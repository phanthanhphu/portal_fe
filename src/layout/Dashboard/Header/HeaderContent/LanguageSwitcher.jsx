import React from 'react';
import { MenuItem, Select, Box, Stack, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

import FlagEN from '../../../../assets/images/flags/en.png';
import FlagVI from '../../../../assets/images/flags/vi.png';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const theme = useTheme();

  const handleChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  const languages = [
    { code: 'en', label: 'English', flag: FlagEN },
    { code: 'vi', label: 'Tiếng Việt', flag: FlagVI }
  ];

  // Mặc định luôn là 'en' khi mới vào, user có thể đổi
  const currentLang = i18n.language && ['en', 'vi'].includes(i18n.language) ? i18n.language : 'en';

  return (
    <Box sx={{ ml: 2, minWidth: 140 }}>
      <Select
        value={currentLang}
        onChange={handleChange}
        size="small"
        variant="outlined"
        sx={{
          width: '100%',
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[1],
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            fontWeight: 500,
            fontSize: 14,
            color: theme.palette.text.primary,
            paddingY: '6px',
            paddingX: '12px'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '& .MuiMenuItem-root': {
            fontSize: 14,
            paddingY: 1,
            paddingX: 2,
            borderRadius: 1,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          },
        }}
        // Bỏ IconComponent đi để không hiện icon quả địa cầu
      >
        {languages.map(({ code, label, flag }) => (
          <MenuItem key={code} value={code}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <img
                src={flag}
                alt={label}
                style={{ width: 24, height: 16, borderRadius: 3, objectFit: 'cover', boxShadow: '0 0 4px rgba(0,0,0,0.1)' }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {label}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
