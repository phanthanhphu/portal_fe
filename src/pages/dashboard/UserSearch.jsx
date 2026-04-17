import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

export default function UserSearch({
  searchUsername,
  setSearchUsername,
  searchAddress,
  setSearchAddress,
  searchPhone,
  setSearchPhone,
  searchEmail,
  setSearchEmail,
  searchRole,
  setSearchRole,
  setPage,
  onSearch,
  onReset,
  disabled = false,
}) {
  const theme = useTheme();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const closeError = () => setError(null);
  const busy = disabled || loading;
  const setPage0 = () => setPage?.(0);

  const inputSx = useMemo(
    () => ({
      '& .MuiInputBase-root': {
        height: 34,
        borderRadius: 1.2,
        fontSize: '0.8rem',
        backgroundColor: disabled ? '#f9fafb' : '#fff',
      },
      '& .MuiInputLabel-root': { fontSize: '0.8rem' },
      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
      width: '100%',
    }),
    [disabled, theme.palette.primary.main]
  );

  const btnPrimarySx = useMemo(
    () => ({
      textTransform: 'none',
      fontWeight: 400,
      borderRadius: 1.2,
      height: 34,
      fontSize: '0.85rem',
      px: 2,
      backgroundColor: '#111827',
      '&:hover': { backgroundColor: '#0b1220' },
    }),
    []
  );

  const btnOutlineSx = useMemo(
    () => ({
      textTransform: 'none',
      fontWeight: 400,
      borderRadius: 1.2,
      height: 34,
      fontSize: '0.85rem',
      px: 2,
      color: '#111827',
      borderColor: '#e5e7eb',
      '&:hover': { borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
    }),
    []
  );

  const isValidEmail = useCallback((email) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, []);

  const onEnterSearch = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSearch = useCallback(async () => {
    if (busy) return;

    if (searchEmail && !isValidEmail(searchEmail)) {
      setError('Email không đúng định dạng.');
      return;
    }

    setLoading(true);
    setPage0();
    try {
      await onSearch?.();
    } catch (e) {
      console.error('Search error:', e);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [busy, isValidEmail, onSearch, searchEmail]);

  const handleReset = useCallback(() => {
    setPage0();
    setSearchUsername('');
    setSearchAddress('');
    setSearchPhone('');
    setSearchEmail('');
    setSearchRole('');
    onReset?.();
  }, [
    onReset,
    setSearchAddress,
    setSearchEmail,
    setSearchPhone,
    setSearchRole,
    setSearchUsername,
    setPage,
  ]);

  const emailError = !!searchEmail && !isValidEmail(searchEmail);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        mb: 1,
        borderRadius: 1.5,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'auto', // quan trọng: giữ 1 hàng + màn nhỏ vẫn kéo ngang
      }}
    >
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={closeError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={closeError} severity="error" sx={{ width: '100%', fontSize: '0.85rem' }}>
          {error}
        </Alert>
      </Snackbar>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
          Filters
        </Typography>
      </Stack>

      {/* ONE ROW ONLY */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(7, minmax(180px, 1fr))',
            md: 'repeat(7, minmax(160px, 1fr))',
          },
          gap: 1,
          alignItems: 'center',
          minWidth: { xs: 7 * 180, md: 'unset' }, // ép nó thành 1 hàng thật sự (xs sẽ scroll)
        }}
      >
        <TextField
          label="Username"
          size="small"
          value={searchUsername}
          onChange={(e) => {
            setPage0();
            setSearchUsername(e.target.value);
          }}
          disabled={disabled}
          sx={inputSx}
          onKeyDown={onEnterSearch}
        />

        <TextField
          label="Email"
          size="small"
          value={searchEmail}
          onChange={(e) => {
            setPage0();
            setSearchEmail(e.target.value);
          }}
          disabled={disabled}
          sx={inputSx}
          onKeyDown={onEnterSearch}
          error={emailError}
          helperText={emailError ? 'Invalid email' : ''}
        />

        <TextField
          label="Phone"
          size="small"
          value={searchPhone}
          onChange={(e) => {
            setPage0();
            setSearchPhone(e.target.value);
          }}
          disabled={disabled}
          sx={inputSx}
          onKeyDown={onEnterSearch}
        />

        <FormControl fullWidth size="small" sx={inputSx}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>Role</InputLabel>
          <Select
            value={searchRole || ''}
            label="Role"
            onChange={(e) => {
              setPage0();
              setSearchRole(e.target.value);
            }}
            disabled={disabled}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="User">User</MenuItem>
            <MenuItem value="Leader">Leader</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Address"
          size="small"
          value={searchAddress}
          onChange={(e) => {
            setPage0();
            setSearchAddress(e.target.value);
          }}
          disabled={disabled}
          sx={inputSx}
          onKeyDown={onEnterSearch}
        />

        <Button variant="contained" onClick={handleSearch} disabled={busy} sx={btnPrimarySx}>
          {loading ? 'Searching…' : 'Search'}
        </Button>

        <Button variant="outlined" onClick={handleReset} disabled={busy} sx={btnOutlineSx}>
          Reset
        </Button>
      </Box>
    </Paper>
  );
}

UserSearch.propTypes = {
  searchUsername: PropTypes.string,
  setSearchUsername: PropTypes.func.isRequired,
  searchAddress: PropTypes.string,
  setSearchAddress: PropTypes.func.isRequired,
  searchPhone: PropTypes.string,
  setSearchPhone: PropTypes.func.isRequired,
  searchEmail: PropTypes.string,
  setSearchEmail: PropTypes.func.isRequired,
  searchRole: PropTypes.string,
  setSearchRole: PropTypes.func.isRequired,
  setPage: PropTypes.func,
  onSearch: PropTypes.func,
  onReset: PropTypes.func,
  disabled: PropTypes.bool,
};
