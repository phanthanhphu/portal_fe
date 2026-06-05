import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Cancel,
  CheckCircle,
  Close,
  Download,
  Edit,
  Inbox as InboxIcon,
  Refresh,
  Search,
  SwapHoriz,
  Visibility,
} from '@mui/icons-material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { apiRawClient as axios } from '../../routes/globalApi';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../../config';
import {
  emptyPreviewState,
  formatDateTime,
  getNoticeFileName,
  getNoticeFileUrl,
  getPreviewKind,
} from './noticesUtils';
import EditNoticeDialog from './EditNoticeDialog';

const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const STATUS_META = {
  PENDING: {
    label: 'Pending',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  APPROVED: {
    label: 'Approved',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  REJECTED: {
    label: 'Rejected',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
  },
};

const APPROVE_PERMISSION = {
  NONE: 'NONE',
  NOTICE: 'NOTICE',
  DOCUMENT: 'DOCUMENT',
  BOTH: 'BOTH',
};

const DEPT_API = `${API_BASE_URL}/api/departments`;

const normalizeApprovePermission = (value) => {
  const permission = String(value || APPROVE_PERMISSION.NONE).trim().toUpperCase();

  if (
    permission === APPROVE_PERMISSION.NOTICE ||
    permission === APPROVE_PERMISSION.DOCUMENT ||
    permission === APPROVE_PERMISSION.BOTH ||
    permission === APPROVE_PERMISSION.NONE
  ) {
    return permission;
  }

  return APPROVE_PERMISSION.NONE;
};

const isAdminRole = (role) => {
  const normalizedRole = String(role || '').trim().toUpperCase();
  return normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';
};

const canUserApproveNotice = (user = {}) => {
  if (!user) return false;

  // IMPORTANT:
  // Approval action is controlled ONLY by approvePermission.
  // Role Admin alone must NOT grant Notice approval action.
  const permission = normalizeApprovePermission(user.approvePermission);

  return permission === APPROVE_PERMISSION.NOTICE || permission === APPROVE_PERMISSION.BOTH;
};

const getCurrentUserForPermission = () => {
  const userKeys = ['user', 'currentUser', 'authUser', 'userInfo'];

  for (const key of userKeys) {
    const user = parseJsonSafely(localStorage.getItem(key));
    if (user) return user;
  }

  return {};
};

const syncCurrentUserPermissionToStorage = (latestUser = {}) => {
  const userKeys = ['user', 'currentUser', 'authUser', 'userInfo'];

  userKeys.forEach((key) => {
    const currentValue = parseJsonSafely(localStorage.getItem(key));

    if (!currentValue) return;

    const currentId = String(currentValue.id || currentValue.userId || currentValue._id || '').trim();
    const latestId = String(latestUser.id || latestUser.userId || latestUser._id || '').trim();

    if (currentId && latestId && currentId !== latestId) return;

    localStorage.setItem(
      key,
      JSON.stringify({
        ...currentValue,
        ...latestUser,
        approvePermission: normalizeApprovePermission(latestUser.approvePermission),
        canApproveNotice: latestUser.canApproveNotice === true,
        canApproveDocument: latestUser.canApproveDocument === true,
      }),
    );
  });
};

const stripHtml = (html = '') =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|div|li|h[1-6]|tr|table)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const sanitizeNoticeHtml = (html = '') =>
  String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

const isLongContent = (text = '') => String(text || '').trim().length > 180;

const parseJsonSafely = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;

    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getCurrentUserId = () => {
  const directUserId = localStorage.getItem('userId');
  if (directUserId) return directUserId;

  const userKeys = ['user', 'currentUser', 'authUser', 'userInfo'];

  for (const key of userKeys) {
    const user = parseJsonSafely(localStorage.getItem(key));

    if (user?.id) return user.id;
    if (user?.userId) return user.userId;
    if (user?._id) return user._id;
  }

  const tokenPayload = decodeJwtPayload(localStorage.getItem('token'));

  return tokenPayload?.id
    || tokenPayload?.userId
    || tokenPayload?._id
    || tokenPayload?.sub
    || '';
};

const getAuthHeaders = (accept = '*/*') => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: accept,
  };
};

const normalizeUrl = (value) => String(value || '').trim();

const uniqueUrls = (urls = []) => {
  const result = [];

  urls.forEach((url) => {
    const cleanUrl = normalizeUrl(url);
    if (cleanUrl && !result.includes(cleanUrl)) result.push(cleanUrl);
  });

  return result;
};

const getNoticeFileUrls = (item) => {
  const urls = [];

  if (Array.isArray(item?.fileUrls)) {
    item.fileUrls.forEach((url) => {
      const cleanUrl = normalizeUrl(url);
      if (cleanUrl && !urls.includes(cleanUrl)) urls.push(cleanUrl);
    });
  }

  if (urls.length === 0 && item?.fileUrl) {
    const cleanUrl = normalizeUrl(item.fileUrl);
    if (cleanUrl) urls.push(cleanUrl);
  }

  return urls;
};

const normalizeNoticeRow = (item = {}) => {
  const fileUrls = getNoticeFileUrls(item);
  const previewUrls = Array.isArray(item.previewUrls) && item.previewUrls.length > 0
    ? uniqueUrls(item.previewUrls)
    : fileUrls;

  const status = String(item.status || APPROVAL_STATUS.APPROVED).toUpperCase();

  return {
    ...item,
    status: STATUS_META[status] ? status : APPROVAL_STATUS.APPROVED,
    fileUrls,
    previewUrls,
    fileUrl: fileUrls[0] || item.fileUrl || null,
    previewUrl: previewUrls[0] || fileUrls[0] || item.previewUrl || null,
    department: [item.departmentName, item.division].filter(Boolean).join(' '),
  };
};

const OFFICE_PREVIEW_TYPES = new Set(['DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX']);

