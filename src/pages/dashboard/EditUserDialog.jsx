import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  MenuItem,
  Avatar,
  Grid,
  Divider,
  Tooltip,
  Chip,
  Switch,
  useMediaQuery,
  Slide,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

import { API_BASE_URL } from '../../config';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const buildAbsoluteImageUrl = (profileImageUrl) => {
  if (!profileImageUrl) return '';
  const t = new Date().getTime();
  if (profileImageUrl.startsWith('http')) return `${profileImageUrl}?t=${t}`;
  const clean = profileImageUrl.startsWith('/') ? profileImageUrl : `/${profileImageUrl}`;
  return `${API_BASE_URL}${clean}?t=${t}`;
};

const stripToServerPath = (absoluteUrl) => {
  if (!absoluteUrl) return '';
  const clean = absoluteUrl.split('?')[0];
  return clean.replace(`${API_BASE_URL}/`, '/').replace(API_BASE_URL, '');
};

const APPROVE_PERMISSION_OPTIONS = [
  { value: 'NONE', label: 'No approve permission' },
  { value: 'NOTICE', label: 'Approve Notice' },
  { value: 'DOCUMENT', label: 'Approve Document' },
  { value: 'BOTH', label: 'Approve Notice & Document' },
];

const BOOKING_PERMISSION_OPTIONS = [
  { value: 'NONE', label: 'No booking permission' },
  { value: 'BOOKING', label: 'Can manage booking' },
];

const normalizeApprovePermission = (value) => {
  const normalized = String(value || 'NONE').trim().toUpperCase();
  return APPROVE_PERMISSION_OPTIONS.some((item) => item.value === normalized) ? normalized : 'NONE';
};

const getApprovePermissionLabel = (value) => {
  const normalized = normalizeApprovePermission(value);
  return APPROVE_PERMISSION_OPTIONS.find((item) => item.value === normalized)?.label || 'No approve permission';
};

const normalizeBookingPermission = (value) => {
  const normalized = String(value || 'NONE').trim().toUpperCase();
  return BOOKING_PERMISSION_OPTIONS.some((item) => item.value === normalized) ? normalized : 'NONE';
};

const getBookingPermissionLabel = (value) => {
  const normalized = normalizeBookingPermission(value);
  return BOOKING_PERMISSION_OPTIONS.find((item) => item.value === normalized)?.label || 'No booking permission';
};


