import PropTypes from 'prop-types';
import { matchPath, Link } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import Dot from 'components/@extended/Dot';
import IconButton from 'components/@extended/IconButton';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

export default function NavItem({ item, level, isParents = false, setSelectedID, pathname }) {
  const theme = useTheme();
  const downLG = useMediaQuery((t) => t.breakpoints.down('lg'));
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  // ✅ local sizing
  const ITEM_HEIGHT = 44;
  const ICON_BOX = 40;
  const OPEN_ICON_SIZE = 18;
  const CLOSED_ICON_SIZE = 20;

  // ✅ accent theo theme (xanh/primary) — không vàng
  const ACCENT = theme.palette.primary.main;
  const TEXT = alpha('#fff', 0.90);
  const TEXT_MUTED = alpha('#fff', 0.68);

  let itemTarget = '_self';
  if (item.target) itemTarget = '_blank';

  const Icon = item.icon;
  const itemIcon = item.icon ? <Icon variant="Bulk" size={drawerOpen ? OPEN_ICON_SIZE : CLOSED_ICON_SIZE} /> : false;

  const isSelected =
    item.id === 'grouprequest'
      ? ['/group-requests', '/summary/', '/requisition-monthly/', '/comparison/', '/request-monthly-comparison/'].some((r) =>
          pathname.startsWith(r)
        )
      : !!matchPath({ path: item?.link ? item.link : item.url, end: false }, pathname);

  const itemHandler = () => {
    if (downLG) handlerDrawerOpen(false);
    if (isParents && setSelectedID) setSelectedID();
  };

  const compactPl = () => {
    if (!drawerOpen) return 1;
    if (level <= 1) return 2;
    if (level === 2) return 3;
    return 3.5;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <ListItemButton
        component={Link}
        to={item.url}
        target={itemTarget}
        disabled={item.disabled}
        selected={isSelected}
        onClick={itemHandler}
        sx={{
          position: 'relative',
          zIndex: 1201,
          minHeight: ITEM_HEIGHT,
          pl: compactPl(),
          pr: drawerOpen ? 1.25 : 1,
          py: 0.6,

          ...(drawerOpen && level === 1 && { mx: 1, my: 0.45, borderRadius: 2 }),
          ...(!drawerOpen && { mx: 0.75, my: 0.55, borderRadius: 2, justifyContent: 'center' }),

          transition: 'background-color .18s ease, box-shadow .18s ease',

          '&:hover': {
            bgcolor: alpha('#fff', 0.08),
            boxShadow: `0 10px 24px ${alpha('#000', 0.22)}`
          },

          // ✅ selected: viền trái + glow nhẹ, nền mờ xanh
          '&.Mui-selected': {
            bgcolor: alpha(ACCENT, 0.14),
            boxShadow: `inset 3px 0 0 ${ACCENT}, 0 10px 24px ${alpha('#000', 0.18)}`,
            '&:hover': { bgcolor: alpha(ACCENT, 0.18) }
          }
        }}
      >
        {itemIcon && (
          <ListItemIcon
            sx={{
              minWidth: drawerOpen ? 34 : 0,
              color: isSelected ? ACCENT : TEXT_MUTED,

              // drawer đóng: icon pill
              ...(!drawerOpen &&
                level === 1 && {
                  borderRadius: 2,
                  width: ICON_BOX,
                  height: ICON_BOX,
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha('#fff', 0.06),
                  boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.06)}`
                }),

              // drawer đóng + selected: pill xanh mờ
              ...(!drawerOpen &&
                isSelected && {
                  bgcolor: alpha(ACCENT, 0.18)
                })
            }}
          >
            {itemIcon}
          </ListItemIcon>
        )}

        {!itemIcon && drawerOpen && (
          <ListItemIcon sx={{ minWidth: 22 }}>
            <Dot size={isSelected ? 6 : 5} color={isSelected ? 'primary' : 'secondary'} />
          </ListItemIcon>
        )}

        {(drawerOpen || (!drawerOpen && level !== 1)) && (
          <ListItemText
            primaryTypographyProps={{ noWrap: true }}
            primary={
              <Typography
                sx={{
                  color: isSelected ? TEXT : TEXT_MUTED,
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.875rem',
                  lineHeight: 1.1,
                  letterSpacing: 0.2
                }}
              >
                {item.title}
              </Typography>
            }
          />
        )}

        {(drawerOpen || (!drawerOpen && level !== 1)) && item.chip && (
          <Chip
            color={item.chip.color}
            variant={item.chip.variant}
            size={item.chip.size}
            label={item.chip.label}
            avatar={item.chip.avatar && <Avatar>{item.chip.avatar}</Avatar>}
            sx={{
              ml: 1,
              bgcolor: alpha('#fff', 0.08),
              color: TEXT,
              border: `1px solid ${alpha('#fff', 0.10)}`
            }}
          />
        )}
      </ListItemButton>

      {(drawerOpen || (!drawerOpen && level !== 1)) &&
        item?.actions?.map((action, index) => {
          const ActionIcon = action?.icon;
          const callAction = action?.function;

          return (
            <IconButton
              key={index}
              {...(action.type === 'function' && {
                onClick: (event) => {
                  event.stopPropagation();
                  callAction();
                }
              })}
              {...(action.type === 'link' && {
                component: Link,
                to: action.url,
                target: action.target ? '_blank' : '_self'
              })}
              color="secondary"
              variant="outlined"
              sx={{
                position: 'absolute',
                top: 10,
                right: 8,
                zIndex: 1202,
                width: 18,
                height: 18,
                p: 0.25,
                borderColor: alpha('#fff', 0.22),
                bgcolor: alpha('#000', 0.10),
                '&:hover': {
                  borderColor: alpha(ACCENT, 0.95),
                  bgcolor: alpha(ACCENT, 0.12)
                }
              }}
            >
              <ActionIcon size={11} style={{ marginLeft: 1, color: TEXT }} />
            </IconButton>
          );
        })}
    </Box>
  );
}

NavItem.propTypes = {
  item: PropTypes.any,
  level: PropTypes.number,
  isParents: PropTypes.bool,
  setSelectedID: PropTypes.any,
  pathname: PropTypes.string
};
