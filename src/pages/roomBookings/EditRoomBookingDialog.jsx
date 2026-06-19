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
import EnglishDateField from './EnglishDateField';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const ROOM_API = `${API_BASE_URL}/api/rooms`;
const LOCATION_API = `${API_BASE_URL}/api/locations`;
const BOOKING_API = `${API_BASE_URL}/api/room-bookings`;

const getAuthHeaders = (contentType = true) => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: '*/*',
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  };
};

const DEFAULT_TIME = '00:00';

const initialForm = {
  title: '',
  roomId: '',
  checkInDate: '',
  checkInTime: DEFAULT_TIME,
  checkOutDate: '',
  checkOutTime: DEFAULT_TIME,
  peopleInCharge: '',
  locationId: '',
  basedLocation: '',
  roomCharged: '',
};


const normalizeIsoDateValue = (value) => {
  if (!value) return '';

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return '';
  }

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) return '';

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const toDateInputValue = (value) => {
  if (!value) return '';

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (typeof value === 'string') {
    return normalizeIsoDateValue(value);
  }

  return '';
};

const toTimeInputValue = (value, fallback = '') => {
  if (!value) return fallback;

  if (Array.isArray(value) && value.length >= 2) {
    const [hour, minute] = value;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  if (typeof value === 'string') {
    return value.slice(0, 5);
  }

  return fallback;
};

const toDateTime = (date, time) => {
  if (!date) return null;
  const safeTime = time || DEFAULT_TIME;
  const value = new Date(`${date}T${safeTime}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

export default function EditRoomBookingDialog({
  open,
  onCancel,
  onOk,
  currentItem = null,
  disabled = false,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [form, setForm] = useState(initialForm);
  const [rooms, setRooms] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
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

  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true);

    try {
      const response = await axios.get(`${LOCATION_API}/options`, {
        headers: getAuthHeaders(false),
      });

      const locationOptions = Array.isArray(response?.data) ? response.data : [];

      setLocations(
        [...locationOptions].sort((a, b) =>
          String(a.location || a.id || '').localeCompare(String(b.location || b.id || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      );
    } catch (error) {
      console.error(error);
      setLocations([]);
      toast(error?.response?.data?.message || 'Fetch locations failed', 'error');
    } finally {
      setLoadingLocations(false);
    }
  }, []);


  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    setForm({
      title: currentItem?.title || '',
      roomId: currentItem?.roomId || '',
      checkInDate: toDateInputValue(currentItem?.checkInDate),
      checkInTime: toTimeInputValue(currentItem?.checkInTime, DEFAULT_TIME),
      checkOutDate: toDateInputValue(currentItem?.checkOutDate),
      checkOutTime: toTimeInputValue(currentItem?.checkOutTime, DEFAULT_TIME),
      peopleInCharge: currentItem?.peopleInCharge || '',
      locationId: String(currentItem?.locationId || ''),
      basedLocation: currentItem?.basedLocation || '',
      roomCharged: currentItem?.roomCharged ?? '',
    });

    setSaving(false);
    setConfirmOpen(false);
    fetchRooms();
    fetchLocations();
  }, [open, currentItem, fetchRooms, fetchLocations]);

  /*
   * Fix lỗi mở Edit nhưng Location dropdown không tự select.
   *
   * Nguyên nhân thường gặp:
   * - List/search API trả currentItem chỉ có basedLocation text, chưa có locationId.
   * - Hoặc locationId có nhưng options /api/locations/options load sau.
   *
   * Cách xử lý:
   * - Ưu tiên match theo locationId.
   * - Nếu không có locationId thì match ngược theo basedLocation name.
   */
  useEffect(() => {
    if (!open || !currentItem || locations.length === 0) {
      return;
    }

    setForm((prev) => {
      const currentLocationId = String(currentItem?.locationId || prev.locationId || '').trim();
      const currentLocationName = currentItem?.basedLocation || prev.basedLocation || '';

      const matchedById = currentLocationId
        ? locations.find((location) => String(location.id || '').trim() === currentLocationId)
        : null;

      const matchedByName = currentLocationName
        ? locations.find((location) => normalizeText(location.location) === normalizeText(currentLocationName))
        : null;

      const matchedLocation = matchedById || matchedByName;

      if (!matchedLocation?.id) {
        return prev;
      }

      const nextLocationId = String(matchedLocation.id || '').trim();
      const nextBasedLocation = matchedLocation.location || currentLocationName || '';

      if (prev.locationId === nextLocationId && prev.basedLocation === nextBasedLocation) {
        return prev;
      }

      return {
        ...prev,
        locationId: nextLocationId,
        basedLocation: nextBasedLocation,
      };
    });
  }, [open, currentItem, locations]);

  const locked = saving || loadingRooms || loadingLocations || disabled;

  const setValue = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validate = () => {
    if (!currentItem?.id) return 'Invalid room booking item';
    if (!form.title.trim()) return 'Name is required';
    if (!form.roomId) return 'Room is required';
    if (!form.checkInDate) return 'Check-in date is required';
    if (!form.checkOutDate) return 'Check-out date is required';
    if (!form.peopleInCharge.trim()) return 'People in charge is required';
    if (!form.locationId) return 'Location is required';

    const checkInDate = normalizeIsoDateValue(form.checkInDate);
    const checkOutDate = normalizeIsoDateValue(form.checkOutDate);

    if (!checkInDate || !checkOutDate) {
      return 'Please enter date as MM/DD/YYYY';
    }

    const checkInAt = toDateTime(checkInDate, form.checkInTime || DEFAULT_TIME);
    const checkOutAt = toDateTime(checkOutDate, form.checkOutTime || DEFAULT_TIME);

    if (!checkInAt || !checkOutAt) {
      return 'Check-in/check-out date time is invalid';
    }

    if (checkOutAt <= checkInAt) {
      return 'Check-out date/time must be after check-in date/time';
    }

    if (form.roomCharged !== '') {
      const chargedText = String(form.roomCharged).trim();
      const charged = Number(chargedText);

      if (Number.isNaN(charged)) {
        return 'Room charged must be a valid USD amount';
      }

      if (charged < 0) {
        return 'Room charged must be greater than or equal to 0 USD';
      }

      if (!/^\d+(\.\d{1,2})?$/.test(chargedText)) {
        return 'Room charged supports up to 2 decimal places in USD';
      }
    }

    return null;
  };

  const buildPayload = () => ({
    id: currentItem.id,
    title: form.title.trim(),
    roomId: form.roomId,
    checkInDate: normalizeIsoDateValue(form.checkInDate),
    checkInTime: form.checkInTime || DEFAULT_TIME,
    checkOutDate: normalizeIsoDateValue(form.checkOutDate),
    checkOutTime: form.checkOutTime || DEFAULT_TIME,
    peopleInCharge: form.peopleInCharge.trim(),
    locationId: form.locationId,
    // Backend sẽ lấy tên location theo locationId. Giữ basedLocation để tương thích dữ liệu cũ.
    basedLocation: selectedLocationName || form.basedLocation || '',
    roomCharged: form.roomCharged === '' ? null : Number(form.roomCharged),
    showOnIndexRoom: currentItem.showOnIndexRoom,
    createdBy: currentItem.createdBy,
    createdAt: currentItem.createdAt,
    updatedAt: currentItem.updatedAt,
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
      await axios.put(
        `${BOOKING_API}/${currentItem.id}`,
        buildPayload(),
        { headers: getAuthHeaders(true) }
      );

      toast('Room booking updated successfully');
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Update room booking failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedRoomName = rooms.find((room) => room.id === form.roomId)?.roomName || currentItem?.roomName || '';
  const selectedLocationName = locations.find((location) => String(location.id || '').trim() === String(form.locationId || '').trim())?.location || currentItem?.basedLocation || '';

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

  const fieldSx = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
    },
  }), []);

  const gradientBtnSx = useMemo(() => ({
    borderRadius: 999,
    px: 2.2,
    py: 1.1,
    fontWeight: 800,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  }), [theme]);

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
                Edit Room Booking
              </Typography>

              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Update room booking request
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<EventAvailableRoundedIcon />}
                label="Editing"
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
        <br></br>
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
                label="Name"
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
                <EnglishDateField
                  label="Check-in Date"
                  value={form.checkInDate}
                  onChange={(nextValue) => setValue('checkInDate', nextValue)}
                  disabled={locked}
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
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 60 }}
                  helperText="Default 00:00"
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
                <EnglishDateField
                  label="Check-out Date"
                  value={form.checkOutDate}
                  onChange={(nextValue) => setValue('checkOutDate', nextValue)}
                  disabled={locked}
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
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 60 }}
                  helperText="Default 00:00"
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

              <FormControl size="small" fullWidth required disabled={locked} sx={fieldSx}>
                <InputLabel>Location</InputLabel>
                <Select
                  label="Location"
                  value={form.locationId}
                  onChange={(e) => {
                    const nextLocationId = String(e.target.value || '').trim();
                    const matchedLocation = locations.find((location) => String(location.id || '').trim() === nextLocationId);

                    setForm((prev) => ({
                      ...prev,
                      locationId: nextLocationId,
                      basedLocation: matchedLocation?.location || '',
                    }));
                  }}
                >
                  {locations.length === 0 && (
                    <MenuItem value="" disabled>
                      {loadingLocations ? 'Loading locations...' : 'No locations available'}
                    </MenuItem>
                  )}

                  {form.locationId && !locations.some((location) => String(location.id || '').trim() === String(form.locationId || '').trim()) && (
                    <MenuItem value={form.locationId}>
                      {form.basedLocation || form.locationId}
                    </MenuItem>
                  )}

                  {locations.map((location) => (
                    <MenuItem key={location.id} value={String(location.id || '')}>
                      {location.location || location.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Room Charged (USD)"
                type="number"
                value={form.roomCharged}
                onChange={(e) => setValue('roomCharged', e.target.value)}
                disabled={locked}
                size="small"
                fullWidth
                inputProps={{
                  min: 0,
                  step: 0.01,
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
                  Booking saves roomId and locationId. Current selected room: <b>{selectedRoomName || '-'}</b>. Current selected location: <b>{selectedLocationName || '-'}</b>.
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
              || !form.checkOutDate
              || !form.peopleInCharge.trim()
              || !form.locationId
            }
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Update</DialogTitle>

        <DialogContent>
          <Typography>
            Update room booking <b>{form.title}</b> ?
          </Typography>
          <Typography fontSize={12} color="text.secondary" sx={{ mt: 1 }}>
            {form.checkInDate} {form.checkInTime || DEFAULT_TIME} → {form.checkOutDate} {form.checkOutTime || DEFAULT_TIME}
          </Typography>
          <Typography fontSize={12} color="text.secondary" sx={{ mt: 0.5 }}>
            Location: {selectedLocationName || '-'}
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
