import PropTypes from 'prop-types';
import { useMemo } from 'react';

// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

// project-imports
import DrawerHeader from './DrawerHeader';
import DrawerContent from './DrawerContent';
import MiniDrawerStyled from './MiniDrawerStyled';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

export default function MainDrawer({ window }) {
  const theme = useTheme();
  const downLG = useMediaQuery((t) => t.breakpoints.down('lg'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const MOBILE_DRAWER_WIDTH = 270;

  const container = window !== undefined ? () => window().document.body : undefined;

  const drawerContent = useMemo(() => <DrawerContent />, []);
  const drawerHeader = useMemo(() => <DrawerHeader open={drawerOpen} />, [drawerOpen]);

  const paperBase = {
    borderRight: `1px solid ${alpha('#fff', 0.10)}`,
    backgroundImage: 'none',
    overflow: 'hidden',

    // ✅ glass + depth
    background: `linear-gradient(180deg, ${alpha('#0b1220', 0.86)} 0%, ${alpha('#0b1220', 0.62)} 100%)`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',

    // ✅ subtle inner
    boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.06)}`
  };

  return (
    <Box component="nav" aria-label="mailbox folders" sx={{ flexShrink: { md: 0 }, zIndex: 1200 }}>
      {!downLG ? (
        <MiniDrawerStyled
          variant="permanent"
          open={drawerOpen}
          sx={{
            '& .MuiDrawer-paper': {
              ...paperBase
            }
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box
              sx={{
                px: 1.25,
                pt: 1.25,
                pb: 1,
                borderBottom: `1px solid ${alpha('#fff', 0.08)}`
              }}
            >
              {drawerHeader}
            </Box>

            {/* Content */}
            <Box
              sx={{
                flex: 1,
                px: 0.75,
                py: 0.75,
                overflow: 'hidden'
              }}
            >
              {drawerContent}
            </Box>

            {/* Footer glow (nhẹ thôi, nhìn “xịn”) */}
            <Box
              sx={{
                height: 10,
                background: `radial-gradient(60% 90% at 50% 0%, ${alpha(theme.palette.primary.main, 0.22)} 0%, transparent 70%)`,
                opacity: 0.9
              }}
            />
          </Box>
        </MiniDrawerStyled>
      ) : (
        <Drawer
          container={container}
          variant="temporary"
          open={drawerOpen}
          onClose={() => handlerDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: drawerOpen ? 'block' : 'none', lg: 'none' },
            '& .MuiDrawer-paper': {
              ...paperBase,
              width: MOBILE_DRAWER_WIDTH,
              boxShadow: `0 28px 80px ${alpha('#000', 0.55)}`,
              borderTopRightRadius: 18,
              borderBottomRightRadius: 18
            }
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 1.25, pt: 1.25, pb: 1, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
              {drawerHeader}
            </Box>
            <Box sx={{ flex: 1, px: 0.75, py: 0.75, overflow: 'hidden' }}>{drawerContent}</Box>
          </Box>
        </Drawer>
      )}
    </Box>
  );
}

MainDrawer.propTypes = { window: PropTypes.func };
