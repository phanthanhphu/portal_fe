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

export default function EditDocumentTypeDialog({
  open,
  onCancel,
  onOk,
  currentItem = null,
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
      return;
    }

    setName(currentItem?.name || '');
    setSaving(false);
    setConfirmOpen(false);
  }, [open, currentItem]);

  const locked = saving || disabled;

  const validate = () => {
    if (!currentItem?.id) return 'Invalid Document Type item';
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
      const payload = {
        id: currentItem.id,
        name: name.trim(),
        departments: Array.isArray(currentItem.departments) ? currentItem.departments : [],
        createdAt: currentItem.createdAt,
        updatedAt: currentItem.updatedAt,
      };

      await axios.put(
        `${TYPE_API}/${currentItem.id}`,
        payload,
        { headers: getAuthHeaders() }
      );

      toast('Document Type updated successfully');
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Update Document Type failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const departments = Array.isArray(currentItem?.departments) ? currentItem.departments : [];

  const paperSx = useMemo(() => ({
    borderRadius: fullScreen ? 0 : 4,
    overflow: 'hidden',
    boxShadow: `0 22px 70px ${alpha('#000', 0.25)}`,
    background: alpha('#FFFFFF', 0.95),
    backdropFilter: 'blur(14px)',
  }), [fullScreen]);

  const headerSx = useMemo(() => ({
    py: 2,
    px: 2.5,
    color: 'white',
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  }), [theme]);

  const fieldSx = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
    },
  }), []);

  const gradientBtnSx = useMemo(() => ({
    borderRadius: 999,
    px: 2.2,
    py: 1.1,
    fontWeight: 800,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  }), [theme]);

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
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography fontWeight={900}>
                Edit Document Type
              </Typography>
              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Update document type information
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<CheckCircleRoundedIcon />}
                label="Editing"
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
                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                background: alpha(theme.palette.primary.main, 0.04),
              }}
            >
              <Typography fontSize={13} fontWeight={700} sx={{ mb: 1 }}>
                Linked Departments
              </Typography>

              {departments.length > 0 ? (
                <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                  {departments.map((d) => (
                    <Chip
                      key={d.idDepartment || d.id || d.name}
                      label={d.name || d.departmentName || d.idDepartment || '-'}
                      size="small"
                      sx={{ borderRadius: 999 }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography fontSize={12} color="text.secondary">
                  No departments linked to this type.
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.warning.main, 0.12),
              }}
            >
              <Stack direction="row" spacing={1}>
                <InfoRoundedIcon fontSize="small" color="warning" />
                <Typography fontSize={12}>
                  This dialog only updates the type name and keeps the current departments unchanged.
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
            {saving ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Update</DialogTitle>

        <DialogContent>
          <Typography>
            Update document type <b>{name}</b> ?
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
