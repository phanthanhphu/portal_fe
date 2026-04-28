import {
  Home3,
  HomeTrendUp,
  Box,
  Building,
  Profile,
  DocumentText1,
  Link21
} from 'iconsax-reactjs';

const icons = {
  navigation: Home3,
  dashboard: HomeTrendUp,
  appLinks: Link21,
  notices: DocumentText1,
  departmentForms: Box,
  departments: Building,
  users: Profile
};

// CSS styles giống file mẫu
const menuStyles = {
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
    borderRadius: '8px',
    margin: '4px 8px',
    transition: 'background-color 0.2s, color 0.2s',
    '&:hover': {
      backgroundColor: '#f5f5f5',
      color: '#1976d2'
    }
  },
  icon: {
    marginRight: '12px',
    fontSize: '24px',
    color: '#666',
    transition: 'color 0.2s'
  },
  iconActive: {
    color: '#1976d2'
  },
  groupTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1976d2',
    padding: '16px 8px 8px',
    textTransform: 'uppercase'
  }
};

const getDashboardMenu = () => {
  const role = localStorage.getItem('role');

  const baseChildren = [
    // {
    //   id: 'dashboard',
    //   title: 'Dashboard',
    //   type: 'item',
    //   url: '/dashboard',
    //   icon: icons.dashboard,
    //   breadcrumbs: false
    // },
    {
      id: 'app-links',
      title: 'App Links',
      type: 'item',
      url: '/app-links',
      icon: icons.appLinks,
      breadcrumbs: false
    },
    {
      id: 'notices',
      title: 'Notices',
      type: 'item',
      url: '/notices',
      icon: icons.notices,
      breadcrumbs: false
    },
    {
      id: 'department-forms',
      title: 'Department Forms',
      type: 'item',
      url: '/department-forms',
      icon: icons.departmentForms,
      breadcrumbs: false
    },
    {
      id: 'departments',
      title: 'Departments',
      type: 'item',
      url: '/department-management',
      icon: icons.departments,
      breadcrumbs: false
    }
  ];

  const userManagementItem = {
    id: 'users',
    title: 'Users',
    type: 'item',
    url: '/user-management',
    icon: icons.users,
    breadcrumbs: false
  };

  return {
    id: 'group-dashboard',
    title: 'Portal Management',
    icon: icons.navigation,
    type: 'group',
    children: role === 'Admin'
      ? [...baseChildren, userManagementItem]
      : baseChildren
  };
};

const dashboard = getDashboardMenu();

export default dashboard;
export { menuStyles };
