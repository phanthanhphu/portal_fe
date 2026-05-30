import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Box,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  Chip,
  Divider,
  Tooltip,
  Switch,
  useMediaQuery,
} from '@mui/material';

import { alpha, useTheme } from '@mui/material/styles';

import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

import { API_BASE_URL } from '../../config';

const APPROVE_PERMISSION_OPTIONS = [
  { value: 'NONE', label: 'No approve permission' },
  { value: 'NOTICE', label: 'Approve Notice' },
  { value: 'DOCUMENT', label: 'Approve Document' },
  { value: 'BOTH', label: 'Approve Notice & Document' },
];

const normalizeApprovePermission = (value) => {
  const normalized = String(value || 'NONE').trim().toUpperCase();
  return APPROVE_PERMISSION_OPTIONS.some((item) => item.value === normalized) ? normalized : 'NONE';
};

const getApprovePermissionLabel = (value) => {
  const normalized = normalizeApprovePermission(value);
  return APPROVE_PERMISSION_OPTIONS.find((item) => item.value === normalized)?.label || 'No approve permission';
};

const initialForm = {
  username: '',
  email: '',
  password: '',
  address: '',
  phone: '',
  role: 'User',
  approvePermission: 'NONE',
  isEnabled: true,
  departmentId: '',
};

