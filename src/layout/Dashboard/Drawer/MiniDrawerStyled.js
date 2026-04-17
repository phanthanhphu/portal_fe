// material-ui
import { styled, alpha } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';

// ==============================|| MINI DRAWER - STYLED ||============================== //

// ✅ hardcode width tại đây (không dùng config)
const DRAWER_OPEN_WIDTH = 220;   // menu mở
const DRAWER_CLOSED_WIDTH = 72;  // menu thu nhỏ (chỉ icon)

const openedMixin = (theme) => ({
  width: DRAWER_OPEN_WIDTH,
  overflowX: 'hidden',
  borderRight: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
  backgroundImage: 'none',
  boxShadow: 'none',
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen
  })
});

const closedMixin = (theme) => ({
  width: DRAWER_CLOSED_WIDTH,
  overflowX: 'hidden',
  borderRight: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
  backgroundImage: 'none',
  boxShadow: theme.customShadows?.z1 || '0 12px 40px rgba(0,0,0,0.10)',
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  })
});

const MiniDrawerStyled = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',

  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme)
  }),

  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme)
  })
}));

export default MiniDrawerStyled;
