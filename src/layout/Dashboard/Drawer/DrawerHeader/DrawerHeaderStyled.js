import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';

const DrawerHeaderStyled = styled(Box, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  ...theme.mixins.toolbar,
  minHeight: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: open ? 'flex-start' : 'center',

  paddingLeft: open ? theme.spacing(2) : theme.spacing(0),
  paddingRight: theme.spacing(2),

  borderBottom: `1px solid ${alpha('#fff', 0.08)}`
}));

export default DrawerHeaderStyled;
