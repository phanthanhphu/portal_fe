import {
  Home3,
  HomeTrendUp,
  Category2,
  Building,
  Profile2User,
  DocumentText1,
  Link21,
  NotificationBing
} from 'iconsax-reactjs';

const icons = {
  navigation: Home3,
  dashboard: HomeTrendUp,
  appLinks: Link21,
  documentTypes: Category2,
  notices: NotificationBing,
  departmentForms: DocumentText1,
  departments: Building,
  users: Profile2User
};

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

const normalizeRole = (value) => String(value || '').trim().toUpperCase();

const getCurrentRole = () => {
  const roleFromStorage = localStorage.getItem('role');

  if (roleFromStorage) {
    return normalizeRole(roleFromStorage);
  }

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return normalizeRole(user?.role);
  } catch {
    return '';
  }
};

const getDashboardMenu = () => {
  const role = getCurrentRole();
  const isAdmin = role === 'ADMIN';

  const baseChildren = [
    {
      id: 'app-links',
      title: 'App Links',
      type: 'item',
      url: '/app-links',
      icon: icons.appLinks,
      breadcrumbs: false
    },
    {
      id: 'departments',
      title: 'Departments',
      type: 'item',
      url: '/department-management',
      icon: icons.departments,
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
      id: 'document-types',
      title: 'Document Types',
      type: 'item',
      url: '/document-types',
      icon: icons.documentTypes,
      breadcrumbs: false
    },
    {
      id: 'department-forms',
      title: 'Documents',
      type: 'item',
      url: '/department-forms',
      icon: icons.departmentForms,
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
    children: isAdmin ? [...baseChildren, userManagementItem] : baseChildren
  };
};

const dashboard = getDashboardMenu();

export default dashboard;
export { getDashboardMenu, menuStyles };