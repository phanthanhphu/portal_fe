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
  IconButton,
  useMediaQuery,
  MenuItem,
  Box,
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { API_BASE_URL } from "../../config";

const API_BASE = `${API_BASE_URL}/api/forms`;
const DEPT_API = `${API_BASE_URL}/api/departments`;

export default function EditFormDialog({
  open,
  onClose,
  onCancel,
  onSuccess,
  form,
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

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [snackbarMessage, setSnackbarMessage] = useState("");

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

      const res = await fetch(
        `${DEPT_API}/search?userId=${encodeURIComponent(loggedInUserId)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to load department list");
      }

      const data = await res.json();

      const admin = Boolean(data?.isAdmin);
      const list = Array.isArray(data?.departments) ? data.departments : [];

      setIsAdmin(admin);
      setDepartments(list);

      if (admin) {
        // Admin được phép đổi department của form.
        // Giữ department hiện tại của form làm giá trị mặc định.
        setDepartmentId(form?.departmentId || "");
      } else {
        // User thường không được chọn department.
        // Department mặc định bắt buộc là phòng ban chính của user do API trả về.
        setDepartmentId(list[0]?.id || "");
      }
    } catch (err) {
      console.error(err);
      toast(err.message || "Failed to load department list", "error");
      setDepartments([]);
      setDepartmentId("");
      setIsAdmin(false);
    } finally {
      setLoadingDept(false);
    }
  };

  /* =========================
     LOAD FORM DATA + DEPARTMENTS
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
      return;
    }

    if (!form) return;

    setTitle(form.title || "");
    setDescription(form.description || "");
    setDepartmentId(form.departmentId || "");
    setFile(null);
    setSaving(false);

    fetchDepartments();
  }, [open, form]);

  /* =========================
     CLOSE
     ========================= */
  const handleClose = () => {
    if (saving) return;
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  /* =========================
     VALIDATE
     ========================= */
  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!departmentId) return "Department is required";
    return null;
  };

  /* =========================
     UPDATE - MULTIPART
     ========================= */
  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast(err, "error");

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("departmentId", departmentId);

      // Append new file only if selected. Backend keeps old file if absent.
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch(`${API_BASE}/${form.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update form");
      }

      const result = await res.json();

      toast("Form updated successfully!", "success");
      onSuccess?.(result);
      handleClose();
    } catch (err) {
      console.error(err);
      toast(err.message || "An error occurred while updating", "error");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     STYLES
     ========================= */
  const paperSx = useMemo(
    () => ({
      borderRadius: fullScreen ? 0 : 4,
      boxShadow: `0 22px 70px ${alpha("#000", 0.25)}`,
    }),
    [fullScreen]
  );

  const headerSx = {
    py: 2,
    px: 2.5,
    color: "white",
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  };

  const gradientBtnSx = {
    borderRadius: 999,
    px: 3,
    py: 1,
    fontWeight: 700,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    "&:hover": {
      backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
    },
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={headerSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={800}>
              Edit Form
            </Typography>
            <IconButton onClick={handleClose} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <br />

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              disabled={saving}
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              disabled={saving}
            />

            {isAdmin && (
              <TextField
                select
                label="Department *"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                fullWidth
                required
                disabled={saving || loadingDept}
              >
                {departments.map((dep) => (
                  <MenuItem key={dep.id} value={dep.id}>
                    {dep.departmentName} ({dep.division})
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* File Section */}
            <Box>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUploadIcon />}
                disabled={saving}
                sx={{ py: 1.5, borderStyle: "dashed", borderWidth: 2 }}
              >
                {file ? "Change file" : "Replace file (optional)"}
                <input
                  hidden
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Button>

              {file ? (
                <Typography variant="body2" sx={{ mt: 1, color: "primary.main" }}>
                  New file: <strong>{file.name}</strong>
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                  Current file:{" "}
                  {form?.fileUrl
                    ? form.fileUrl.split("/").pop()
                    : "No file"}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={handleClose} disabled={saving} sx={{ fontWeight: 500 }}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={
              saving ||
              loadingDept ||
              !title.trim() ||
              !departmentId
            }
            variant="contained"
            sx={gradientBtnSx}
          >
            {saving ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} color="inherit" />
                <span>Updating...</span>
              </Stack>
            ) : (
              "Update Form"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
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
