import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Stack,
  Box,
  IconButton,
  Chip,
  Tooltip,
  useMediaQuery,
  FormControlLabel,
  Checkbox,
  MenuItem
} from '@mui/material';

import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';

import { apiRawClient as axios } from '../../routes/globalApi';
import { API_BASE_URL } from '../../config';
import NoticeContentEditor from './NoticeContentEditor';

const DEPT_API = `${API_BASE_URL}/api/departments`;
const MAX_FILES = 5;

const stripHtml = (html = '') =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();


const normalizeUrl = (value) => String(value || '').trim();

const uniqueUrls = (urls = []) => {
  const result = [];
  urls.forEach((url) => {
    const cleanUrl = normalizeUrl(url);
    if (cleanUrl && !result.includes(cleanUrl)) result.push(cleanUrl);
  });
  return result;
};

const getNoticeFileUrls = (item) => {
  const urls = [];

  if (Array.isArray(item?.fileUrls)) {
    item.fileUrls.forEach((url) => {
      const cleanUrl = normalizeUrl(url);
      if (cleanUrl && !urls.includes(cleanUrl)) urls.push(cleanUrl);
    });
  }

  if (urls.length === 0 && item?.fileUrl) {
    const cleanUrl = normalizeUrl(item.fileUrl);
    if (cleanUrl) urls.push(cleanUrl);
  }

  return urls;
};

const getFileName = (fileUrl) => {
  if (!fileUrl) return 'No file';
  try {
    return decodeURIComponent(String(fileUrl).split('/').pop().split('?')[0]) || 'file';
  } catch {
    return 'file';
  }
};

