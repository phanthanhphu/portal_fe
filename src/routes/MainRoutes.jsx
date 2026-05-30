import { lazy, useEffect, useState } from 'react';
import { Navigate, useNavigate, Outlet } from 'react-router-dom';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { Typography, Box, Button } from '@mui/material';
import LoginPage from './LoginPage';
import { toast } from 'react-toastify';
import PageHome from '../pages/index/PageHome';

const DepartmentPage = Loadable(lazy(() => import('pages/department/DepartmentManagement')));
const UserManagementPage = Loadable(lazy(() => import('pages/dashboard/UserManagementPage')));
const AppLinksPage = Loadable(lazy(() => import('pages/appLinks/AppLinksPage')));
const DocumentTypesPage = Loadable(lazy(() => import('pages/documenttype/DocumentTypesPage')));
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

      <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
        Go to Dashboard
      </Button>
    </Box>
  );
}

function ProtectedRoute() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
    }
  }, [navigate, token]);

  return token ? <Outlet /> : null;
}

function AdminRoute({ children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  let role = '';

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    role = String(user?.role || localStorage.getItem('role') || '').trim().toUpperCase();
  } catch {
    role = String(localStorage.getItem('role') || '').trim().toUpperCase();
  }

  const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN';

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
    } else if (!isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, token, isAdmin]);

  if (!token || !isAdmin) {
    return null;
  }

  return children;
}

const MainRoutes = {
  path: '/',
  children: [
    { path: '/', element: <PageHome /> },
    { path: '/login', element: <LoginPage /> },
    {
      path: '/',
      element: <ProtectedRoute />,
      children: [
        {
          path: '/',
          element: <DashboardLayout />,
          children: [
            { path: 'app-links', element: <AppLinksPage /> },
            { path: 'document-types', element: <DocumentTypesPage /> },
            { path: 'notices', element: <NoticesPage /> },

            { path: 'approve', element: <Navigate to="/approve/notices" replace /> },
            { path: 'approve/notices', element: <NoticeApprovalPage /> },
            { path: 'approve/documents', element: <DocumentApprovalPage /> },

            { path: 'notices/approval', element: <Navigate to="/approve/notices" replace /> },
            { path: 'documents/approval', element: <Navigate to="/approve/documents" replace /> },

            { path: 'department-management', element: <DepartmentPage /> },
            { path: 'department-forms', element: <DepartmentFormsPage /> },
            {
              path: 'user-management',
              element: (
                <AdminRoute>
                  <UserManagementPage />
                </AdminRoute>
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
