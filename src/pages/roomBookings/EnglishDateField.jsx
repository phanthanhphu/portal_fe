import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (value) => String(value).padStart(2, '0');

const normalizeDateOnly = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const parseIsoDate = (value) => {
  if (!value) return null;

  const parts = String(value).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const formatIsoDate = (date) => {
  const value = normalizeDateOnly(date);
  if (!value) return '';
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
};

const parseDisplayDate = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const parseDateValue = (value) => parseIsoDate(value) || parseDisplayDate(value);

const formatDisplayDate = (value) => {
  const date = parseDateValue(value);
  if (!date) return '';
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}`;
};

const normalizeToIsoDate = (value) => {
  const date = parseDateValue(value);
  return date ? formatIsoDate(date) : '';
};

const isBeforeMinDate = (date, min) => {
  const current = normalizeDateOnly(date);
  const minDate = parseDateValue(min);

  if (!current || !minDate) return false;
  return current.getTime() < minDate.getTime();
};

const getInitialViewDate = (value, min) => {
  return parseDateValue(value) || parseDateValue(min) || normalizeDateOnly(new Date());
};

const buildCalendarCells = (viewDate) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay();
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

export default function EnglishDateField({
  label,
  labelAsPlaceholder = false,
  value,
  onChange,
  disabled = false,
  required = false,
  min,
  size = 'small',
  fullWidth = true,
  helperText,
  onKeyDown,
  sx,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [draft, setDraft] = useState(() => formatDisplayDate(value));
  const [viewDate, setViewDate] = useState(() => getInitialViewDate(value, min));

  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const today = useMemo(() => normalizeDateOnly(new Date()), []);
  const cells = useMemo(() => buildCalendarCells(viewDate), [viewDate]);
  const open = Boolean(anchorEl);

  useEffect(() => {
    setDraft(formatDisplayDate(value));

    const parsed = parseDateValue(value);
    if (parsed) {
      setViewDate(parsed);
    }
  }, [value]);

  const openCalendar = (event) => {
    if (disabled) return;
    setViewDate(getInitialViewDate(value, min));
    setAnchorEl(event.currentTarget);
  };

  const closeCalendar = () => {
    setAnchorEl(null);
  };

  const applyDate = (date) => {
    if (!date || isBeforeMinDate(date, min)) return;

    const nextValue = formatIsoDate(date);
    onChange?.(nextValue);
    setDraft(formatDisplayDate(nextValue));
    setViewDate(date);
    closeCalendar();
  };

  const clearDate = () => {
    onChange?.('');
    setDraft('');
    closeCalendar();
  };

  const selectToday = () => {
    if (isBeforeMinDate(today, min)) return;
    applyDate(today);
  };

  const handleDraftChange = (event) => {
    const nextText = event.target.value.replace(/[^0-9/]/g, '').slice(0, 10);
    setDraft(nextText);

    if (!nextText) {
      onChange?.('');
      return;
    }

    const parsed = parseDisplayDate(nextText);
    if (parsed && !isBeforeMinDate(parsed, min)) {
      onChange?.(formatIsoDate(parsed));
      setViewDate(parsed);
    }
  };

  const handleDraftBlur = () => {
    if (!draft) return;

    const parsed = parseDisplayDate(draft);
    if (!parsed || isBeforeMinDate(parsed, min)) {
      setDraft(formatDisplayDate(value));
      return;
    }

    const nextValue = formatIsoDate(parsed);
    onChange?.(nextValue);
    setDraft(formatDisplayDate(nextValue));
  };

  const changeMonth = (amount) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };

  const textFieldLabel = labelAsPlaceholder ? undefined : label;
  const placeholderText = labelAsPlaceholder ? label : 'MM/DD/YYYY';

  return (
    <>
      <TextField
        label={textFieldLabel}
        value={draft}
        onChange={handleDraftChange}
        onBlur={handleDraftBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
        required={required}
        size={size}
        fullWidth={fullWidth}
        placeholder={placeholderText}
        helperText={helperText}
        InputLabelProps={labelAsPlaceholder ? undefined : { shrink: true }}
        inputProps={{ inputMode: 'numeric', 'aria-label': label }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                onClick={openCalendar}
                disabled={disabled}
                aria-label={`Open ${label} calendar`}
              >
                📅
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={sx}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closeCalendar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 0.5,
            p: 1.25,
            width: 292,
            borderRadius: 2,
          },
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <IconButton size="small" onClick={() => changeMonth(-1)} aria-label="Previous month">
              ‹
            </IconButton>

            <Typography fontWeight={700} fontSize={14} textAlign="center">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </Typography>

            <IconButton size="small" onClick={() => changeMonth(1)} aria-label="Next month">
              ›
            </IconButton>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.25,
            }}
          >
            {WEEKDAY_NAMES.map((dayName) => (
              <Typography
                key={dayName}
                textAlign="center"
                fontSize={11}
                fontWeight={700}
                color="text.secondary"
                sx={{ py: 0.5 }}
              >
                {dayName}
              </Typography>
            ))}

            {cells.map((date, index) => {
              if (!date) {
                return <Box key={`empty-${index}`} sx={{ height: 32 }} />;
              }

              const isoDate = formatIsoDate(date);
              const selected = selectedDate && isoDate === formatIsoDate(selectedDate);
              const isToday = isoDate === formatIsoDate(today);
              const blocked = isBeforeMinDate(date, min);

              return (
                <Button
                  key={isoDate}
                  variant={selected ? 'contained' : 'text'}
                  disabled={blocked}
                  onClick={() => applyDate(date)}
                  sx={{
                    minWidth: 0,
                    height: 32,
                    p: 0,
                    borderRadius: 1.2,
                    fontSize: 12,
                    fontWeight: isToday || selected ? 800 : 500,
                    textTransform: 'none',
                    border: isToday && !selected ? '1px solid #111827' : '1px solid transparent',
                  }}
                >
                  {date.getDate()}
                </Button>
              );
            })}
          </Box>

          <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ pt: 0.5 }}>
            <Button size="small" onClick={selectToday} disabled={isBeforeMinDate(today, min)} sx={{ textTransform: 'none' }}>
              Today
            </Button>
            <Button size="small" onClick={clearDate} sx={{ textTransform: 'none' }}>
              Clear
            </Button>
            <Button size="small" onClick={closeCalendar} sx={{ textTransform: 'none' }}>
              Close
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}
