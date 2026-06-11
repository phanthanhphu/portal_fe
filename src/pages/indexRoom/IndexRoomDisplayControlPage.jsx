import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Save, Refresh } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const DISPLAY_CONFIG_API = `${API_BASE_URL}/api/index-room-display-config`;

const DEFAULT_CONFIG = {
  eyebrowText: 'Room Reservation Display',
  welcomeText: 'Welcome to',
  titleText: 'Broadpeak Soc Trang',
  statusText: 'Reserved',
};

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

const normalizeConfig = (value = {}) => ({
  eyebrowText: value.eyebrowText || DEFAULT_CONFIG.eyebrowText,
  welcomeText: value.welcomeText || DEFAULT_CONFIG.welcomeText,
  titleText: value.titleText || DEFAULT_CONFIG.titleText,
  statusText: value.statusText || DEFAULT_CONFIG.statusText,
});

export default function IndexRoomDisplayControlPage() {
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const titlePreview = useMemo(() => String(form.titleText || '').trim() || DEFAULT_CONFIG.titleText, [form.titleText]);

  const toast = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);

    try {
      const response = await axios.get(DISPLAY_CONFIG_API, {
        headers: getAuthHeaders('application/json'),
      });

      setForm(normalizeConfig(response?.data || {}));
    } catch (error) {
      console.error(error);
      setForm(DEFAULT_CONFIG);
      toast(error?.response?.data?.message || 'Failed to load display config.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload = {
        eyebrowText: form.eyebrowText?.trim() || DEFAULT_CONFIG.eyebrowText,
        welcomeText: form.welcomeText?.trim() || DEFAULT_CONFIG.welcomeText,
        titleText: form.titleText?.trim() || DEFAULT_CONFIG.titleText,
        statusText: form.statusText?.trim() || DEFAULT_CONFIG.statusText,
      };

      const response = await axios.put(DISPLAY_CONFIG_API, payload, {
        headers: {
          ...getAuthHeaders('application/json'),
          'Content-Type': 'application/json',
        },
      });

      setForm(normalizeConfig(response?.data || payload));
      toast('Display information updated successfully.', 'success');
    } catch (error) {
      console.error(error);
      toast(error?.response?.data?.message || 'Update display information failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving;

  return (
    <Box sx={{ bgcolor: '#f7f7f7', minHeight: '100vh', p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography variant="h6" fontWeight={900}>
              Room Reservation Display Control
            </Typography>
            <Typography fontSize={13} color="text.secondary">
              Edit only the header information shown on the room reservation display.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
              onClick={fetchConfig}
              disabled={disabled}
              sx={{ textTransform: 'none' }}
            >
              Refresh
            </Button>

            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={disabled}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
          }}
        >
          <Typography fontWeight={900} sx={{ mb: 0.5 }}>
            Edit Information
          </Typography>
          <Typography fontSize={13} color="text.secondary" sx={{ mb: 2 }}>
            This page has no add/delete list. It only edits one display configuration.
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Small Label"
              value={form.eyebrowText}
              onChange={(e) => updateField('eyebrowText', e.target.value)}
              disabled={disabled}
              fullWidth
              size="small"
              helperText="Example: Room Reservation Display"
            />

            <TextField
              label="Welcome Text"
              value={form.welcomeText}
              onChange={(e) => updateField('welcomeText', e.target.value)}
              disabled={disabled}
              fullWidth
              size="small"
              helperText="Example: Welcome to"
            />

            <TextField
              label="Main Title"
              value={form.titleText}
              onChange={(e) => updateField('titleText', e.target.value)}
              disabled={disabled}
              fullWidth
              size="small"
              helperText="Example: Broadpeak Soc Trang"
            />

            <TextField
              label="Status Text"
              value={form.statusText}
              onChange={(e) => updateField('statusText', e.target.value)}
              disabled={disabled}
              fullWidth
              size="small"
              helperText="Example: Reserved"
            />
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            flex: 1.2,
            p: 2,
            borderRadius: 2,
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
          }}
        >
          <Typography fontWeight={900} sx={{ mb: 0.5 }}>
            Preview
          </Typography>
          <Typography fontSize={13} color="text.secondary" sx={{ mb: 2 }}>
            Approximate preview of the display header.
          </Typography>

          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 2,
              p: 2,
              minHeight: 180,
              border: '1px solid #164e63',
              background: 'linear-gradient(135deg, #0f3a5d, #183f42)',
              color: '#fff',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 82% 20%, rgba(255, 214, 70, 0.18), transparent 28%)',
              }}
            />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    px: 1.4,
                    py: 0.35,
                    mb: 0.8,
                    borderRadius: 999,
                    bgcolor: '#facc15',
                    color: '#111827',
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  {form.eyebrowText || DEFAULT_CONFIG.eyebrowText}
                </Box>

                <Typography
                  sx={{
                    fontSize: 18,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    opacity: 0.9,
                    fontWeight: 500,
                    lineHeight: 1.1,
                  }}
                >
                  {form.welcomeText || DEFAULT_CONFIG.welcomeText}
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: 34, md: 42 },
                    lineHeight: 1.05,
                    fontWeight: 1000,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {titlePreview}
                </Typography>
              </Box>

              <Box
                sx={{
                  minWidth: 180,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: '#facc15',
                  color: '#111827',
                  border: '1px solid rgba(255,255,255,0.65)',
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    bgcolor: '#22c55e',
                    mr: 0.8,
                    boxShadow: '0 0 8px rgba(34,197,94,0.85)',
                  }}
                />
                {form.statusText || DEFAULT_CONFIG.statusText}
              </Box>
            </Stack>

            <Divider sx={{ position: 'relative', zIndex: 1, mt: 2, borderColor: '#facc15', borderBottomWidth: 2 }} />
          </Box>
        </Paper>
      </Stack>

      <Snackbar
        open={notification.open}
        autoHideDuration={4500}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={notification.severity}
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
