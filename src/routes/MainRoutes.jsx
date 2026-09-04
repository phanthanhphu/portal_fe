import { lazy, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { Typography, Box, Button } from '@mui/material';
import LoginPage from './LoginPage';
import { toast } from 'react-toastify';
import PageHome from '../pages/index/PageHome';
import { isViewRole } from '../utils/accessRole';

const DepartmentPage = Loadable(lazy(() => import('pages/department/DepartmentManagement')));
const UserManagementPage = Loadable(lazy(() => import('pages/users/UserManagementPage')));
const AppLinksPage = Loadable(lazy(() => import('pages/appLinks/AppLinksPage')));
const DocumentTypesPage = Loadable(lazy(() => import('pages/documenttype/DocumentTypesPage')));
const LocationsPage = Loadable(lazy(() => import('pages/locations/LocationsPage')));
const RoomsPage = Loadable(lazy(() => import('pages/rooms/RoomsPage')));
const RoomBookingsPage = Loadable(lazy(() => import('pages/roomBookings/RoomBookingsPage')));
const IndexRoomPage = Loadable(lazy(() => import('pages/indexRoom/IndexRoomPage')));
const NoticesPage = Loadable(lazy(() => import('pages/notices/NoticesPage')));

const NoticeApprovalPage = Loadable(lazy(() => import('pages/notices/NoticeApprovalPage')));
const DocumentApprovalPage = Loadable(
  lazy(() => import('pages/formlist/DocumentApprovalPage'))
);
const Color = Loadable(lazy(() => import('pages/component-overview/color')));
const TypographyPage = Loadable(lazy(() => import('pages/component-overview/typography')));
const Shadow = Loadable(lazy(() => import('pages/component-overview/shadows')));

const FormListDialog = Loadable(lazy(() => import('pages/formlist/FormListDialog')));
const AddFormDialog = Loadable(lazy(() => import('pages/formlist/AddFormDialog')));
const EditFormDialog = Loadable(lazy(() => import('pages/formlist/EditFormDialog')));

const LOGIN_PATH = '/login';
const DEFAULT_AFTER_LOGIN_PATH = '/app-links';

const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;

    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
};

const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('role');
  localStorage.removeItem('approvePermission');
  localStorage.removeItem('canApproveNotice');
  localStorage.removeItem('canApproveDocument');
  localStorage.removeItem('bookingPermission');
  localStorage.removeItem('canManageBooking');
  localStorage.removeItem('modulePermission');
  localStorage.removeItem('canManageAppLinks');
  localStorage.removeItem('canManageNotice');
  localStorage.removeItem('canManageDocument');
  localStorage.removeItem('canManageDepartment');
  localStorage.removeItem('departmentId');
  localStorage.removeItem('departmentName');
  localStorage.removeItem('division');
  localStorage.removeItem('loginAt');
  localStorage.removeItem('authenticationType');
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

const getStoredRole = () => {
  const user = getStoredUser();

  return String(user?.role || localStorage.getItem('role') || '')
    .trim()
    .toUpperCase();
};

const isAdminRole = (role) => {
  const normalizedRole = String(role || '').trim().toUpperCase();

  return normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';
};

const canApproveNotice = () => {
  const user = getStoredUser();

  const role = getStoredRole();

  if (isAdminRole(role) || isViewRole(role)) {
    return true;
  }

  return Boolean(user?.canApproveNotice);
};

const canApproveDocument = () => {
  const user = getStoredUser();

  const role = getStoredRole();

  if (isAdminRole(role) || isViewRole(role)) {
    return true;
  }

  return Boolean(user?.canApproveDocument);
};

function DepartmentFormsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);

  return (
    <>
      <FormListDialog
        open={true}
        onCancel={() => {}}
        onAdd={() => setAddOpen(true)}
        onEdit={(form) => {
          setSelectedForm(form);
          setEditOpen(true);
        }}
      />

      <AddFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />

      <EditFormDialog
        open={editOpen}
        form={selectedForm}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

function NotFound() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h4" color="error">
        404 Not Found
      </Typography>

      <Button variant="contained" onClick={() => navigate(DEFAULT_AFTER_LOGIN_PATH)} sx={{ mt: 2 }}>
        Go to Dashboard
      </Button>
    </Box>
  );
}

