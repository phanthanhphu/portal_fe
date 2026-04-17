import React, { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Slide
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';

import { API_BASE_URL } from '../../config';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const glassPaperSx = (theme) => ({
  borderRadius: 4,
  overflow: 'hidden',
  border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
  background: `linear-gradient(145deg, ${alpha('#ffffff', 0.86)}, ${alpha('#ffffff', 0.72)})`,
  backdropFilter: 'blur(16px) saturate(160%)',
  boxShadow: `0 30px 90px ${alpha('#000', 0.20)}`
});

const fieldSx = (theme) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 3,
    background: alpha(theme.palette.common.white, 0.75),
    transition: 'all .18s ease',
    '&:hover': { background: alpha(theme.palette.common.white, 0.86) },
    '&.Mui-focused': {
      boxShadow: `0 10px 28px ${alpha(theme.palette.primary.main, 0.16)}`
    }
  },
  '& .MuiInputLabel-root': { fontWeight: 700 }
});

export default function ResetPasswordDialog({ open, onClose, onUpdate, user }) {
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmNewPassword: ''
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

  useEffect(() => {
    if (user && open) {
      setFormData({
        email: user.email || '',
        newPassword: '',
        confirmNewPassword: ''
      });
    }
  }, [user, open]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    if (!formData.email?.trim()) return toast('Email is required.', 'error'), false;
    if (!formData.newPassword) return toast('New password is required.', 'error'), false;
    if (formData.newPassword.length < 6) return toast('Password must be at least 6 characters.', 'error'), false;
    if (formData.newPassword !== formData.confirmNewPassword)
      return toast('New password and confirmation do not match.', 'error'), false;
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/users/reset-password`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          newPassword: formData.newPassword,
          confirmNewPassword: formData.confirmNewPassword
        })
      });

      if (!res.ok) {
        // try json, fallback text
        let message = `Password reset failed (${res.status})`;
        try {
          const errorData = await res.json();
          message = errorData?.message || message;
        } catch {
          const t = await res.text();
          message = t || message;
        }
        throw new Error(message);
      }

      const data = await res.json();
      toast(data?.message || 'Password reset successfully', 'success');

      setFormData({
        email: user?.email || '',
        newPassword: '',
        confirmNewPassword: ''
      });

      onUpdate?.(data);
      onClose?.();
    } catch (err) {
      toast(err.message || 'Reset failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={saving ? undefined : onClose}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Transition}
        PaperProps={{ sx: glassPaperSx }}
        BackdropProps={{
          sx: (theme) => ({
            backgroundColor: alpha(theme.palette.grey[900], 0.62),
            backdropFilter: 'blur(10px)'
          })
        }}
      >
        {/* Header */}
        <Box
          sx={(theme) => ({
            px: 2.5,
            py: 2,
            background: `linear-gradient(110deg,
              ${alpha(theme.palette.primary.main, 0.92)},
              ${alpha(theme.palette.secondary.main, 0.78)}
            )`
          })}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  background: alpha('#fff', 0.16),
                  border: `1px solid ${alpha('#fff', 0.22)}`
                }}
              >
                <LockResetRoundedIcon sx={{ color: '#fff' }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: 'common.white',
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase'
                  }}
                >
                  Reset Password
                </Typography>
                <Typography sx={{ color: alpha('#fff', 0.82), fontSize: 13, mt: 0.2 }}>
                  Change password for this account
                </Typography>
              </Box>
            </Stack>

            <IconButton
              onClick={onClose}
              disabled={saving}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                color: 'common.white',
                background: alpha('#fff', 0.14),
                border: `1px solid ${alpha('#fff', 0.22)}`,
                '&:hover': { background: alpha('#fff', 0.22) }
              }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              value={formData.email}
              onChange={handleChange('email')}
              fullWidth
              required
              type="email"
              disabled={saving}
              sx={fieldSx}
            />
            <TextField
              label="New Password"
              value={formData.newPassword}
              onChange={handleChange('newPassword')}
              fullWidth
              required
              type="password"
              disabled={saving}
              sx={fieldSx}
              helperText="Minimum 6 characters"
            />
            <TextField
              label="Confirm New Password"
              value={formData.confirmNewPassword}
              onChange={handleChange('confirmNewPassword')}
              fullWidth
              required
              type="password"
              disabled={saving}
              sx={fieldSx}
            />

            <Divider sx={{ opacity: 0.6 }} />

            {/* Actions */}
            <Stack direction="row" spacing={1.2} justifyContent="flex-end">
              <Button
                onClick={onClose}
                disabled={saving}
                variant="outlined"
                sx={(theme) => ({
                  borderRadius: 3,
                  fontWeight: 850,
                  borderColor: alpha(theme.palette.text.primary, 0.18),
                  background: alpha('#fff', 0.35),
                  '&:hover': { background: alpha('#fff', 0.6) }
                })}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={saving}
                variant="contained"
                sx={(theme) => ({
                  borderRadius: 999,
                  px: 3,
                  fontWeight: 950,
                  textTransform: 'none',
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: `0 18px 45px ${alpha(theme.palette.primary.main, 0.22)}`,
                  '&:hover': { transform: 'translateY(-1px)' }
                })}
              >
                {saving ? <CircularProgress size={20} color="inherit" /> : 'Reset'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3200}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 800 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Confirm (simple + same glass) */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: glassPaperSx }}>
        <Box sx={{ p: 2.2 }}>
          <Typography sx={{ fontWeight: 950, mb: 0.7 }}>Confirm reset</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            Are you sure you want to reset the password for <b>{formData.email || 'this user'}</b>?
          </Typography>

          <Stack direction="row" spacing={1.2} justifyContent="flex-end" sx={{ mt: 2.2 }}>
            <Button
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
              variant="outlined"
              sx={(theme) => ({
                borderRadius: 3,
                fontWeight: 850,
                borderColor: alpha(theme.palette.text.primary, 0.18),
                background: alpha('#fff', 0.35)
              })}
            >
              No
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={saving}
              variant="contained"
              sx={(theme) => ({
                borderRadius: 999,
                fontWeight: 950,
                textTransform: 'none',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
              })}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Yes'}
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </>
  );
}