const getFileExtensionFromUrl = (value) => {
  if (!value) return '';

  try {
    const decodedValue = decodeURIComponent(String(value));
    const cleanValue = decodedValue
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/');

    const fileName = cleanValue.split('/').pop() || cleanValue;
    const dotIndex = fileName.lastIndexOf('.');

    if (dotIndex < 0 || dotIndex === fileName.length - 1) {
      return '';
    }

    return fileName.substring(dotIndex + 1).toUpperCase();
  } catch {
    const cleanValue = String(value)
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/');

    const fileName = cleanValue.split('/').pop() || cleanValue;
    const dotIndex = fileName.lastIndexOf('.');

    return dotIndex >= 0 ? fileName.substring(dotIndex + 1).toUpperCase() : '';
  }
};

const getNoticePreviewFileType = (item) => {
  const fileUrl = getNoticeFileUrl(item);
  const fileName = getNoticeFileName(item);

  const candidates = [
    item?.fileType,
    item?.type,
    fileName,
    fileUrl,
    item?.fileUrl,
    item?.previewUrl,
  ];

  for (const candidate of candidates) {
    const directType = String(candidate || '').trim().toUpperCase();

    if (OFFICE_PREVIEW_TYPES.has(directType)) {
      return directType;
    }

    const extension = getFileExtensionFromUrl(candidate);

    if (extension) {
      return extension;
    }
  }

  return '';
};

const shouldConvertNoticeFileToPdf = (item) => OFFICE_PREVIEW_TYPES.has(getNoticePreviewFileType(item));

const createNoticeFileItem = (item, fileUrl) => ({
  ...item,
  fileUrl,
  previewUrl: fileUrl || item?.previewUrl || '',
});

