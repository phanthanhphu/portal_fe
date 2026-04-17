import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Stack,
  Avatar,
  Box,
  IconButton,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from 'iconsax-react';
import { API_BASE_URL } from '../../config.js';
import CloseIcon from '@mui/icons-material/Close';

export default function ViewUserDialog({ open, onClose, user }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const fallbackAvatar = useMemo(
    () => `${API_BASE_URL}/Uploads/users/default-user.png`,
    []
  );

  const resolveImageUrl = (raw) => {
    if (!raw) return fallbackAvatar;

    // already full URL
    if (raw.startsWith('http')) return `${raw}${raw.includes('?') ? '&' : '?'}t=${Date.now()}`;

    // server path
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${API_BASE_URL}${path}?t=${Date.now()}`;
  };

  const avatarSrc = resolveImageUrl(user?.profileImageUrl);

  const roleMeta = useMemo(() => {
    const r = (user?.role || '').toLowerCase();
    if (r.includes('admin')) return { label: user?.role || 'ADMIN', tone: 'error' };
    if (r.includes('manager') || r.includes('mod')) return { label: user?.role || 'MANAGER', tone: 'warning' };
    if (r.includes('staff')) return { label: user?.role || 'STAFF', tone: 'info' };
    return { label: user?.role || 'USER', tone: 'success' };
  }, [user?.role]);

  const statusMeta = useMemo(() => {
    const enabled = user?.isEnabled !== undefined ? !!user.isEnabled : true;
    return enabled
      ? { label: 'Enabled', tone: 'success' }
      : { label: 'Disabled', tone: 'default' };
  }, [user?.isEnabled]);

  const active = !!user?.isActive;

  // Glass / gradient styles (aligned with your Edit dialog vibe)
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

  const subtleCardSx = {
    borderRadius: 4,
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    background: alpha(theme.palette.common.white, 0.6),
    backdropFilter: 'blur(10px)',
    boxShadow: `0 10px 30px ${alpha('#000', 0.08)}`,
  };

  const InfoRow = ({ icon, label, value }) => (
    <Stack direction="row" spacing={1.2} alignItems="flex-start">
      <Box sx={{ color: 'primary.main', mt: 0.2 }}>
        <Icon name={icon} size={18} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            mt: 0.2,
          }}
        >
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
              User Profile
            </Typography>
            <Typography sx={{ opacity: 0.9, mt: 0.4, fontSize: 13 }}>
              Overview details and status
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={roleMeta.label}
              color={roleMeta.tone}
              variant="filled"
              sx={{
                fontWeight: 900,
                bgcolor: alpha('#000', 0.18),
                border: `1px solid ${alpha('#fff', 0.22)}`,
                color: 'common.white',
              }}
            />
            <Chip
              size="small"
              label={statusMeta.label}
              color={statusMeta.tone}
              variant="filled"
              sx={{
                fontWeight: 900,
                bgcolor: alpha('#000', 0.18),
                border: `1px solid ${alpha('#fff', 0.22)}`,
                color: 'common.white',
              }}
            />

            <Tooltip title="Close">
              <span>
                <IconButton
                  onClick={onClose}
                  sx={{
                    color: 'common.white',
                    bgcolor: alpha('#000', 0.18),
                    border: `1px solid ${alpha('#fff', 0.22)}`,
                    '&:hover': { bgcolor: alpha('#000', 0.28), transform: 'translateY(-1px)' },
                    transition: 'transform .15s ease',
                  }}
                  aria-label="Close"
                >
                  <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </span>
            </Tooltip>

          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '260px 1fr' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {/* Left card: Avatar */}
          <Box sx={{ ...subtleCardSx, p: 2 }}>
            <Stack spacing={1.6} alignItems="center">
              <Box
                sx={{
                  position: 'relative',
                  '@keyframes pulse': {
                    '0%': { boxShadow: `0 0 0 0 ${alpha('#00C853', 0.45)}` },
                    '70%': { boxShadow: `0 0 0 10px ${alpha('#00C853', 0)}` },
                    '100%': { boxShadow: `0 0 0 0 ${alpha('#00C853', 0)}` },
                  },
                }}
              >
                <Avatar
                  src={avatarSrc}
                  alt={user?.username || 'User'}
                  sx={{
                    width: 112,
                    height: 112,
                    fontSize: 34,
                    fontWeight: 900,
                    border: `3px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                    boxShadow: `0 14px 40px ${alpha('#000', 0.16)}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                  }}
                  onError={(e) => {
                    e.currentTarget.src = fallbackAvatar;
                  }}
                />

                {/* Active dot */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 6,
                    right: 6,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: active ? '#00C853' : alpha(theme.palette.text.secondary, 0.4),
                    border: `3px solid ${alpha('#fff', 0.9)}`,
                    boxShadow: active ? `0 0 10px ${alpha('#00C853', 0.6)}` : 'none',
                    animation: active ? 'pulse 2s infinite' : 'none',
                  }}
                />
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                  {user?.username || '—'}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.2 }}>
                  {user?.email || '—'}
                </Typography>
              </Box>

              <Divider flexItem />

              <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                <Chip
                  size="small"
                  label={active ? 'Active' : 'Offline'}
                  sx={{
                    fontWeight: 800,
                    bgcolor: alpha(active ? '#00C853' : theme.palette.text.secondary, 0.12),
                    border: `1px solid ${alpha(active ? '#00C853' : theme.palette.text.secondary, 0.22)}`,
                  }}
                />
                <Chip
                  size="small"
                  label={roleMeta.label}
                  sx={{
                    fontWeight: 800,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                  }}
                />
              </Stack>

              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                Avatar updates in the Edit dialog
              </Typography>
            </Stack>
          </Box>

          {/* Right card: Details */}
          <Box sx={{ ...subtleCardSx, p: 2 }}>
            <Stack spacing={1.6}>
              <Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                  Details
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>
                  Basic profile information
                </Typography>
              </Box>

              <Divider />

              <Stack spacing={1.3}>
                <InfoRow icon="Mail" label="Email" value={user?.email} />
                <InfoRow icon="Call" label="Phone" value={user?.phone} />
                <InfoRow icon="Location" label="Address" value={user?.address} />
                <InfoRow icon="UserTag" label="Role" value={user?.role} />
                <InfoRow
                  icon="ShieldTick"
                  label="Account Status"
                  value={statusMeta.label}
                />
              </Stack>
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
