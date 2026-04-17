// src/pages/.../AddDialog.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  FormHelperText,
  Box,
  Snackbar,
  Alert,
  Divider,
  Tooltip,
  Chip,
  useMediaQuery,
} from '@mui/material';

import { alpha, useTheme } from '@mui/material/styles';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import { API_BASE_URL } from '../../config';
import SupplierSelector from './SupplierSelector';
import { debounce } from 'lodash';

const normalizeCurrencyCode = (code) => {
  const validCurrencies = ['VND', 'USD', 'EUR', 'JPY', 'GBP'];
  const currencyMap = { EURO: 'EUR' };
  if (!code) return 'VND';
  const normalized = currencyMap[String(code).toUpperCase()] || String(code).toUpperCase();
  return validCurrencies.includes(normalized) ? normalized : 'VND';
};

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getAccessToken = () =>
  localStorage.getItem('accessToken') ||
  localStorage.getItem('token') ||
  localStorage.getItem('jwt') ||
  '';

const getUserEmail = () => {
  const direct =
    localStorage.getItem('email') ||
    localStorage.getItem('userEmail') ||
    localStorage.getItem('username');

  if (direct && direct.trim()) return direct.trim();

  const token = getAccessToken();
  const payload = token ? parseJwt(token) : null;

  const email = payload?.email || payload?.preferred_username || payload?.upn || payload?.sub;

  return typeof email === 'string' ? email.trim() : '';
};

/**
 * ✅ Helper: pick first non-empty string
 */
const pickFirst = (...vals) =>
  vals.find((v) => typeof v === 'string' && v.trim() !== '') || '';

