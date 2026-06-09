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
} from '@mui/material';
import { Add } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const ROOM_API = `${API_BASE_URL}/api/rooms`;

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

export default function RoomBookingSearch({
  searchName,
  setSearchName,
  roomId,
  setRoomId,
  onSearch,
  onReset,
  onAdd,
  disabled = false,
}) {
  const [rooms, setRooms] = useState([]);

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

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSearch = useCallback(() => {
    onSearch?.();
  }, [onSearch]);

  const handleReset = useCallback(() => {
    setSearchName('');
    setRoomId('');
    onReset?.();
  }, [setSearchName, setRoomId, onReset]);

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

        <Button
          variant="contained"
          startIcon={<Add fontSize="small" />}
          onClick={onAdd}
          disabled={disabled}
          sx={{
            borderRadius: 1.2,
            height: 34,
            px: 1.25,
            textTransform: 'none',
            fontWeight: 400,
            backgroundColor: '#111827',
            '&:hover': { backgroundColor: '#0b1220' },
          }}
        >
          Add Booking
        </Button>
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        flexWrap="wrap"
        alignItems={{ md: 'flex-end' }}
        sx={{ width: '100%' }}
      >
        <TextField
          label="Search Title / People in Charge / Based Location"
          size="small"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={{
            flex: 1,
            minWidth: { xs: '100%', md: 320 },
            '& .MuiInputBase-root': { height: 38 },
          }}
        />

        <FormControl
          size="small"
          sx={{
            minWidth: { xs: '100%', md: 240 },
            '& .MuiInputBase-root': { height: 38 },
          }}
          disabled={disabled}
        >
          <InputLabel>Room</InputLabel>
          <Select
            label="Room"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            <MenuItem value="">All Rooms</MenuItem>
            {rooms.map((room) => (
              <MenuItem key={room.id} value={room.id}>
                {room.roomName || room.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0, mt: 1 }}>
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={disabled}
            sx={{
              height: 38,
              minWidth: 100,
              borderRadius: 1.2,
              textTransform: 'none',
              fontWeight: 400,
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
            sx={{
              height: 38,
              minWidth: 100,
              borderRadius: 1.2,
              textTransform: 'none',
              fontWeight: 400,
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
      </Stack>
    </Paper>
  );
}