export default function EditUserDialog({ open, onClose, onUpdate, user, disabled = false }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    address: '',
    phone: '',
    role: 'User',
    approvePermission: 'NONE',
    bookingPermission: 'NONE',
    isEnabled: true,
    departmentId: '',
  });

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [keptImageUrl, setKeptImageUrl] = useState('');
  const [removedImageUrl, setRemovedImageUrl] = useState('');

  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const locked = saving || disabled;

  const toast = (msg, severity = 'success') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
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
      '& .MuiInputLabel-root': { fontWeight: 700 },
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

  const outlineBtnSx = useMemo(
    () => ({
      borderRadius: 999,
      px: 2.2,
      py: 1.1,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    }),
    []
  );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const selectedDepartment = useMemo(() => {
    return departments.find((d) => d.id === formData.departmentId) || null;
  }, [departments, formData.departmentId]);

  const selectedDepartmentLabel = useMemo(() => {
    if (!selectedDepartment) return '—';
    const division = selectedDepartment.division || '';
    const departmentName = selectedDepartment.departmentName || '';
    return division ? `${division} - ${departmentName}` : departmentName;
  }, [selectedDepartment]);

  useEffect(() => {
    if (!(open && user)) return;

    setFormData({
      username: user.username || '',
      email: user.email || '',
      address: user.address || '',
      phone: user.phone || '',
      role: user.role || 'User',
      approvePermission: normalizeApprovePermission(user.approvePermission),
      bookingPermission: normalizeBookingPermission(user.bookingPermission),
      isEnabled: user.isEnabled !== undefined ? user.isEnabled : true,
      departmentId: user.department?.id || user.departmentId || '',
    });

    setNewImage(null);
    setRemovedImageUrl('');

    const abs = buildAbsoluteImageUrl(user.profileImageUrl);
    setKeptImageUrl(abs);
    setNewImagePreview(abs || null);

    setConfirmOpen(false);
    setSnackbarOpen(false);
    setSnackbarMessage('');
    setSnackbarSeverity('success');
  }, [user, open]);

  useEffect(() => {
    if (!open) return;

    let active = true;

    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/departments`, {
          method: 'GET',
          headers: { accept: 'application/json' },
        });

        if (!res.ok) {
          throw new Error(`Không tải được danh sách phòng ban (${res.status})`);
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (active) setDepartments(list);
      } catch (err) {
        console.error('Fetch departments error:', err);
        if (active) {
          setDepartments([]);
          toast(err?.message || 'Không tải được danh sách phòng ban.', 'error');
        }
      } finally {
        if (active) setLoadingDepartments(false);
      }
    };

    fetchDepartments();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (newImagePreview && newImage) URL.revokeObjectURL(newImagePreview);
    };
  }, [newImagePreview, newImage]);

  const handleClose = () => {
    if (locked) return;
    onClose?.();
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return toast('Aucun fichier sélectionné.', 'warning');

    if (!file.type.startsWith('image/')) {
      e.target.value = null;
      return toast('Veuillez sélectionner une image valide.', 'error');
    }

    if (file.size > 5 * 1024 * 1024) {
      e.target.value = null;
      return toast("L'image doit faire moins de 5MB.", 'error');
    }

    if (newImagePreview && newImage) URL.revokeObjectURL(newImagePreview);

    if (keptImageUrl) {
      setRemovedImageUrl(stripToServerPath(keptImageUrl));
      setKeptImageUrl('');
    }

    setNewImage(file);
    setNewImagePreview(URL.createObjectURL(file));
    e.target.value = null;
  };

  const handleRemoveImage = () => {
    if (newImage && newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
      setNewImage(null);
      setNewImagePreview(null);
      return;
    }

    if (keptImageUrl) {
      setRemovedImageUrl(stripToServerPath(keptImageUrl));
      setKeptImageUrl('');
      setNewImagePreview(null);
    }
  };

  const handleSubmit = () => {
    if (!formData.username?.trim()) return toast('Username est requis.', 'error');
    if (!formData.email?.trim()) return toast('Email est requis.', 'error');
    if (!emailRegex.test(formData.email.trim())) return toast("Format d'email invalide.", 'error');
    if (!formData.departmentId?.trim()) return toast('Veuillez sélectionner un département.', 'error');
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setSaving(true);

    const formDataToSend = new FormData();
    const payload = {
      ...formData,
      approvePermission: normalizeApprovePermission(formData.approvePermission),
    };

    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== '') formDataToSend.append(k, v);
    });

    if (newImage) formDataToSend.append('profileImage', newImage);
    if (removedImageUrl) formDataToSend.append('imageToDelete', removedImageUrl);

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { accept: '*/*' },
        body: formDataToSend,
      });

      if (!res.ok) {
        const errorText = await res.text();
        let message = `Échec de la mise à jour (${res.status})`;
        try {
          const errorData = JSON.parse(errorText);
          message = errorData?.message || message;
        } catch {
          message = errorText || message;
        }
        throw new Error(message);
      }

      const text = await res.text();
      let data = null;
      let message = 'Utilisateur mis à jour avec succès';

      try {
        data = JSON.parse(text);
        message = data?.message || message;
      } catch {}

      toast(message, 'success');

      setNewImage(null);
      setRemovedImageUrl('');

      const updatedUser = data?.data || data || { ...user, ...formData };
      const nextUrl = buildAbsoluteImageUrl(
        data?.data?.profileImageUrl || data?.profileImageUrl || user?.profileImageUrl
      );

      setKeptImageUrl(nextUrl);
      setNewImagePreview(nextUrl || null);

      onUpdate?.(updatedUser);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast(err?.message || 'Échec de la mise à jour.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const titleName = formData.username?.trim() || user?.username || 'Unknown';

  const imageStatusLabel = useMemo(() => {
    if (newImage) return `New: ${newImage.name}`;
    if (removedImageUrl) return 'Removed';
    if (keptImageUrl) return 'Keep current';
    return 'None';
  }, [newImage, removedImageUrl, keptImageUrl]);

  return (
    <>
      <Dialog
        open={open}
        onClose={locked ? undefined : handleClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Transition}
        PaperProps={{ sx: paperSx }}
        BackdropProps={{
          sx: {
            backgroundColor: alpha(theme.palette.grey[900], 0.62),
            backdropFilter: 'blur(10px)',
          },
        }}
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
                Edit User
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.4, fontSize: 13 }}>
                Update basic info, department & avatar
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
                    <CloseRoundedIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2}>
            <Box sx={{ ...subtleCardSx, p: 2 }}>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                Profile
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                Change avatar and enable/disable status
              </Typography>

              <Divider sx={{ my: 1.6 }} />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={newImagePreview || undefined}
                    alt={titleName}
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 4,
                      border: `1px solid ${alpha(theme.palette.common.white, 0.6)}`,
                      boxShadow: `0 14px 35px ${alpha(theme.palette.primary.main, 0.16)}`,
                    }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                      {titleName}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {formData.role} • {formData.isEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.4 }}>
                      Department: <b>{selectedDepartmentLabel}</b><br />
                      Approve: <b>{getApprovePermissionLabel(formData.approvePermission)}</b><br />
                      Booking: <b>{getBookingPermissionLabel(formData.bookingPermission)}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.4 }}>
                      Image: <b>{imageStatusLabel}</b>
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCameraRoundedIcon />}
                    disabled={locked}
                    sx={outlineBtnSx}
                  >
                    Select
                    <input hidden type="file" accept="image/*" onChange={handleFileChange} />
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    disabled={locked || (!newImage && !keptImageUrl)}
                    onClick={handleRemoveImage}
                    sx={{
                      ...outlineBtnSx,
                      borderColor: alpha(theme.palette.error.main, 0.35),
                      color: theme.palette.error.main,
                      '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.06) },
                    }}
                  >
                    Remove
                  </Button>

                  <Box
                    sx={{
                      px: 1.2,
                      py: 0.6,
                      borderRadius: 999,
                      border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                      backgroundColor: alpha(theme.palette.common.white, 0.55),
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
                        {formData.isEnabled ? 'Enabled' : 'Disabled'}
                      </Typography>
                      <Switch
                        checked={formData.isEnabled}
                        onChange={(e) => setFormData((p) => ({ ...p, isEnabled: e.target.checked }))}
                        disabled={locked}
                        size="small"
                      />
                    </Stack>
                  </Box>
                </Stack>
              </Stack>

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
                    <b>Tip:</b> Keep role names consistent (User/Leader/Admin) to avoid filtering issues.
                  </Typography>
                </Stack>
              </Box>
            </Box>

            <Box sx={{ ...subtleCardSx, p: 2 }}>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                Details
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                Update contact info, department and access role
              </Typography>

              <Divider sx={{ my: 1.6 }} />

              <Grid container spacing={1.8}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Username"
                    value={formData.username}
                    onChange={handleChange('username')}
                    fullWidth
                    required
                    disabled={locked}
                    size="small"
                    sx={fieldSx}
                    placeholder="e.g., bao.chau"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    fullWidth
                    required
                    disabled={locked}
                    size="small"
                    sx={fieldSx}
                    placeholder="e.g., user@mail.com"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone"
                    value={formData.phone}
                    onChange={handleChange('phone')}
                    fullWidth
                    disabled={locked}
                    size="small"
                    sx={fieldSx}
                    placeholder="Optional"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Role"
                    value={formData.role}
                    onChange={handleChange('role')}
                    fullWidth
                    disabled={locked}
                    size="small"
                    sx={fieldSx}
                  >
                    <MenuItem value="User">User</MenuItem>
                    <MenuItem value="Leader">Leader</MenuItem>
                    <MenuItem value="Admin">Admin</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Approve Permission"
                    value={normalizeApprovePermission(formData.approvePermission)}
                    onChange={handleChange('approvePermission')}
                    fullWidth
                    disabled={locked}
                    size="small"
                    sx={fieldSx}
                    helperText="Allow user to approve Notice, Document, both, or none."
                  >
                    {APPROVE_PERMISSION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Booking Permission"
                    value={normalizeBookingPermission(formData.bookingPermission)}
                    onChange={handleChange('bookingPermission')}
                    fullWidth
                    disabled={locked}
                    size="small"
                    sx={fieldSx}
                    helperText="Allow user to add, edit, delete and show room bookings on Index Room."
                  >
                    {BOOKING_PERMISSION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    select
                    label="Department"
                    value={formData.departmentId}
                    onChange={handleChange('departmentId')}
                    fullWidth
                    required
                    disabled={locked || loadingDepartments}
                    size="small"
                    sx={fieldSx}
                    helperText={loadingDepartments ? 'Loading departments...' : 'Select a department'}
                  >
                    {departments.length === 0 && !loadingDepartments ? (
                      <MenuItem value="" disabled>
                        No departments available
                      </MenuItem>
                    ) : null}

                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.division ? `${dept.division} - ${dept.departmentName}` : dept.departmentName}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Address"
                    value={formData.address}
                    onChange={handleChange('address')}
                    fullWidth
                    disabled={locked}
                    size="small"
                    sx={fieldSx}
                    placeholder="Optional"
                  />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 2.5 }, py: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={locked} variant="contained" sx={gradientBtnSx}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Update'}
          </Button>
        </DialogActions>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={5200}
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
        onClose={locked ? undefined : () => setConfirmOpen(false)}
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
            Are you sure you want to update <b>{titleName}</b>?
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
                • Email: <b>{formData.email?.trim() || '—'}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Role: <b>{formData.role || '—'}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Department: <b>{selectedDepartmentLabel}</b><br />
                      Approve: <b>{getApprovePermissionLabel(formData.approvePermission)}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Status: <b>{formData.isEnabled ? 'Enabled' : 'Disabled'}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Image: <b>{imageStatusLabel}</b>
              </Typography>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            No
          </Button>
          <Button onClick={handleConfirmSubmit} disabled={locked} variant="contained" sx={{ ...gradientBtnSx, px: 2.4 }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
