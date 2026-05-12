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
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";

import axios from "axios";
import { API_BASE_URL } from "../../config";

const DEPT_API = `${API_BASE_URL}/api/departments`;
const TYPE_API = `${API_BASE_URL}/api/document-types`;
const MAX_FILES = 5;

const formatFileSize = (size = 0) => {
  if (!size) return "0 MB";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

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
  const [typeId, setTypeId] = useState("");
  const [files, setFiles] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
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

  const fetchDocumentTypes = async () => {
    setLoadingTypes(true);

    try {
      const res = await axios.get(TYPE_API, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          Accept: "*/*"
        }
      });

      const list = Array.isArray(res.data) ? res.data : [];
      setDocumentTypes(list);
      setTypeId(list[0]?.id || "");
    } catch (err) {
      console.error(err);
      toast("Không tải được danh sách type", "error");
      setDocumentTypes([]);
      setTypeId("");
    } finally {
      setLoadingTypes(false);
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
      setTypeId("");
      setFiles([]);
      setDepartments([]);
      setDocumentTypes([]);
      setIsAdmin(false);
      setLoadingDept(false);
      setLoadingTypes(false);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    setTitle("");
    setDescription("");
    setDepartmentId("");
    setTypeId("");
    setFiles([]);
    setSaving(false);
    setConfirmOpen(false);

    fetchDepartments();
    fetchDocumentTypes();
  }, [open]);

  const handleClose = () => {
    if (locked) return;
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const handleFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    setFiles((prev) => {
      const availableSlots = MAX_FILES - prev.length;

      if (availableSlots <= 0) {
        toast(`Chỉ được upload tối đa ${MAX_FILES} file`, "error");
        return prev;
      }

      const acceptedFiles = selectedFiles.slice(0, availableSlots);

      if (selectedFiles.length > availableSlots) {
        toast(`Chỉ nhận thêm ${availableSlots} file. Tối đa ${MAX_FILES} file`, "warning");
      }

      return [...prev, ...acceptedFiles];
    });
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    if (!title.trim()) return "Tiêu đề không được để trống";
    if (!departmentId) return "Phòng ban không hợp lệ";
    if (!typeId) return "Vui lòng chọn type";
    if (files.length === 0) return "Vui lòng chọn ít nhất 1 file";
    if (files.length > MAX_FILES) return `Chỉ được upload tối đa ${MAX_FILES} file`;
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
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("departmentId", departmentId);
      formData.append("typeId", typeId);

      files.forEach((selectedFile) => {
        formData.append("files", selectedFile);
      });

      await axios.post(`${API_BASE_URL}/api/forms`, formData, {
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
                Upload tối đa {MAX_FILES} file cho một document
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<CheckCircleRoundedIcon />}
                label={`${files.length}/${MAX_FILES} files`}
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

            <TextField
              select
              label="Type *"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              disabled={locked || loadingTypes}
              fullWidth
            >
              {documentTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Button
                variant="outlined"
                component="label"
                disabled={locked || files.length >= MAX_FILES}
                fullWidth
                startIcon={<CloudUploadIcon />}
                sx={{ py: 1.5, borderStyle: "dashed", borderWidth: 2 }}
              >
                Upload Files * ({files.length}/{MAX_FILES})
                <input
                  hidden
                  multiple
                  type="file"
                  onChange={handleFilesChange}
                />
              </Button>

              {files.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1.2 }}>
                  {files.map((selectedFile, index) => (
                    <Stack
                      key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{
                        px: 1.2,
                        py: 0.8,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                        borderRadius: 2,
                        background: alpha(theme.palette.primary.main, 0.04)
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        <InsertDriveFileRoundedIcon fontSize="small" color="primary" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontSize={13} fontWeight={700} noWrap>
                            {selectedFile.name}
                          </Typography>
                          <Typography fontSize={12} color="text.secondary">
                            {formatFileSize(selectedFile.size)}
                          </Typography>
                        </Box>
                      </Stack>

                      <Tooltip title="Remove file">
                        <IconButton size="small" onClick={() => handleRemoveFile(index)} disabled={locked}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(theme.palette.primary.main, 0.08) }}>
              <Stack direction="row" spacing={1}>
                <InfoRoundedIcon fontSize="small" />
                <Typography fontSize={13}>
                  Có thể upload từ 1 đến {MAX_FILES} file. Khi lưu, UI sẽ gửi từng file bằng field <b>files</b>.
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
              loadingTypes ||
              !title.trim() ||
              !departmentId ||
              !typeId ||
              files.length === 0
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
            Create form <b>{title}</b> with <b>{files.length}</b> file(s)?
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
