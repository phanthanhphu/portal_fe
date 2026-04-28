import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Stack,
  Box,
  IconButton,
  Chip,
  Tooltip,
  useMediaQuery,
  MenuItem
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import axios from "axios";
import { API_BASE_URL } from "../../config";

const DEPT_API = `${API_BASE_URL}/api/departments`;

export default function AddFormDialog({
  open,
  onClose,
  onCancel,
  onSuccess,
  disabled = false
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [file, setFile] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const locked = saving || disabled;

  const toast = (msg, severity = "success") => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const getLoggedInUserId = () => {
    try {
      const userStr = localStorage.getItem("user");

      if (userStr) {
        const user = JSON.parse(userStr);
        return user?.id || user?.userId || user?._id || "";
      }
    } catch (e) {
      console.error("Cannot parse user from localStorage", e);
    }

    return localStorage.getItem("userId") || "";
  };

  /* =========================
     LOAD DEPARTMENTS BY USER
     ========================= */
  const fetchDepartments = async () => {
    setLoadingDept(true);

    try {
      const loggedInUserId = getLoggedInUserId();

      if (!loggedInUserId) {
        toast("Không tìm thấy userId của user đang đăng nhập", "error");
        setDepartments([]);
        setDepartmentId("");
        setIsAdmin(false);
        return;
      }

      const res = await axios.get(`${DEPT_API}/search`, {
        params: {
          userId: loggedInUserId
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const admin = Boolean(res.data?.isAdmin);
      const list = Array.isArray(res.data?.departments)
        ? res.data.departments
        : [];

      setIsAdmin(admin);
      setDepartments(list);

      if (admin) {
        // Admin được phép chọn department khi tạo form.
        setDepartmentId("");
      } else {
        // User thường không được chọn department.
        // Department mặc định là phòng ban chính của user do API trả về.
        setDepartmentId(list[0]?.id || "");
      }
    } catch (err) {
      console.error(err);
      toast("Không tải được danh sách phòng ban", "error");
      setDepartments([]);
      setDepartmentId("");
      setIsAdmin(false);
    } finally {
      setLoadingDept(false);
    }
  };

  /* =========================
     RESET WHEN OPEN / CLOSE
     ========================= */
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDepartmentId("");
      setFile(null);
      setDepartments([]);
      setIsAdmin(false);
      setLoadingDept(false);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    setTitle("");
    setDescription("");
    setDepartmentId("");
    setFile(null);
    setSaving(false);
    setConfirmOpen(false);

    fetchDepartments();
  }, [open]);

  const handleClose = () => {
    if (locked) return;
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const validate = () => {
    if (!title.trim()) return "Tiêu đề không được để trống";
    if (!departmentId) return "Phòng ban không hợp lệ";
    if (!file) return "Vui lòng chọn file";
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) return toast(err, "error");
    setConfirmOpen(true);
  };

  /* =========================
     CREATE FORM
     ========================= */
  const handleConfirm = async () => {
    setConfirmOpen(false);
    setSaving(true);

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);

      await axios.post(`${API_BASE_URL}/api/forms`, formData, {
        params: {
          title: title.trim(),
          description: description.trim(),
          departmentId
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      toast("Tạo form thành công!", "success");
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Tạo form thất bại";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     STYLES
     ========================= */
  const paperSx = useMemo(() => ({
    borderRadius: fullScreen ? 0 : 4,
    boxShadow: `0 20px 60px ${alpha("#000", 0.25)}`
  }), [fullScreen]);

  const headerSx = useMemo(() => ({
    pt: 3,
    pb: 2,
    px: 3,
    color: "white",
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  }), [theme]);

  const gradientBtnSx = {
    borderRadius: 999,
    px: 3,
    py: 1,
    fontWeight: 700,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={locked ? undefined : handleClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={headerSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Add New Form
              </Typography>
              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Upload a new form to the system
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<CheckCircleRoundedIcon />}
                label="Adding"
                size="small"
                sx={{ bgcolor: alpha("#fff", 0.2), color: "white" }}
              />
              <Tooltip title="Close">
                <IconButton onClick={handleClose} sx={{ color: "white" }}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>

        <br />

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={locked}
              fullWidth
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={locked}
              fullWidth
              multiline
              minRows={3}
            />

            {isAdmin && (
              <TextField
                select
                label="Department *"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={locked || loadingDept}
                fullWidth
              >
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.departmentName} ({d.division})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Box>
              <Button
                variant="outlined"
                component="label"
                disabled={locked}
                fullWidth
                startIcon={<CloudUploadIcon />}
                sx={{ py: 1.5, borderStyle: "dashed", borderWidth: 2 }}
              >
                Upload File *
                <input
                  hidden
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Button>

              {file && (
                <Typography fontSize={13} sx={{ mt: 1, color: "primary.main" }}>
                  Selected: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(theme.palette.primary.main, 0.08) }}>
              <Stack direction="row" spacing={1}>
                <InfoRoundedIcon fontSize="small" />
                <Typography fontSize={13}>
                  File will be stored securely and available for download.
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleClose} disabled={locked}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              locked ||
              loadingDept ||
              !title.trim() ||
              !departmentId ||
              !file
            }
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "Create Form"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Create</DialogTitle>
        <DialogContent>
          <Typography>
            Create form <b>{title}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>No</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : "Yes, Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4500}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
