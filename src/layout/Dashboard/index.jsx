import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

// project-imports
import Drawer from './Drawer';
import Header from './Header';
import Footer from './Footer';
import Breadcrumbs from 'components/@extended/Breadcrumbs';
import Loader from 'components/Loader';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { DRAWER_WIDTH } from 'config';

// ==============================|| MAIN LAYOUT ||============================== //

export default function MainLayout() {
  const { menuMasterLoading } = useGetMenuMaster();
  const downXL = useMediaQuery((theme) => theme.breakpoints.down('xl'));

  // set media wise responsive drawer
  useEffect(() => {
    handlerDrawerOpen(!downXL);
  }, [downXL]);

  if (menuMasterLoading) return <Loader />;

  return (
    <Box sx={{ display: 'flex', width: '100%', fontFamily: (theme) => theme.typography.fontFamily }}>
      <Header />
      <Drawer />

      <Box
        component="main"
        sx={{
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          minWidth: 0,
          flexGrow: 1,
          p: { xs: 1, sm: 1.5, md: 2 },
          // Keep the admin layout flat and consistent without affecting the public Index page.
          '& .MuiPaper-root': { borderRadius: '10px' },
          '& .MuiCard-root': { borderRadius: '10px' },
          '& .MuiButton-root, & .MuiOutlinedInput-root, & .MuiToggleButton-root': { borderRadius: '6px' },
          '& .MuiTableContainer-root, & .MuiAccordion-root': { borderRadius: '8px' }
        }}
      >
        <Toolbar sx={{ mt: 'inherit', mb: 'inherit' }} />
        <Box
          sx={{
            px: 0,
            position: 'relative',
            minHeight: 'calc(100vh - 124px)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Breadcrumbs />
          <Outlet />
          <Footer />
        </Box>
      </Box>
    </Box>
  );
}
