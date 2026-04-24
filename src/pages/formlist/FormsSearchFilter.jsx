import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';

export default function FormsSearchFilter({
  searchDeptName,
  setSearchDeptName,
  searchTitle,
  setSearchTitle,
  searchDesc,
  setSearchDesc,
  onSearch,
  onReset,
  disabled = false,
}) {
  const [localError, setLocalError] = useState(null);

  const handleSearch = useCallback(() => {
    setLocalError(null);
    onSearch();
  }, [onSearch]);

  const handleReset = useCallback(() => {
    setSearchDeptName('');
    setSearchTitle('');
    setSearchDesc('');
    onReset();
  }, [setSearchDeptName, setSearchTitle, setSearchDesc, onReset]);

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
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        Form Filters
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        flexWrap="wrap"
        alignItems={{ md: 'flex-end' }}
        sx={{ width: '100%' }}
      >
        <TextField
          key="search-dept-name"  // ← thêm key để ổn định
          label="Department Name"
          size="small"
          value={searchDeptName}
          onChange={(e) => setSearchDeptName(e.target.value)}
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
          key="search-title"  // ← thêm key
          label="Title"
          size="small"
          value={searchTitle}
          onChange={(e) => setSearchTitle(e.target.value)}
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
          key="search-desc"  // ← thêm key
          label="Description"
          size="small"
          value={searchDesc}
          onChange={(e) => setSearchDesc(e.target.value)}
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
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#0b1220',
                boxShadow: 'none',
              },
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