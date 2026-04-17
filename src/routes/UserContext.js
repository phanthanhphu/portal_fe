import { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [role, setRole] = useState(localStorage.getItem('role') || '');

  const updateRole = (newRole) => {
    console.log('Debug - Updating role in UserContext:', newRole); // Debug log
    setRole(newRole);
    if (newRole) {
      localStorage.setItem('role', newRole);
    } else {
      localStorage.removeItem('role');
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const newRole = localStorage.getItem('role') || '';
      console.log('Debug - Storage role changed:', newRole); // Debug log
      setRole(newRole);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <UserContext.Provider value={{ role, updateRole }}>
      {children}
    </UserContext.Provider>
  );
};