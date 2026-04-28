import React, { useEffect, useMemo, useState } from 'react';
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
  Link,
  MenuItem
} from '@mui/material';

import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

import axios from 'axios';
import { API_BASE_URL } from '../../config';

const DEPT_API = `${API_BASE_URL}/api/departments`;

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
  const [file, setFile] = useState(null);
  const [departmentId, setDepartmentId] = useState('');

  const [departments, setDepartments] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const toast = (msg, severity = 'success') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
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
        toast('Không tìm thấy userId của user đang đăng nhập', 'error');
        setDepartments([]);
        setDepartmentId('');
        setIsAdmin(false);
        return;
      }

      const res = await axios.get(`${DEPT_API}/search`, {
        params: {
          userId: loggedInUserId
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const admin = Boolean(res.data?.isAdmin);
      const list = Array.isArray(res.data?.departments)
        ? res.data.departments
        : [];

      setIsAdmin(admin);
      setDepartments(list);

      if (admin) {
        // Admin được phép chọn lại department khi edit.
        // Giữ department hiện tại của notice làm lựa chọn mặc định.
        setDepartmentId(currentItem?.departmentId || '');
      } else {
        // User thường không được chọn department.
        // Department mặc định bắt buộc là phòng ban chính của user do API trả về.
        setDepartmentId(list[0]?.id || '');
      }
    } catch (err) {
      console.error(err);
      toast('Không tải được danh sách phòng ban', 'error');
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
      setFile(null);
      setDepartmentId('');
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
    setFile(null);
    setSaving(false);
    setConfirmOpen(false);

    fetchDepartments();
  }, [open, currentItem]);

  const getCurrentFileUrl = () => {
    return (
      currentItem?.fileUrl ||
      currentItem?.url ||
      currentItem?.attachmentUrl ||
      currentItem?.documentUrl ||
      ''
    );
  };

  const getCurrentFileName = () => {
    if (currentItem?.fileName) return currentItem.fileName;
    if (currentItem?.originalFileName) return currentItem.originalFileName;

    const fileUrl = getCurrentFileUrl();
    if (!fileUrl) return '';

    try {
      const cleanUrl = fileUrl.split('?')[0];
      return decodeURIComponent(cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1));
    } catch (e) {
      return fileUrl;
    }
  };

  const currentFileUrl = getCurrentFileUrl();
  const currentFileName = getCurrentFileName();

  const locked = saving || disabled;

  const validate = () => {
    if (!currentItem?.id) return 'Invalid Notice item';
    if (!title.trim()) return 'Title is required';
    if (!content.trim()) return 'Content is required';
    if (!departmentId) return 'Department is required';
    return null;
  };

  const handleClose = () => {
    if (locked) return;
    onCancel?.();
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
        toast('Không tìm thấy userId của user đang đăng nhập', 'error');
        return;
      }

      const formData = new FormData();

      if (file) {
        formData.append('file', file);
      }

      await axios.put(
        `${API_BASE_URL}/api/notices/${currentItem.id}`,
        formData,
        {
          params: {
            title: title.trim(),
            content: content.trim(),
            userId: loggedInUserId,
            departmentId,
            pinned
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
            accept: '*/*'
          }
        }
      );

      toast('Notice updated successfully');
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(
        err?.response?.data?.message || 'Update Notice failed',
        'error'
      );
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
    '& .MuiOutlinedInput-root': {
      borderRadius: 3
    }
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
      <Dialog
        open={open}
        onClose={locked ? undefined : handleClose}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={headerSx}>
          <Stack direction="row" justifyContent="space-between">
            <Box>
              <Typography fontWeight={900}>
                Edit Notice
              </Typography>
              <Typography fontSize={13}>
                Update notice
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Chip
                icon={<CheckCircleRoundedIcon />}
                label="Editing"
                size="small"
              />

              <Tooltip title="Close">
                <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>

        <br />

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              multiline
              minRows={5}
              sx={fieldSx}
            />

            {isAdmin && (
              <TextField
                select
                label="Department *"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={locked || loadingDept}
                size="small"
                fullWidth
                sx={fieldSx}
              >
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.departmentName} ({d.division})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Box>
              <Typography fontSize={13} fontWeight={600} mb={1}>
                Current file
              </Typography>

              {currentFileUrl ? (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                    background: alpha(theme.palette.primary.main, 0.04)
                  }}
                >
                  <Typography fontSize={13}>
                    {currentFileName || 'Attached file'}
                  </Typography>

                  <Link
                    href={currentFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    fontSize={12}
                  >
                    View current file
                  </Link>
                </Box>
              ) : (
                <Typography fontSize={12} color="text.secondary">
                  No file attached
                </Typography>
              )}
            </Box>

            <Box>
              <Button
                variant="outlined"
                component="label"
                disabled={locked}
              >
                Upload New File
                <input
                  hidden
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Button>

              {file && (
                <Typography fontSize={12} mt={1}>
                  New file selected: {file.name}
                </Typography>
              )}
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  disabled={locked}
                />
              }
              label="Pinned notice"
            />

            <Typography fontSize={12} color="text.secondary">
              User ID: {getLoggedInUserId() || 'Not found'}
            </Typography>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.primary.main, 0.08)
              }}
            >
              <Stack direction="row" spacing={1}>
                <InfoRoundedIcon fontSize="small" />
                <Typography fontSize={12}>
                  If no new file is selected, the system will keep the current file.
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={locked}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              locked ||
              loadingDept ||
              !title.trim() ||
              !content.trim() ||
              !departmentId
            }
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} maxWidth="xs" fullWidth>
        <DialogTitle>
          Confirm Update
        </DialogTitle>

        <DialogContent>
          <Typography>
            Update notice <b>{title}</b> ?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            No
          </Button>

          <Button onClick={handleConfirm} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
