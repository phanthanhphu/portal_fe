import { useMemo } from 'react';

// material-ui
import { alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

// project-imports
import AppBarStyled from './AppBarStyled';
import HeaderContent from './HeaderContent';
import IconButton from 'components/@extended/IconButton';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from 'config';

// assets
import { HamburgerMenu } from 'iconsax-reactjs';

export default function Header() {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const headerContent = useMemo(() => <HeaderContent />, []);

  const mainHeader = (
    <Toolbar
      sx={{
        minHeight: 64,
        px: { xs: 1.25, sm: 2, md: 2.5, lg: 3 },
        gap: 1,
        width: '100%',
        alignItems: 'center'
      }}
    >
      <IconButton
        aria-label="open drawer"
        onClick={() => handlerDrawerOpen(!drawerOpen)}
        edge="start"
        color="secondary"
        variant="light"
        size="large"
        sx={(theme) => ({
          width: 40,
          height: 40,
          p: 0,
          borderRadius: 2,
          color: theme.palette.primary.main,
          bgcolor: alpha(theme.palette.primary.main, drawerOpen ? 0.10 : 0.14),
          border: `1px solid ${alpha('#fff', 0.10)}`,
          boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.06)}`,
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.18),
            transform: 'translateY(-1px)'
          }
        })}
      >
        <HamburgerMenu size={20} />
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
        {headerContent}
      </Box>
    </Toolbar>
  );

  // ✅ appBar luôn offset theo drawer để KHÔNG đè lên menu mini
  const offset = drawerOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH;

  const appBarBaseSx = (theme) => ({
    bgcolor: alpha(theme.palette.background.default, 0.85),
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${alpha('#000', 0.06)}`,
    zIndex: theme.zIndex.drawer + 1,

    // ✅ quan trọng: đẩy header qua phải đúng bằng chiều rộng drawer
    marginLeft: offset,
    width: `calc(100% - ${offset}px)`
  });

  // ✅ Dùng AppBarStyled cho desktop, AppBar cho mobile nhưng vẫn giữ offset (vì drawer bạn không overlay)
  return (
    <>
      {!downLG ? (
        <AppBarStyled
          open={drawerOpen}
          position="fixed"
          elevation={0}
          sx={(theme) => appBarBaseSx(theme)}
        >
          {mainHeader}
        </AppBarStyled>
      ) : (
        <AppBar
          position="fixed"
          elevation={0}
          sx={(theme) => ({
            ...appBarBaseSx(theme)
          })}
        >
          {mainHeader}
        </AppBar>
      )}
    </>
  );
}
