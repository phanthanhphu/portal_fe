import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
} from '@mui/material';

export default function DepartmentSearch({
  searchValue,
  departmentNameValue,
  onSearchChange,
  onDepartmentNameChange,
  onSearch,
  onReset,
  disabled = false,
}) {
  const theme = useTheme();

  const [error, setError] = useState(null);
  const [departmentNameSearch, setDepartmentNameSearch] = useState(departmentNameValue || '');
  const [divisionSearch, setDivisionSearch] = useState(searchValue || '');

  useEffect(() => {
    setDepartmentNameSearch(departmentNameValue || '');
  }, [departmentNameValue]);

  useEffect(() => {
    setDivisionSearch(searchValue || '');
  }, [searchValue]);

  const closeError = () => setError(null);

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
      px: 2,
      color: '#111827',
      borderColor: '#e5e7eb',
      '&:hover': { borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
      whiteSpace: 'nowrap',
    }),
    []
  );

  const busy = disabled;

  const setLocalAndParentDepartment = (value) => {
    setDepartmentNameSearch(value);
    onDepartmentNameChange?.(value);
  };

  const setLocalAndParentDivision = (value) => {
    setDivisionSearch(value);
    onSearchChange?.(value);
  };

  const handleSearch = useCallback(() => {
    try {
      onSearch?.({ departmentName: departmentNameSearch, division: divisionSearch });
    } catch (e) {
      setError('Không thể thực hiện search. Vui lòng thử lại.');
    }
  }, [onSearch, departmentNameSearch, divisionSearch]);

  const handleReset = useCallback(() => {
    setDepartmentNameSearch('');
    setDivisionSearch('');
    onSearchChange?.('');
    onDepartmentNameChange?.('');
    onReset?.();
  }, [onReset, onSearchChange, onDepartmentNameChange]);

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
        overflowX: 'auto',
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
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(200px, 1fr)) auto auto' },
          gap: 1,
          alignItems: 'center',
        }}
      >
        <TextField
          label="Department Name"
          size="small"
          value={departmentNameSearch}
          onChange={(e) => setLocalAndParentDepartment(e.target.value)}
          disabled={disabled}
          sx={inputSx}
          placeholder="Type department…"
        />

        <TextField
          label="Division"
          size="small"
          value={divisionSearch}
          onChange={(e) => setLocalAndParentDivision(e.target.value)}
          disabled={disabled}
          sx={inputSx}
          placeholder="Type division…"
        />

        <Button variant="contained" onClick={handleSearch} disabled={busy} sx={btnPrimarySx}>
          Search
        </Button>

        <Button variant="outlined" onClick={handleReset} disabled={busy} sx={btnOutlineSx}>
          Reset
        </Button>
      </Box>
    </Paper>
  );
}

DepartmentSearch.propTypes = {
  searchValue: PropTypes.string,
  departmentNameValue: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  onDepartmentNameChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func,
  onReset: PropTypes.func,
  disabled: PropTypes.bool,
};