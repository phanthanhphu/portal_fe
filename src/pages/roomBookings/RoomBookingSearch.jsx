import React, { useCallback, useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Box,
} from '@mui/material';
import { Add, FileDownload } from '@mui/icons-material';
import EnglishDateField from './EnglishDateField';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const ROOM_API = `${API_BASE_URL}/api/rooms`;
const LOCATION_API = `${API_BASE_URL}/api/locations`;

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

const inputSx = {
  '& .MuiInputBase-root': { height: 38 },
};

const filterItemSx = {
  // Cho input tự giãn để phủ đầy chiều ngang của hàng search.
  flex: '1.15 1 0',
  minWidth: 165,
};

const locationItemSx = {
  flex: '1.25 1 0',
  minWidth: 180,
};

const dateItemSx = {
  flex: '0.95 1 0',
  minWidth: 160,
};

const nameItemSx = {
  flex: '1.15 1 0',
  minWidth: 165,
};

const actionButtonSx = {
  height: 38,
  minWidth: 96,
  borderRadius: 1.2,
  textTransform: 'none',
  fontWeight: 400,
  whiteSpace: 'nowrap',
};

export default function RoomBookingSearch({
  searchName,
  setSearchName,
  roomId,
  setRoomId,
  locationId,
  setLocationId,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  onSearch,
  onReset,
  onAdd,
  onExport,
  exporting = false,
  canExport = true,
  disabled = false,
}) {
  const [rooms, setRooms] = useState([]);
  const [locations, setLocations] = useState([]);

  const searchKeyword = searchName ?? '';
  const setSearchKeyword = setSearchName || (() => {});

  const fetchRooms = useCallback(async () => {
    try {
      const response = await axios.get(`${ROOM_API}/options`, {
        headers: getAuthHeaders('*/*'),
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
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await axios.get(`${LOCATION_API}/options`, {
        headers: getAuthHeaders('*/*'),
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
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchLocations();
  }, [fetchRooms, fetchLocations]);

  const handleSearch = useCallback(() => {
    onSearch?.();
  }, [onSearch]);

  const handleReset = useCallback(() => {
    setSearchKeyword('');
    setRoomId?.('');
    setLocationId?.('');
    setFromDate?.('');
    setToDate?.('');
    onReset?.();
  }, [setSearchKeyword, setRoomId, setLocationId, setFromDate, setToDate, onReset]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !disabled) {
      handleSearch();
    }
  }, [disabled, handleSearch]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Room Booking Filter
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          sx={{
            flexWrap: 'nowrap',
            overflowX: { xs: 'auto', sm: 'visible' },
            pb: { xs: 0.25, sm: 0 },
          }}
        >
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={15} /> : <FileDownload fontSize="small" />}
            onClick={onExport}
            disabled={disabled || exporting || !canExport}
            sx={{
              ...actionButtonSx,
              px: 1.25,
              flexShrink: 0,
              borderColor: '#111827',
              color: '#111827',
              '&:hover': {
                borderColor: '#0b1220',
                color: '#0b1220',
                backgroundColor: 'rgba(17, 24, 39, 0.04)',
              },
            }}
          >
            Export Excel
          </Button>

          <Button
            variant="contained"
            startIcon={<Add fontSize="small" />}
            onClick={onAdd}
            disabled={disabled}
            sx={{
              ...actionButtonSx,
              px: 1.25,
              flexShrink: 0,
              backgroundColor: '#111827',
              '&:hover': { backgroundColor: '#0b1220' },
            }}
          >
            Add Booking
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 1,
          alignItems: 'center',
          width: '100%',
          overflowX: 'auto',
          pb: 0.5,
          // Tránh input bị co nhỏ làm label ngày bị che, nhưng vẫn fill hết hàng ngang.
          '& > .MuiFormControl-root': { minWidth: 0 },
        }}
      >
        <TextField
          label="Name"
          size="small"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={{
            ...inputSx,
            ...nameItemSx,
          }}
        />

        <FormControl
          size="small"
          fullWidth
          disabled={disabled}
          sx={{
            ...inputSx,
            ...filterItemSx,
          }}
        >
          <InputLabel>Room</InputLabel>
          <Select
            label="Room"
            value={roomId || ''}
            onChange={(e) => setRoomId?.(e.target.value)}
          >
            <MenuItem value="">All Rooms</MenuItem>
            {rooms.map((room) => (
              <MenuItem key={room.id} value={room.id}>
                {room.roomName || room.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          fullWidth
          disabled={disabled}
          sx={{
            ...inputSx,
            ...locationItemSx,
          }}
        >
          <InputLabel>Based Location</InputLabel>
          <Select
            label="Based Location"
            value={locationId || ''}
            onChange={(e) => setLocationId?.(e.target.value)}
          >
            <MenuItem value="">All Locations</MenuItem>
            {locations.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.location || item.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <EnglishDateField
          label="From Date"
          labelAsPlaceholder
          value={fromDate || ''}
          onChange={(nextValue) => setFromDate?.(nextValue)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          sx={{
            ...inputSx,
            ...dateItemSx,
          }}
        />

        <EnglishDateField
          label="To Date"
          labelAsPlaceholder
          value={toDate || ''}
          onChange={(nextValue) => setToDate?.(nextValue)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          sx={{
            ...inputSx,
            ...dateItemSx,
          }}
        />

        <Stack
          direction="row"
          spacing={1}
          sx={{
            flex: '0 0 auto',
            minWidth: 205,
            ml: 0,
            flexWrap: 'nowrap',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={disabled}
            fullWidth
            sx={{
              ...actionButtonSx,
              flex: '1 1 0',
              backgroundColor: '#111827',
              '&:hover': { backgroundColor: '#0b1220' },
            }}
          >
            Search
          </Button>

          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={disabled}
            fullWidth
            sx={{
              ...actionButtonSx,
              flex: '1 1 0',
              borderColor: '#111827',
              color: '#111827',
              '&:hover': {
                borderColor: '#0b1220',
                color: '#0b1220',
                backgroundColor: 'rgba(17, 24, 39, 0.04)',
              },
            }}
          >
            Reset
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
