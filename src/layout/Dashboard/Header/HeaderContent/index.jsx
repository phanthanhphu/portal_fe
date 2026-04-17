// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';

// project-imports
import MobileSection from './MobileSection';
import Profile from './Profile';
import Search from './Search';

// ==============================|| HEADER - CONTENT ||============================== //

export default function HeaderContent() {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  return (
    <Box
      sx={{
        width: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0
      }}
    >
      {/* Search: bên trái */}
      {!downLG && (
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 520, minWidth: 280 }}>
            <Search />
          </Box>
        </Box>
      )}

      {/* Spacer: đẩy avatar về phải */}
      {!downLG && <Box sx={{ flex: 1 }} />}

      {/* Avatar: góc phải (chỗ số 1) */}
      {!downLG && (
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          <Profile />
        </Box>
      )}

      {/* Mobile */}
      {downLG && <Box sx={{ flex: 1 }} />}
      {downLG && <MobileSection />}
    </Box>
  );
}
