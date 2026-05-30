import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { matchPath } from 'react-router-dom';

import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { alpha, useTheme } from '@mui/material/styles';

import NavItem from './NavItem';
import { useGetMenuMaster } from 'api/menu';

const isItemSelected = (menuItem, pathname) => {
  if (!menuItem) return false;

  if (menuItem.url) {
    return !!matchPath(
      {
        path: menuItem?.link ? menuItem.link : menuItem.url,
        end: Boolean(menuItem.exact)
      },
      pathname
    );
  }

  if (Array.isArray(menuItem.children)) {
    return menuItem.children.some((child) => isItemSelected(child, pathname));
  }

  return false;
};

function NavCollapse({ item, level = 1, pathname }) {
  const theme = useTheme();
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const [open, setOpen] = useState(false);

  const selected = isItemSelected(item, pathname);
  const Icon = item.icon;
  const itemIcon = Icon ? <Icon variant="Bulk" size={drawerOpen ? 18 : 20} /> : null;

  useEffect(() => {
    if (selected) {
      setOpen(true);
    }
  }, [selected]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const compactPl = () => {
    if (!drawerOpen) return 1;
    if (level <= 1) return 2;
    if (level === 2) return 3;
    return 3.5;
  };

  return (
    <>
      <ListItemButton
        selected={selected}
        onClick={handleToggle}
        sx={{
          position: 'relative',
          zIndex: 1201,
          minHeight: 44,
          pl: compactPl(),
          pr: drawerOpen ? 1.25 : 1,
          py: 0.6,
          mx: drawerOpen ? 1 : 0.75,
          my: drawerOpen ? 0.45 : 0.55,
          borderRadius: 2,
          justifyContent: drawerOpen ? 'flex-start' : 'center',
          transition: 'background-color .18s ease, box-shadow .18s ease',
          '&:hover': {
            bgcolor: alpha('#fff', 0.08),
            boxShadow: `0 10px 24px ${alpha('#000', 0.22)}`
          },
          '&.Mui-selected': {
            bgcolor: alpha(theme.palette.primary.main, 0.14),
            boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}, 0 10px 24px ${alpha('#000', 0.18)}`,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.18)
            }
          }
        }}
      >
        {itemIcon && (
          <ListItemIcon
            sx={{
              minWidth: drawerOpen ? 34 : 0,
              color: selected ? theme.palette.primary.main : alpha('#fff', 0.68),
              ...(!drawerOpen && {
                borderRadius: 2,
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: selected ? alpha(theme.palette.primary.main, 0.18) : alpha('#fff', 0.06),
                boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.06)}`
              })
            }}
          >
            {itemIcon}
          </ListItemIcon>
        )}

        {drawerOpen && (
          <>
            <ListItemText
              primaryTypographyProps={{ noWrap: true }}
              primary={
                <Typography
                  sx={{
                    color: selected ? alpha('#fff', 0.9) : alpha('#fff', 0.68),
                    fontWeight: selected ? 700 : 500,
                    fontSize: '0.875rem',
                    lineHeight: 1.1,
                    letterSpacing: 0.2
                  }}
                >
                  {item.title}
                </Typography>
              }
            />
            {open ? (
              <ExpandLess sx={{ fontSize: 18, color: alpha('#fff', 0.75) }} />
            ) : (
              <ExpandMore sx={{ fontSize: 18, color: alpha('#fff', 0.75) }} />
            )}
          </>
        )}
      </ListItemButton>

      <Collapse in={open && drawerOpen} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ py: 0.25 }}>
          {(item.children || []).map((child) => {
            if (child.type === 'collapse') {
              return <NavCollapse key={child.id} item={child} level={level + 1} pathname={pathname} />;
            }

            if (child.type === 'item') {
              return <NavItem key={child.id} item={child} level={level + 1} pathname={pathname} />;
            }

            return (
              <Typography key={child.id || child.title} variant="h6" color="error" align="center">
                Fix - Group Collapse or Items
              </Typography>
            );
          })}
        </List>
      </Collapse>
    </>
  );
}

