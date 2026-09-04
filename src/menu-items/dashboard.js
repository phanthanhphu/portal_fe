import {
  Home3,
  HomeTrendUp,
  Category2,
  Building,
  Profile2User,
  DocumentText1,
  Link21,
  NotificationBing,
  TickCircle
} from 'iconsax-reactjs';

const icons = {
  navigation: Home3,
  dashboard: HomeTrendUp,
  appLinks: Link21,
  documentTypes: Category2,
  locations: Building,
  rooms: Building,
  roomBookings: DocumentText1,
  indexRoom: HomeTrendUp,
  notices: NotificationBing,
  approve: TickCircle,
  noticeApproval: NotificationBing,
  documentApproval: DocumentText1,
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
const normalizePermission = (value) => String(value || '').trim().toUpperCase();

const parseStoredJson = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  const keys = ['user', 'currentUser', 'authUser', 'loginUser'];

  for (const key of keys) {
    const parsed = parseStoredJson(localStorage.getItem(key));

    if (parsed) {
      return parsed.user || parsed.data || parsed;
    }
  }

  return {};
};

const getCurrentUserContext = () => {
  const user = getStoredUser();
  const department = user?.department || {};

  return {
    ...user,
    role: user?.role || localStorage.getItem('role') || '',

    department,
    departmentId:
      user?.departmentId ||
      department?.id ||
      localStorage.getItem('departmentId') ||
      '',
    departmentName:
      user?.departmentName ||
      user?.department_name ||
      department?.departmentName ||
      department?.name ||
      localStorage.getItem('departmentName') ||
      '',
    division:
      user?.division ||
      department?.division ||
      localStorage.getItem('division') ||
      '',

    approvePermission: user?.approvePermission || localStorage.getItem('approvePermission') || 'NONE',
    canApproveNotice:
      user?.canApproveNotice ??
      user?.can_approve_notice ??
      (localStorage.getItem('canApproveNotice') === 'true'),
    canApproveDocument:
      user?.canApproveDocument ??
      user?.can_approve_document ??
      (localStorage.getItem('canApproveDocument') === 'true'),

    bookingPermission: user?.bookingPermission || localStorage.getItem('bookingPermission') || 'NONE',
    canManageBooking:
      user?.canManageBooking ??
      user?.can_manage_booking ??
      (localStorage.getItem('canManageBooking') === 'true'),

    // Quyền thao tác module thường:
    // NONE / NOTICE / DOCUMENT / APP_LINK / ALL / NOTICE,DOCUMENT,APP_LINK
    modulePermission: user?.modulePermission || localStorage.getItem('modulePermission') || 'NONE',
    canManageAppLinks:
      user?.canManageAppLinks ??
      user?.can_manage_app_links ??
      (localStorage.getItem('canManageAppLinks') === 'true'),
    canManageNotice:
      user?.canManageNotice ??
      user?.can_manage_notice ??
      (localStorage.getItem('canManageNotice') === 'true'),
    canManageDocument:
      user?.canManageDocument ??
      user?.can_manage_document ??
      (localStorage.getItem('canManageDocument') === 'true'),
    canManageDepartment:
      user?.canManageDepartment ??
      user?.can_manage_department ??
      (localStorage.getItem('canManageDepartment') === 'true')
  };
};

const isAdminRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'ADMIN' || normalized === 'ROLE_ADMIN';
};

const isViewRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'VIEW' || normalized === 'ROLE_VIEW';
};

const hasBookingManagePermission = (user) => {
  if (isAdminRole(user?.role)) return true;

  return Boolean(user?.canManageBooking)
    || normalizePermission(user?.bookingPermission) === 'BOOKING';
};

const hasApproveNoticePermission = (user) => {
  if (isAdminRole(user?.role) || isViewRole(user?.role)) return true;

  const approvePermission = normalizePermission(user?.approvePermission);

  return Boolean(user?.canApproveNotice)
    || approvePermission === 'NOTICE'
    || approvePermission === 'BOTH';
};

const hasApproveDocumentPermission = (user) => {
  if (isAdminRole(user?.role) || isViewRole(user?.role)) return true;

  const approvePermission = normalizePermission(user?.approvePermission);

  return Boolean(user?.canApproveDocument)
    || approvePermission === 'DOCUMENT'
    || approvePermission === 'BOTH';
};

const getModulePermissionList = (value) => {
  const permission = normalizePermission(value);

  if (!permission || permission === 'NONE') {
    return [];
  }

  if (permission === 'ALL') {
    return ['NOTICE', 'DOCUMENT', 'APP_LINK'];
  }

  return permission
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
};

const hasModulePermission = (user, target) => {
  if (isAdminRole(user?.role)) return true;

  const targetPermission = normalizePermission(target);
  const permissions = getModulePermissionList(user?.modulePermission);

  return permissions.includes(targetPermission);
};

const hasAppLinkManagePermission = (user) => {
  if (isAdminRole(user?.role)) return true;

  return Boolean(user?.canManageAppLinks)
    || hasModulePermission(user, 'APP_LINK');
};

const hasNoticeManagePermission = (user) => {
  if (isAdminRole(user?.role)) return true;

  return Boolean(user?.canManageNotice)
    || hasModulePermission(user, 'NOTICE');
};

const hasDocumentManagePermission = (user) => {
  if (isAdminRole(user?.role)) return true;

  return Boolean(user?.canManageDocument)
    || hasModulePermission(user, 'DOCUMENT');
};

const hasDepartmentManagePermission = (user) => {
  if (isAdminRole(user?.role)) return true;

  return Boolean(user?.canManageDepartment)
    || hasModulePermission(user, 'DEPARTMENT');
};

