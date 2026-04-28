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
  Divider,
  Tooltip,
  useMediaQuery,
  MenuItem,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: '*/*' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/* =========================
   Helpers
   ========================= */
const normalizeImageUrl = (rawUrl) => {
  if (!rawUrl) return '';

  const value = String(rawUrl).trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('data:image/')) return value;

  const cleanBase = API_BASE_URL.replace(/\/$/, '');
  const cleanPath = value.startsWith('/') ? value : `/${value}`;

  return `${cleanBase}${cleanPath}`;
};

const getImageField = (item) => {
  return (
    item?.icon ||
    item?.image ||
    item?.imageUrl ||
    item?.filePath ||
    item?.path ||
    item?.thumbnail ||
    ''
  );
};

export default function EditAppLinkDialog({
  open,
  onCancel,
  onOk,
  currentItem = null,
  disabled = false,
  isAdmin = false,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');

  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');

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

  const toast = (msg, severity = 'success') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const fetchDepartmentsForAdmin = async () => {
    if (!isAdmin) {
      setDepartments([]);
      setDepartmentId('');
      return;
    }

    setLoadingDepartments(true);

    try {
      const loggedInUserId = getLoggedInUserId();

      if (!loggedInUserId) {
        toast('Không tìm thấy userId của user đang đăng nhập.', 'error');
        setDepartments([]);
        setDepartmentId('');
        return;
      }

      const response = await apiClient.get('/api/departments/search', {
        params: {
          userId: loggedInUserId,
          skipDepartmentFilter: true,
        },
      });

      const list = Array.isArray(response.data?.departments)
        ? response.data.departments
        : [];

      setDepartments(list);
      setDepartmentId(currentItem?.departmentId || '');
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Không tải được danh sách phòng ban.', 'error');
      setDepartments([]);
      setDepartmentId(currentItem?.departmentId || '');
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setName('');
      setUrl('');
      setDesc('');
      setDepartmentId('');
      setDepartments([]);
      setLoadingDepartments(false);
      setConfirmOpen(false);
      setSnackbarOpen(false);
      setSnackbarMessage('');
      setSnackbarSeverity('success');
      setImageFile(null);
      setImagePreview('');
      return;
    }

    setName(currentItem?.name || '');
    setUrl(currentItem?.url || '');
    setDesc(currentItem?.desc || '');
    setDepartmentId(currentItem?.departmentId || '');
    setImageFile(null);
    setImagePreview(normalizeImageUrl(getImageField(currentItem)));
    setConfirmOpen(false);
    setSnackbarOpen(false);
    setSnackbarMessage('');
    setSnackbarSeverity('success');

    fetchDepartmentsForAdmin();
  }, [open, currentItem, isAdmin]);

  useEffect(() => {
    if (!imageFile) return;

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const locked = saving || disabled;

  const validate = () => {
    if (!name.trim()) return 'App Link Name is required.';
    if (!url.trim()) return 'URL is required.';
    if (!/^https?:\/\/.+/i.test(url.trim())) return 'URL must start with http:// or https://';
    if (!desc.trim()) return 'Description is required.';
    if (isAdmin && !departmentId) return 'Please select a department.';
    return null;
  };

  const handleClose = () => {
    if (locked) return;
    onCancel?.();
  };

  const handleChooseFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file.', 'error');
      return;
    }

    setImageFile(file);
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) return toast(err, 'error');
    if (!currentItem?.id) return toast('Invalid App Link item.', 'error');
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!currentItem?.id) {
      setConfirmOpen(false);
      return toast('Invalid App Link item.', 'error');
    }

    setConfirmOpen(false);
    setSaving(true);

    try {
      const loggedInUserId = getLoggedInUserId();

      if (!loggedInUserId) {
        toast('Không tìm thấy userId của user đang đăng nhập.', 'error');
        return;
      }

      const formData = new FormData();

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const params = {
        name: name.trim(),
        url: url.trim(),
        desc: desc.trim(),
        userId: loggedInUserId,
      };

      if (isAdmin) {
        params.departmentId = departmentId;
      }

      const response = await apiClient.put(`/api/app-links/${currentItem.id}`, formData, {
        params,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast(response?.data?.message || 'App Link updated successfully!', 'success');
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);

      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      let errorMessage = backendMessage || 'Update App Link failed.';

      if (!backendMessage) {
        switch (status) {
          case 400:
            errorMessage = 'Invalid data provided. Please check your inputs.';
            break;
          case 401:
            errorMessage = 'Unauthorized. Please log in again.';
            break;
          case 403:
            errorMessage = 'You do not have permission to perform this action.';
            break;
          case 404:
            errorMessage = 'App Link not found or API endpoint not found.';
            break;
          case 409:
            errorMessage = 'This App Link may already exist.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = 'Failed to update App Link.';
        }
      }

      toast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const paperSx = useMemo(
    () => ({
      borderRadius: fullScreen ? 0 : 4,
      overflow: 'hidden',
      boxShadow: `0 22px 70px ${alpha('#000', 0.25)}`,
      border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
      background:
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.72)
          : alpha('#FFFFFF', 0.92),
      backdropFilter: 'blur(14px)',
    }),
    [fullScreen, theme]
  );

  const headerSx = useMemo(
    () => ({
      position: 'relative',
      py: 2,
      px: 2.5,
      color: 'common.white',
      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    }),
    [theme]
  );

  const subtleCardSx = useMemo(
    () => ({
      borderRadius: 4,
      border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
      background: alpha(theme.palette.common.white, 0.6),
      backdropFilter: 'blur(10px)',
      boxShadow: `0 10px 30px ${alpha('#000', 0.08)}`,
    }),
    [theme]
  );

  const fieldSx = useMemo(
    () => ({
      '& .MuiOutlinedInput-root': {
        borderRadius: 3,
        backgroundColor: alpha(theme.palette.common.white, 0.65),
        '& fieldset': { borderColor: alpha(theme.palette.divider, 0.7) },
        '&:hover fieldset': { borderColor: alpha(theme.palette.primary.main, 0.5) },
        '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: 2 },
      },
      '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.primary.main },
    }),
    [theme]
  );

  const gradientBtnSx = useMemo(
    () => ({
      borderRadius: 999,
      px: 2.2,
      py: 1.1,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.28)}`,
      transform: 'translateY(0)',
      transition: 'transform .15s ease, box-shadow .15s ease',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: `0 14px 30px ${alpha(theme.palette.primary.main, 0.34)}`,
        backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
      },
    }),
    [theme]
  );

  const outlineBtnSx = {
    borderRadius: 999,
    px: 2.2,
    py: 1.1,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={locked ? undefined : handleClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={headerSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  fontSize: { xs: 18, sm: 20 },
                }}
              >
                Edit App Link
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.4, fontSize: 13 }}>
                Update app link information
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                icon={<CheckCircleRoundedIcon />}
                label="Editing"
                sx={{
                  color: 'common.white',
                  bgcolor: alpha('#000', 0.18),
                  border: `1px solid ${alpha('#fff', 0.22)}`,
                  fontWeight: 700,
                }}
              />
              <Tooltip title="Close">
                <span>
                  <IconButton
                    onClick={handleClose}
                    disabled={locked}
                    sx={{
                      color: 'common.white',
                      bgcolor: alpha('#000', 0.18),
                      border: `1px solid ${alpha('#fff', 0.22)}`,
                      '&:hover': { bgcolor: alpha('#000', 0.28) },
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2}>
            <Box sx={{ ...subtleCardSx, p: 2 }}>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Details</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                Update name, URL, description or replace image
              </Typography>

              <Divider sx={{ my: 1.6 }} />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.8,
                }}
              >
                <TextField
                  label="App Link Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={locked}
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  placeholder="e.g., Dashboard"
                />

                <TextField
                  label="URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={locked}
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  placeholder="http://localhost:3000/dashboard"
                />

                {isAdmin && (
                  <TextField
                    select
                    label="Department"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    disabled={locked || loadingDepartments}
                    size="small"
                    fullWidth
                    sx={{
                      ...fieldSx,
                      gridColumn: { xs: 'span 1', sm: 'span 2' },
                    }}
                  >
                    {departments.map((department) => (
                      <MenuItem key={department.id} value={department.id}>
                        {department.departmentName} ({department.division})
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                <TextField
                  label="Description"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  disabled={locked}
                  size="small"
                  fullWidth
                  multiline
                  minRows={3}
                  sx={{
                    ...fieldSx,
                    gridColumn: { xs: 'span 1', sm: 'span 2' },
                  }}
                  placeholder="Enter description..."
                />

                <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.secondary', mb: 0.8, ml: 0.4 }}>
                    Replace Image
                  </Typography>

                  <Box
                    sx={{
                      border: `1px dashed ${alpha(theme.palette.primary.main, 0.35)}`,
                      borderRadius: 3,
                      p: 1.5,
                      background: alpha(theme.palette.primary.main, 0.03),
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>
                          Choose new image
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                          Nếu không chọn ảnh mới thì giữ ảnh cũ
                        </Typography>
                      </Stack>

                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<UploadFileRoundedIcon />}
                        disabled={locked}
                        sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
                      >
                        Upload image
                        <input hidden type="file" accept="image/*" onChange={handleChooseFile} />
                      </Button>
                    </Stack>

                    {imageFile && (
                      <Typography sx={{ mt: 1.2, fontSize: 12.5, color: 'text.secondary' }}>
                        Selected file: <b style={{ color: '#111827' }}>{imageFile.name}</b>
                      </Typography>
                    )}

                    <Box
                      sx={{
                        mt: 1.5,
                        minHeight: 170,
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                        bgcolor: alpha(theme.palette.common.white, 0.72),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {imagePreview ? (
                        <Box
                          component="img"
                          src={imagePreview}
                          alt="preview"
                          onError={(e) => {
                            console.error('Edit preview image load failed:', imagePreview, currentItem);
                            e.currentTarget.style.display = 'none';
                          }}
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 220,
                            objectFit: 'contain',
                          }}
                        />
                      ) : (
                        <Stack spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                          <ImageRoundedIcon sx={{ fontSize: 34, opacity: 0.7 }} />
                          <Typography sx={{ fontSize: 12.5 }}>No image available</Typography>
                        </Stack>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 1.8,
                  p: 1.4,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <InfoRoundedIcon sx={{ fontSize: 18, mt: '2px', color: alpha(theme.palette.primary.main, 0.8) }} />
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                    <b>Tip:</b> Nếu không chọn ảnh mới thì preview sẽ giữ ảnh hiện tại.
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ mt: 1.6 }}>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                  Preview: <b style={{ color: '#111827' }}>{name.trim() || 'Unknown'}</b> • {url.trim() || 'No URL'} •{' '}
                  {desc.trim() || 'No description'}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 2.5 }, py: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={locked || loadingDepartments}
            variant="contained"
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Update'}
          </Button>
        </DialogActions>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={5000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
            background: alpha('#FFFFFF', 0.92),
            backdropFilter: 'blur(14px)',
            boxShadow: `0 22px 70px ${alpha('#000', 0.18)}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm Update</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13.5 }}>
            Bạn chắc chắn muốn update App Link <b>{name.trim() || 'Unknown'}</b>?
          </Typography>

          <Box
            sx={{
              mt: 2,
              p: 1.4,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
            }}
          >
            <Stack spacing={0.6}>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Name: <b>{name.trim() || '—'}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • URL: <b>{url.trim() || '—'}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Department:{' '}
                <b>
                  {isAdmin
                    ? departments.find((department) => department.id === departmentId)?.departmentName || '—'
                    : 'Your department'}
                </b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Description: <b>{desc.trim() || '—'}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Image: <b>{imageFile?.name || 'Keep current image'}</b>
              </Typography>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            No
          </Button>
          <Button onClick={handleConfirm} disabled={locked} variant="contained" sx={{ ...gradientBtnSx, px: 2.4 }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
