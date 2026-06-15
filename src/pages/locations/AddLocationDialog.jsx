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
} from '@mui/material';

import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const LOCATION_API = `${API_BASE_URL}/api/locations`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
};


const decodeJwtPayload = (token) => {
  if (!token || !String(token).includes('.')) return null;

  try {
    const base64Url = String(token).split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isMongoObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || '').trim());

const parseStoredJson = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};


const getCreatedByEmail = (fallbackValue = '') => {
  const storageKeys = ['user', 'currentUser', 'authUser', 'loginUser'];
  const candidates = [];

  storageKeys.forEach((key) => {
    const parsed = parseStoredJson(localStorage.getItem(key));
    const user = parsed?.user || parsed?.data || parsed;

    if (user) {
      candidates.push(
        user.email,
        user.mail,
        user.emailAddress
      );
    }
  });

  const tokenPayload = decodeJwtPayload(localStorage.getItem('token'));

  candidates.push(
    localStorage.getItem('email'),
    localStorage.getItem('mail'),
    localStorage.getItem('emailAddress'),
    tokenPayload?.email,
    tokenPayload?.mail,
    tokenPayload?.emailAddress,
    tokenPayload?.preferred_username,
    tokenPayload?.sub,
    fallbackValue
  );

  const email = candidates
    .map((item) => String(item || '').trim())
    .find((item) => item && item.includes('@') && !isMongoObjectId(item));

  return email || 'SYSTEM';
};

export default function AddLocationDialog({
  open,
  onCancel,
  onOk,
  disabled = false,
  userIdCreate = '',
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [locationName, setLocationName] = useState('');
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

  useEffect(() => {
    if (!open) {
      setLocationName('');
      setSaving(false);
      setConfirmOpen(false);
    }
  }, [open]);

  const locked = saving || disabled;
  const createdByEmail = useMemo(() => getCreatedByEmail(userIdCreate), [userIdCreate]);

  const validate = () => {
    if (!locationName.trim()) return 'Location is required';

    if (!String(createdByEmail || '').trim()) {
      return 'Created By email is required. Please login again.';
    }

    return null;
  };

  const handleClose = () => {
    if (!locked) onCancel?.();
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
      await axios.post(
        LOCATION_API,
        {
          location: locationName.trim(),
          userIdCreate: createdByEmail,
        },
        { headers: getAuthHeaders() }
      );

      toast('Location created successfully');
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Create location failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const paperSx = useMemo(() => ({
    borderRadius: fullScreen ? 0 : 4,
    boxShadow: `0 20px 60px ${alpha('#000', 0.25)}`,
  }), [fullScreen]);

  const headerSx = useMemo(() => ({
    pt: 3,
    pb: 2,
    px: 3,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  }), [theme]);

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
    },
  };

  const gradientBtnSx = {
    borderRadius: 999,
    px: 3,
    py: 1,
    fontWeight: 700,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
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
          <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Add Location
              </Typography>

              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Create a new location master data
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<LocationOnRoundedIcon />}
                label="Adding"
                size="small"
                sx={{ bgcolor: alpha('#fff', 0.2), color: 'white' }}
              />

              <Tooltip title="Close">
                <IconButton onClick={handleClose} sx={{ color: 'white' }} disabled={locked}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>
        <br />

        <DialogContent sx={{ p: 3, mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              label="Location"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              required
              autoFocus
              sx={fieldSx}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !locked) handleSubmit();
              }}
            />

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.primary.main, 0.08),
              }}
            >
              <Stack direction="row" spacing={1}>
                <InfoRoundedIcon fontSize="small" />
                <Typography fontSize={12}>
                  Location stores ID, location name, creator email, created date and updated date. If it is used by room bookings, backend will prevent deletion.
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
            disabled={locked || !locationName.trim()}
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Create</DialogTitle>

        <DialogContent>
          <Typography>
            Create location <b>{locationName}</b> ?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>No</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbarSeverity} sx={{ width: '100%' }} onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
