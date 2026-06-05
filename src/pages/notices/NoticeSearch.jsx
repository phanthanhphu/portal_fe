import React, { useCallback, useState } from 'react';
import {
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';

export default function NoticeSearch({
  searchDivision = '',
  setSearchDivision,
  searchDepartment = '',
  setSearchDepartment,
  searchTitle = '',
  setSearchTitle,
  searchContent = '',
  setSearchContent,
  onSearch,
  onReset,
  onAdd,
  disabled = false,
  disableDepartmentSearch = false,
  showAddButton = true,
}) {
  const [localError, setLocalError] = useState(null);

  const handleSearch = useCallback(() => {
    setLocalError(null);

    try {
      onSearch?.();
    } catch (error) {
      setLocalError(error?.message || 'Search failed');
    }
  }, [onSearch]);

  const handleReset = useCallback(() => {
    setSearchDivision?.('');
    setSearchDepartment?.('');
    setSearchTitle?.('');
    setSearchContent?.('');
    onReset?.();
  }, [setSearchDivision, setSearchDepartment, setSearchTitle, setSearchContent, onReset]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !disabled) {
        handleSearch();
      }
    },
    [disabled, handleSearch]
  );

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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Notices Filter
        </Typography>

        {showAddButton && (
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
            Add Notice
          </Button>
        )}
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        flexWrap="wrap"
        alignItems={{ md: 'flex-end' }}
        sx={{ width: '100%' }}
      >
        {setSearchDivision && (
          <TextField
            label="Division"
            size="small"
            value={searchDivision}
            onChange={(event) => setSearchDivision(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            fullWidth
            sx={{
              flex: 1,
              minWidth: { xs: '100%', md: 200 },
              '& .MuiInputBase-root': { height: 38 },
            }}
          />
        )}

        {setSearchDepartment && (
          <TextField
            label="Department Name"
            size="small"
            value={searchDepartment}
            onChange={(event) => setSearchDepartment(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || disableDepartmentSearch}
            fullWidth
            sx={{
              flex: 1,
              minWidth: { xs: '100%', md: 220 },
              '& .MuiInputBase-root': { height: 38 },
            }}
          />
        )}

        <TextField
          label="Title"
          size="small"
          value={searchTitle}
          onChange={(event) => setSearchTitle?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={{
            flex: 1,
            minWidth: { xs: '100%', md: 220 },
            '& .MuiInputBase-root': { height: 38 },
          }}
        />

        <TextField
          label="Content"
          size="small"
          value={searchContent}
          onChange={(event) => setSearchContent?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={{
            flex: 1,
            minWidth: { xs: '100%', md: 220 },
            '& .MuiInputBase-root': { height: 38 },
          }}
        />

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={disabled}
            sx={{
              height: 34,
              minWidth: 92,
              px: 2.5,
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
              height: 34,
              minWidth: 92,
              px: 2.5,
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

      <Snackbar
        open={!!localError}
        autoHideDuration={4000}
        onClose={() => setLocalError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setLocalError(null)}>
          {localError}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
