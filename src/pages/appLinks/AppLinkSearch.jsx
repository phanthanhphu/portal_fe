import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';

export default function AppLinkSearch({
  nameValue = '',
  descValue = '',
  onNameChange,
  onDescChange,
  onSearch,
  onReset,
  disabled = false,
}) {
  const theme = useTheme();

  const [localName, setLocalName] = useState(nameValue || '');
  const [localDesc, setLocalDesc] = useState(descValue || '');
  const [error, setError] = useState(null);

  // Đồng bộ state từ parent khi props thay đổi
  useEffect(() => {
    setLocalName(nameValue || '');
  }, [nameValue]);

  useEffect(() => {
    setLocalDesc(descValue || '');
  }, [descValue]);

  const closeError = () => setError(null);

  // Style chung cho input (giống DepartmentSearch)
  const inputSx = useMemo(
    () => ({
      '& .MuiInputBase-root': {
        height: 34,
        borderRadius: 1.2,
        fontSize: '0.85rem',
        backgroundColor: disabled ? '#f9fafb' : '#fff',
      },
      '& .MuiInputLabel-root': { fontSize: '0.8rem' },
      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
      },
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
      px: 3,
      backgroundColor: '#111827',
      '&:hover': { backgroundColor: '#0b1220' },
      whiteSpace: 'nowrap',
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
      px: 3,
      color: '#111827',
      borderColor: '#e5e7eb',
      '&:hover': { borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
      whiteSpace: 'nowrap',
    }),
    []
  );

  const handleSearch = useCallback(() => {
    try {
      onSearch?.({
        name: localName.trim(),
        desc: localDesc.trim(),
      });
    } catch (e) {
      setError('Không thể thực hiện tìm kiếm. Vui lòng thử lại.');
    }
  }, [onSearch, localName, localDesc]);

  const handleReset = useCallback(() => {
    setLocalName('');
    setLocalDesc('');
    onNameChange?.('');
    onDescChange?.('');
    onReset?.();
  }, [onNameChange, onDescChange, onReset]);

  const setLocalAndParentName = (value) => {
    setLocalName(value);
    onNameChange?.(value);
  };

  const setLocalAndParentDesc = (value) => {
    setLocalDesc(value);
    onDescChange?.(value);
  };

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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(220px, 1fr)) auto auto',
          },
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        <TextField
          label="Name"
          size="small"
          value={localName}
          onChange={(e) => setLocalAndParentName(e.target.value)}
          disabled={disabled}
          sx={inputSx}
          placeholder="Search by name..."
        />

        <TextField
          label="Description"
          size="small"
          value={localDesc}
          onChange={(e) => setLocalAndParentDesc(e.target.value)}
          disabled={disabled}
          sx={inputSx}
          placeholder="Search by description..."
        />

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={disabled}
          sx={btnPrimarySx}
        >
          Search
        </Button>

        <Button
          variant="outlined"
          onClick={handleReset}
          disabled={disabled}
          sx={btnOutlineSx}
        >
          Reset
        </Button>
      </Box>
    </Paper>
  );
}

AppLinkSearch.propTypes = {
  nameValue: PropTypes.string,
  descValue: PropTypes.string,
  onNameChange: PropTypes.func.isRequired,
  onDescChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};