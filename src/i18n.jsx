// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      welcome: 'Welcome',
      profile: 'Profile',
      setting: 'Setting',
      notifications: 'Notifications',
      logout: 'Logout',
    }
  },
  vi: {
    translation: {
      welcome: 'Chào mừng',
      profile: 'Hồ sơ',
      setting: 'Cài đặt',
      notifications: 'Thông báo',
      logout: 'Đăng xuất',
    }
  }
};

i18n
  .use(LanguageDetector) // detect user language
  .use(initReactI18next) // pass i18n to react-i18next
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