function ProtectedRoute() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const expired = token ? isTokenExpired(token) : false;

  useEffect(() => {
    if (expired) {
      clearAuthSession();
      toast.error('Session expired. Please login again.');
    }
  }, [expired]);

  if (!token || expired) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function AdminOrViewRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const expired = token ? isTokenExpired(token) : false;
  const role = getStoredRole();
  const allowed = isAdminRole(role) || isViewRole(role);

  useEffect(() => {
    if (expired) {
      clearAuthSession();
      toast.error('Session expired. Please login again.');
      return;
    }

    if (token && !allowed) {
      toast.error('Access denied. Admin or View role required.');
    }
  }, [token, expired, allowed]);

  if (!token || expired) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }

  if (!allowed) {
    return <Navigate to={DEFAULT_AFTER_LOGIN_PATH} replace />;
  }

  return children;
}

function NoticeApprovalRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const expired = token ? isTokenExpired(token) : false;
  const allowed = canApproveNotice();

  useEffect(() => {
    if (expired) {
      clearAuthSession();
      toast.error('Session expired. Please login again.');
      return;
    }

    if (token && !allowed) {
      toast.error('Access denied. Notice approval permission required.');
    }
  }, [token, expired, allowed]);

  if (!token || expired) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }

  if (!allowed) {
    return <Navigate to={DEFAULT_AFTER_LOGIN_PATH} replace />;
  }

  return children;
}

function DocumentApprovalRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const expired = token ? isTokenExpired(token) : false;
  const allowed = canApproveDocument();

  useEffect(() => {
    if (expired) {
      clearAuthSession();
      toast.error('Session expired. Please login again.');
      return;
    }

    if (token && !allowed) {
      toast.error('Access denied. Document approval permission required.');
    }
  }, [token, expired, allowed]);

  if (!token || expired) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }

  if (!allowed) {
    return <Navigate to={DEFAULT_AFTER_LOGIN_PATH} replace />;
  }

  return children;
}

const MainRoutes = {
  path: '/',
  children: [
    { path: '/', element: <PageHome /> },
    { path: '/login', element: <LoginPage /> },

    // Public screen URL for TV/kiosk display
    { path: '/index-room', element: <IndexRoomPage /> },

    {
      path: '/',
      element: <ProtectedRoute />,
      children: [
        {
          path: '/',
          element: <DashboardLayout />,
          children: [
            { path: 'dashboard', element: <Navigate to={DEFAULT_AFTER_LOGIN_PATH} replace /> },

            { path: 'app-links', element: <AppLinksPage /> },
            { path: 'document-types', element: <DocumentTypesPage /> },
            { path: 'locations', element: <LocationsPage /> },
            { path: 'rooms', element: <RoomsPage /> },
            { path: 'room-bookings', element: <RoomBookingsPage /> },
            { path: 'notices', element: <NoticesPage /> },

            { path: 'approve', element: <Navigate to="/approve/notices" replace /> },
            {
              path: 'approve/notices',
              element: (
                <NoticeApprovalRoute>
                  <NoticeApprovalPage />
                </NoticeApprovalRoute>
              )
            },
            {
              path: 'approve/documents',
              element: (
                <DocumentApprovalRoute>
                  <DocumentApprovalPage />
                </DocumentApprovalRoute>
              )
            },

            { path: 'notices/approval', element: <Navigate to="/approve/notices" replace /> },
            { path: 'documents/approval', element: <Navigate to="/approve/documents" replace /> },

            { path: 'department-management', element: <DepartmentPage /> },
            { path: 'department-forms', element: <DepartmentFormsPage /> },
            {
              path: 'user-management',
              element: (
                <AdminOrViewRoute>
                  <UserManagementPage />
                </AdminOrViewRoute>
              )
            },
            { path: 'typography', element: <TypographyPage /> },
            { path: 'color', element: <Color /> },
            { path: 'shadows', element: <Shadow /> },
            { path: '*', element: <NotFound /> }
          ]
        }
      ]
    }
  ]
};

export default MainRoutes;
