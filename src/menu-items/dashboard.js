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
const normalizeText = (value) => String(value || '').trim().toUpperCase();

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
      (localStorage.getItem('canManageBooking') === 'true')
  };
};

const isAdminRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'ADMIN' || normalized === 'ROLE_ADMIN';
};

const isItDepartment = (user) => {
  const values = [
    user?.departmentName,
    user?.division,
    user?.department?.departmentName,
    user?.department?.name,
    user?.department?.division,
    localStorage.getItem('departmentName'),
    localStorage.getItem('division')
  ]
    .map(normalizeText)
    .filter(Boolean);

  return values.some((value) => (
    value === 'IT' ||
    value === 'I.T' ||
    value === 'I.T.' ||
    value.includes('IT CENTER') ||
    value.includes('INFORMATION TECHNOLOGY') ||
    value.includes('TECHNOLOGY') ||
    value.includes('INFORMATION SYSTEM') ||
    value.includes('SYSTEM')
  ));
};

const hasBookingManagePermission = (user) => {
  if (isAdminRole(user?.role)) return true;

  return Boolean(user?.canManageBooking)
    || normalizePermission(user?.bookingPermission) === 'BOOKING';
};

const hasApproveNoticePermission = (user) => {
  if (isAdminRole(user?.role)) return true;

  const approvePermission = normalizePermission(user?.approvePermission);

  return Boolean(user?.canApproveNotice)
    || approvePermission === 'NOTICE'
    || approvePermission === 'BOTH';
};

const hasApproveDocumentPermission = (user) => {
  if (isAdminRole(user?.role)) return true;

  const approvePermission = normalizePermission(user?.approvePermission);

  return Boolean(user?.canApproveDocument)
    || approvePermission === 'DOCUMENT'
    || approvePermission === 'BOTH';
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
  const isIT = isItDepartment(currentUser);
  const canSeeAppLinks = isAdmin || isIT;

  const canManageBooking = hasBookingManagePermission(currentUser);
  const canApproveNotice = hasApproveNoticePermission(currentUser);
  const canApproveDocument = hasApproveDocumentPermission(currentUser);
  const hasAnyApprovePermission = canApproveNotice || canApproveDocument;

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

  const baseChildren = [
    canSeeAppLinks ? appLinksItem : null,
    departmentsItem,
    noticesItem,
    documentTypesItem,
    roomsItem,
    roomBookingsItem,
    indexRoomItem,
    documentsItem
  ].filter(Boolean);

  let children = [];

  if (isAdmin) {
    // Admin thấy toàn bộ menu, bao gồm App Links.
    children = [
      ...baseChildren,
      userManagementItem,
      approveItem
    ].filter(Boolean);
  } else {
    // App Links chỉ cho bộ phận IT.
    if (canSeeAppLinks) {
      pushUniqueMenu(children, appLinksItem);
    }

    // User có Booking: hiện Rooms, Room Bookings, Index Room.
    if (canManageBooking) {
      pushUniqueMenu(children, roomsItem);
      pushUniqueMenu(children, roomBookingsItem);
      pushUniqueMenu(children, indexRoomItem);
    }

    // User có bất kỳ quyền Approve nào thì luôn thấy menu thường:
    // Notices + Documents.
    if (hasAnyApprovePermission) {
      pushUniqueMenu(children, noticesItem);
      pushUniqueMenu(children, documentsItem);
    }

    // Trong nhóm Approve chỉ hiện đúng quyền:
    // NOTICE -> Approve / Notice
    // DOCUMENT -> Approve / Document
    // BOTH -> cả 2
    if (approveItem) {
      pushUniqueMenu(children, approveItem);
    }

    // User không có quyền đặc biệt thì cho menu tối thiểu,
    // nhưng App Links vẫn chỉ hiện nếu thuộc IT.
    if (children.length === 0) {
      if (canSeeAppLinks) {
        pushUniqueMenu(children, appLinksItem);
      }

      pushUniqueMenu(children, noticesItem);
      pushUniqueMenu(children, documentsItem);
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