const AddUserDialog = ({ open, onClose, onAdd }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState(initialForm);

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const [emailError, setEmailError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const locked = saving;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const toast = (msg, severity = 'success') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleClose = () => {
    if (locked) return;
    onClose?.();
  };

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
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!open) return;

    setAttemptedSubmit(false);
    setConfirmOpen(false);
    setSnackbarOpen(false);
    setSnackbarMessage('');
    setSnackbarSeverity('success');

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

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'email') {
      if (value && !emailRegex.test(value)) setEmailError('Invalid email format');
      else setEmailError('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return toast('No file selected.', 'warning');

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (e.g., .jpg, .png).', 'error');
      e.target.value = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('Image file size must be under 5MB.', 'error');
      e.target.value = null;
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setProfileImage(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = null;
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setProfileImage(null);
    setImagePreview(null);
  };

  const validate = () => {
    if (!formData.username?.trim()) return 'Username is required.';
    if (!formData.email?.trim()) return 'Email is required.';
    if (!formData.password?.trim()) return 'Password is required.';
    if (formData.email && !emailRegex.test(formData.email)) return 'Invalid email format.';
    if (!formData.departmentId?.trim()) return 'Department is required.';
    return '';
  };

  const handleSubmit = () => {
    setAttemptedSubmit(true);
    const err = validate();
    if (err) return toast(err, 'error');
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);

    const formDataToSend = new FormData();
    const payload = {
      ...formData,
      approvePermission: normalizeApprovePermission(formData.approvePermission),
    };

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== '') formDataToSend.append(key, value);
    });

    if (profileImage) formDataToSend.append('profileImage', profileImage);

    console.log('FormData entries:');
    for (let pair of formDataToSend.entries()) {
      console.log(`${pair[0]}: ${pair[1] instanceof File ? pair[1].name : pair[1]}`);
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/add`, {
        method: 'POST',
        headers: { accept: '*/*' },
        body: formDataToSend,
      });

      if (!res.ok) {
        const errorText = await res.text();
        let message = `Add user failed with status ${res.status}`;
        try {
          const errorData = JSON.parse(errorText);
          message = errorData.message || message;
        } catch {
          message = errorText || message;
        }
        throw new Error(message);
      }

      const text = await res.text();
      let message = 'User added successfully';

      try {
        const data = JSON.parse(text);
        message = data.message || message;
        onAdd?.(data);
      } catch {
        console.warn('Response is not JSON:', text);
        onAdd?.({ message });
      }

      toast(message, 'success');

      setFormData(initialForm);
      setEmailError('');
      setAttemptedSubmit(false);
      handleRemoveImage();

      onClose?.();
    } catch (err) {
      console.error('Add user error:', err);
      toast(err?.message || 'Add user failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const titleName = formData.username?.trim() || 'Unknown';

  const showUsernameError = attemptedSubmit && !formData.username?.trim();
  const showEmailError = (attemptedSubmit && !formData.email?.trim()) || !!emailError;
  const showPasswordError = attemptedSubmit && !formData.password?.trim();
  const showDepartmentError = attemptedSubmit && !formData.departmentId?.trim();

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
                Add New User
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.4, fontSize: 13 }}>
                Create a user with role, department and profile image
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                icon={<CheckCircleRoundedIcon />}
                label="Creating"
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
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                Details
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                Fill required fields. Keep role naming consistent.
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
                  label="Username"
                  value={formData.username}
                  onChange={handleChange('username')}
                  fullWidth
                  size="small"
                  required
                  disabled={locked}
                  sx={fieldSx}
                  error={showUsernameError}
                  helperText={showUsernameError ? 'Username is required' : ' '}
                  placeholder="e.g., bao.chau"
                />

                <TextField
                  label="Email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  fullWidth
                  size="small"
                  required
                  disabled={locked}
                  sx={fieldSx}
                  error={showEmailError}
                  helperText={emailError || (attemptedSubmit && !formData.email?.trim() ? 'Email is required' : ' ')}
                  placeholder="e.g., user@mail.com"
                />

                <TextField
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  fullWidth
                  size="small"
                  required
                  disabled={locked}
                  sx={fieldSx}
                  error={showPasswordError}
                  helperText={showPasswordError ? 'Password is required' : ' '}
                  placeholder="••••••••"
                />

                <FormControl fullWidth size="small" disabled={locked} sx={fieldSx}>
                  <InputLabel sx={{ fontWeight: 700 }}>Role</InputLabel>
                  <Select value={formData.role} label="Role" onChange={handleChange('role')}>
                    <MenuItem value="User">User</MenuItem>
                    <MenuItem value="Leader">Leader</MenuItem>
                    <MenuItem value="Admin">Admin</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small" disabled={locked} sx={fieldSx}>
                  <InputLabel sx={{ fontWeight: 700 }}>Approve Permission</InputLabel>
                  <Select
                    value={normalizeApprovePermission(formData.approvePermission)}
                    label="Approve Permission"
                    onChange={handleChange('approvePermission')}
                  >
                    {APPROVE_PERMISSION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Controls whether this user can approve notices, documents, both, or none.
                  </FormHelperText>
                </FormControl>

                <FormControl
                  fullWidth
                  size="small"
                  disabled={locked || loadingDepartments}
                  sx={fieldSx}
                  error={showDepartmentError}
                >
                  <InputLabel sx={{ fontWeight: 700 }}>Department</InputLabel>
                  <Select
                    value={formData.departmentId}
                    label="Department"
                    onChange={handleChange('departmentId')}
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
                  </Select>
                  <FormHelperText>
                    {showDepartmentError
                      ? 'Department is required'
                      : loadingDepartments
                      ? 'Loading departments...'
                      : ' '}
                  </FormHelperText>
                </FormControl>

                <TextField
                  label="Address"
                  value={formData.address}
                  onChange={handleChange('address')}
                  fullWidth
                  size="small"
                  disabled={locked}
                  sx={fieldSx}
                  placeholder="Optional"
                />

                <TextField
                  label="Phone"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  fullWidth
                  size="small"
                  disabled={locked}
                  sx={fieldSx}
                  placeholder="Optional"
                />
              </Box>

              <Box
                sx={{
                  mt: 1.6,
                  p: 1.3,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InfoRoundedIcon sx={{ fontSize: 18, color: alpha(theme.palette.primary.main, 0.8) }} />
                    <Box>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        <b>Status:</b> {formData.isEnabled ? 'Enabled' : 'Disabled'}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        <b>Department:</b> {selectedDepartmentLabel}
                      </Typography>
                    </Box>
                  </Stack>
                  <Switch
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                    disabled={locked}
                  />
                </Stack>
              </Box>
            </Box>

            <Box sx={{ ...subtleCardSx, p: 2 }}>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                Profile Image
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                Optional. JPG/PNG under 5MB.
              </Typography>

              <Divider sx={{ my: 1.6 }} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoCamera />}
                  disabled={locked}
                  sx={outlineBtnSx}
                >
                  Select Image
                  <input hidden type="file" accept="image/*" onChange={handleFileChange} />
                </Button>

                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                  {profileImage ? (
                    <>
                      <b>1 image selected:</b> {profileImage.name}
                    </>
                  ) : (
                    'No image selected'
                  )}
                </Typography>
              </Stack>

              {imagePreview && (
                <Box
                  sx={{
                    mt: 1.6,
                    position: 'relative',
                    display: 'inline-block',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    background: alpha('#fff', 0.55),
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Profile Preview"
                    style={{ display: 'block', maxHeight: 160, width: 'auto' }}
                    onError={(e) => {
                      console.error(`Failed to load image: ${imagePreview}`);
                      toast('Failed to load image preview.', 'error');
                      e.currentTarget.style.display = 'none';
                    }}
                  />

                  <Tooltip title="Remove">
                    <span>
                      <IconButton
                        onClick={handleRemoveImage}
                        disabled={locked}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: alpha('#000', 0.18),
                          border: `1px solid ${alpha('#fff', 0.22)}`,
                          color: 'common.white',
                          '&:hover': { bgcolor: alpha('#000', 0.28) },
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 2.5 }, py: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={locked} variant="contained" sx={gradientBtnSx}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Add'}
          </Button>
        </DialogActions>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
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
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm Add</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13.5 }}>
            Are you sure you want to add user <b>{titleName}</b>?
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
                • Image: <b>{profileImage ? profileImage.name : 'None'}</b>
              </Typography>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            No
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            disabled={locked}
            variant="contained"
            sx={{ ...gradientBtnSx, px: 2.4 }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddUserDialog;
