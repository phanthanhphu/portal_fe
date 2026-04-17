// src/pages/group/UpdateStatusGroup.jsx
import React, { useState, useEffect } from 'react';
import {
  Select,
  MenuItem,
  Box,
  CircularProgress,
  FormControl,
  Typography,
} from '@mui/material';
import Notification from './Notification';
import { API_BASE_URL } from '../../config';

const STATUS_OPTIONS = [
  { value: 'Not Started', label: 'Not Started', color: '#b0bec5' },
  { value: 'In Progress', label: 'In Progress', color: '#42a5f5' },
  { value: 'Completed',   label: 'Completed',   color: '#66bb6a' },
];

const STATUS_ORDER = {
  'Not Started': 0,
  'In Progress': 1,
  'Completed': 2,
};

export default function UpdateStatusGroup({
  groupId,
  currentStatus = 'Not Started',
  onSuccess,
}) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = (user.role || '').toUpperCase();
  const userId = user.id || '';
  const isAdminOrLeader = role === 'ADMIN' || role === 'LEADER';

  useEffect(() => setStatus(currentStatus), [currentStatus]);

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === status || !groupId) return;

    // Kiểm tra quyền: User thường KHÔNG được đổi ngược
    if (!isAdminOrLeader) {
      const currentOrder = STATUS_ORDER[status];
      const newOrder = STATUS_ORDER[newStatus];
      if (newOrder < currentOrder) {
        setNotification({
          open: true,
          message: 'You do not have permission to revert the status.',
          severity: 'warning'
        });
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/group-summary-requisitions/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ groupId, status: newStatus, userId }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Server error');
      }

      setStatus(newStatus);
      onSuccess?.();
      setNotification({
        open: true,
        message: 'Status updated successfully!',
        severity: 'success'
      });
    } catch (err) {
      setNotification({
        open: true,
        message: `Update failed: ${err.message}`,
        severity: 'error'
      });
      setStatus(status); // giữ nguyên status cũ nếu lỗi
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FormControl size="small" sx={{ width: 138 }}>
        <Select
          value={status}
          onChange={handleChange}
          disabled={loading || !groupId}
          sx={{
            '& .MuiSelect-select': {
              p: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              borderRadius: '14px',
              bgcolor: 'transparent',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              transition: 'all 0.2s ease',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.18)' },
            },
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          }}
          renderValue={() => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: STATUS_OPTIONS.find(o => o.value === status)?.color || '#999',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
              <Typography sx={{ fontSize: '0.64rem', fontWeight: 600, color: '#263238' }}>
                {status}
              </Typography>
            </Box>
          )}
        >
          {loading && (
            <MenuItem disabled>
              <CircularProgress size={14} />
            </MenuItem>
          )}
          {STATUS_OPTIONS.map((opt) => {
            const canSelect = isAdminOrLeader || STATUS_ORDER[opt.value] >= STATUS_ORDER[status];
            return (
              <MenuItem
                key={opt.value}
                value={opt.value}
                disabled={!canSelect && !loading}
                sx={{ py: 0.7, opacity: !canSelect ? 0.5 : 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: opt.color,
                    }}
                  />
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                    {opt.label}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {/* Notification đẹp như ở SupplierProductsPage */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </>
  );
}