export default function AddDialog({ open, onClose, onRefresh, groupId }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const defaultFormData = useMemo(
    () => ({
      itemDescriptionEN: '',
      itemDescriptionVN: '',
      fullItemDescriptionVN: '',
      oldSapCode: '',
      hanaSapCode: '',
      orderQty: '',
      reason: '',
      remark: '',
      supplierId: '',
      groupId: groupId || '',
      productType1Id: '',
      productType2Id: '',
      unit: '',
      supplierPrice: 0,
    }),
    [groupId]
  );

  const [formData, setFormData] = useState(defaultFormData);

  // ✅ requestUnit used for supplier filtering + submitted unit
  const [requestUnit, setRequestUnit] = useState('');

  const [deptRows, setDeptRows] = useState([{ department: '', qty: '', buy: '' }]);
  const [deptErrors, setDeptErrors] = useState(['']);

  const [saving, setSaving] = useState(false);

  const [departmentList, setDepartmentList] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [translating, setTranslating] = useState(false);

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [groupCurrency, setGroupCurrency] = useState('VND');
  const [loadingCurrency, setLoadingCurrency] = useState(false);
  const [currencyError, setCurrencyError] = useState(null);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSupplierSelector, setShowSupplierSelector] = useState(true);

  const [supplierSelectorKey, setSupplierSelectorKey] = useState(0);

  const [isEnManuallyEdited, setIsEnManuallyEdited] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  // ✅ NEW: confirm-unselect when editing supplier-driven fields
  const [openUnselectConfirm, setOpenUnselectConfirm] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);
  // pendingEdit = { type: 'form' | 'requestUnit', field, value, label }

  const locked = saving;
  const mountedRef = useRef(false);

  const unitForFilter = (requestUnit || '').trim();

  // ===== UI TOKENS =====
  const paperSx = useMemo(
    () => ({
      borderRadius: fullScreen ? 0 : 4,
      overflow: 'hidden',
      boxShadow: `0 22px 70px ${alpha('#000', 0.25)}`,
      border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
      background:
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.72)
          : alpha('#FFFFFF', 0.92),
      backdropFilter: 'blur(14px)',
    }),
    [fullScreen, theme]
  );

  const headerSx = useMemo(
    () => ({
      position: 'relative',
      py: 1.6,
      px: 2.2,
      color: 'common.white',
      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    }),
    [theme]
  );

  const subtleCardSx = useMemo(
    () => ({
      borderRadius: 4,
      border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
      background: alpha(theme.palette.common.white, 0.6),
      backdropFilter: 'blur(10px)',
      boxShadow: `0 10px 30px ${alpha('#000', 0.08)}`,
      p: 1.6,
    }),
    [theme]
  );

  const fieldSx = useMemo(
    () => ({
      '& .MuiInputLabel-root': { fontSize: 12.5 },
      '& .MuiFormHelperText-root': { marginLeft: 0, fontSize: 12 },
      '& .MuiOutlinedInput-root': {
        borderRadius: 3,
        backgroundColor: alpha(theme.palette.common.white, 0.65),
        minHeight: 36,
        '& input': { padding: '8px 12px', fontSize: 13.5, lineHeight: 1.25 },
        '& textarea': { padding: '8px 12px', fontSize: 13.5, lineHeight: 1.35 },
        '& .MuiSelect-select': { padding: '8px 36px 8px 12px', fontSize: 13.5, lineHeight: 1.25 },
        '& fieldset': { borderColor: alpha(theme.palette.divider, 0.7) },
        '&:hover fieldset': { borderColor: alpha(theme.palette.primary.main, 0.5) },
        '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: 2 },
      },
    }),
    [theme]
  );

  const gradientBtnSx = useMemo(
    () => ({
      borderRadius: 999,
      px: 2.2,
      py: 1,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.28)}`,
      transform: 'translateY(0)',
      transition: 'transform .15s ease, box-shadow .15s ease',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: `0 14px 30px ${alpha(theme.palette.primary.main, 0.34)}`,
        backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
      },
    }),
    [theme]
  );

  const outlineBtnSx = useMemo(
    () => ({
      borderRadius: 999,
      px: 2.2,
      py: 1,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    }),
    []
  );

  const toastError = useCallback((msg) => {
    setErrorMessage(msg);
    setErrorOpen(true);
  }, []);

  // ===== Confirm Unselect helpers =====
  const doUnselectSupplier = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      supplierId: '',
      supplierPrice: 0,
      productType1Id: '',
      productType2Id: '',
    }));
    setSelectedSupplier(null);
    setShowSupplierSelector(true);
    setSupplierSelectorKey((k) => k + 1);
  }, []);

  const requestUnselectConfirm = useCallback(
    ({ type, field, value, label }) => {
      // Ask confirm only when supplier is selected
      if (!formData.supplierId?.trim() && !selectedSupplier) {
        if (type === 'requestUnit') {
          setRequestUnit(value);
          setFormData((prev) => ({ ...prev, unit: value }));
        } else {
          setFormData((prev) => ({ ...prev, [field]: value }));
          if (field === 'itemDescriptionEN') setIsEnManuallyEdited(true);
          if (field === 'itemDescriptionVN') setIsEnManuallyEdited(false);
        }
        return;
      }

      setPendingEdit({ type, field, value, label });
      setOpenUnselectConfirm(true);
    },
    [formData.supplierId, selectedSupplier]
  );

  const handleCancelUnselect = () => {
    setOpenUnselectConfirm(false);
    setPendingEdit(null);
  };

  const handleOkUnselect = () => {
    setOpenUnselectConfirm(false);

    doUnselectSupplier();

    if (pendingEdit) {
      if (pendingEdit.type === 'requestUnit') {
        setRequestUnit(pendingEdit.value);
        setFormData((prev) => ({ ...prev, unit: pendingEdit.value }));
      } else {
        setFormData((prev) => ({ ...prev, [pendingEdit.field]: pendingEdit.value }));
        if (pendingEdit.field === 'itemDescriptionEN') setIsEnManuallyEdited(true);
        if (pendingEdit.field === 'itemDescriptionVN') setIsEnManuallyEdited(false);
      }
    }

    setPendingEdit(null);
    toastError('Supplier selection has been cleared. Please select a supplier again.');
  };

  // ===== Calc =====
  const totalRequestQty = useMemo(
    () => deptRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0),
    [deptRows]
  );

  const orderQtyError = useMemo(() => {
    if (!formData.orderQty || totalRequestQty <= 0) return '';
    const oq = parseFloat(formData.orderQty);
    if (!Number.isFinite(oq)) return '';
    return oq > totalRequestQty ? `Order Q'ty cannot exceed total request (${totalRequestQty})` : '';
  }, [formData.orderQty, totalRequestQty]);

  const validateDeptDuplicates = useCallback((rows) => {
    const errors = rows.map((row, idx) => {
      if (!row.department) return '';
      const dup = rows.some((r, i) => r.department === row.department && i !== idx);
      return dup ? 'This department is already selected' : '';
    });
    setDeptErrors(errors);
    return errors;
  }, []);

  const autoAllocateBuy = useCallback(
    (rows, orderQtyInput) => {
      const orderQty = parseFloat(orderQtyInput) || 0;
      if (orderQty <= 0 || totalRequestQty === 0) {
        return rows.map((r) => ({ ...r, buy: '' }));
      }

      const effectiveQty = Math.min(orderQty, totalRequestQty);

      const sorted = rows
        .map((r, i) => ({ ...r, originalIndex: i }))
        .filter((r) => parseFloat(r.qty) > 0)
        .sort((a, b) => (parseFloat(a.qty) || 0) - (parseFloat(b.qty) || 0) || a.originalIndex - b.originalIndex);

      const allocated = {};
      let remaining = effectiveQty;

      for (const row of sorted) {
        if (remaining <= 0) break;
        const req = parseFloat(row.qty) || 0;
        if (req > 0) {
          const give = Math.min(req, remaining);
          allocated[row.department] = give;
          remaining -= give;
        }
      }

      return rows.map((row) => ({
        ...row,
        buy: row.department && allocated[row.department] !== undefined ? allocated[row.department] : '',
      }));
    },
    [totalRequestQty]
  );

  useEffect(() => {
    if (!orderQtyError && formData.orderQty) {
      const newRows = autoAllocateBuy(deptRows, formData.orderQty);
      setDeptRows(newRows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.orderQty, autoAllocateBuy, orderQtyError]);

  const fetchGroupCurrency = useCallback(async () => {
    if (!groupId) {
      setGroupCurrency('VND');
      setCurrencyError(null);
      return;
    }

    setLoadingCurrency(true);
    setCurrencyError(null);

    try {
      const email = getUserEmail();
      const token = getAccessToken();

      const url =
        `${API_BASE_URL}/api/group-summary-requisitions/${groupId}` +
        (email ? `?email=${encodeURIComponent(email)}` : '');

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Currency load failed: ${res.status} ${txt}`);
      }

      const data = await res.json();
      const cur = normalizeCurrencyCode(data.currency);
      if (mountedRef.current) setGroupCurrency(cur);
    } catch (e) {
      console.error('fetchGroupCurrency error:', e);
      if (mountedRef.current) {
        setGroupCurrency('VND');
        setCurrencyError('Cannot load currency. Falling back to VND.');
      }
    } finally {
      if (mountedRef.current) setLoadingCurrency(false);
    }
  }, [groupId]);

  const fetchDepartmentList = useCallback(async () => {
    setLoadingDepartments(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/departments`, {
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (mountedRef.current) setDepartmentList(data || []);
    } catch (err) {
      console.error(err);
      if (mountedRef.current) setDepartmentList([]);
    } finally {
      if (mountedRef.current) setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    mountedRef.current = true;

    fetchGroupCurrency();
    fetchDepartmentList();

    setFormData({ ...defaultFormData, groupId: groupId || '' });
    setRequestUnit('');

    const baseRows = [{ department: '', qty: '', buy: '' }];
    setDeptRows(baseRows);
    setDeptErrors(['']);

    setFiles([]);
    setPreviews((p) => {
      p.forEach((u) => URL.revokeObjectURL(u));
      return [];
    });

    setSelectedSupplier(null);
    setShowSupplierSelector(true);
    setSupplierSelectorKey((k) => k + 1);

    setIsEnManuallyEdited(false);
    setErrorOpen(false);
    setErrorMessage('');
    setOpenConfirmDialog(false);

    setOpenUnselectConfirm(false);
    setPendingEdit(null);

    return () => {
      mountedRef.current = false;
    };
  }, [open, groupId, fetchGroupCurrency, fetchDepartmentList, defaultFormData]);

  // Auto translate VN -> EN
  const translateText = useCallback(
    async (text) => {
      if (!text || isEnManuallyEdited) return;
      setTranslating(true);
      try {
        const token = getAccessToken();
        const res = await fetch(`${API_BASE_URL}/api/translate/vi-to-en`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (mountedRef.current) {
          setFormData((prev) => ({ ...prev, itemDescriptionEN: data.translatedText || '' }));
        }
      } catch (err) {
        console.error('Translate failed:', err);
      } finally {
        if (mountedRef.current) setTranslating(false);
      }
    },
    [isEnManuallyEdited]
  );

  const debouncedTranslate = useMemo(() => debounce(translateText, 600), [translateText]);

  useEffect(() => {
    if (formData.itemDescriptionVN && !isEnManuallyEdited) {
      debouncedTranslate(formData.itemDescriptionVN);
    }
    return () => {
      debouncedTranslate.cancel?.();
    };
  }, [formData.itemDescriptionVN, debouncedTranslate, isEnManuallyEdited]);

  /**
   * ✅ Supplier = source of truth
   * Selecting supplier -> auto-fill SAP/Hana + VN/EN + price/type + unit
   */
  const handleSelectSupplier = (supplierData) => {
    if (!supplierData) {
      setFormData((prev) => ({
        ...prev,
        supplierId: '',
        supplierPrice: 0,
        productType1Id: '',
        productType2Id: '',
      }));

      setSelectedSupplier(null);
      setShowSupplierSelector(true);
      setSupplierSelectorKey((k) => k + 1);
      return;
    }

    const vn = pickFirst(
      supplierData.itemDescriptionVN,
      supplierData.vietnameseName,
      supplierData.descriptionVN,
      supplierData.descriptionVn,
      supplierData.vnDescription,
      supplierData.nameVN,
      supplierData.itemDescription
    );

    const en = pickFirst(
      supplierData.itemDescriptionEN,
      supplierData.englishName,
      supplierData.descriptionEN,
      supplierData.descriptionEn,
      supplierData.enDescription,
      supplierData.nameEN
    );

    // ✅ overwrite unit ALWAYS (and sync into requestUnit input)
    const nextUnit = (supplierData.unit || '').trim();
    setRequestUnit(nextUnit);

    setFormData((prev) => ({
      ...prev,
      supplierId: supplierData.supplierId || '',
      supplierPrice: parseFloat(supplierData.supplierPrice) || 0,
      productType1Id: supplierData.productType1Id || '',
      productType2Id: supplierData.productType2Id || '',

      oldSapCode: supplierData.oldSapCode || '',
      hanaSapCode: supplierData.hanaSapCode || '',
      itemDescriptionVN: vn || '',
      itemDescriptionEN: en || '',
      unit: nextUnit,
    }));

    setSelectedSupplier({
      supplierName: supplierData.supplierName || '',
      sapCode: supplierData.oldSapCode || '',
      hanaCode: supplierData.hanaSapCode || '',
      price: parseFloat(supplierData.supplierPrice) || 0,
      unit: nextUnit,
    });

    setIsEnManuallyEdited(false);

    if (!en && vn) {
      debouncedTranslate(vn);
    }

    setShowSupplierSelector(false);
  };

  // ✅ handleChange with confirm-unselect
  const handleChange = (field) => (e) => {
    const value = e.target.value;

    const supplierDrivenFields = ['oldSapCode', 'hanaSapCode', 'itemDescriptionVN', 'itemDescriptionEN'];

    if (supplierDrivenFields.includes(field) && (formData.supplierId?.trim() || selectedSupplier)) {
      const labels = {
        oldSapCode: 'Old SAP Code',
        hanaSapCode: 'Hana SAP Code',
        itemDescriptionVN: 'Item Description (VN)',
        itemDescriptionEN: 'Item Description (EN)',
      };

      requestUnselectConfirm({
        type: 'form',
        field,
        value,
        label: labels[field] || field,
      });
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'itemDescriptionEN') setIsEnManuallyEdited(true);
    if (field === 'itemDescriptionVN') setIsEnManuallyEdited(false);
  };

  const handleDeptChange = (index, field, value) => {
    setDeptRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'department') validateDeptDuplicates(updated);
      return updated;
    });
  };

  const handleAddDeptRow = () => {
    setDeptRows((prev) => {
      const next = [...prev, { department: '', qty: '', buy: '' }];
      setDeptErrors((e) => [...e, '']);
      return next;
    });
  };

  const handleDeleteDeptRow = (i) => {
    setDeptRows((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      const safe = next.length ? next : [{ department: '', qty: '', buy: '' }];
      validateDeptDuplicates(safe);
      return safe;
    });
  };

  const calcTotalRequestQty = () => deptRows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
  const calcTotalBuy = () => deptRows.reduce((s, r) => s + (parseFloat(r.buy) || 0), 0);

  const handleFileChange = (e) => {
    const remain = 10 - files.length;
    const selected = Array.from(e.target.files || []).slice(0, Math.max(0, remain));
    const valid = selected.filter((f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);

    if (valid.length < selected.length) toastError('Only images ≤ 5MB are allowed.');

    setFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);

    e.target.value = null;
  };

  const handleRemoveFile = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleAddClick = () => {
    if (!formData.oldSapCode?.trim()) return toastError('Old SAP Code is required.');
    if (!formData.itemDescriptionVN?.trim()) return toastError('Item Description (VN) is required.');

    if (totalRequestQty === 0) return toastError('At least one department must have request quantity.');
    if (orderQtyError) return toastError(orderQtyError);
    if (deptErrors.some(Boolean)) return toastError('Duplicate departments are not allowed.');

    setOpenConfirmDialog(true);
  };

  const handleAdd = async () => {
    const departmentRequisitions = deptRows
      .filter((r) => r.department && r.qty !== '' && r.qty !== null && r.qty !== undefined)
      .map((r) => ({
        id: r.department,
        name: departmentList.find((d) => String(d.id) === String(r.department))?.departmentName || '',
        qty: parseFloat(r.qty) || 0,
        buy: parseFloat(r.buy) || 0,
      }));

    const formDataToSend = new FormData();
    formDataToSend.append('englishName', formData.itemDescriptionEN || '');
    formDataToSend.append('vietnameseName', formData.itemDescriptionVN || '');
    formDataToSend.append('fullDescription', formData.fullItemDescriptionVN || '');
    formDataToSend.append('oldSapCode', formData.oldSapCode || '');
    formDataToSend.append('hanaSapCode', formData.hanaSapCode || '');
    formDataToSend.append('departmentRequisitions', JSON.stringify(departmentRequisitions));
    formDataToSend.append('orderQty', parseFloat(formData.orderQty) || 0);
    formDataToSend.append('reason', formData.reason || '');
    formDataToSend.append('remark', formData.remark || '');
    formDataToSend.append('supplierId', formData.supplierId || '');
    formDataToSend.append('groupId', formData.groupId || '');
    formDataToSend.append('productType1Id', formData.productType1Id || '');
    formDataToSend.append('productType2Id', formData.productType2Id || '');

    formDataToSend.append('unit', requestUnit || '');
    formDataToSend.append('supplierPrice', formData.supplierPrice || 0);

    files.forEach((f) => formDataToSend.append('files', f));

    setSaving(true);
    try {
      const email = getUserEmail();
      if (!email) throw new Error('Missing email. Please login again.');

      const token = getAccessToken();

      const res = await fetch(`${API_BASE_URL}/api/summary-requisitions/create?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formDataToSend,
      });

      let data = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        const txt = await res.text().catch(() => '');
        data = { message: txt };
      }

      if (!res.ok) throw new Error(data?.message || 'Add failed.');

      setOpenConfirmDialog(false);
      onClose?.('Added successfully!');
      onRefresh?.();
    } catch (err) {
      toastError(err.message || 'Add failed.');
    } finally {
      setSaving(false);
    }
  };

  const currentImagesCount = files.length;
  const dialogMaxWidth = 'xl';

  const paperSxEnhanced = useMemo(
    () => ({
      ...paperSx,
      width: 'min(1680px, 98vw)',
      maxWidth: '98vw',
      maxHeight: fullScreen ? '100vh' : '92vh',
    }),
    [paperSx, fullScreen]
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={locked ? undefined : onClose}
        fullScreen={fullScreen}
        maxWidth={dialogMaxWidth}
        fullWidth
        PaperProps={{ sx: paperSxEnhanced }}
      >
        <DialogTitle sx={headerSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  fontSize: { xs: 16.5, sm: 18.5 },
                }}
              >
                Add Request
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.4, fontSize: 12.5 }}>
                Create a new request with optional supplier, departments, qty and images.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                icon={<CheckCircleRoundedIcon />}
                label={loadingCurrency ? 'Loading...' : `Currency: ${groupCurrency}`}
                sx={{
                  color: 'common.white',
                  bgcolor: alpha('#000', 0.18),
                  border: `1px solid ${alpha('#fff', 0.22)}`,
                  fontWeight: 700,
                }}
              />
              <Tooltip title="Close">
                <span>
                  <IconButton
                    onClick={onClose}
                    disabled={locked}
                    sx={{
                      color: 'common.white',
                      bgcolor: alpha('#000', 0.18),
                      border: `1px solid ${alpha('#fff', 0.22)}`,
                      '&:hover': { bgcolor: alpha('#000', 0.28) },
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>

        {/* ===== CONTENT ===== */}
        <DialogContent
          sx={{
            p: { xs: 1.8, sm: 2.2 },
            ...(showSupplierSelector && !fullScreen ? { maxHeight: 'calc(92vh - 160px)', overflowY: 'auto' } : {}),
          }}
        >
          <Stack spacing={1.4}>
            {currencyError && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                {currencyError}
              </Alert>
            )}

            {/* BASIC INFO */}
            <Box sx={subtleCardSx}>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Basic Info</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.2 }}>
                VN is required; EN auto-translates unless you edit it manually.
              </Typography>

              <Divider sx={{ my: 1.2 }} />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                  gap: 1.2,
                }}
              >
                <TextField
                  label="Old SAP Code *"
                  value={formData.oldSapCode}
                  onChange={handleChange('oldSapCode')}
                  size="small"
                  fullWidth
                  required
                  disabled={locked}
                  sx={fieldSx}
                  helperText="You can type manually or select a supplier to auto-fill."
                />

                <TextField
                  label="Hana SAP Code"
                  value={formData.hanaSapCode}
                  onChange={handleChange('hanaSapCode')}
                  size="small"
                  fullWidth
                  disabled={locked}
                  sx={fieldSx}
                  helperText="Auto-filled when selecting supplier, but you can edit it."
                />

                {/* Request Unit (confirm before unselect) */}
                <TextField
                  label="Request Unit"
                  value={requestUnit}
                  onChange={(e) => {
                    const next = e.target.value;

                    if ((formData.supplierId?.trim() || selectedSupplier) && next !== requestUnit) {
                      requestUnselectConfirm({
                        type: 'requestUnit',
                        field: 'requestUnit',
                        value: next,
                        label: 'Request Unit',
                      });
                      return;
                    }

                    setRequestUnit(next);
                    setFormData((prev) => ({ ...prev, unit: next }));
                  }}
                  size="small"
                  fullWidth
                  disabled={locked}
                  sx={fieldSx}
                  helperText="Used to auto-filter supplier list."
                />

                <TextField
                  label="Item Description (VN) *"
                  value={formData.itemDescriptionVN}
                  onChange={handleChange('itemDescriptionVN')}
                  size="small"
                  fullWidth
                  required
                  autoFocus
                  disabled={locked}
                  sx={fieldSx}
                  style={{ gridColumn: '1 / span 2' }}
                />

                <TextField
                  label="Item Description (EN)"
                  value={formData.itemDescriptionEN}
                  onChange={handleChange('itemDescriptionEN')}
                  size="small"
                  fullWidth
                  disabled={locked || translating}
                  sx={fieldSx}
                  InputProps={{ endAdornment: translating ? <CircularProgress size={16} /> : null }}
                />

                <TextField
                  label="Full Item Description (VN)"
                  value={formData.fullItemDescriptionVN}
                  onChange={handleChange('fullItemDescriptionVN')}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  disabled={locked}
                  sx={fieldSx}
                  style={{ gridColumn: '1 / span 3' }}
                />
              </Box>
            </Box>

            {/* SUPPLIER OPTIONAL */}
            <Box sx={subtleCardSx}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Supplier (Optional)</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.2 }}>
                    Selecting a supplier auto-fills SAP + Hana + VN/EN + price/type + unit.
                  </Typography>
                </Box>

                {!showSupplierSelector && (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={locked}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        supplierId: '',
                        supplierPrice: 0,
                        productType1Id: '',
                        productType2Id: '',
                      }));

                      setSelectedSupplier(null);
                      setShowSupplierSelector(true);
                      setSupplierSelectorKey((k) => k + 1);
                    }}
                    sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 800 }}
                  >
                    Change supplier
                  </Button>
                )}
              </Stack>

              <Divider sx={{ my: 1.2 }} />

              {showSupplierSelector ? (
                <Box
                  sx={{
                    borderRadius: 4,
                    border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
                    background: alpha('#fff', 0.65),
                    p: 1.2,
                    overflowX: 'auto',
                    '& > .MuiPaper-root': { minWidth: 1400 },
                  }}
                >
                  <SupplierSelector
                    key={supplierSelectorKey}
                    onSelectSupplier={handleSelectSupplier}
                    currency={groupCurrency}
                    disabled={loadingCurrency || locked}
                    prefillSapCode={formData.oldSapCode}
                    prefillHanaCode={formData.hanaSapCode}
                    prefillItemDescriptionVN={formData.itemDescriptionVN}
                    prefillItemDescriptionEN={formData.itemDescriptionEN}
                    prefillUnit={unitForFilter}
                  />
                </Box>
              ) : selectedSupplier ? (
                <Box
                  sx={{
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    background: alpha('#fff', 0.7),
                    p: 1.4,
                  }}
                >
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Selected supplier</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 14.5, color: '#111827', mt: 0.2 }}>
                    {selectedSupplier.supplierName}
                  </Typography>

                  <Box
                    sx={{
                      mt: 0.8,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' },
                      gap: 0.9,
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      SAP: <b>{selectedSupplier.sapCode || '-'}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      Hana: <b>{selectedSupplier.hanaCode || '-'}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      Unit: <b>{requestUnit || '-'}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      Price:{' '}
                      <b>
                        {(selectedSupplier.price || 0).toLocaleString('vi-VN', {
                          style: 'currency',
                          currency: groupCurrency,
                        })}
                      </b>
                    </Typography>
                  </Box>
                </Box>
              ) : null}
            </Box>

            {/* DEPARTMENTS */}
            <Box sx={subtleCardSx}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Department Requests</Typography>
                  <Tooltip title="Buy is auto-allocated based on Order Q'ty (smallest requests first)." arrow>
                    <InfoOutlinedIcon sx={{ fontSize: '1.05rem', color: alpha(theme.palette.text.secondary, 0.65) }} />
                  </Tooltip>
                </Stack>

                <Button
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={handleAddDeptRow}
                  variant="outlined"
                  size="small"
                  disabled={locked}
                  sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 800, px: 1.6 }}
                >
                  Add department
                </Button>
              </Stack>

              <Divider sx={{ my: 1.2 }} />

              <Stack spacing={1}>
                {deptRows.map((row, i) => (
                  <Box
                    key={i}
                    sx={{
                      borderRadius: 4,
                      border: `1px solid ${alpha(theme.palette.divider, 0.75)}`,
                      background: alpha('#fff', i % 2 === 0 ? 0.72 : 0.6),
                      p: 1.2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr auto' },
                        gap: 1,
                        alignItems: 'center',
                      }}
                    >
                      <FormControl
                        fullWidth
                        size="small"
                        error={!!deptErrors[i]}
                        disabled={loadingDepartments || locked}
                        sx={fieldSx}
                      >
                        <InputLabel>Department</InputLabel>
                        <Select
                          value={row.department}
                          label="Department"
                          onChange={(e) => handleDeptChange(i, 'department', e.target.value)}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {departmentList.map((d) => (
                            <MenuItem key={d.id} value={String(d.id)}>
                              {d.departmentName}
                            </MenuItem>
                          ))}
                        </Select>
                        {deptErrors[i] && <FormHelperText>{deptErrors[i]}</FormHelperText>}
                      </FormControl>

                      <TextField
                        label="Qty"
                        type="number"
                        size="small"
                        value={row.qty}
                        onChange={(e) => handleDeptChange(i, 'qty', e.target.value)}
                        disabled={locked}
                        sx={fieldSx}
                        inputProps={{ min: 0 }}
                      />

                      <TextField
                        label="Buy"
                        type="number"
                        size="small"
                        value={row.buy || ''}
                        disabled
                        sx={{
                          ...fieldSx,
                          '& .MuiOutlinedInput-root': {
                            ...(fieldSx['& .MuiOutlinedInput-root'] || {}),
                            backgroundColor: alpha(theme.palette.action.disabledBackground, 0.55),
                          },
                        }}
                      />

                      <Tooltip title="Remove row" arrow>
                        <span>
                          <IconButton
                            onClick={() => handleDeleteDeptRow(i)}
                            color="error"
                            disabled={locked || deptRows.length <= 1}
                            size="small"
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                              bgcolor: alpha(theme.palette.error.main, 0.05),
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                ))}

                <Box
                  sx={{
                    mt: 0.4,
                    p: 1.2,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.2}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Typography sx={{ fontSize: 12.8, color: 'text.secondary' }}>
                      Total Qty: <b style={{ color: theme.palette.text.primary }}>{calcTotalRequestQty()}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 12.8, color: 'text.secondary' }}>
                      Total Buy: <b style={{ color: theme.palette.text.primary }}>{calcTotalBuy()}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 12.8, color: 'text.secondary' }}>
                      Unit: <b style={{ color: theme.palette.text.primary }}>{requestUnit || '-'}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 12.8, color: 'text.secondary' }}>
                      Price:{' '}
                      <b style={{ color: theme.palette.text.primary }}>
                        {(formData.supplierPrice || 0).toLocaleString('vi-VN', {
                          style: 'currency',
                          currency: groupCurrency,
                        })}
                      </b>
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* ORDER */}
            <Box sx={subtleCardSx}>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Order</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.2 }}>
                Order Q'ty drives Buy auto-allocation.
              </Typography>

              <Divider sx={{ my: 1.2 }} />

              <TextField
                label="Order Q'ty"
                type="number"
                value={formData.orderQty}
                onChange={handleChange('orderQty')}
                size="small"
                fullWidth
                error={!!orderQtyError}
                disabled={locked}
                helperText={orderQtyError || `Total request: ${totalRequestQty}`}
                sx={fieldSx}
                inputProps={{ min: 0 }}
              />
            </Box>

            {/* NOTES */}
            <Box sx={subtleCardSx}>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Notes</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.2 }}>Reason / Remark.</Typography>

              <Divider sx={{ my: 1.2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}>
                <TextField
                  label="Reason"
                  value={formData.reason}
                  onChange={handleChange('reason')}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  disabled={locked}
                  sx={fieldSx}
                />
                <TextField
                  label="Remark"
                  value={formData.remark}
                  onChange={handleChange('remark')}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  disabled={locked}
                  sx={fieldSx}
                />
              </Box>
            </Box>

            {/* IMAGES */}
            <Box sx={subtleCardSx}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Images</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.2 }}>
                    Only images ≤ 5MB. Max 10 images total.
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={`${currentImagesCount}/10`}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                    color: theme.palette.primary.dark,
                    fontWeight: 800,
                  }}
                />
              </Stack>

              <Divider sx={{ my: 1.2 }} />

              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoCamera fontSize="small" />}
                  disabled={locked || currentImagesCount >= 10}
                  sx={{
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 800,
                    alignSelf: 'flex-start',
                    px: 1.6,
                  }}
                >
                  Choose images
                  <input hidden multiple accept="image/*" type="file" onChange={handleFileChange} />
                </Button>

                {previews.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, mt: 0.4 }}>
                    {previews.map((url, i) => (
                      <Box key={i} sx={{ position: 'relative' }}>
                        <img
                          src={url}
                          alt=""
                          style={{
                            height: 88,
                            width: 132,
                            objectFit: 'cover',
                            borderRadius: 12,
                            border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                            display: 'block',
                          }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            bgcolor: alpha('#fff', 0.85),
                            border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                            width: 30,
                            height: 30,
                          }}
                          onClick={() => handleRemoveFile(i)}
                          disabled={locked}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 2.2 }, py: 1.8, gap: 1 }}>
          <Button onClick={onClose} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleAddClick}
            disabled={locked || deptErrors.some(Boolean) || !!orderQtyError}
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ CONFIRM: Unselect supplier when editing supplier-driven fields */}
      <Dialog
        open={openUnselectConfirm}
        onClose={locked ? undefined : handleCancelUnselect}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm change</DialogTitle>
        <DialogContent sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            You are editing <b>{pendingEdit?.label || 'this field'}</b>.
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 13.5, color: 'text.secondary' }}>
            If you continue, the current <b>supplier selection will be cleared</b> and you must select a supplier again.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.6, gap: 1 }}>
          <Button onClick={handleCancelUnselect} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>
          <Button onClick={handleOkUnselect} disabled={locked} variant="contained" sx={gradientBtnSx}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRM ADD */}
      <Dialog
        open={openConfirmDialog}
        onClose={locked ? undefined : () => setOpenConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
            background: alpha('#FFFFFF', 0.92),
            backdropFilter: 'blur(14px)',
            boxShadow: `0 22px 70px ${alpha('#000', 0.18)}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm add</DialogTitle>
        <DialogContent sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            Add request for <b>{formData.itemDescriptionVN || 'Unknown'}</b>?
          </Typography>
          <Typography sx={{ mt: 0.6, fontSize: 12.5, color: 'text.secondary' }}>
            This will create a new request with departments, qty and images.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setOpenConfirmDialog(false)} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={locked} variant="contained" sx={gradientBtnSx}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ERROR TOAST */}
      <Snackbar
        open={errorOpen}
        autoHideDuration={6000}
        onClose={() => setErrorOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorOpen(false)} sx={{ borderRadius: 3 }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
}