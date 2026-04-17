import React from 'react';
import { Snackbar, Alert } from '@mui/material';

const Notification = ({ open, message, severity, onClose }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000} // Tự đóng sau 6 giây
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={severity} // success, warning, error
        sx={{ width: '100%', fontSize: '0.8rem' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Notification;