const pushUniqueMenu = (children, item) => {
  if (!item) return;

  if (!children.some((x) => x.id === item.id)) {
    children.push(item);
  }
};

const getDashboardMenu = () => {
  const currentUser = getCurrentUserContext();

  const isAdmin = isAdminRole(currentUser.role);
  const isView = isViewRole(currentUser.role);
  const canSeeAppLinks = isAdmin || isView || hasAppLinkManagePermission(currentUser);

  const canManageNotice = hasNoticeManagePermission(currentUser);
  const canManageDocument = hasDocumentManagePermission(currentUser);
  const canManageDepartment = hasDepartmentManagePermission(currentUser);

  const canManageBooking = hasBookingManagePermission(currentUser);
  const canApproveNotice = hasApproveNoticePermission(currentUser);
  const canApproveDocument = hasApproveDocumentPermission(currentUser);

  const appLinksItem = {
    id: 'app-links',
    title: 'App Links',
    type: 'item',
    url: '/app-links',
    icon: icons.appLinks,
    breadcrumbs: false
  };

  const departmentsItem = {
    id: 'departments',
    title: 'Departments',
    type: 'item',
    url: '/department-management',
    icon: icons.departments,
    breadcrumbs: false
  };

  const noticesItem = {
    id: 'notices',
    title: 'Notices',
    type: 'item',
    url: '/notices',
    icon: icons.notices,
    breadcrumbs: false,
    exact: true
  };

  const documentTypesItem = {
    id: 'document-types',
    title: 'Document Types',
    type: 'item',
    url: '/document-types',
    icon: icons.documentTypes,
    breadcrumbs: false
  };

  const locationsItem = {
    id: 'locations',
    title: 'Locations',
    type: 'item',
    url: '/locations',
    icon: icons.locations,
    breadcrumbs: false,
    exact: true
  };

  const roomsItem = {
    id: 'rooms',
    title: 'Rooms',
    type: 'item',
    url: '/rooms',
    icon: icons.rooms,
    breadcrumbs: false,
    exact: true
  };

  const roomBookingsItem = {
    id: 'room-bookings',
    title: 'Room Bookings',
    type: 'item',
    url: '/room-bookings',
    icon: icons.roomBookings,
    breadcrumbs: false,
    exact: true
  };

  const indexRoomItem = {
    id: 'index-room',
    title: 'Index Room',
    type: 'item',
    url: '/index-room',
    icon: icons.indexRoom,
    breadcrumbs: false,
    exact: true
  };

  const documentsItem = {
    id: 'department-forms',
    title: 'Documents',
    type: 'item',
    url: '/department-forms',
    icon: icons.departmentForms,
    breadcrumbs: false
  };

  const userManagementItem = {
    id: 'users',
    title: 'Users',
    type: 'item',
    url: '/user-management',
    icon: icons.users,
    breadcrumbs: false
  };

  const noticeApprovalItem = {
    id: 'notice-approval',
    title: 'Notice',
    type: 'item',
    url: '/approve/notices',
    icon: icons.noticeApproval,
    breadcrumbs: false,
    exact: true
  };

  const documentApprovalItem = {
    id: 'document-approval',
    title: 'Document',
    type: 'item',
    url: '/approve/documents',
    icon: icons.documentApproval,
    breadcrumbs: false,
    exact: true
  };

  const approveChildren = [
    canApproveNotice ? noticeApprovalItem : null,
    canApproveDocument ? documentApprovalItem : null
  ].filter(Boolean);

  const approveItem = approveChildren.length > 0
    ? {
        id: 'approve',
        title: 'Approve',
        type: 'collapse',
        icon: icons.approve,
        breadcrumbs: false,
        children: approveChildren
      }
    : null;

  let children = [];

  if (isAdmin || isView) {
    // Admin có toàn quyền; View thấy toàn bộ menu nhưng chỉ được đọc.
    children = [
      appLinksItem,
      departmentsItem,
      noticesItem,
      documentTypesItem,
      documentsItem,
      approveItem,
      userManagementItem,
      locationsItem,
      roomsItem,
      roomBookingsItem,
      indexRoomItem
    ].filter(Boolean);
  } else {
    // App Links chỉ hiện khi có quyền APP_LINK.
    if (canSeeAppLinks) {
      pushUniqueMenu(children, appLinksItem);
    }

    // Quyền DEPARTMENT thì hiện Departments.
    if (canManageDepartment) {
      pushUniqueMenu(children, departmentsItem);
    }

    // Quyền NOTICE thì hiện Notices.
    if (canManageNotice) {
      pushUniqueMenu(children, noticesItem);
    }

    // Quyền DOCUMENT thì hiện Document Types + Documents.
    if (canManageDocument) {
      pushUniqueMenu(children, documentTypesItem);
      pushUniqueMenu(children, documentsItem);
    }

    // Quyền duyệt thì hiện nhóm Approve đúng quyền.
    if (approveItem) {
      pushUniqueMenu(children, approveItem);
    }

    // Quyền BOOKING thì hiện menu phòng.
    if (canManageBooking) {
      pushUniqueMenu(children, locationsItem);
      pushUniqueMenu(children, roomsItem);
      pushUniqueMenu(children, roomBookingsItem);
      pushUniqueMenu(children, indexRoomItem);
    }
  }

  return {
    id: 'group-dashboard',
    title: 'Portal Management',
    icon: icons.navigation,
    type: 'group',
    children
  };
};

const dashboard = getDashboardMenu();

export default dashboard;
export { getDashboardMenu, menuStyles };
