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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const TYPE_API = `${API_BASE_URL}/api/document-types`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
};

export default function AddDocumentTypeDialog({
  open,
  onCancel,
  onOk,
  disabled = false,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [name, setName] = useState('');
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
      setName('');
      setSaving(false);
      setConfirmOpen(false);
    }
  }, [open]);

  const locked = saving || disabled;

  const validate = () => {
    if (!name.trim()) return 'Type name is required';
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
        TYPE_API,
        { name: name.trim() },
        { headers: getAuthHeaders() }
      );

      toast('Document Type created successfully');
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Create Document Type failed', 'error');
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
                Add Document Type
              </Typography>

              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Create a new document type
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<CheckCircleRoundedIcon />}
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
        <br></br>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              label="Type Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
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
                  New type will be created with empty departments. You can assign departments later from the edit flow/API.
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
            disabled={locked || !name.trim()}
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
            Create document type <b>{name}</b> ?
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
