import { lazy, useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { Typography, Box, Button } from '@mui/material';
import LoginPage from './LoginPage';
import { toast } from 'react-toastify';
import PageHome from './PageHome';

// ==============================|| LAZY LOADED PAGES ||============================== //

const DashboardDefault = Loadable(lazy(() => import('pages/dashboard/default')));

// Department
const DepartmentPage = Loadable(lazy(() => import('pages/department/DepartmentManagement')));


// User
const UserManagementPage = Loadable(lazy(() => import('pages/dashboard/UserManagementPage')));


// App Links
const AppLinksPage = Loadable(lazy(() => import('pages/appLinks/AppLinksPage')));

// Notices
const NoticesPage = Loadable(lazy(() => import('pages/notices/NoticesPage')));

// ✅ GIỮ NGUYÊN (fix lỗi của bạn)
const Color = Loadable(lazy(() => import('pages/component-overview/color')));
const TypographyPage = Loadable(lazy(() => import('pages/component-overview/typography')));
const Shadow = Loadable(lazy(() => import('pages/component-overview/shadows')));

// ✅ NEW - Form Dialogs
const FormListDialog = Loadable(lazy(() => import('pages/formlist/FormListDialog')));
const AddFormDialog = Loadable(lazy(() => import('pages/formlist/AddFormDialog')));
const EditFormDialog = Loadable(lazy(() => import('pages/formlist/EditFormDialog')));

// ==============================|| DEPARTMENT FORMS PAGE ||============================== //

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

// ==============================|| NOT FOUND PAGE ||============================== //

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

// ==============================|| PROTECTED ROUTE ||============================== //

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

// ==============================|| ADMIN ROUTE ||============================== //

function AdminRoute({ children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
    } else if (role !== 'Admin') {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, token, role]);

  if (!token || role !== 'Admin') {
    return null;
  }

  return children;
}

// ==============================|| ROUTES ||============================== //

const MainRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: <PageHome />
    },
    {
      path: '/login',
      element: <LoginPage />
    },

    {
      path: '/',
      element: <ProtectedRoute />,
      children: [
        {
          path: '/',
          element: <DashboardLayout />,
          children: [
            {
              path: 'dashboard',
              element: <DashboardDefault />
            },

            {
              path: 'app-links',
              element: <AppLinksPage />
            },

            {
              path: 'notices',
              element: <NoticesPage />
            },
            {
              path: 'department-management',
              element: <DepartmentPage />
            },

            // ✅ THÊM MỚI (CHỈ DÒNG NÀY)
            {
              path: 'department-forms',
              element: <DepartmentFormsPage />
            },
            {
              path: 'user-management',
              element: (
                <AdminRoute>
                  <UserManagementPage />
                </AdminRoute>
              )
            },
            {
              path: 'typography',
              element: <TypographyPage />
            },
            {
              path: 'color',
              element: <Color />
            },
            {
              path: 'shadows',
              element: <Shadow />
            },

            {
              path: '*',
              element: <NotFound />
            }
          ]
        }
      ]
    }
  ]
};

export default MainRoutes;