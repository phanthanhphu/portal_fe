export const normalizeRole = (value) => String(value || '').trim().toUpperCase();

export const isAdminRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'ADMIN' || normalized === 'ROLE_ADMIN';
};

export const isViewRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'VIEW' || normalized === 'ROLE_VIEW';
};

export const isAdminOrViewRole = (role) => isAdminRole(role) || isViewRole(role);

export const getStoredUser = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('user') || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getStoredRole = () => {
  const user = getStoredUser();
  return user?.role || localStorage.getItem('role') || '';
};

export const isStoredViewRole = () => isViewRole(getStoredRole());