NavCollapse.propTypes = {
  item: PropTypes.any,
  level: PropTypes.number,
  pathname: PropTypes.string
};

export default function NavGroup({ item, lastItem, remItems, lastItemId, setSelectedID, pathname }) {
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  const [anchorEl, setAnchorEl] = useState(null);
  const [currentItem, setCurrentItem] = useState(item);

  const openMini = Boolean(anchorEl);

  useEffect(() => {
    if (lastItem) {
      if (item.id === lastItemId) {
        const localItem = { ...item };
        const elements = remItems.map((ele) => ele.elements);
        localItem.children = elements.flat(1);
        setCurrentItem(localItem);
      } else {
        setCurrentItem(item);
      }
    } else {
      setCurrentItem(item);
    }
  }, [item, lastItem, lastItemId, remItems, downLG]);

  const checkOpenForParent = (child, id) => {
    child.forEach((ele) => {
      if (ele.children?.length) {
        checkOpenForParent(ele.children, id);
      }

      if (ele.url && !!matchPath({ path: ele?.link ? ele.link : ele.url, end: Boolean(ele.exact) }, pathname)) {
        setSelectedID(id);
      }
    });
  };

  const checkSelectedOnload = (data) => {
    const childrens = data.children ? data.children : [];

    childrens.forEach((itemCheck) => {
      if (itemCheck?.children?.length) {
        checkOpenForParent(itemCheck.children, currentItem.id);
      }

      if (itemCheck.url && !!matchPath({ path: itemCheck?.link ? itemCheck.link : itemCheck.url, end: Boolean(itemCheck.exact) }, pathname)) {
        setSelectedID(currentItem.id);
      }
    });
  };

  useEffect(() => {
    checkSelectedOnload(currentItem);
    if (openMini) setAnchorEl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentItem]);

  const navCollapse = currentItem.children?.map((menuItem, index) => {
    switch (menuItem.type) {
      case 'collapse':
        return <NavCollapse key={menuItem.id} item={menuItem} level={1} pathname={pathname} />;

      case 'item':
        return <NavItem key={menuItem.id} item={menuItem} level={1} pathname={pathname} />;

      default:
        return (
          <Typography key={index} variant="h6" color="error" align="center">
            Fix - Group Collapse or Items
          </Typography>
        );
    }
  });

  return (
    <List
      subheader={
        <>
          {currentItem.title ? (
            drawerOpen && (
              <Box sx={{ pl: 3, mb: 1.5 }}>
                <Typography
                  variant="h5"
                  sx={{
                    textTransform: 'uppercase',
                    fontSize: '0.688rem',
                    color: 'secondary.dark'
                  }}
                >
                  {currentItem.title}
                </Typography>
                {currentItem.caption && (
                  <Typography variant="caption" color="secondary">
                    {currentItem.caption}
                  </Typography>
                )}
              </Box>
            )
          ) : (
            <Divider sx={{ my: 0.5 }} />
          )}
        </>
      }
      sx={{ mt: drawerOpen && currentItem.title ? 1.5 : 0, py: 0, zIndex: 0 }}
    >
      {navCollapse}
    </List>
  );
}

NavGroup.propTypes = {
  item: PropTypes.any,
  lastItem: PropTypes.number,
  remItems: PropTypes.array,
  lastItemId: PropTypes.string,
  selectedID: PropTypes.oneOfType([PropTypes.string, PropTypes.any]),
  setSelectedID: PropTypes.oneOfType([PropTypes.any, PropTypes.func]),
  setSelectedItems: PropTypes.oneOfType([PropTypes.string, PropTypes.any]),
  selectedItems: PropTypes.oneOfType([PropTypes.string, PropTypes.any]),
  setSelectedLevel: PropTypes.object,
  selectedLevel: PropTypes.number,
  pathname: PropTypes.string
};