const formatFileSize = (size = 0) => {
  if (!size) return '0 MB';
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

export default function EditNoticeDialog({
  open,
  onCancel,
  onOk,
  currentItem = null,
  disabled = false
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [departmentId, setDepartmentId] = useState('');

  const [keepFileUrls, setKeepFileUrls] = useState([]);
  const keepFileUrlsRef = useRef([]);
  const [removedFileUrls, setRemovedFileUrls] = useState([]);
  const removedFileUrlsRef = useRef([]);
  const [newFiles, setNewFiles] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const totalActiveFiles = keepFileUrls.length + newFiles.length;

  const toast = (msg, severity = 'success') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const syncKeepFileUrls = (nextUrls) => {
    const cleanUrls = uniqueUrls(nextUrls);
    keepFileUrlsRef.current = cleanUrls;
    setKeepFileUrls(cleanUrls);
  };

  const syncRemovedFileUrls = (nextUrls) => {
    const cleanUrls = uniqueUrls(nextUrls);
    removedFileUrlsRef.current = cleanUrls;
    setRemovedFileUrls(cleanUrls);
  };

  const getLoggedInUserId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user?.id || user?.userId || user?._id || '';
      }
    } catch (e) {
      console.error('Cannot parse user from localStorage', e);
    }
    return localStorage.getItem('userId') || '';
  };

  const fetchDepartments = async () => {
    setLoadingDept(true);
    try {
      const loggedInUserId = getLoggedInUserId();

      if (!loggedInUserId) {
        toast('Cannot find logged-in user ID', 'error');
        setDepartments([]);
        setDepartmentId('');
        setIsAdmin(false);
        return;
      }

      const res = await axios.get(`${DEPT_API}/search`, {
        params: { userId: loggedInUserId },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const admin = Boolean(res.data?.isAdmin);
      const list = Array.isArray(res.data?.departments) ? res.data.departments : [];

      setIsAdmin(admin);
      setDepartments(list);
      setDepartmentId(admin ? currentItem?.departmentId || '' : list[0]?.id || '');
    } catch (err) {
      console.error(err);
      toast('Failed to load departments', 'error');
      setDepartments([]);
      setDepartmentId('');
      setIsAdmin(false);
    } finally {
      setLoadingDept(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setTitle('');
      setContent('');
      setPinned(false);
      setDepartmentId('');
      syncKeepFileUrls([]);
      syncRemovedFileUrls([]);
      setNewFiles([]);
      setDepartments([]);
      setIsAdmin(false);
      setLoadingDept(false);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    setTitle(currentItem?.title || '');
    setContent(currentItem?.content || '');
    setPinned(!!currentItem?.pinned);
    setDepartmentId(currentItem?.departmentId || '');
    syncKeepFileUrls(getNoticeFileUrls(currentItem));
    syncRemovedFileUrls([]);
    setNewFiles([]);
    setSaving(false);
    setConfirmOpen(false);

    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentItem]);

  const locked = saving || disabled;

  const validate = () => {
    if (!currentItem?.id) return 'Invalid Notice item';
    if (!title.trim()) return 'Title is required';
    if (!stripHtml(content)) return 'Content is required';
    if (!departmentId) return 'Department is required';
    if (keepFileUrlsRef.current.length + newFiles.length > MAX_FILES) return `You can upload maximum ${MAX_FILES} files`;
    return null;
  };

  const handleClose = () => {
    if (locked) return;
    onCancel?.();
  };

  const handleNewFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (selectedFiles.length === 0) return;

    setNewFiles((prev) => {
      const availableSlots = MAX_FILES - keepFileUrlsRef.current.length - prev.length;

      if (availableSlots <= 0) {
        toast(`This notice already has ${MAX_FILES} files`, 'error');
        return prev;
      }

      const acceptedFiles = selectedFiles.slice(0, availableSlots);

      if (selectedFiles.length > availableSlots) {
        toast(`Only ${availableSlots} more file(s) can be added. Maximum ${MAX_FILES} files`, 'warning');
      }

      return [...prev, ...acceptedFiles];
    });
  };

  const handleRemoveExistingFile = (fileUrl) => {
    const cleanUrl = normalizeUrl(fileUrl);
    if (!cleanUrl) return;

    syncKeepFileUrls(keepFileUrlsRef.current.filter((url) => url !== cleanUrl));
    syncRemovedFileUrls([...removedFileUrlsRef.current, cleanUrl]);
  };

  const handleUndoRemoveExistingFile = (fileUrl) => {
    const cleanUrl = normalizeUrl(fileUrl);
    if (!cleanUrl) return;

    syncRemovedFileUrls(removedFileUrlsRef.current.filter((url) => url !== cleanUrl));
    syncKeepFileUrls([...keepFileUrlsRef.current, cleanUrl]);
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      toast(err, 'error');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setSaving(true);

    try {
      const loggedInUserId = getLoggedInUserId();

      if (!loggedInUserId) {
        toast('Cannot find logged-in user ID', 'error');
        return;
      }

      const keepUrlsPayload = uniqueUrls(keepFileUrlsRef.current);
      const removedUrlsPayload = uniqueUrls(removedFileUrlsRef.current);
      const formData = new FormData();

      /*
       * IMPORTANT:
       * Do not send title/content through axios params.
       * Rich HTML content can be very long, and putting it in the URL
       * can cause Network Error / net::ERR_FAILED.
       * Send all notice fields inside multipart FormData instead.
       */
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      formData.append('userId', loggedInUserId);
      formData.append('departmentId', departmentId);
      formData.append('pinned', String(Boolean(pinned)));

      if (keepUrlsPayload.length > 0) {
        keepUrlsPayload.forEach((fileUrl) => {
          formData.append('fileUrls', fileUrl);
        });
      } else {
        /*
         * IMPORTANT:
         * Send an empty fileUrls field when all existing files are removed.
         * If this field is not sent, backend treats it as old FE behavior
         * and keeps all existing files unchanged.
         */
        formData.append('fileUrls', '');
      }

      removedUrlsPayload.forEach((fileUrl) => {
        formData.append('removeFileUrls', fileUrl);
      });

      newFiles.forEach((selectedFile) => {
        formData.append('files', selectedFile);
      });

      console.log('Notice edit keep fileUrls sent to BE:', keepUrlsPayload);
      console.log('Notice edit removeFileUrls sent to BE:', removedUrlsPayload);

      const response = await axios.put(
        `${API_BASE_URL}/api/notices/${currentItem.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            Accept: '*/*'
          }
        }
      );

      const result = response?.data || {};
      const originalUrls = getNoticeFileUrls(currentItem);
      const returnedUrls = getNoticeFileUrls(result);
      const newlyReturnedUrls = returnedUrls.filter((url) => !originalUrls.includes(url));
      const finalFileUrls = uniqueUrls([...keepUrlsPayload, ...newlyReturnedUrls]);

      const fixedResultForUI = {
        ...currentItem,
        ...result,
        title: title.trim(),
        content: content.trim(),
        departmentId,
        pinned,
        fileUrl: finalFileUrls[0] || null,
        previewUrl: finalFileUrls[0] || null,
        fileUrls: finalFileUrls,
        previewUrls: finalFileUrls,
      };

      toast('Notice updated successfully');
      onOk?.(fixedResultForUI);
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Update Notice failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const paperSx = useMemo(() => ({
    borderRadius: fullScreen ? 0 : 4,
    overflow: 'hidden',
    boxShadow: `0 22px 70px ${alpha('#000', 0.25)}`,
    background: alpha('#FFFFFF', 0.95),
    backdropFilter: 'blur(14px)'
  }), [fullScreen]);

  const headerSx = useMemo(() => ({
    py: 2,
    px: 2.5,
    color: 'white',
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  }), [theme]);

  const fieldSx = useMemo(() => ({
    '& .MuiOutlinedInput-root': { borderRadius: 3 }
  }), []);

  const gradientBtnSx = useMemo(() => ({
    borderRadius: 999,
    px: 2.2,
    py: 1.1,
    fontWeight: 800,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  }), [theme]);

  return (
    <>
      {/* IMPORTANT: disableEnforceFocus lets TinyMCE table popups receive clicks inside MUI Dialog. */}
<Dialog
  open={open}
  onClose={locked ? undefined : handleClose}
  fullScreen={fullScreen}
  maxWidth="md"
  fullWidth
  disableEnforceFocus
  disableRestoreFocus
  PaperProps={{ sx: paperSx }}
>
        <DialogTitle sx={headerSx}>
          <Stack direction="row" justifyContent="space-between">
            <Box>
              <Typography fontWeight={900}>Edit Notice</Typography>
              <Typography fontSize={13}>Current files: {totalActiveFiles}/{MAX_FILES}</Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Chip icon={<CheckCircleRoundedIcon />} label="Editing" size="small" />
              <Tooltip title="Close"><IconButton onClick={handleClose} sx={{ color: 'white' }}><CloseIcon /></IconButton></Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>
        <br></br>
        <DialogContent sx={{ px: 3, pt: 3.5, pb: 3 }}>
          <Stack spacing={2}>
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={locked} size="small" fullWidth sx={fieldSx} />
            <NoticeContentEditor label="Content" value={content} onChange={setContent} disabled={locked} />

            {isAdmin && (
              <TextField select label="Department *" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={locked || loadingDept} size="small" fullWidth sx={fieldSx}>
                {departments.map((d) => (<MenuItem key={d.id} value={d.id}>{d.departmentName} ({d.division})</MenuItem>))}
              </TextField>
            )}

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography fontSize={13} fontWeight={600}>Files ({totalActiveFiles}/{MAX_FILES})</Typography>
                {removedFileUrls.length > 0 && <Chip size="small" color="warning" label={`${removedFileUrls.length} removed`} />}
              </Stack>

              <Button variant="outlined" component="label" disabled={locked || totalActiveFiles >= MAX_FILES} startIcon={<CloudUploadIcon />} fullWidth sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2 }}>
                Add More Files ({totalActiveFiles}/{MAX_FILES})
                <input hidden multiple type="file" onChange={handleNewFilesChange} />
              </Button>

              <Stack spacing={1} sx={{ mt: 1.2 }}>
                {keepFileUrls.length === 0 && newFiles.length === 0 && <Typography variant="body2" color="text.secondary">No file selected</Typography>}

                {keepFileUrls.map((fileUrl) => (
                  <Stack key={fileUrl} direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ px: 1.2, py: 0.8, border: '1px solid #e5e7eb', borderRadius: 2, background: '#fff' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                      <InsertDriveFileRoundedIcon fontSize="small" color="primary" />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>{getFileName(fileUrl)}</Typography>
                        <Typography fontSize={12} color="text.secondary">Existing file</Typography>
                      </Box>
                    </Stack>
                    <Tooltip title="Remove current file"><IconButton size="small" onClick={() => handleRemoveExistingFile(fileUrl)} disabled={locked}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                ))}

                {removedFileUrls.map((fileUrl) => (
                  <Stack key={`removed-${fileUrl}`} direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ px: 1.2, py: 0.8, border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`, borderRadius: 2, background: alpha(theme.palette.warning.main, 0.06) }}>
                    <Typography variant="body2" sx={{ color: 'warning.dark' }} noWrap>Will delete from source: {getFileName(fileUrl)}</Typography>
                    <Button size="small" onClick={() => handleUndoRemoveExistingFile(fileUrl)} disabled={locked}>Undo</Button>
                  </Stack>
                ))}

                {newFiles.map((selectedFile, index) => (
                  <Stack key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`} direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ px: 1.2, py: 0.8, border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`, borderRadius: 2, background: alpha(theme.palette.success.main, 0.06) }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                      <InsertDriveFileRoundedIcon fontSize="small" color="success" />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>{selectedFile.name}</Typography>
                        <Typography fontSize={12} color="text.secondary">New file • {formatFileSize(selectedFile.size)}</Typography>
                      </Box>
                    </Stack>
                    <Tooltip title="Remove new file"><IconButton size="small" onClick={() => handleRemoveNewFile(index)} disabled={locked}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <FormControlLabel control={<Checkbox checked={pinned} onChange={(e) => setPinned(e.target.checked)} disabled={locked} />} label="Pinned notice" />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} disabled={locked}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={locked || loadingDept || totalActiveFiles > MAX_FILES} variant="contained" sx={gradientBtnSx}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Update Notice'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Update</DialogTitle>
        <DialogContent><Typography>Update this notice?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={saving}>Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={4500} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>{snackbarMessage}</Alert>
      </Snackbar>
    </>
  );
}
