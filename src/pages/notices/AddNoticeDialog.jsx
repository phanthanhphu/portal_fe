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
  FormControlLabel,
  Checkbox,
  MenuItem
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";

import { apiRawClient as axios } from '../../routes/globalApi';
import { API_BASE_URL } from "../../config";
import NoticeContentEditor from "./NoticeContentEditor";

const DEPT_API = `${API_BASE_URL}/api/departments`;
const MAX_FILES = 5;

const stripHtml = (html = "") =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();


const formatFileSize = (size = 0) => {
  if (!size) return "0 MB";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

export default function AddNoticeDialog({
  open,
  onCancel,
  onOk,
  disabled = false
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [files, setFiles] = useState([]);
  const [departmentId, setDepartmentId] = useState("");

  const [departments, setDepartments] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      console.error(e);
    }

    return localStorage.getItem("userId") || "";
  };

  const fetchDepartments = async () => {
    setLoadingDept(true);

    try {
      const loggedInUserId = getLoggedInUserId();

      if (!loggedInUserId) {
        toast("Cannot find logged-in userId", "error");
        setDepartments([]);
        setDepartmentId("");
        setIsAdmin(false);
        return;
      }

      const res = await axios.get(`${DEPT_API}/search`, {
        params: { userId: loggedInUserId },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      const admin = Boolean(res.data?.isAdmin);
      const list = Array.isArray(res.data?.departments) ? res.data.departments : [];

      setIsAdmin(admin);
      setDepartments(list);
      setDepartmentId(admin ? "" : list[0]?.id || "");
    } catch (err) {
      console.error(err);
      toast("Cannot load department list", "error");
      setDepartments([]);
      setDepartmentId("");
      setIsAdmin(false);
    } finally {
      setLoadingDept(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
      setPinned(false);
      setFiles([]);
      setDepartmentId("");
      setDepartments([]);
      setIsAdmin(false);
      setLoadingDept(false);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    fetchDepartments();
  }, [open]);

  const locked = saving || disabled;

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!stripHtml(content)) return "Content is required";
    if (!departmentId) return "Department is required";
    if (files.length > MAX_FILES) return `You can upload maximum ${MAX_FILES} files`;
    return null;
  };

  const handleClose = () => {
    if (!locked) onCancel?.();
  };

  const handleFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    setFiles((prev) => {
      const availableSlots = MAX_FILES - prev.length;

      if (availableSlots <= 0) {
        toast(`You can upload maximum ${MAX_FILES} files`, "error");
        return prev;
      }

      const acceptedFiles = selectedFiles.slice(0, availableSlots);

      if (selectedFiles.length > availableSlots) {
        toast(`Only ${availableSlots} more file(s) can be added. Maximum ${MAX_FILES} files`, "warning");
      }

      return [...prev, ...acceptedFiles];
    });
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const err = validate();

    if (err) {
      toast(err, "error");
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setSaving(true);

    try {
      const loggedInUserId = getLoggedInUserId();

      if (!loggedInUserId) {
        toast("Cannot find logged in userId", "error");
        return;
      }

      const formData = new FormData();

      // IMPORTANT: do not send rich HTML content in query params.
      // Long Word/TinyMCE HTML can make the URL too long and cause Network Error.
      // Spring @RequestParam can still read these fields from multipart/form-data.
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("userId", loggedInUserId);
      formData.append("departmentId", departmentId);
      formData.append("pinned", String(pinned));
      // Approval workflow: every new notice should wait for admin approval first.
      // Backend can ignore this field if it already sets PENDING by default.
      formData.append("status", "PENDING");

      files.forEach((selectedFile) => {
        formData.append("files", selectedFile);
      });

      const response = await axios.post(`${API_BASE_URL}/api/notices`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          Accept: "*/*"
          // Do not set Content-Type manually; axios/browser will add multipart boundary.
        }
      });

      const createdNotice = response?.data || {};
      const createdStatus = String(createdNotice?.status || "").trim().toUpperCase();

      if (createdStatus === "PENDING") {
        toast("Notice submitted and waiting for approval", "info");
      } else if (createdStatus === "APPROVED") {
        toast("Notice created and approved successfully", "success");
      } else {
        toast("Notice created successfully", "success");
      }

      onOk?.(createdNotice);
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || "Create Notice failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const paperSx = useMemo(() => ({
    borderRadius: fullScreen ? 0 : 4,
    boxShadow: `0 20px 60px ${alpha("#000", 0.25)}`
  }), [fullScreen]);

  const headerSx = useMemo(() => ({
    pt: 3,
    pb: 2,
    px: 3,
    color: "white",
    display: "flex",
    alignItems: "center",
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  }), [theme]);

  const fieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: 3 }
  };

  const gradientBtnSx = {
    borderRadius: 999,
    px: 3,
    py: 1,
    fontWeight: 700,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  };

  return (
    <>
      {/* IMPORTANT: disableEnforceFocus lets TinyMCE table popups receive clicks inside MUI Dialog. */}
      <Dialog
        open={open}
        onClose={locked ? undefined : handleClose}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
        disableRestoreFocus
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={headerSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
            <Box>
              <Typography variant="h6" fontWeight={700}>Add Notice</Typography>
              <Typography fontSize={13} sx={{ opacity: 0.9 }}>Upload up to {MAX_FILES} files for one notice</Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip icon={<CheckCircleRoundedIcon />} label={`${files.length}/${MAX_FILES} files`} size="small" sx={{ bgcolor: alpha("#fff", 0.2), color: "white" }} />
              <Tooltip title="Close">
                <IconButton onClick={handleClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>
        <br></br>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={locked} size="small" fullWidth sx={fieldSx} />
            <NoticeContentEditor label="Content" value={content} onChange={setContent} disabled={locked} />

            {isAdmin && (
              <TextField select label="Department *" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={locked || loadingDept} size="small" fullWidth sx={fieldSx}>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.departmentName} ({d.division})</MenuItem>
                ))}
              </TextField>
            )}

            <Box>
              <Button variant="outlined" component="label" disabled={locked || files.length >= MAX_FILES} startIcon={<CloudUploadIcon />} fullWidth sx={{ py: 1.5, borderStyle: "dashed", borderWidth: 2 }}>
                Upload Files ({files.length}/{MAX_FILES})
                <input hidden multiple type="file" onChange={handleFilesChange} />
              </Button>

              {files.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1.2 }}>
                  {files.map((selectedFile, index) => (
                    <Stack key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`} direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ px: 1.2, py: 0.8, border: "1px solid #e5e7eb", borderRadius: 2, background: "#fff" }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        <InsertDriveFileRoundedIcon fontSize="small" color="primary" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{selectedFile.name}</Typography>
                          <Typography fontSize={12} color="text.secondary">{formatFileSize(selectedFile.size)}</Typography>
                        </Box>
                      </Stack>
                      <Tooltip title="Remove file">
                        <IconButton size="small" onClick={() => handleRemoveFile(index)} disabled={locked}><CloseIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <FormControlLabel control={<Checkbox checked={pinned} onChange={(e) => setPinned(e.target.checked)} disabled={locked} />} label="Pinned notice" />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} disabled={locked}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={locked || loadingDept} variant="contained" sx={gradientBtnSx}>
            {saving ? <CircularProgress size={20} color="inherit" /> : "Submit Notice"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Create</DialogTitle>
        <DialogContent><Typography>Create this notice?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={saving}>Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={4500} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>{snackbarMessage}</Alert>
      </Snackbar>
    </>
  );
}
