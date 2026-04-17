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

export default function NoticeSearch({
  searchTitle,
  setSearchTitle,
  searchContent,
  setSearchContent,
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
    setSearchTitle('');
    setSearchContent('');
    onReset();
  }, [setSearchTitle, setSearchContent, onReset]);

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
        Notices Filter
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        flexWrap="wrap"
        alignItems={{ md: 'flex-end' }}
        sx={{ width: '100%' }}
      >
        <TextField
          key="search-title"
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
          key="search-content"
          label="Content"
          size="small"
          value={searchContent}
          onChange={(e) => setSearchContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={{
            flex: 1,
            minWidth: { xs: '100%', md: 220 },
            '& .MuiInputBase-root': { height: 38 },
          }}
        />

        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0, mt: 1 }}>
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={disabled}
            sx={{ height: 38, minWidth: 100, textTransform: 'none' }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={disabled}
            sx={{ height: 38, minWidth: 100, textTransform: 'none' }}
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