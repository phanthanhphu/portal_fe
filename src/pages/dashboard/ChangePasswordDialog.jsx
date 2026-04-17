import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  IconButton,
  Tooltip,
  Box,
  Divider,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import { API_BASE_URL } from '../../config';

export default function ChangePasswordDialog({ open, onClose, onUpdate, user }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [saving, setSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const [confirmOpen, setConfirmOpen] = useState(false);

  const toast = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Initialize form with user email only
  useEffect(() => {
    if (user && open) {
      setFormData({
        email: user.email || '',
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    }
  }, [user, open]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    if (!formData.email?.trim()) return 'Email is required.';
    if (!formData.oldPassword) return 'Old password is required.';
    if (!formData.newPassword) return 'New password is required.';
    if (formData.newPassword.length < 6) return 'New password must be at least 6 characters.';
    if (formData.newPassword !== formData.confirmNewPassword)
      return 'New password and confirmation do not match.';
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) return toast(err, 'error');
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);

    const token = localStorage.getItem('token');
    if (!token) return toast('Authentication token is missing.', 'error');

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          confirmNewPassword: formData.confirmNewPassword,
        }),
      });

      if (!res.ok) {
        let message = `Password change failed (status ${res.status}).`;
        try {
          const errorData = await res.json();
          message = errorData.message || message;
        } catch {}
        throw new Error(message);
      }

      const data = await res.json();
      toast(data.message || 'Password changed successfully.', 'success');

      // Logout (best-effort)
      try {
        await fetch(`${API_BASE_URL}/users/logout`, {
          method: 'DELETE',
          headers: { accept: '*/*', Authorization: `Bearer ${token}` },
        });
      } catch {}

      // Clear and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setFormData({
        email: user?.email || '',
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });

      onUpdate?.(data);
      onClose?.();

      setTimeout(() => {
        window.location.href = '/react/login';
      }, 900);
    } catch (err) {
      toast(err.message || 'An error occurred while changing the password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelConfirm = () => setConfirmOpen(false);

  // ====== Styles (same modern system) ======
  const paperSx = {
    borderRadius: fullScreen ? 0 : 4,
    overflow: 'hidden',
    boxShadow: `0 22px 70px ${alpha('#000', 0.25)}`,
    border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
    background:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.background.paper, 0.72)
        : alpha('#FFFFFF', 0.9),
    backdropFilter: 'blur(14px)',
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
      backgroundColor: alpha(theme.palette.common.white, 0.65),
      '& fieldset': { borderColor: alpha(theme.palette.divider, 0.7) },
      '&:hover fieldset': { borderColor: alpha(theme.palette.primary.main, 0.5) },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: 2 },
    },
  };

  const gradientBtnSx = {
    borderRadius: 999,
    px: 2.4,
    py: 1.1,
    fontWeight: 900,
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
  };

  const subtleCardSx = {
    borderRadius: 4,
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    background: alpha(theme.palette.common.white, 0.6),
    backdropFilter: 'blur(10px)',
    boxShadow: `0 10px 30px ${alpha('#000', 0.08)}`,
  };

  const strength = useMemo(() => {
    const p = formData.newPassword || '';
    if (!p) return { label: '—', tone: 'default' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', tone: 'error' };
    if (score === 2) return { label: 'Medium', tone: 'warning' };
    return { label: 'Strong', tone: 'success' };
  }, [formData.newPassword]);

  return (
    <>
      <Dialog
        open={open}
        onClose={saving ? undefined : onClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            position: 'relative',
            py: 2,
            px: 2.5,
            color: 'common.white',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }}
        >
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
                Change Password
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.4, fontSize: 13 }}>
                This will sign you out after updating
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                icon={<SecurityRoundedIcon sx={{ color: 'white !important' }} />}
                label={`Strength: ${strength.label}`}
                color={strength.tone}
                sx={{
                  color: 'common.white',
                  bgcolor: alpha('#000', 0.18),
                  border: `1px solid ${alpha('#fff', 0.22)}`,
                  fontWeight: 900,
                }}
              />
              <Tooltip title="Close">
                <span>
                  <IconButton
                    onClick={onClose}
                    disabled={saving}
                    aria-label="Close"
                    sx={{
                      color: 'common.white',
                      bgcolor: alpha('#000', 0.18),
                      border: `1px solid ${alpha('#fff', 0.22)}`,
                      '&:hover': { bgcolor: alpha('#000', 0.28), transform: 'translateY(-1px)' },
                      transition: 'transform .15s ease',
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ ...subtleCardSx, p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                  Credentials
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                  Enter your current password and set a new one
                </Typography>
              </Box>

              <Divider />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.6,
                }}
              >
                <TextField
                  label="Email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  fullWidth
                  size="small"
                  required
                  type="email"
                  disabled={saving}
                  sx={fieldSx}
                />

                <TextField
                  label="Old Password"
                  value={formData.oldPassword}
                  onChange={handleChange('oldPassword')}
                  fullWidth
                  size="small"
                  required
                  type="password"
                  disabled={saving}
                  sx={fieldSx}
                />

                <TextField
                  label="New Password"
                  value={formData.newPassword}
                  onChange={handleChange('newPassword')}
                  fullWidth
                  size="small"
                  required
                  type="password"
                  disabled={saving}
                  sx={fieldSx}
                />

                <TextField
                  label="Confirm New Password"
                  value={formData.confirmNewPassword}
                  onChange={handleChange('confirmNewPassword')}
                  fullWidth
                  size="small"
                  required
                  type="password"
                  disabled={saving}
                  sx={fieldSx}
                />
              </Box>

              <Box
                sx={{
                  p: 1.4,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.warning.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`,
                }}
              >
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                  <b>Security note:</b> After changing your password, you will be logged out and redirected to the login page.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 2.5 }, py: 2, gap: 1 }}>
          <Button
            onClick={onClose}
            disabled={saving}
            variant="outlined"
            sx={{
              borderRadius: 999,
              px: 2.4,
              py: 1.1,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            variant="contained"
            startIcon={!saving ? <LockResetRoundedIcon /> : null}
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Update'}
          </Button>
        </DialogActions>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3500}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Dialog>

      {/* Confirm dialog (same style) */}
      <Dialog
        open={confirmOpen}
        onClose={handleCancelConfirm}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            ...paperSx,
            borderRadius: 4,
          },
        }}
      >
        <DialogTitle
          sx={{
            py: 1.8,
            px: 2.2,
            color: 'common.white',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
              Confirm Change
            </Typography>

            <Tooltip title="Close">
              <span>
                <IconButton
                  onClick={handleCancelConfirm}
                  disabled={saving}
                  sx={{
                    color: 'common.white',
                    bgcolor: alpha('#000', 0.18),
                    border: `1px solid ${alpha('#fff', 0.22)}`,
                  }}
                  aria-label="Close"
                >
                  <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2.2 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13.5 }}>
            Are you sure you want to change the password for <b>{formData.email || 'this account'}</b>?
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
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              You will be logged out immediately after the password is updated.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2.2, py: 2, gap: 1 }}>
          <Button
            onClick={handleCancelConfirm}
            disabled={saving}
            variant="outlined"
            sx={{
              borderRadius: 999,
              px: 2.2,
              py: 1.05,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            No
          </Button>

          <Button
            onClick={handleConfirmSubmit}
            disabled={saving}
            variant="contained"
            sx={{
              ...gradientBtnSx,
              px: 2.2,
              py: 1.05,
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