const getBlobErrorMessage = async (error, fallbackMessage) => {
  try {
    const data = error?.response?.data;

    if (data instanceof Blob) {
      const text = await data.text();

      if (!text) return fallbackMessage;

      try {
        const json = JSON.parse(text);
        return json?.message || fallbackMessage;
      } catch {
        return text || fallbackMessage;
      }
    }

    return error?.response?.data?.message || error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

function StatusChip({ status }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;

  return (
    <Chip
      size="small"
      label={meta.label}
      sx={{
        height: 24,
        minWidth: 86,
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 800,
        color: meta.color,
        backgroundColor: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    />
  );
}

function PaginationBar({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange, loading }) {
  const totalPages = Math.max(1, Math.ceil((count || 0) / (rowsPerPage || 1)));
  const from = count === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(count || 0, (page + 1) * rowsPerPage);

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 1,
        px: 1.25,
        py: 0.9,
        borderRadius: 1.5,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          Showing <span style={{ color: '#111827' }}>{from}</span>–<span style={{ color: '#111827' }}>{to}</span> of{' '}
          <span style={{ color: '#111827' }}>{count || 0}</span>
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
          <Button
            variant="text"
            startIcon={<ChevronLeftIcon fontSize="small" />}
            disabled={loading || page <= 0}
            onClick={() => onPageChange(page - 1)}
            sx={{ textTransform: 'none', fontWeight: 400 }}
          >
            Prev
          </Button>

          <Pagination
            size="small"
            page={page + 1}
            count={totalPages}
            onChange={(_, newPage) => onPageChange(newPage - 1)}
            disabled={loading}
            siblingCount={1}
            boundaryCount={1}
            sx={{ '& .MuiPaginationItem-root': { fontSize: '0.8rem', minWidth: 32, height: 32 } }}
          />

          <Button
            variant="text"
            endIcon={<ChevronRightIcon fontSize="small" />}
            disabled={loading || page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            sx={{ textTransform: 'none', fontWeight: 400 }}
          >
            Next
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Page size</Typography>
          <Select
            size="small"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            disabled={loading}
            sx={{
              height: 32,
              minWidth: 110,
              borderRadius: 1.2,
              '& .MuiSelect-select': { fontSize: '0.8rem' },
            }}
          >
            {[10, 12, 20, 50].map((n) => (
              <MenuItem key={n} value={n} sx={{ fontSize: '0.8rem' }}>
                {n} / page
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>
    </Paper>
  );
}

function NoticeDetailDialog({ open, item, loadingAction, canEdit, canApproveNotice, onClose, onApprove, onReject, onEdit, onChangeStatus, onPreviewFile, onDownloadFile }) {
  if (!item) return null;

  const isPending = item.status === APPROVAL_STATUS.PENDING;
  const files = getNoticeFileUrls(item);

  return (
    <Dialog open={open} onClose={loadingAction ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Notice Detail</Typography>
            <Typography fontSize={13} color="text.secondary">
              Review notice content before publishing to index page
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip status={item.status} />
            <IconButton size="small" disabled={loadingAction} onClick={onClose}>
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography fontSize={12} fontWeight={700} color="text.secondary">Title</Typography>
            <Typography fontWeight={800}>{item.title || '-'}</Typography>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box flex={1}>
              <Typography fontSize={12} fontWeight={700} color="text.secondary">Department</Typography>
              <Typography fontSize={14}>{[item.departmentName, item.division].filter(Boolean).join(' - ') || '-'}</Typography>
            </Box>

            <Box flex={1}>
              <Typography fontSize={12} fontWeight={700} color="text.secondary">Created By</Typography>
              <Typography fontSize={14}>{item.createdByName || item.userName || item.createdBy || item.createdByUserId || item.userId || '-'}</Typography>
            </Box>

            <Box flex={1}>
              <Typography fontSize={12} fontWeight={700} color="text.secondary">Created At</Typography>
              <Typography fontSize={14}>{formatDateTime(item.createdAt)}</Typography>
            </Box>
          </Stack>

          {item.status === APPROVAL_STATUS.APPROVED && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box flex={1}>
                <Typography fontSize={12} fontWeight={700} color="text.secondary">Approved By</Typography>
                <Typography fontSize={14}>{item.approvedBy || '-'}</Typography>
              </Box>
              <Box flex={1}>
                <Typography fontSize={12} fontWeight={700} color="text.secondary">Approved At</Typography>
                <Typography fontSize={14}>{formatDateTime(item.approvedAt)}</Typography>
              </Box>
            </Stack>
          )}

          {item.status === APPROVAL_STATUS.REJECTED && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid #fecaca',
                bgcolor: '#fef2f2',
              }}
            >
              <Typography fontSize={12} fontWeight={800} color="#991b1b">Rejected Reason</Typography>
              <Typography fontSize={14} color="#7f1d1d">{item.rejectReason || '-'}</Typography>
              <Typography fontSize={12} color="#991b1b" sx={{ mt: 0.5 }}>
                Rejected by {item.rejectedBy || '-'} at {formatDateTime(item.rejectedAt)}
              </Typography>
            </Paper>
          )}

          <Divider />

          <Box>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>Content</Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid #e5e7eb',
                minHeight: 140,
                bgcolor: '#fff',
                '& p': { mt: 0 },
                '& table': { width: '100%', borderCollapse: 'collapse' },
                '& td, & th': { border: '1px solid #d1d5db', p: '6px 8px' },
              }}
            >
              <Box dangerouslySetInnerHTML={{ __html: sanitizeNoticeHtml(item.content || '') }} />
            </Paper>
          </Box>

          <Box>
            <Typography fontSize={12} fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>Files</Typography>
            {files.length > 0 ? (
              <Stack spacing={1}>
                {files.map((fileUrl, index) => {
                  const fileItem = createNoticeFileItem(item, fileUrl);
                  const fileName = getNoticeFileName(fileItem) || `File ${index + 1}`;

                  return (
                    <Paper
                      key={`${fileUrl}-${index}`}
                      elevation={0}
                      sx={{
                        p: 1.2,
                        borderRadius: 1.5,
                        border: '1px solid #e5e7eb',
                        bgcolor: '#f9fafb',
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        justifyContent="space-between"
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontSize={13} fontWeight={800} noWrap>{fileName}</Typography>
                          <Typography fontSize={12} color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            {fileUrl}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility fontSize="small" />}
                            disabled={loadingAction}
                            onClick={() => onPreviewFile(fileItem)}
                            sx={{ textTransform: 'none' }}
                          >
                            Preview
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Download fontSize="small" />}
                            disabled={loadingAction}
                            onClick={() => onDownloadFile(fileItem)}
                            sx={{ textTransform: 'none' }}
                          >
                            Download
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Typography fontSize={13} color="text.secondary">No file attached</Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Tooltip title={canEdit ? 'Edit notice' : 'No Notice approval permission'} arrow>
          <span>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              disabled={loadingAction || !canEdit}
              onClick={() => onEdit(item)}
              sx={{ textTransform: 'none' }}
            >
              Edit
            </Button>
          </span>
        </Tooltip>

        <Tooltip title={canEdit ? 'Change status' : 'No Notice approval permission'} arrow>
          <span>
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              disabled={loadingAction || !canEdit}
              onClick={() => onChangeStatus(item)}
              sx={{ textTransform: 'none' }}
            >
              Change Status
            </Button>
          </span>
        </Tooltip>

        <Button disabled={loadingAction} onClick={onClose} sx={{ textTransform: 'none' }}>
          Close
        </Button>

        {isPending && (
          <>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              disabled={loadingAction || !canApproveNotice}
              onClick={() => onReject(item)}
              sx={{ textTransform: 'none' }}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={loadingAction ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
              disabled={loadingAction || !canApproveNotice}
              onClick={() => onApprove(item)}
              sx={{ textTransform: 'none' }}
            >
              Approve
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function RejectDialog({ open, item, reason, loading, onChangeReason, onClose, onConfirm }) {
  const isReasonEmpty = !String(reason || '').trim();

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reject Notice</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography fontSize={14}>Do you want to reject this notice?</Typography>
          <Typography fontWeight={800}>{item?.title || '-'}</Typography>
          <TextField
            label="Reason"
            placeholder="Enter the rejection reason so the user knows what to update..."
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            required
            disabled={loading}
            error={open && isReasonEmpty}
            helperText={open && isReasonEmpty ? 'Rejection reason is required.' : ' '}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button disabled={loading} onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={loading || isReasonEmpty}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Cancel />}
          onClick={onConfirm}
          sx={{ textTransform: 'none' }}
        >
          Confirm Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}


function StatusChangeDialog({
  open,
  item,
  statusValue,
  reason,
  loading,
  onStatusChange,
  onReasonChange,
  onClose,
  onConfirm,
}) {
  const currentStatus = String(item?.status || APPROVAL_STATUS.PENDING).toUpperCase();
  const nextStatus = String(statusValue || '').toUpperCase();
  const isRejected = nextStatus === APPROVAL_STATUS.REJECTED;
  const isSameStatus = currentStatus === nextStatus;

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Notice Status</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography fontSize={12} fontWeight={800} color="text.secondary">Notice</Typography>
            <Typography fontWeight={800}>{item?.title || '-'}</Typography>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Box flex={1}>
              <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ mb: 0.75 }}>
                Current Status
              </Typography>
              <StatusChip status={currentStatus} />
            </Box>

            <Box flex={1}>
              <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ mb: 0.75 }}>
                New Status
              </Typography>
              <Select
                size="small"
                value={statusValue}
                fullWidth
                disabled={loading}
                onChange={(e) => onStatusChange(e.target.value)}
              >
                <MenuItem value={APPROVAL_STATUS.PENDING}>Pending</MenuItem>
                <MenuItem value={APPROVAL_STATUS.APPROVED}>Approved</MenuItem>
                <MenuItem value={APPROVAL_STATUS.REJECTED}>Rejected</MenuItem>
              </Select>
            </Box>
          </Stack>

          {isRejected && (
            <TextField
              label="Reject Reason"
              placeholder="Enter the rejection reason..."
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              disabled={loading}
            />
          )}

          {nextStatus === APPROVAL_STATUS.PENDING && (
            <Alert severity="info">
              Changing to Pending will move this notice back to the approval queue and clear the previous approve/reject information.
            </Alert>
          )}

          {nextStatus === APPROVAL_STATUS.APPROVED && (
            <Alert severity="success">
              Changing to Approved will allow this notice to appear on the Notices/index page.
            </Alert>
          )}

          {isSameStatus && (
            <Alert severity="warning">
              The new status is the same as the current status.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button disabled={loading} onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={loading || isSameStatus || (isRejected && !String(reason || '').trim())}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SwapHoriz />}
          onClick={onConfirm}
          sx={{ textTransform: 'none' }}
        >
          Save Status
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function NoticeApprovalPage() {
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const previewFullScreen = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const [rows, setRows] = useState([]);
  const [statusTab, setStatusTab] = useState(APPROVAL_STATUS.PENDING);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [canApproveNoticePermission, setCanApproveNoticePermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [previewState, setPreviewState] = useState(emptyPreviewState);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [statusDialogItem, setStatusDialogItem] = useState(null);
  const [statusValue, setStatusValue] = useState(APPROVAL_STATUS.PENDING);
  const [statusReason, setStatusReason] = useState('');
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [contentDialogItem, setContentDialogItem] = useState(null);

  const userId = useMemo(() => getCurrentUserId(), []);
  const [currentUserForPermission, setCurrentUserForPermission] = useState(() => getCurrentUserForPermission());
  const currentUserPermissionRef = useRef(getCurrentUserForPermission());

  const toast = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const searchKeywordParams = useMemo(() => {
    const cleanKeyword = keywordFilter.trim();
    return {
      title: cleanKeyword,
      content: cleanKeyword,
    };
  }, [keywordFilter]);

  const fetchCountByStatus = useCallback(async (status) => {
    if (!userId) return 0;

    const response = await axios.get(`${API_BASE_URL}/api/notices/search`, {
      params: {
        userId,
        skipDepartmentFilter: true,
        status,
        title: searchKeywordParams.title,
        content: searchKeywordParams.content,
        departmentName: departmentFilter,
        page: 0,
        size: 1,
      },
      headers: getAuthHeaders('*/*'),
    });

    return Number(response?.data?.totalElements || 0);
  }, [userId, searchKeywordParams, departmentFilter]);

  const fetchCounts = useCallback(async () => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        fetchCountByStatus(APPROVAL_STATUS.PENDING),
        fetchCountByStatus(APPROVAL_STATUS.APPROVED),
        fetchCountByStatus(APPROVAL_STATUS.REJECTED),
      ]);

      setCounts({
        PENDING: pending,
        APPROVED: approved,
        REJECTED: rejected,
      });
    } catch (err) {
      console.error('Cannot load notice status counts', err);
    }
  }, [fetchCountByStatus]);

  const applyCurrentUserPermission = useCallback((latestUser = {}) => {
    const mergedUser = {
      ...getCurrentUserForPermission(),
      ...latestUser,
    };

    const permission = normalizeApprovePermission(mergedUser.approvePermission);
    const canApproveNotice = permission === APPROVE_PERMISSION.NOTICE || permission === APPROVE_PERMISSION.BOTH;

    const normalizedMergedUser = {
      ...mergedUser,
      approvePermission: permission,
      canApproveNotice,
    };

    currentUserPermissionRef.current = normalizedMergedUser;
    setCurrentUserForPermission(normalizedMergedUser);
    setIsAdmin(isAdminRole(normalizedMergedUser.role));
    setCanApproveNoticePermission(canApproveNotice);
    syncCurrentUserPermissionToStorage(normalizedMergedUser);

    return normalizedMergedUser;
  }, []);

  const fetchCurrentUserPermission = useCallback(async () => {
    if (!userId) {
      return applyCurrentUserPermission(getCurrentUserForPermission());
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
        headers: getAuthHeaders('application/json'),
      });

      const latestUser = response?.data?.data || response?.data?.user || response?.data || {};

      return applyCurrentUserPermission(latestUser);
    } catch (err) {
      console.warn('Cannot refresh current user approve permission. Fallback to localStorage.', err);
      return applyCurrentUserPermission(getCurrentUserForPermission());
    }
  }, [userId, applyCurrentUserPermission]);

  const fetchDepartments = useCallback(async () => {
    if (!userId) {
      setDepartments([]);
      return;
    }

    setLoadingDepartments(true);

    try {
      const response = await axios.get(`${DEPT_API}/search`, {
        params: { userId },
        headers: getAuthHeaders('*/*'),
      });

      const list = Array.isArray(response?.data?.departments)
        ? response.data.departments
        : Array.isArray(response?.data)
          ? response.data
          : [];

      setDepartments(list);
    } catch (err) {
      console.error('Cannot load departments for notice approval search', err);
      setDepartments([]);
      toast(err?.response?.data?.message || 'Failed to fetch departments.', 'error');
    } finally {
      setLoadingDepartments(false);
    }
  }, [userId]);

  const fetchData = useCallback(async (overrides = {}) => {
    const silent = Boolean(overrides.silent);

    if (!userId) {
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      toast('User ID not found. Please login again.', 'error');
      navigate('/login');
      return;
    }

    if (!silent) setLoading(true);

    const effPage = Number.isInteger(overrides.page) ? overrides.page : page;
    const effSize = Number.isInteger(overrides.size) ? overrides.size : rowsPerPage;
    const effStatus = overrides.status || statusTab;
    const effKeyword = overrides.keyword !== undefined ? overrides.keyword : keywordFilter;
    const effDepartment = overrides.department !== undefined ? overrides.department : departmentFilter;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/notices/search`, {
        params: {
          userId,
          skipDepartmentFilter: true,
          status: effStatus,
          title: effKeyword,
          content: effKeyword,
          departmentName: effDepartment,
          page: effPage,
          size: effSize,
        },
        headers: getAuthHeaders('*/*'),
      });

      const result = response?.data || {};
      const normalizedRows = (result.content || []).map((item) => normalizeNoticeRow(item));

      setRows(normalizedRows);
      setTotalElements(Number(result.totalElements || 0));
      setTotalPages(Number(result.totalPages || 1));
      const latestUserForPermission = overrides.currentUserForPermission || currentUserPermissionRef.current || getCurrentUserForPermission();
      const responseApprovePermission = normalizeApprovePermission(result.approvePermission);
      const userApprovePermission = normalizeApprovePermission(latestUserForPermission.approvePermission);
      const canApproveFromResponse =
        responseApprovePermission === APPROVE_PERMISSION.NOTICE ||
        responseApprovePermission === APPROVE_PERMISSION.BOTH;
      const canApproveFromLatestUser =
        userApprovePermission === APPROVE_PERMISSION.NOTICE ||
        userApprovePermission === APPROVE_PERMISSION.BOTH;

      setIsAdmin(Boolean(result.isAdmin) || isAdminRole(latestUserForPermission?.role));
      setCanApproveNoticePermission(canApproveFromResponse || canApproveFromLatestUser);
    } catch (err) {
      console.error(err);
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      toast(err?.response?.data?.message || 'Failed to fetch notices.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId, page, rowsPerPage, statusTab, keywordFilter, departmentFilter, navigate]);

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      const latestUser = await fetchCurrentUserPermission();

      if (!active) return;

      await fetchData({ currentUserForPermission: latestUser });
    };

    loadInitialData();

    return () => {
      active = false;
    };
  }, [fetchCurrentUserPermission, fetchData]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handleTabChange = (_, nextStatus) => {
    setStatusTab(nextStatus);
    setPage(0);
  };

  const handleSearch = () => {
    const nextKeyword = keywordInput.trim();
    const nextDepartment = departmentInput.trim();

    setKeywordFilter(nextKeyword);
    setDepartmentFilter(nextDepartment);
    setPage(0);
  };

  const handleReset = () => {
    setKeywordInput('');
    setKeywordFilter('');
    setDepartmentInput('');
    setDepartmentFilter('');
    setPage(0);
  };

  const handleApprove = async (item) => {
    if (!item?.id) return;

    if (!canApproveReject) {
      toast('You do not have Notice approval permission.', 'error');
      return;
    }

    setActionLoading(true);

    try {
      await axios.patch(`${API_BASE_URL}/api/notices/${item.id}/approve`, null, {
        params: { userId },
        headers: getAuthHeaders('*/*'),
      });

      toast('Notice approved successfully. It can now appear on index page.', 'success');
      setSelectedItem(null);
      await fetchData({ silent: true });
      await fetchCounts();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Approve notice failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (item) => {
    if (!canApproveReject) {
      toast('You do not have Notice approval permission.', 'error');
      return;
    }

    setRejectItem(item);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectItem?.id) return;

    if (!canApproveReject) {
      toast('You do not have Notice approval permission.', 'error');
      return;
    }

    if (!rejectReason.trim()) {
      toast('Rejection reason is required before confirming.', 'warning');
      return;
    }

    setActionLoading(true);

    try {
      await axios.patch(
        `${API_BASE_URL}/api/notices/${rejectItem.id}/reject`,
        { reason: rejectReason.trim() },
        {
          params: { userId },
          headers: {
            ...getAuthHeaders('application/json'),
            'Content-Type': 'application/json',
          },
        },
      );

      toast('Notice rejected successfully.', 'warning');
      setRejectItem(null);
      setRejectReason('');
      setSelectedItem(null);
      await fetchData({ silent: true });
      await fetchCounts();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Reject notice failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action permission is NOT based on role Admin.
  // Admin also needs approvePermission = NOTICE or BOTH.
  const canApproveReject = Boolean(canApproveNoticePermission);

  const handleOpenStatusDialog = useCallback((item) => {
    if (!item?.id) return;

    if (!canApproveReject) {
      toast('You do not have Notice approval permission.', 'error');
      return;
    }

    const currentStatus = String(item.status || APPROVAL_STATUS.PENDING).toUpperCase();

    setStatusDialogItem(item);
    setStatusValue(STATUS_META[currentStatus] ? currentStatus : APPROVAL_STATUS.PENDING);
    setStatusReason(item.rejectReason || '');
  }, [canApproveReject]);

  const handleCloseStatusDialog = useCallback(() => {
    if (actionLoading) return;

    setStatusDialogItem(null);
    setStatusValue(APPROVAL_STATUS.PENDING);
    setStatusReason('');
  }, [actionLoading]);

  const updateNoticeStatus = useCallback(async (item, nextStatus, reason = '') => {
    const normalizedStatus = String(nextStatus || '').trim().toUpperCase();

    if (!item?.id) return null;

    const payload = {
      status: normalizedStatus,
      reason: reason.trim(),
    };

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/notices/${item.id}/status`,
        payload,
        {
          params: { userId },
          headers: {
            ...getAuthHeaders('application/json'),
            'Content-Type': 'application/json',
          },
        },
      );

      return response?.data || null;
    } catch (error) {
      const statusCode = Number(error?.response?.status || 0);
      const canFallback = statusCode === 404 || statusCode === 405;

      if (!canFallback) throw error;

      // Backward compatibility if BE has only old approve/reject APIs.
      // PENDING still requires the new /status endpoint.
      if (normalizedStatus === APPROVAL_STATUS.APPROVED) {
        const response = await axios.patch(`${API_BASE_URL}/api/notices/${item.id}/approve`, null, {
          params: { userId },
          headers: getAuthHeaders('*/*'),
        });
        return response?.data || null;
      }

      if (normalizedStatus === APPROVAL_STATUS.REJECTED) {
        const response = await axios.patch(
          `${API_BASE_URL}/api/notices/${item.id}/reject`,
          { reason: reason.trim() },
          {
            params: { userId },
            headers: {
              ...getAuthHeaders('application/json'),
              'Content-Type': 'application/json',
            },
          },
        );
        return response?.data || null;
      }

      throw error;
    }
  }, [userId]);

  const handleConfirmStatusChange = async () => {
    if (!statusDialogItem?.id) return;

    const nextStatus = String(statusValue || '').trim().toUpperCase();
    const currentStatus = String(statusDialogItem.status || '').trim().toUpperCase();

    if (nextStatus === currentStatus) {
      toast('This notice already has that status.', 'warning');
      return;
    }

    if (nextStatus === APPROVAL_STATUS.REJECTED && !statusReason.trim()) {
      toast('Reject reason is required when changing to Rejected.', 'warning');
      return;
    }

    setActionLoading(true);

    try {
      const updated = await updateNoticeStatus(statusDialogItem, nextStatus, statusReason);
      const normalizedUpdated = normalizeNoticeRow({
        ...statusDialogItem,
        ...(updated || {}),
        status: nextStatus,
      });

      setRows((prev) => prev.map((row) => (String(row?.id || '') === String(statusDialogItem.id) ? normalizedUpdated : row)));
      setSelectedItem((prev) => (String(prev?.id || '') === String(statusDialogItem.id) ? normalizedUpdated : prev));

      toast(`Notice status changed to ${nextStatus}.`, nextStatus === APPROVAL_STATUS.REJECTED ? 'warning' : 'success');
      setStatusDialogItem(null);
      setStatusValue(APPROVAL_STATUS.PENDING);
      setStatusReason('');

      await fetchData({ silent: true });
      await fetchCounts();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || 'Change notice status failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenContentDialog = useCallback((item) => {
    setContentDialogItem(item);
    setContentDialogOpen(true);
  }, []);

  const handleCloseContentDialog = useCallback(() => {
    setContentDialogOpen(false);
    setContentDialogItem(null);
  }, []);

  const handleRefresh = async () => {
    await fetchDepartments();
    const latestUser = await fetchCurrentUserPermission();
    await fetchData({ currentUserForPermission: latestUser });
    await fetchCounts();
  };


  useEffect(() => {
    return () => {
      if (previewState.blobUrl) {
        URL.revokeObjectURL(previewState.blobUrl);
      }
    };
  }, [previewState.blobUrl]);

  const closePreviewDialog = useCallback(() => {
    setPreviewState((prev) => {
      if (prev.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl);
      }

      return emptyPreviewState;
    });
  }, []);

  const handleOpenPreview = useCallback(async (item) => {
    const fileUrl = getNoticeFileUrl(item);
    const fileName = getNoticeFileName(item);

    if (!fileUrl) {
      toast('This notice has no file to preview.', 'warning');
      return;
    }

    setPreviewState((prev) => {
      if (prev.blobUrl) URL.revokeObjectURL(prev.blobUrl);

      return {
        ...emptyPreviewState,
        open: true,
        loading: true,
        error: '',
        item,
        blobUrl: '',
        mimeType: '',
        fileName,
        previewKind: '',
      };
    });

    try {
      const shouldConvertToPdf = shouldConvertNoticeFileToPdf(item);

      const response = shouldConvertToPdf
        ? await axios.get(`${API_BASE_URL}/api/files/preview-pdf`, {
            params: { fileUrl },
            responseType: 'blob',
            headers: getAuthHeaders('application/pdf'),
          })
        : await axios.get(fileUrl, {
            responseType: 'blob',
            headers: getAuthHeaders('*/*'),
          });

      const mimeType = shouldConvertToPdf
        ? 'application/pdf'
        : response?.data?.type || response?.headers?.['content-type'] || '';

      const previewKindValue = shouldConvertToPdf ? 'pdf' : getPreviewKind(item, mimeType);
      const blobUrl = URL.createObjectURL(response.data);

      setPreviewState({
        ...emptyPreviewState,
        open: true,
        loading: false,
        error: '',
        item,
        blobUrl,
        mimeType,
        fileName,
        previewKind: previewKindValue,
      });
    } catch (error) {
      const errorMessage = await getBlobErrorMessage(error, 'Failed to load file for preview.');

      setPreviewState({
        ...emptyPreviewState,
        open: true,
        loading: false,
        error: errorMessage,
        item,
        blobUrl: '',
        mimeType: '',
        fileName,
        previewKind: '',
      });
    }
  }, []);

  const handleDownloadFile = useCallback(async (item) => {
    const fileUrl = getNoticeFileUrl(item);
    const fileName = getNoticeFileName(item) || 'file';

    if (!fileUrl) {
      toast('This notice has no file to download.', 'warning');
      return;
    }

    try {
      const response = await axios.get(fileUrl, {
        responseType: 'blob',
        headers: getAuthHeaders('*/*'),
      });

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      toast('File downloaded successfully.', 'success');
    } catch (error) {
      toast('Failed to download file.', 'error');
    }
  }, []);

  const previewKind = useMemo(() => {
    return previewState.previewKind || getPreviewKind(previewState.item, previewState.mimeType);
  }, [previewState.previewKind, previewState.item, previewState.mimeType]);

  const handleOpenEdit = useCallback((item) => {
    if (!item?.id) return;

    if (!canApproveReject) {
      toast('You do not have Notice approval permission.', 'error');
      return;
    }

    setSelectedItem(null);
    setEditItem(item);
    setOpenEditDialog(true);
  }, [canApproveReject]);

  const handleCloseEditDialog = useCallback(() => {
    setOpenEditDialog(false);
    setEditItem(null);
  }, []);

  const handleEditOk = useCallback(async (updatedItem) => {
    const targetId = String(updatedItem?.id || editItem?.id || '').trim();

    if (targetId) {
      const mergedItem = {
        ...(editItem || {}),
        ...(updatedItem || {}),
      };

      // Some older backend update responses may not return approval fields.
      // Preserve the current approval status so editing a pending notice does not accidentally look approved in UI.
      if (!updatedItem?.status) {
        mergedItem.status = editItem?.status || statusTab;
      }

      if (!updatedItem?.approvedBy) mergedItem.approvedBy = editItem?.approvedBy;
      if (!updatedItem?.approvedAt) mergedItem.approvedAt = editItem?.approvedAt;
      if (!updatedItem?.rejectedBy) mergedItem.rejectedBy = editItem?.rejectedBy;
      if (!updatedItem?.rejectedAt) mergedItem.rejectedAt = editItem?.rejectedAt;
      if (!updatedItem?.rejectReason) mergedItem.rejectReason = editItem?.rejectReason;

      const normalizedUpdatedItem = normalizeNoticeRow(mergedItem);

      setRows((prev) => prev.map((row) => (String(row?.id || '') === targetId ? normalizedUpdatedItem : row)));
      setSelectedItem((prev) => (String(prev?.id || '') === targetId ? normalizedUpdatedItem : prev));
    }

    setOpenEditDialog(false);
    setEditItem(null);
    toast('Notice updated successfully.', 'success');

    await fetchData({ silent: true });
    await fetchCounts();
  }, [editItem, fetchData, fetchCounts, statusTab]);

  const summaryCards = [
    { status: APPROVAL_STATUS.PENDING, label: 'Waiting approval', value: counts.PENDING },
    { status: APPROVAL_STATUS.APPROVED, label: 'Published', value: counts.APPROVED },
    { status: APPROVAL_STATUS.REJECTED, label: 'Rejected', value: counts.REJECTED },
  ];

  return (
    <Box sx={{ bgcolor: '#f7f7f7', minHeight: '100vh', p: 1.5 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <Box>
            <Typography variant="h6" fontWeight={900}>Notice Approval</Typography>
            <Typography fontSize={13} color="text.secondary">
              Review user-submitted notices before publishing them to the index page.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={loading || actionLoading}
            sx={{ height: 38, textTransform: 'none' }}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        {summaryCards.map((card) => {
          const meta = STATUS_META[card.status];

          return (
            <Paper
              key={card.status}
              elevation={0}
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(meta.color, 0.18)}`,
                bgcolor: '#fff',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography fontSize={12} color="text.secondary" fontWeight={700}>{card.label}</Typography>
                  <Typography variant="h5" fontWeight={900} sx={{ color: meta.color }}>{card.value}</Typography>
                </Box>
                <StatusChip status={card.status} />
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: 2,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={statusTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, borderBottom: '1px solid #e5e7eb' }}
        >
          <Tab value={APPROVAL_STATUS.PENDING} label={`Pending (${counts.PENDING || 0})`} />
          <Tab value={APPROVAL_STATUS.APPROVED} label={`Approved (${counts.APPROVED || 0})`} />
          <Tab value={APPROVAL_STATUS.REJECTED} label={`Rejected (${counts.REJECTED || 0})`} />
        </Tabs>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ p: 2 }}
        >
          <TextField
            label="Search title/content"
            size="small"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            InputProps={{
              startAdornment: <Search sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flex: 1, minWidth: { xs: '100%', md: 260 } }}
          />

          <TextField
            select
            label="Department"
            size="small"
            value={departmentInput}
            onChange={(e) => setDepartmentInput(e.target.value)}
            disabled={loadingDepartments}
            sx={{ minWidth: { xs: '100%', md: 240 } }}
          >
            <MenuItem value="">All Departments</MenuItem>
            {departments.map((department) => {
              const departmentName = department.departmentName || department.name || '';
              const division = department.division || '';
              const label = [departmentName, division].filter(Boolean).join(' - ') || department.id || 'Department';

              return (
                <MenuItem key={department.id || label} value={departmentName}>
                  {label}
                </MenuItem>
              );
            })}
          </TextField>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              sx={{ height: 38, minWidth: 96, textTransform: 'none' }}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={loading}
              sx={{ height: 38, minWidth: 96, textTransform: 'none' }}
            >
              Reset
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: alpha('#fff', 0.65),
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['No', 'Title', 'Content', 'Department', 'Created At', 'Files', 'Status', 'Actions'].map((label) => (
                  <TableCell
                    key={label}
                    align={['No', 'Files', 'Status', 'Actions'].includes(label) ? 'center' : 'left'}
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#111827',
                      backgroundColor: '#f3f4f6',
                      borderBottom: '1px solid #e5e7eb',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.length > 0 ? (
                rows.map((item, index) => {
                  const files = getNoticeFileUrls(item);
                  const isPending = item.status === APPROVAL_STATUS.PENDING;
                  const contentText = stripHtml(item.content || '');
                  const showMoreContent = isLongContent(contentText);

                  return (
                    <TableRow key={item.id || index} hover>
                      <TableCell align="center" sx={{ width: 58 }}>{page * rowsPerPage + index + 1}</TableCell>

                      <TableCell sx={{ minWidth: isSmallScreen ? 180 : 220, maxWidth: isSmallScreen ? 240 : 300 }}>
                        <Typography
                          fontWeight={800}
                          fontSize={13}
                          sx={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: 1.45,
                          }}
                        >
                          {item.title || '-'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: isSmallScreen ? 260 : 340, maxWidth: isSmallScreen ? 300 : 420 }}>
                        <Stack spacing={0.35} alignItems="flex-start">
                          <Typography
                            fontSize={12}
                            color="text.secondary"
                            sx={{
                              lineHeight: 1.45,
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {contentText || '-'}
                          </Typography>

                          {contentText && showMoreContent && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleOpenContentDialog(item)}
                              sx={{
                                minWidth: 'auto',
                                p: 0,
                                mt: 0.2,
                                fontSize: '0.7rem',
                                textTransform: 'none',
                                fontWeight: 800,
                              }}
                            >
                              View more
                            </Button>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ minWidth: 180 }}>
                        <Typography fontSize={13}>{item.departmentName || '-'}</Typography>
                        <Typography fontSize={12} color="text.secondary">{item.division || ''}</Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: 145 }}>
                        <Typography fontSize={13}>{formatDateTime(item.createdAt)}</Typography>
                      </TableCell>

                      <TableCell align="center" sx={{ width: 80 }}>{files.length}</TableCell>

                      <TableCell align="center" sx={{ width: 120 }}>
                        <StatusChip status={item.status} />
                      </TableCell>

                      <TableCell align="center" sx={{ width: 230 }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="View detail" arrow>
                            <IconButton size="small" onClick={() => setSelectedItem(item)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={canApproveReject ? 'Edit notice' : 'No Notice approval permission'} arrow>
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={!canApproveReject || actionLoading}
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title={canApproveReject ? 'Change status' : 'No Notice approval permission'} arrow>
                            <span>
                              <IconButton
                                size="small"
                                color="secondary"
                                disabled={!canApproveReject || actionLoading}
                                onClick={() => handleOpenStatusDialog(item)}
                              >
                                <SwapHoriz fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          {isPending && (
                            <>
                              <Tooltip title={canApproveReject ? 'Approve' : 'No Notice approval permission'} arrow>
                                <span>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    disabled={!canApproveReject || actionLoading}
                                    onClick={() => handleApprove(item)}
                                  >
                                    <CheckCircle fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Tooltip title={canApproveReject ? 'Reject' : 'No Notice approval permission'} arrow>
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    disabled={!canApproveReject || actionLoading}
                                    onClick={() => handleOpenReject(item)}
                                  >
                                    <Cancel fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 5 }}>
                    <Stack alignItems="center" spacing={0.75} sx={{ color: 'text.secondary' }}>
                      <InboxIcon sx={{ fontSize: 36, opacity: 0.65 }} />
                      <Typography fontWeight={800}>No Notices Found</Typography>
                      <Typography fontSize={13}>There is no notice in this status.</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />
        <Box sx={{ p: 1, bgcolor: '#fff' }}>
          <PaginationBar
            count={totalElements}
            page={page}
            rowsPerPage={rowsPerPage}
            loading={loading}
            onPageChange={(nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(nextSize) => {
              setRowsPerPage(nextSize);
              setPage(0);
            }}
          />
        </Box>
      </Paper>

      <NoticeDetailDialog
        open={!!selectedItem}
        item={selectedItem}
        loadingAction={actionLoading}
        canEdit={canApproveReject}
        canApproveNotice={canApproveReject}
        onClose={() => setSelectedItem(null)}
        onApprove={handleApprove}
        onReject={handleOpenReject}
        onEdit={handleOpenEdit}
        onChangeStatus={handleOpenStatusDialog}
        onPreviewFile={handleOpenPreview}
        onDownloadFile={handleDownloadFile}
      />

      <EditNoticeDialog
        open={openEditDialog}
        currentItem={editItem}
        onCancel={handleCloseEditDialog}
        onOk={handleEditOk}
        disabled={actionLoading}
      />

      <StatusChangeDialog
        open={!!statusDialogItem}
        item={statusDialogItem}
        statusValue={statusValue}
        reason={statusReason}
        loading={actionLoading}
        onStatusChange={setStatusValue}
        onReasonChange={setStatusReason}
        onClose={handleCloseStatusDialog}
        onConfirm={handleConfirmStatusChange}
      />

      <RejectDialog
        open={!!rejectItem}
        item={rejectItem}
        reason={rejectReason}
        loading={actionLoading}
        onChangeReason={setRejectReason}
        onClose={() => {
          setRejectItem(null);
          setRejectReason('');
        }}
        onConfirm={handleConfirmReject}
      />

      <Dialog
        open={contentDialogOpen}
        onClose={handleCloseContentDialog}
        fullScreen={previewFullScreen}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: previewFullScreen ? 0 : 2,
            maxHeight: previewFullScreen ? '100%' : '88vh',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} noWrap>
                Notice Content
              </Typography>
              <Typography fontSize={12} color="text.secondary" noWrap>
                {contentDialogItem?.title || 'Full notice content'}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseContentDialog}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, backgroundColor: '#f8fafc' }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              border: '1px solid #e5e7eb',
              borderRadius: 2,
              backgroundColor: '#fff',
              color: '#111827',
              fontSize: 14,
              lineHeight: 1.7,
              '& p': { my: 0.75 },
              '& ul, & ol': { pl: 3, my: 1 },
              '& table': { width: '100%', borderCollapse: 'collapse', my: 1.5 },
              '& th, & td': { border: '1px solid #d1d5db', p: 0.75, verticalAlign: 'top' },
              '& img': { maxWidth: '100%', height: 'auto' },
            }}
            dangerouslySetInnerHTML={{
              __html: sanitizeNoticeHtml(contentDialogItem?.content || '<p>No content</p>'),
            }}
          />
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 2, py: 1.5 }}>
          <Button onClick={handleCloseContentDialog} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewState.open}
        onClose={closePreviewDialog}
        fullScreen={previewFullScreen}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: previewFullScreen ? 0 : 2,
            minHeight: previewFullScreen ? '100%' : '80vh',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} noWrap>
                {previewState.fileName || 'Preview file'}
              </Typography>
              <Typography fontSize={12} color="text.secondary">
                {previewState.item?.title || 'Notice file'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              {previewState.item && (
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleDownloadFile(previewState.item)}
                  sx={{ textTransform: 'none' }}
                >
                  Download
                </Button>
              )}
              <IconButton onClick={closePreviewDialog}>
                <Close />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2, backgroundColor: '#f8fafc' }}>
          {previewState.loading ? (
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh' }}>
              <CircularProgress />
              <Typography color="text.secondary">Loading file...</Typography>
            </Stack>
          ) : previewState.error ? (
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh', textAlign: 'center' }}>
              <Typography color="error">{previewState.error}</Typography>
              {previewState.item && (
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => handleDownloadFile(previewState.item)}
                  sx={{ textTransform: 'none' }}
                >
                  Download file
                </Button>
              )}
            </Stack>
          ) : previewState.blobUrl ? (
            <Box sx={{ minHeight: '65vh', borderRadius: 2, overflow: 'hidden', backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
              {previewKind === 'image' ? (
                <Box
                  component="img"
                  src={previewState.blobUrl}
                  alt={previewState.fileName}
                  sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block', backgroundColor: '#fff' }}
                />
              ) : previewKind === 'pdf' ? (
                <Box
                  component="iframe"
                  src={previewState.blobUrl}
                  title={previewState.fileName}
                  sx={{ width: '100%', height: previewFullScreen ? '78vh' : '72vh', border: 0, display: 'block' }}
                />
              ) : (
                <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh', p: 3, textAlign: 'center' }}>
                  <Typography fontWeight={700}>This file does not support direct preview in the popup.</Typography>
                  <Typography color="text.secondary" fontSize={14}>
                    You can still download the file to open it with the appropriate application.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={() => handleDownloadFile(previewState.item)}
                    sx={{ textTransform: 'none' }}
                  >
                    Download file
                  </Button>
                </Stack>
              )}
            </Box>
          ) : (
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: '60vh' }}>
              <Typography color="text.secondary">No preview data available.</Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 2, py: 1.5 }}>
          <Button onClick={closePreviewDialog} sx={{ textTransform: 'none' }}>Close</Button>
          {previewState.item && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => handleDownloadFile(previewState.item)}
              sx={{ textTransform: 'none' }}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={4500}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={notification.severity}
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          sx={{ fontSize: '0.85rem' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
