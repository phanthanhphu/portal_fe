// src/pages/.../EditDialog.jsx
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
  const map = { EURO: 'EUR' };
  if (!code) return 'VND';
  const normalized = map[String(code).toUpperCase()] || String(code).toUpperCase();
  return ['VND', 'USD', 'EUR', 'JPY', 'GBP'].includes(normalized) ? normalized : 'VND';
};

// ===== auth helpers (same mindset as AddDialog) =====
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

const withEmail = (url, email) => {
  if (!email) return url;
  return url.includes('?')
    ? `${url}&email=${encodeURIComponent(email)}`
    : `${url}?email=${encodeURIComponent(email)}`;
};

/**
 * ✅ Helper: pick first non-empty string
 */
const pickFirst = (...vals) =>
  vals.find((v) => typeof v === 'string' && v.trim() !== '') || '';

export default function EditDialog({ open, item, onClose, onRefresh }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const mountedRef = useRef(false);

  const [formData, setFormData] = useState({
    itemDescriptionEN: '',
    itemDescriptionVN: '',
    fullItemDescriptionVN: '',
    oldSapCode: '',
    hanaSapCode: '',
    orderQty: '',
    reason: '',
    remark: '',
    supplierId: '',
    groupId: '',
    productType1Id: '',
    productType2Id: '',
    unit: '',
    supplierPrice: 0,
  });

  // ✅ NEW: unit gốc của request (editable + dùng để filter + gửi lên server)
  const [requestUnit, setRequestUnit] = useState('');

  const [deptRows, setDeptRows] = useState([{ department: '', qty: '', buy: '' }]);
  const [deptErrors, setDeptErrors] = useState(['']);
  const [saving, setSaving] = useState(false);

  const [departmentList, setDepartmentList] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [translating, setTranslating] = useState(false);

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [groupCurrency, setGroupCurrency] = useState('VND');
  const [loadingCurrency, setLoadingCurrency] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSupplierSelector, setShowSupplierSelector] = useState(true);

  // ✅ reset SupplierSelector UI filters when change supplier
  const [supplierSelectorKey, setSupplierSelectorKey] = useState(0);

  // ✅ user đã bấm Change supplier
  const [supplierChangeMode, setSupplierChangeMode] = useState(false);

  const [isEnManuallyEdited, setIsEnManuallyEdited] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  const locked = saving;

  // ✅ unit dùng để filter supplier (ưu tiên requestUnit)
  const unitForFilter = (requestUnit || formData.unit || '').trim();

  // ✅ NEW: Completed lock (cannot leave supplier empty once completed)
  const completedLockRef = useRef(false);
  const initialSupplierRef = useRef({ supplierId: '', supplierName: '' });

  // ===== CONFIRM UNSELECT ON EDIT =====
  const [openUnselectConfirm, setOpenUnselectConfirm] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);
  // pendingEdit = { type: 'form' | 'requestUnit', field, value, label }

  // ===== UI TOKENS =====
  const paperSx = useMemo(
    () => ({
      borderRadius: fullScreen ? 0 : 4,
      overflow: 'hidden',
      boxShadow: `0 22px 70px ${alpha('#000', 0.25)}`,
      border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
      background: alpha('#FFFFFF', 0.92),
      backdropFilter: 'blur(14px)',

      width: fullScreen ? '100%' : '96vw',
      maxWidth: fullScreen ? '100%' : '1600px',
      height: fullScreen ? '100%' : '92vh',
      maxHeight: fullScreen ? '100%' : '92vh',
      display: 'flex',
      flexDirection: 'column',
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
      flex: '0 0 auto',
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
    // clear supplier but keep user-edited fields
    setFormData((prev) => ({
      ...prev,
      supplierId: '',
      supplierPrice: 0,
      productType1Id: '',
      productType2Id: '',
    }));

    setSelectedSupplier(null);
    setShowSupplierSelector(true);
    setSupplierChangeMode(true);
    setSupplierSelectorKey((k) => k + 1);
  }, []);

  const requestUnselectConfirm = useCallback(
    ({ type, field, value, label }) => {
      // chỉ hỏi confirm nếu đang có supplier
      if (!formData.supplierId?.trim() && !selectedSupplier) {
        if (type === 'requestUnit') {
          setRequestUnit(value);
          setFormData((prev) => ({ ...prev, unit: value })); // sync unit display if needed
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

    // 1) unselect supplier
    doUnselectSupplier();

    // 2) apply pending edit
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

    toastError('Đã bỏ chọn nhà cung cấp. Vui lòng chọn lại nhà cung cấp.');
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
      if (orderQty <= 0 || totalRequestQty === 0) return rows.map((r) => ({ ...r, buy: '' }));
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
        buy: row.department ? (allocated[row.department] ?? '') : '',
      }));
    },
    [totalRequestQty]
  );

  useEffect(() => {
    if (!orderQtyError) {
      setDeptRows((prev) => autoAllocateBuy(prev, formData.orderQty));
    }
  }, [formData.orderQty, autoAllocateBuy, orderQtyError]);

  // ===== API =====
  const fetchGroupCurrency = useCallback(async () => {
    const gid = item?.requisition?.groupId;
    if (!gid) {
      setGroupCurrency('VND');
      return;
    }

    setLoadingCurrency(true);
    try {
      const email = getUserEmail();
      const token = getAccessToken();

      const url = withEmail(`${API_BASE_URL}/api/group-summary-requisitions/${gid}`, email);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setGroupCurrency(normalizeCurrencyCode(data.currency));
      } else {
        if (mountedRef.current) setGroupCurrency('VND');
      }
    } catch {
      if (mountedRef.current) setGroupCurrency('VND');
    } finally {
      if (mountedRef.current) setLoadingCurrency(false);
    }
  }, [item]);

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

      const data = await res.json().catch(() => []);
      if (mountedRef.current) setDepartmentList(data || []);
    } catch (err) {
      console.error(err);
      if (mountedRef.current) setDepartmentList([]);
    } finally {
      if (mountedRef.current) setLoadingDepartments(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const rid = item?.requisition?.id;
    if (!rid) return;

    try {
      const email = getUserEmail();
      const token = getAccessToken();

      const url = withEmail(`${API_BASE_URL}/api/summary-requisitions/${rid}`, email);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Load failed');
      }

      const data = await res.json();
      if (!mountedRef.current) return;

      // ✅ Completed lock detection (robust)
      const wasCompleted =
        !!data?.completedDate ||
        data?.isCompleted === true ||
        data?.completed === true ||
        String(data?.status || '').toLowerCase() === 'completed';

      completedLockRef.current = wasCompleted;
      initialSupplierRef.current = {
        supplierId: data?.supplierId || '',
        supplierName: data?.supplierName || '',
      };

      const unitValue = data.unit || '';

      setFormData({
        itemDescriptionEN: data.itemDescriptionEN || '',
        itemDescriptionVN: data.itemDescriptionVN || '',
        fullItemDescriptionVN: data.fullDescription || '',
        oldSapCode: data.oldSAPCode || '',
        hanaSapCode: data.hanaSAPCode || '',
        orderQty: data.orderQty?.toString() || '',
        reason: data.reason || '',
        remark: data.remark || '',
        supplierId: data.supplierId || '',
        groupId: data.groupId || '',
        productType1Id: data.productType1Id || '',
        productType2Id: data.productType2Id || '',
        unit: unitValue,
        supplierPrice: data.price || 0,
      });

      // ✅ request unit = unit của request thật (editable)
      setRequestUnit(unitValue);

      const depts = (data.departmentRequisitions || []).map((d) => ({
        department: d.id ? String(d.id) : '',
        qty: d.qty != null ? String(d.qty) : '',
        buy: d.buy != null ? String(d.buy) : '',
      }));
      if (depts.length === 0) depts.push({ department: '', qty: '', buy: '' });

      setDeptRows(depts);
      validateDeptDuplicates(depts);

      setImageUrls(data.imageUrls || []);

      setFiles([]);
      setPreviews((p) => {
        p.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      setImagesToDelete([]);

      if (data.supplierId) {
        setSelectedSupplier({
          supplierName: data.supplierName || '',
          sapCode: data.oldSAPCode || '',
          hanaCode: data.hanaSAPCode || '',
          price: data.price || 0,
          unit: unitValue,
        });
        setShowSupplierSelector(false);
      } else {
        setSelectedSupplier(null);
        setShowSupplierSelector(true);
      }

      setIsEnManuallyEdited(false);
      setSupplierChangeMode(false);
      setSupplierSelectorKey((k) => k + 1);
    } catch (e) {
      console.error(e);
      toastError(e?.message || 'Failed to load data');
    }
  }, [item, toastError, validateDeptDuplicates]);

  // ===== open lifecycle =====
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // cleanup previews
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && item?.requisition?.id) {
      fetchData();
      fetchGroupCurrency();
      fetchDepartmentList();
      return;
    }

    setFormData({
      itemDescriptionEN: '',
      itemDescriptionVN: '',
      fullItemDescriptionVN: '',
      oldSapCode: '',
      hanaSapCode: '',
      orderQty: '',
      reason: '',
      remark: '',
      supplierId: '',
      groupId: '',
      productType1Id: '',
      productType2Id: '',
      unit: '',
      supplierPrice: 0,
    });

    setRequestUnit('');

    setDeptRows([{ department: '', qty: '', buy: '' }]);
    setDeptErrors(['']);

    setFiles([]);
    setPreviews((p) => {
      p.forEach((u) => URL.revokeObjectURL(u));
      return [];
    });

    setImageUrls([]);
    setImagesToDelete([]);

    setSelectedSupplier(null);
    setShowSupplierSelector(true);
    setSupplierSelectorKey((k) => k + 1);

    setSupplierChangeMode(false);

    setIsEnManuallyEdited(false);
    setOpenConfirmDialog(false);

    setOpenUnselectConfirm(false);
    setPendingEdit(null);

    // ✅ reset completed lock
    completedLockRef.current = false;
    initialSupplierRef.current = { supplierId: '', supplierName: '' };
  }, [open, item, fetchData, fetchGroupCurrency, fetchDepartmentList]);

  // ===== Auto translate VN -> EN =====
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
        if (res.ok) {
          const data = await res.json();
          if (mountedRef.current) {
            setFormData((prev) => ({ ...prev, itemDescriptionEN: data.translatedText || '' }));
          }
        }
      } catch {
        // ignore
      } finally {
        if (mountedRef.current) setTranslating(false);
      }
    },
    [isEnManuallyEdited]
  );

  const debouncedTranslate = useMemo(() => debounce(translateText, 600), [translateText]);

  useEffect(() => {
    const vn = (formData.itemDescriptionVN || '').trim();
    const en = (formData.itemDescriptionEN || '').trim();

    if (vn && !isEnManuallyEdited && !en) {
      debouncedTranslate(vn);
    }

    return () => debouncedTranslate.cancel?.();
  }, [formData.itemDescriptionVN, formData.itemDescriptionEN, debouncedTranslate, isEnManuallyEdited]);

  // ===== supplier select =====
  const handleSelectSupplier = (supplierData) => {
    if (supplierData) {
      setSupplierChangeMode(false);

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

      // ✅ overwrite unit + requestUnit ALWAYS
      const nextUnit = (supplierData.unit || '').trim();
      setRequestUnit(nextUnit);

      setFormData((prev) => ({
        ...prev,
        supplierId: supplierData.supplierId || '',
        unit: nextUnit,
        supplierPrice: parseFloat(supplierData.supplierPrice) || 0,
        productType1Id: supplierData.productType1Id || '',
        productType2Id: supplierData.productType2Id || '',

        oldSapCode: supplierData.oldSapCode || '',
        hanaSapCode: supplierData.hanaSapCode || '',
        itemDescriptionVN: vn || '',
        itemDescriptionEN: en || '',
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
      return;
    }

    // user clear supplier
    if (completedLockRef.current) {
      const oldName = initialSupplierRef.current?.supplierName || 'selected supplier';
      toastError(
        `Cannot leave the supplier blank because this requisition has been marked as Completed. Please keep ${oldName} or choose another supplier before saving.`
      );
      return;
    }

    setSupplierChangeMode(true);

    setFormData((prev) => ({
      ...prev,
      oldSapCode: '',
      hanaSapCode: '',
      supplierId: '',
      unit: '',
      supplierPrice: 0,
      productType1Id: '',
      productType2Id: '',
    }));

    setRequestUnit('');

    setSelectedSupplier(null);
    setShowSupplierSelector(true);
    setSupplierSelectorKey((k) => k + 1);
  };

  // ===== handleChange with confirm =====
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
      return; // chờ user OK
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'itemDescriptionEN') setIsEnManuallyEdited(true);
    if (field === 'itemDescriptionVN') setIsEnManuallyEdited(false);
  };

  const handleDeptChange = (index, field, value) => {
    setDeptRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'department') validateDeptDuplicates(next);
      return next;
    });
  };

  const handleAddDeptRow = () => {
    setDeptRows((prev) => {
      const next = [...prev, { department: '', qty: '', buy: '' }];
      setDeptErrors((e) => [...e, '']);
      return next;
    });
  };

  const handleDeleteDeptRow = (index) => {
    setDeptRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const safe = next.length ? next : [{ department: '', qty: '', buy: '' }];
      validateDeptDuplicates(safe);
      return safe;
    });
  };

  const calcTotalRequestQty = () => deptRows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
  const calcTotalBuy = () => deptRows.reduce((s, r) => s + (parseFloat(r.buy) || 0), 0);

  const currentImagesCount = Math.max(0, files.length + imageUrls.length);

  const handleFileChange = (e) => {
    const maxRemain = 10 - (files.length + imageUrls.length);
    const selected = Array.from(e.target.files || []).slice(0, Math.max(0, maxRemain));
    const valid = selected.filter((f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);

    if (valid.length < selected.length) toastError('Only images ≤ 5MB allowed');

    setFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);

    e.target.value = null;
  };

  const handleRemoveFile = (index) => {
    if (index < imageUrls.length) {
      const url = imageUrls[index];
      setImageUrls((prev) => prev.filter((_, i) => i !== index));
      setImagesToDelete((prev) => [...prev, url]);
    } else {
      const i = index - imageUrls.length;
      URL.revokeObjectURL(previews[i]);
      setFiles((prev) => prev.filter((_, j) => j !== i));
      setPreviews((prev) => prev.filter((_, j) => j !== i));
    }
  };

  const handleSaveClick = () => {
    if (!formData.itemDescriptionVN?.trim()) return toastError('Item Description (VN) is required');
    if (totalRequestQty === 0) return toastError('At least one department must have Qty');
    if (orderQtyError) return toastError(orderQtyError);
    if (deptErrors.some(Boolean)) return toastError('Duplicate departments');

    if (completedLockRef.current && !formData.supplierId?.trim()) {
      const oldName = initialSupplierRef.current?.supplierName || 'nhà cung cấp';
      return toastError(
        `Requisition này đã Completed nên không thể lưu khi thiếu nhà cung cấp.
Hãy giữ ${oldName} hoặc chọn một nhà cung cấp khác rồi hãy bấm Save.`
      );
    }

    setOpenConfirmDialog(true);
  };

  const handleSave = async () => {
    const rid = item?.requisition?.id;
    if (!rid) return toastError('Missing requisition id');

    if (completedLockRef.current && !formData.supplierId?.trim()) {
      const oldName = initialSupplierRef.current?.supplierName || 'nhà cung cấp';
      return toastError(
        `Requisition này đã Completed nên không thể cập nhật khi thiếu nhà cung cấp.
Hãy giữ ${oldName} hoặc chọn một nhà cung cấp khác.`
      );
    }

    const departmentRequisitions = deptRows
      .filter((r) => r.department && r.qty !== '' && r.qty !== null && r.qty !== undefined)
      .map((r) => ({
        id: r.department,
        name: departmentList.find((d) => String(d.id) === String(r.department))?.departmentName || '',
        qty: parseFloat(r.qty) || 0,
        buy: parseFloat(r.buy) || 0,
      }));

    const fd = new FormData();
    fd.append('englishName', formData.itemDescriptionEN || '');
    fd.append('vietnameseName', formData.itemDescriptionVN || '');
    fd.append('fullDescription', formData.fullItemDescriptionVN || '');
    fd.append('oldSapCode', formData.oldSapCode || '');
    fd.append('hanaSapCode', formData.hanaSapCode || '');
    fd.append('departmentRequisitions', JSON.stringify(departmentRequisitions));
    fd.append('orderQty', parseFloat(formData.orderQty) || 0);
    fd.append('reason', formData.reason || '');
    fd.append('remark', formData.remark || '');

    fd.append('supplierId', formData.supplierId ?? '');
    fd.append('groupId', formData.groupId || '');
    fd.append('productType1Id', formData.productType1Id || '');
    fd.append('productType2Id', formData.productType2Id || '');

    // ✅ submit unit ưu tiên requestUnit
    fd.append('unit', (requestUnit || formData.unit || '').trim());

    fd.append('supplierPrice', formData.supplierPrice || 0);

    files.forEach((f) => fd.append('files', f));
    fd.append('imagesToDelete', JSON.stringify(imagesToDelete));

    setSaving(true);
    try {
      const email = getUserEmail();
      const token = getAccessToken();

      const url = withEmail(`${API_BASE_URL}/api/summary-requisitions/${rid}`, email);

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      });

      let payload = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) payload = await res.json().catch(() => null);
      else payload = { message: await res.text().catch(() => '') };

      if (!res.ok) throw new Error(payload?.message || 'Update failed');

      setOpenConfirmDialog(false);
      onClose?.('Updated successfully!');
      onRefresh?.();
    } catch (err) {
      toastError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* MAIN */}
      <Dialog
        open={open}
        onClose={locked ? undefined : onClose}
        fullScreen={fullScreen}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        {/* Header */}
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
                Edit Request
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.4, fontSize: 12.5 }}>
                Update item info, departments, order quantity, notes & images.
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

        {/* ✅ make content scroll inside the big dialog */}
        <DialogContent sx={{ p: { xs: 1.8, sm: 2.2 }, flex: '1 1 auto', overflow: 'auto' }}>
          <Stack spacing={1.4}>
            {/* BASIC */}
            <Box sx={subtleCardSx}>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Basic info</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.2 }}>
                VN required; EN auto-translates unless you edit it manually.
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
                  label="Old SAP Code"
                  value={formData.oldSapCode}
                  onChange={handleChange('oldSapCode')}
                  size="small"
                  fullWidth
                  disabled={locked}
                  sx={fieldSx}
                  helperText="Selecting supplier will auto-fill SAP + Hana."
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

                {/* ✅ Request Unit (confirm before unselect) */}
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
                  helperText="Used to auto-filter supplier list + submitted as unit."
                />

                <TextField
                  label="Item Description (VN) *"
                  value={formData.itemDescriptionVN}
                  onChange={handleChange('itemDescriptionVN')}
                  size="small"
                  fullWidth
                  required
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

            {/* SUPPLIER */}
            <Box sx={subtleCardSx}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Supplier</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.2 }}>
                    Selecting supplier will auto-fill SAP + Hana and unit/price.
                  </Typography>
                </Box>

                {!showSupplierSelector && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      if (completedLockRef.current) {
                        toastError(
                          'This requisition has been completed. You can change the supplier, but it cannot be left blank when saving.'
                        );
                      }

                      setSupplierChangeMode(true);

                      setFormData((prev) => ({
                        ...prev,
                        supplierId: '',
                        unit: requestUnit || prev.unit || '',
                        supplierPrice: 0,
                        productType1Id: '',
                        productType2Id: '',
                      }));

                      setSelectedSupplier(null);
                      setShowSupplierSelector(true);
                      setSupplierSelectorKey((k) => k + 1);
                    }}
                    disabled={locked}
                    sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 800 }}
                  >
                    Change supplier
                  </Button>
                )}
              </Stack>

              <Divider sx={{ my: 1.2 }} />

              {supplierChangeMode && !formData.supplierId && !completedLockRef.current && (
                <Alert
                  severity="info"
                  sx={{
                    mb: 1.2,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.info.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                  }}
                >
                  Supplier is currently <b>empty</b>. If you Save now, the supplier (supplierId/supplierName/price/amount)
                  will be cleared on the server.
                </Alert>
              )}

              {supplierChangeMode && !formData.supplierId && completedLockRef.current && (
                <Alert
                  severity="warning"
                  sx={{
                    mb: 1.2,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.warning.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`,
                  }}
                >
                  Requisition này đã <b>Completed</b> nên bạn <b>không thể</b> để trống nhà cung cấp.
                  Vui lòng chọn một nhà cung cấp trước khi lưu.
                </Alert>
              )}

              {showSupplierSelector ? (
                <Box
                  sx={{
                    borderRadius: 4,
                    border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
                    background: alpha('#fff', 0.65),
                    p: 1.2,
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
                    requisitionId={item?.requisition?.id || ''}
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
                      Unit: <b>{selectedSupplier.unit || '-'}</b>
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
                  <Typography sx={{ fontWeight: 900, letterSpacing: 0.3 }}>Department requests</Typography>
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
                      Unit:{' '}
                      <b style={{ color: theme.palette.text.primary }}>{(requestUnit || formData.unit) || '-'}</b>
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
              <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.2 }}>
                Reason / Remark.
              </Typography>

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
                  icon={<CheckCircleRoundedIcon />}
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

                {(imageUrls.length > 0 || previews.length > 0) && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, mt: 0.4 }}>
                    {imageUrls.map((url, i) => (
                      <Box key={`old-${i}`} sx={{ position: 'relative' }}>
                        <img
                          src={`${API_BASE_URL}${url}`}
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

                    {previews.map((url, i) => (
                      <Box key={`new-${i}`} sx={{ position: 'relative' }}>
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
                          onClick={() => handleRemoveFile(i + imageUrls.length)}
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

        {/* Footer */}
        <DialogActions sx={{ px: { xs: 2, sm: 2.2 }, py: 1.8, gap: 1, flex: '0 0 auto' }}>
          <Button onClick={onClose} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveClick}
            disabled={locked || deptErrors.some(Boolean) || !!orderQtyError}
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
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
            If you continue, the system will <b>deselect the current supplier</b> and you will need to select a supplier again.
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

      {/* CONFIRM SAVE */}
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
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm edit</DialogTitle>
        <DialogContent sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            Save changes for <b>{formData.itemDescriptionVN || 'this item'}</b>?
          </Typography>
          <Typography sx={{ mt: 0.6, fontSize: 12.5, color: 'text.secondary' }}>
            This will update item data, departments, order qty and images.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setOpenConfirmDialog(false)} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={locked} variant="contained" sx={gradientBtnSx}>
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