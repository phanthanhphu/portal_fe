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
  FormControlLabel,
  Switch,
  Avatar,
  Chip,
  Divider,
  Tooltip,
  MenuItem,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import { API_BASE_URL } from '../../config';

const ROLE_PRESET = ['ADMIN', 'MANAGER', 'STAFF', 'SUPPLIER', 'USER'];

const ProfileEditDialog = ({ open, onClose, onUpdate, user }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    address: '',
    phone: '',
    role: '',
    isEnabled: true,
  });

  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [keptImageUrl, setKeptImageUrl] = useState('');
  const [removedImageUrl, setRemovedImageUrl] = useState('');

  const [saving, setSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const [confirmOpen, setConfirmOpen] = useState(false);

  const roleOptions = useMemo(() => {
    const set = new Set(ROLE_PRESET);
    if (formData.role) set.add(formData.role);
    return Array.from(set);
  }, [formData.role]);

  const toast = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const resolveImageUrl = (raw) => {
    if (!raw) return '';
    const ts = `t=${Date.now()}`;

    // Full URL
    if (raw.startsWith('http')) return `${raw}${raw.includes('?') ? '&' : '?'}${ts}`;

    // Path URL
    const cleaned = raw.startsWith('/') ? raw : `/${raw}`;
    return `${API_BASE_URL}${cleaned}?${ts}`;
  };

  const toServerPath = (urlWithQuery) => {
    if (!urlWithQuery) return '';
    const noQuery = urlWithQuery.split('?')[0];
    // Strip API_BASE_URL -> keep server path
    return noQuery
      .replace(`${API_BASE_URL}/`, '/')
      .replace(API_BASE_URL, '');
  };

  const getInitials = (nameOrEmail) => {
    const s = (nameOrEmail || '').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/);
    const a = parts[0]?.[0] || '';
    const b = parts[1]?.[0] || '';
    return (a + b).toUpperCase() || s[0].toUpperCase();
  };

  // Initialize form when dialog opens
  useEffect(() => {
    if (user && open) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        address: user.address || '',
        phone: user.phone || '',
        role: user.role || '',
        isEnabled: user.isEnabled !== undefined ? user.isEnabled : true,
      });

      setNewImage(null);
      setNewImagePreview(null);
      setRemovedImageUrl('');

      if (user.profileImageUrl) {
        const imageUrl = resolveImageUrl(user.profileImageUrl);
        setKeptImageUrl(imageUrl);
        setNewImagePreview(imageUrl);
      } else {
        setKeptImageUrl('');
        setNewImagePreview(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, open]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (newImagePreview && newImage) URL.revokeObjectURL(newImagePreview);
    };
  }, [newImagePreview, newImage]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
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

    // Cleanup old preview (blob)
    if (newImagePreview && newImage) URL.revokeObjectURL(newImagePreview);

    // If an existing server image is being kept, mark it for removal
    if (keptImageUrl) {
      setRemovedImageUrl(toServerPath(keptImageUrl));
      setKeptImageUrl('');
    }

    setNewImage(file);
    setNewImagePreview(URL.createObjectURL(file));
    e.target.value = null;
  };

  const handleRemoveImage = () => {
    if (saving) return;

    // Remove newly picked image
    if (newImagePreview && newImage) {
      URL.revokeObjectURL(newImagePreview);
      setNewImage(null);
      setNewImagePreview(null);
      return;
    }

    // Remove current server image
    if (keptImageUrl) {
      setRemovedImageUrl(toServerPath(keptImageUrl));
      setKeptImageUrl('');
      setNewImagePreview(null);
    }
  };

  const handleSubmit = () => {
    if (!formData.username?.trim()) return toast('Username is required.', 'error');
    if (!formData.email?.trim()) return toast('Email is required.', 'error');
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setSaving(true);

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      // Keep boolean, skip empty strings
      if (value !== undefined && value !== '') formDataToSend.append(key, value);
    });

    if (newImage) formDataToSend.append('profileImage', newImage);
    if (removedImageUrl) formDataToSend.append('imageToDelete', removedImageUrl);

    try {
      const res = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: { accept: '*/*' },
        body: formDataToSend,
      });

      if (!res.ok) {
        const errorText = await res.text();
        let message = `Update failed with status ${res.status}`;
        try {
          const errorData = JSON.parse(errorText);
          message = errorData.message || message;
        } catch {
          message = errorText || message;
        }
        throw new Error(message);
      }

      const text = await res.text();
      let data = null;
      let message = 'User updated successfully';

      try {
        data = JSON.parse(text);
        message = data?.message || message;
      } catch {
        // Non-JSON response
      }

      toast(message, 'success');

      setNewImage(null);
      setNewImagePreview(null);

      const nextKept = data?.profileImageUrl ? resolveImageUrl(data.profileImageUrl) : '';
      setKeptImageUrl(nextKept);
      setRemovedImageUrl('');

      onUpdate(data || { message });
      onClose();
    } catch (err) {
      console.error('Update user error:', err);
      toast(err.message || 'An error occurred while updating the user.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  // Styling tokens
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
  };

  const subtleCardSx = {
    borderRadius: 4,
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    background: alpha(theme.palette.common.white, 0.6),
    backdropFilter: 'blur(10px)',
    boxShadow: `0 10px 30px ${alpha('#000', 0.08)}`,
  };

  const previewSrc = newImagePreview || '';

  const imageActionLabel = newImage
    ? 'New upload'
    : removedImageUrl
      ? 'Remove current'
      : 'Keep current';

  return (
    <>
      <Dialog
        open={open}
        onClose={saving ? undefined : onClose}
        fullScreen={fullScreen}
        maxWidth="md"
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
                Edit User
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.4, fontSize: 13 }}>
                Update profile details, status, and avatar
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                icon={formData.isEnabled ? <CheckCircleRoundedIcon /> : <BlockRoundedIcon />}
                label={formData.isEnabled ? 'Enabled' : 'Disabled'}
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
                    onClick={onClose}
                    disabled={saving}
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
          <Stack spacing={2.2}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
                gap: 2.2,
                alignItems: 'start',
              }}
            >
              {/* Left: Avatar / Upload */}
              <Box sx={{ ...subtleCardSx, p: 2 }}>
                <Stack spacing={1.6} alignItems="center">
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={previewSrc || undefined}
                      alt="Profile"
                      sx={{
                        width: 120,
                        height: 120,
                        fontSize: 36,
                        fontWeight: 800,
                        border: `3px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                        boxShadow: `0 14px 40px ${alpha('#000', 0.16)}`,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: theme.palette.primary.main,
                      }}
                    >
                      {getInitials(formData.username || formData.email)}
                    </Avatar>

                    <Tooltip title="Choose a new image">
                      <span>
                        <IconButton
                          component="label"
                          disabled={saving}
                          sx={{
                            position: 'absolute',
                            right: -6,
                            bottom: -6,
                            width: 44,
                            height: 44,
                            borderRadius: 999,
                            bgcolor: 'common.white',
                            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                            boxShadow: `0 10px 24px ${alpha('#000', 0.12)}`,
                            '&:hover': { transform: 'translateY(-1px)' },
                            transition: 'transform .15s ease',
                          }}
                        >
                          <PhotoCamera sx={{ color: theme.palette.primary.main }} />
                          <input hidden type="file" accept="image/*" onChange={handleFileChange} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      {formData.username || 'Unknown User'}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      {formData.email || '—'}
                    </Typography>
                  </Box>

                  <Divider flexItem />

                  <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled={saving}
                      component="label"
                      sx={{
                        borderRadius: 999,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        py: 1,
                      }}
                      startIcon={<PhotoCamera />}
                    >
                      Upload
                      <input hidden type="file" accept="image/*" onChange={handleFileChange} />
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      disabled={saving || (!newImage && !keptImageUrl)}
                      sx={{
                        borderRadius: 999,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        py: 1,
                      }}
                      startIcon={<DeleteOutlineIcon />}
                      onClick={handleRemoveImage}
                    >
                      Remove
                    </Button>
                  </Stack>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 0.5 }}>
                    JPG/PNG • max 5MB
                  </Typography>

                  {!newImagePreview && !keptImageUrl && (
                    <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: 12 }}>
                      No avatar uploaded
                    </Typography>
                  )}

                  {newImage && (
                    <Chip
                      size="small"
                      label={newImage.name}
                      sx={{
                        maxWidth: '100%',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Stack>
              </Box>

              {/* Right: Form */}
              <Box sx={{ ...subtleCardSx, p: 2 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                      Account
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                      Login essentials and permissions
                    </Typography>
                  </Box>

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
                      required
                      disabled={saving}
                      size="small"
                      fullWidth
                      sx={fieldSx}
                    />
                    <TextField
                      label="Email"
                      value={formData.email}
                      onChange={handleChange('email')}
                      required
                      disabled={saving}
                      size="small"
                      fullWidth
                      sx={fieldSx}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        sx={{ m: 0 }}
                        control={
                          <Switch
                            checked={formData.isEnabled}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, isEnabled: e.target.checked }))
                            }
                            disabled={saving}
                          />
                        }
                        label={
                          <Stack spacing={0.2}>
                            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                              {formData.isEnabled ? 'Enabled' : 'Disabled'}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                              Disabling a user blocks login
                            </Typography>
                          </Stack>
                        }
                      />
                    </Box>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                      Contact
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                      Public profile and contact info
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 1.8,
                    }}
                  >
                    <TextField
                      label="Phone"
                      value={formData.phone}
                      onChange={handleChange('phone')}
                      disabled={saving}
                      size="small"
                      fullWidth
                      sx={fieldSx}
                    />
                    <TextField
                      label="Address"
                      value={formData.address}
                      onChange={handleChange('address')}
                      disabled={saving}
                      size="small"
                      fullWidth
                      sx={fieldSx}
                    />
                  </Box>

                  <Box
                    sx={{
                      mt: 0.5,
                      p: 1.4,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.warning.main, 0.08),
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      <b>Note:</b> Uploading a new image automatically marks the old image for deletion
                      via <code style={{ marginLeft: 6 }}>imageToDelete</code>, matching your existing logic.
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 2.5 }, py: 2, gap: 1 }}>
          <Button
            onClick={onClose}
            disabled={saving}
            variant="outlined"
            sx={{
              borderRadius: 999,
              px: 2.2,
              py: 1.1,
              fontWeight: 800,
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
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Update'}
          </Button>
        </DialogActions>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm Update</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13.5 }}>
            Are you sure you want to update <b>{formData.username || 'Unknown'}</b>?
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
                • Status: <b>{formData.isEnabled ? 'Enabled' : 'Disabled'}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                • Image: <b>{imageActionLabel}</b>
              </Typography>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={saving}
            variant="outlined"
            sx={{
              borderRadius: 999,
              px: 2.2,
              py: 1.1,
              fontWeight: 800,
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
              borderRadius: 999,
              px: 2.2,
              py: 1.1,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProfileEditDialog;
