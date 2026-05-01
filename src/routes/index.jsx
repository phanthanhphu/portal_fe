import { createBrowserRouter, Navigate } from 'react-router-dom';

// project-imports
import MainRoutes from './MainRoutes';
import LoginPage from './LoginPage';
import PageHome from '../pages/index/PageHome';

// ==============================|| ROUTES RENDER ||============================== //

const router = createBrowserRouter(
  [
    // Root "/" sẽ redirect về login (mặc định vào trang login)
    {
      path: '/',
      element: <Navigate to="/login" replace />
    },

    // Trang login
    {
      path: '/login',
      element: <LoginPage />
    },

    // Trang chủ (home) chỉ truy cập được qua /index
    {
      path: '/index',
      element: <PageHome />
    },

    // Các route chính (dashboard, protected routes, v.v.)
    MainRoutes
  ],
  {
    basename: import.meta.env.VITE_APP_BASE_NAME
  }
);

export default router;