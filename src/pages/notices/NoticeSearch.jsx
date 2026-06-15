import React, { useCallback, useState } from 'react';
import {
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Snackbar,
  Alert,
  Box,
} from '@mui/material';
import { Add } from '@mui/icons-material';

const mainFieldSx = {
  flex: '1.15 1 220px',
  minWidth: { xs: '100%', sm: 200, md: 220 },
  '& .MuiInputBase-root': { height: 38 },
};

const smallFieldSx = {
  // Division và Department Name nhỏ hơn Title/Content.
  flex: '0.75 1 165px',
  minWidth: { xs: '100%', sm: 155, md: 165 },
  maxWidth: { xs: '100%', lg: 220 },
  '& .MuiInputBase-root': { height: 38 },
};

const actionButtonSx = {
  height: 34,
  minWidth: 92,
  px: 2.5,
  borderRadius: 1.2,
  textTransform: 'none',
  fontWeight: 400,
  whiteSpace: 'nowrap',
};

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
              whiteSpace: 'nowrap',
              backgroundColor: '#111827',
              '&:hover': { backgroundColor: '#0b1220' },
            }}
          >
            Add Notice
          </Button>
        )}
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'flex-end',
          width: '100%',
        }}
      >
        <TextField
          label="Title"
          size="small"
          value={searchTitle}
          onChange={(event) => setSearchTitle?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={mainFieldSx}
        />

        <TextField
          label="Content"
          size="small"
          value={searchContent}
          onChange={(event) => setSearchContent?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          sx={mainFieldSx}
        />

        {setSearchDivision && (
          <TextField
            label="Division"
            size="small"
            value={searchDivision}
            onChange={(event) => setSearchDivision(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            fullWidth
            sx={smallFieldSx}
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
            sx={smallFieldSx}
          />
        )}

        <Stack
          direction="row"
          spacing={1}
          sx={{
            flex: {
              xs: '1 1 100%',
              sm: '0 0 auto',
            },
            flexShrink: 0,
            flexWrap: 'nowrap',
            ml: { xs: 0, lg: 'auto' },
            minWidth: { xs: '100%', sm: 196 },
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
