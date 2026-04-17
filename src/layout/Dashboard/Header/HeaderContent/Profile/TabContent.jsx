import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';

import { Snackbar, Alert, Tooltip, Portal } from '@mui/material';

import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

import { useUser } from './useUser';
import { User, Edit2, Lock, Logout } from 'iconsax-react';

import ProfileEditDialog from '../../../../../pages/dashboard/ProfileEditDialog';
import ChangePasswordDialog from '../../../../../pages/dashboard/ChangePasswordDialog';
import ViewUserDialog from '../../../../../pages/dashboard/ViewUserDialog';
import { API_BASE_URL } from '../../../../../config';

export default function TabContent({ onRequestClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const imageCacheRef = useRef(new Map());
  const [imageErrors, setImageErrors] = useState({});

  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openChangePassDialog, setOpenChangePassDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const {
    username,
    email,
    address,
    phone,
    role,
    profileImage,
    userId,
    createdAt,
    error,
    success,
    firstLetter,
    fetchUser,
    handleUpdateUser,
    handleUpdatePassword
  } = useUser();

  useEffect(() => {
    if (error || success) setSnackbarOpen(true);
  }, [error, success]);

  const normalizeImageUrl = useCallback((url) => {
    if (!url) return null;

    const cacheKey = `url_${url}`;
    if (imageCacheRef.current.has(cacheKey)) return imageCacheRef.current.get(cacheKey);

    let normalized = url.replace(/\\/g, '/').split('?')[0];
    let finalUrl;

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      finalUrl = normalized.replace(/^https?:\/\/[^\/]+/, '');
    } else if (normalized.startsWith('/uploads/users/') || normalized.startsWith('/Uploads/users/')) {
      finalUrl = normalized;
    } else {
      const cleanPath = normalized.replace(/^\/?uploads\/users\//i, '');
      finalUrl = `/Uploads/users/${cleanPath}`;
    }

    imageCacheRef.current.set(cacheKey, finalUrl);
    return finalUrl;
  }, []);

  const processedUser = useMemo(() => {
    const imageUrl = normalizeImageUrl(profileImage);
    const finalImageUrl = imageUrl || `/Uploads/users/default-user.png`;
    return { id: userId, username, displayImageUrl: finalImageUrl };
  }, [profileImage, userId, username, normalizeImageUrl]);

  const handleImageError = useCallback(
    (id) => {
      if (!id || imageErrors[id]) return;
      setImageErrors((prev) => ({ ...prev, [id]: true }));
    },
    [imageErrors]
  );

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/users/logout`, {
        method: 'DELETE',
        headers: { accept: '*/*', ...(token && { Authorization: `Bearer ${token}` }) }
      });

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');

      setSnackbarOpen(true);
      if (onRequestClose) onRequestClose();

    setTimeout(() => {
      window.location.href = window.location.origin + '/react/login/dashboard';
    }, 900);


    } catch (err) {
      setSnackbarOpen(true);
      if (onRequestClose) onRequestClose();
    }
  };

  const CARD_AVATAR = isMobile ? 44 : 52;

  const cardSx = {
    width: isMobile ? 280 : 320,
    borderRadius: 4,
    overflow: 'hidden',
    border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.96)
      : '#FFFFFF',
    backdropFilter: 'blur(14px)',
    boxShadow: `0 22px 70px ${alpha('#000', 0.22)}`,

    // ✅ KEY FIX: tách khỏi table scroll/overflow bằng fixed + Portal
    position: 'fixed',
    top: 76,
    right: 18,

    // ✅ luôn đè lên sticky header/footer của table
    zIndex: (theme) => theme.zIndex.modal + 4000
  };

  const headerSx = {
    px: 1.6,
    pt: 1.6,
    pb: 1.2,
    textAlign: 'center',
    color: 'common.white',
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  };

  const pillChipSx = {
    mt: 0.8,
    height: 24,
    borderRadius: 999,
    fontWeight: 900,
    letterSpacing: 0.6,
    border: `1px solid ${alpha('#fff', 0.24)}`,
    bgcolor: alpha('#000', 0.16),
    color: 'common.white',
    '& .MuiChip-label': { px: 1.1 }
  };

  const menuItemSx = (tone = 'primary') => ({
    borderRadius: 2.2,
    py: 0.9,
    px: 1.1,
    transition: 'transform .15s ease, background-color .15s ease',
    '&:hover': {
      transform: 'translateY(-1px)',
      backgroundColor: alpha(theme.palette[tone].main, 0.08)
    }
  });

  const tooltipSx = {
    '& .MuiTooltip-tooltip': {
      background: alpha('#FFFFFF', 0.92),
      color: theme.palette.text.primary,
      borderRadius: 12,
      border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
      boxShadow: `0 16px 40px ${alpha('#000', 0.14)}`,
      backdropFilter: 'blur(10px)',
      padding: '10px 12px'
    },
    '& .MuiTooltip-arrow': { color: alpha('#FFFFFF', 0.92) }
  };

  const cardAvatarNode = (() => {
    const { id, displayImageUrl } = processedUser;
    const hasError = id && imageErrors[id];
    const src = `${API_BASE_URL}${displayImageUrl}?t=${Date.now()}`;

    return !hasError ? (
      <Avatar
        src={src}
        alt={username || 'User'}
        sx={{
          width: CARD_AVATAR,
          height: CARD_AVATAR,
          border: `2px solid ${alpha(theme.palette.common.white, 0.55)}`,
          boxShadow: `0 14px 34px ${alpha('#000', 0.18)}`,
          bgcolor: alpha(theme.palette.common.white, 0.15)
        }}
        imgProps={{ loading: 'lazy' }}
        onError={() => handleImageError(id)}
      />
    ) : (
      <Avatar
        sx={{
          width: CARD_AVATAR,
          height: CARD_AVATAR,
          fontWeight: 900,
          color: theme.palette.primary.main,
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          border: `2px solid ${alpha(theme.palette.common.white, 0.55)}`,
          boxShadow: `0 14px 34px ${alpha('#000', 0.18)}`
        }}
      >
        {(firstLetter || 'U').toUpperCase()}
      </Avatar>
    );
  })();

  const handleView = () => {
    if (onRequestClose) onRequestClose();
    setOpenViewDialog(true);
    setOpenEditDialog(false);
    setOpenChangePassDialog(false);
    if (userId) fetchUser(userId);
  };

  const handleEdit = () => {
    if (onRequestClose) onRequestClose();
    setOpenViewDialog(false);
    setOpenEditDialog(true);
    setOpenChangePassDialog(false);
  };

  const handleChangePassword = () => {
    if (onRequestClose) onRequestClose();
    setOpenViewDialog(false);
    setOpenEditDialog(false);
    setOpenChangePassDialog(true);
  };

  const cardNode = (
    <Box sx={cardSx}>
      <Box sx={headerSx}>
        <Stack spacing={1} alignItems="center">
          <Tooltip
            arrow
            placement="bottom"
            sx={tooltipSx}
            title={
              <Box sx={{ minWidth: 220 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.7 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 13.5, letterSpacing: 0.4 }}>
                    USER SUMMARY
                  </Typography>

                  <Chip
                    size="small"
                    icon={<VerifiedRoundedIcon sx={{ fontSize: 16 }} />}
                    label={(role || 'USER').toUpperCase()}
                    sx={{
                      height: 22,
                      borderRadius: 999,
                      fontWeight: 900,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`
                    }}
                  />
                </Stack>

                <Divider sx={{ my: 0.8 }} />

                <Stack spacing={0.6}>
                  <Typography sx={{ fontWeight: 900, fontSize: 13 }}>
                    {username || 'User'}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12.5 }}>
                    {email || '—'}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12.5 }}>
                    ID: {userId || '—'}
                  </Typography>
                </Stack>
              </Box>
            }
          >
            <Box sx={{ display: 'inline-flex', borderRadius: '50%' }}>
              {cardAvatarNode}
            </Box>
          </Tooltip>

          <Typography
            sx={{
              mt: 0.3,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              fontSize: isMobile ? 14.5 : 15.5
            }}
          >
            {username || 'User'}
          </Typography>

          <Chip label={(role || 'USER').toUpperCase()} size="small" sx={pillChipSx} />
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 1, bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff' }}>
        <MenuItem onClick={handleView} sx={menuItemSx('primary')}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <User size={18} color={theme.palette.primary.main} />
          </ListItemIcon>
          <ListItemText primary="View" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 800 }} />
        </MenuItem>

        <MenuItem onClick={handleEdit} sx={menuItemSx('primary')}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Edit2 size={18} color={theme.palette.primary.main} />
          </ListItemIcon>
          <ListItemText primary="Edit" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 800 }} />
        </MenuItem>

        <MenuItem onClick={handleChangePassword} sx={menuItemSx('info')}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Lock size={18} color={theme.palette.info.main} />
          </ListItemIcon>
          <ListItemText primary="Change Password" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 800 }} />
        </MenuItem>

        <Divider sx={{ my: 0.8 }} />

        <MenuItem onClick={handleLogout} sx={menuItemSx('error')}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Logout size={18} color={theme.palette.error.main} />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 800 }} />
        </MenuItem>
      </Box>
    </Box>
  );

  return (
    <>
      {/* ✅ KEY: render card to body to escape table overflow/sticky layers */}
      <Portal>{cardNode}</Portal>

      {/* dialogs */}
      <ViewUserDialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        user={{ username, email, address, phone, role, profileImageUrl: profileImage, createdAt }}
      />

      <ProfileEditDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        onUpdate={handleUpdateUser}
        user={{ id: userId, username, email, address, phone, role, profileImageUrl: profileImage }}
      />

      <ChangePasswordDialog
        open={openChangePassDialog}
        onClose={() => setOpenChangePassDialog(false)}
        onUpdate={handleUpdatePassword}
        user={{ email }}
      />

      {/* Snackbar */}
      <Portal>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{
            zIndex: (theme) => theme.zIndex.modal + 5000,
            pointerEvents: 'auto'
          }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={error ? 'error' : 'success'}
            sx={{
              width: '100%',
              fontSize: '0.9rem',
              py: 1,
              boxShadow: `0 18px 50px ${alpha('#000', 0.25)}`
            }}
          >
            {error || success || 'Done'}
          </Alert>
        </Snackbar>
      </Portal>
    </>
  );
}
