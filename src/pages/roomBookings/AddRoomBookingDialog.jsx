import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Stack,
  Box,
  IconButton,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
} from '@mui/material';

import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const ROOM_API = `${API_BASE_URL}/api/rooms`;
const BOOKING_API = `${API_BASE_URL}/api/room-bookings`;

const getAuthHeaders = (contentType = true) => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: '*/*',
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  };
};

const initialForm = {
  title: '',
  roomId: '',
  checkInDate: '',
  checkInTime: '14:00',
  checkOutDate: '',
  checkOutTime: '12:00',
  peopleInCharge: '',
  basedLocation: '',
  roomCharged: '',
};

const toDateTime = (date, time) => {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};

export default function AddRoomBookingDialog({
  open,
  onCancel,
  onOk,
  disabled = false,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [form, setForm] = useState(initialForm);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const toast = (msg, severity = 'success') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);

    try {
      const response = await axios.get(`${ROOM_API}/options`, {
        headers: getAuthHeaders(false),
      });

      const roomOptions = Array.isArray(response?.data) ? response.data : [];

      setRooms(
        [...roomOptions].sort((a, b) =>
          String(a.roomName || a.id || '').localeCompare(String(b.roomName || b.id || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      );
    } catch (error) {
      console.error(error);
      setRooms([]);
      toast(error?.response?.data?.message || 'Fetch rooms failed', 'error');
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    setForm(initialForm);
    fetchRooms();
  }, [open, fetchRooms]);

  const locked = saving || loadingRooms || disabled;

  const setValue = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.roomId) return 'Room is required';
    if (!form.checkInDate) return 'Check-in date is required';
    if (!form.checkInTime) return 'Check-in time is required';
    if (!form.checkOutDate) return 'Check-out date is required';
    if (!form.checkOutTime) return 'Check-out time is required';
    if (!form.peopleInCharge.trim()) return 'People in charge is required';
    if (!form.basedLocation.trim()) return 'Based location is required';

    const checkInAt = toDateTime(form.checkInDate, form.checkInTime);
    const checkOutAt = toDateTime(form.checkOutDate, form.checkOutTime);

    if (!checkInAt || !checkOutAt) {
      return 'Check-in/check-out date time is invalid';
    }

    if (checkOutAt <= checkInAt) {
      return 'Check-out date/time must be after check-in date/time';
    }

    if (form.roomCharged !== '') {
      const charged = Number(form.roomCharged);

      if (Number.isNaN(charged)) {
        return 'Room charged must be a valid VND amount';
      }

      if (charged < 0) {
        return 'Room charged must be greater than or equal to 0 VND';
      }

      if (!Number.isInteger(charged)) {
        return 'Room charged must be a whole number in VND';
      }
    }

    return null;
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    roomId: form.roomId,
    checkInDate: form.checkInDate,
    checkInTime: form.checkInTime,
    checkOutDate: form.checkOutDate,
    checkOutTime: form.checkOutTime,
    peopleInCharge: form.peopleInCharge.trim(),
    basedLocation: form.basedLocation.trim(),
    roomCharged: form.roomCharged === '' ? null : Number(form.roomCharged),
  });

  const handleClose = () => {
    if (!locked) onCancel?.();
  };

  const handleSubmit = () => {
    const err = validate();

    if (err) {
      toast(err, 'error');
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setSaving(true);

    try {
      await axios.post(
        BOOKING_API,
        buildPayload(),
        { headers: getAuthHeaders(true) }
      );

      toast('Room booking created successfully');
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Create room booking failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedRoomName = rooms.find((room) => room.id === form.roomId)?.roomName || '';

  const paperSx = useMemo(() => ({
    borderRadius: fullScreen ? 0 : 4,
    boxShadow: `0 20px 60px ${alpha('#000', 0.25)}`,
  }), [fullScreen]);

  const headerSx = useMemo(() => ({
    pt: 3,
    pb: 2,
    px: 3,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  }), [theme]);

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
    },
  };

  const gradientBtnSx = {
    borderRadius: 999,
    px: 3,
    py: 1,
    fontWeight: 700,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={locked ? undefined : handleClose}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={headerSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Add Room Booking
              </Typography>

              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Create a new room booking request
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<EventAvailableRoundedIcon />}
                label="Adding"
                size="small"
                sx={{ bgcolor: alpha('#fff', 0.2), color: 'white' }}
              />

              <Tooltip title="Close">
                <IconButton onClick={handleClose} sx={{ color: 'white' }} disabled={locked}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 1 }}>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
              }}
            >
              <TextField
                label="Title"
                value={form.title}
                onChange={(e) => setValue('title', e.target.value)}
                disabled={locked}
                size="small"
                fullWidth
                required
                autoFocus
                sx={fieldSx}
              />

              <FormControl size="small" fullWidth required disabled={locked} sx={fieldSx}>
                <InputLabel>Room</InputLabel>
                <Select
                  label="Room"
                  value={form.roomId}
                  onChange={(e) => setValue('roomId', e.target.value)}
                >
                  {rooms.length === 0 && (
                    <MenuItem value="" disabled>
                      {loadingRooms ? 'Loading rooms...' : 'No rooms available'}
                    </MenuItem>
                  )}

                  {rooms.map((room) => (
                    <MenuItem key={room.id} value={room.id}>
                      {room.roomName || room.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1.3fr 0.7fr' },
                  gap: 1,
                }}
              >
                <TextField
                  label="Check-in Date"
                  type="date"
                  value={form.checkInDate}
                  onChange={(e) => setValue('checkInDate', e.target.value)}
                  disabled={locked}
                  size="small"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={fieldSx}
                />

                <TextField
                  label="Check-in Time"
                  type="time"
                  value={form.checkInTime}
                  onChange={(e) => setValue('checkInTime', e.target.value)}
                  disabled={locked}
                  size="small"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 60 }}
                  sx={fieldSx}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1.3fr 0.7fr' },
                  gap: 1,
                }}
              >
                <TextField
                  label="Check-out Date"
                  type="date"
                  value={form.checkOutDate}
                  onChange={(e) => setValue('checkOutDate', e.target.value)}
                  disabled={locked}
                  size="small"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={fieldSx}
                />

                <TextField
                  label="Check-out Time"
                  type="time"
                  value={form.checkOutTime}
                  onChange={(e) => setValue('checkOutTime', e.target.value)}
                  disabled={locked}
                  size="small"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 60 }}
                  sx={fieldSx}
                />
              </Box>

              <TextField
                label="People in Charge"
                value={form.peopleInCharge}
                onChange={(e) => setValue('peopleInCharge', e.target.value)}
                disabled={locked}
                size="small"
                fullWidth
                required
                sx={fieldSx}
              />

              <TextField
                label="Based Location"
                value={form.basedLocation}
                onChange={(e) => setValue('basedLocation', e.target.value)}
                disabled={locked}
                size="small"
                fullWidth
                required
                sx={fieldSx}
              />

              <TextField
                label="Room Charged (VND)"
                type="number"
                value={form.roomCharged}
                onChange={(e) => setValue('roomCharged', e.target.value)}
                disabled={locked}
                size="small"
                fullWidth
                inputProps={{
                  min: 0,
                  step: 1000,
                }}
                sx={fieldSx}
              />
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.primary.main, 0.08),
              }}
            >
              <Stack direction="row" spacing={1}>
                <InfoRoundedIcon fontSize="small" />
                <Typography fontSize={12}>
                  Booking saves roomId, check-in/check-out date and time. Selected room name: <b>{selectedRoomName || '-'}</b>.
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={locked}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              locked
              || !form.title.trim()
              || !form.roomId
              || !form.checkInDate
              || !form.checkInTime
              || !form.checkOutDate
              || !form.checkOutTime
              || !form.peopleInCharge.trim()
              || !form.basedLocation.trim()
            }
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Create</DialogTitle>

        <DialogContent>
          <Typography>
            Create room booking <b>{form.title}</b> ?
          </Typography>
          <Typography fontSize={12} color="text.secondary" sx={{ mt: 1 }}>
            {form.checkInDate} {form.checkInTime} → {form.checkOutDate} {form.checkOutTime}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>No</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbarSeverity} sx={{ width: '100%' }} onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
