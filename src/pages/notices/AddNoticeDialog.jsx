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
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";

import axios from "axios";
import { API_BASE_URL } from "../../config";

const DEPT_API = `${API_BASE_URL}/api/departments`;

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
  const [file, setFile] = useState(null);
  const [departmentId, setDepartmentId] = useState("");

  const [departments, setDepartments] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);

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

  const fetchDepartments = async () => {
    setLoadingDept(true);
    try {
      const res = await axios.get(DEPT_API);
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast("Không tải được danh sách phòng ban", "error");
    } finally {
      setLoadingDept(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
      setPinned(false);
      setFile(null);
      setDepartmentId("");
      setDepartments([]);
      setLoadingDept(false);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    fetchDepartments();
  }, [open]);

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

  const locked = saving || disabled;

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!content.trim()) return "Content is required";
    if (!departmentId) return "Please select a department";
    return null;
  };

  const handleClose = () => {
    if (!locked) onCancel?.();
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
      if (file) formData.append("file", file);

      await axios.post(`${API_BASE_URL}/api/notices`, formData, {
        params: {
          title: title.trim(),
          content: content.trim(),
          userId: loggedInUserId,
          departmentId,
          pinned
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data"
        }
      });

      toast("Notice created successfully");
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(err?.response?.data?.message || "Create Notice failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const paperSx = useMemo(
    () => ({
      borderRadius: fullScreen ? 0 : 4,
      boxShadow: `0 20px 60px ${alpha("#000", 0.25)}`
    }),
    [fullScreen]
  );

  const headerSx = useMemo(
    () => ({
      pt: 3,
      pb: 2,
      px: 3,
      color: "white",
      display: "flex",
      alignItems: "center",
      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
    }),
    [theme]
  );

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 3
    }
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
      <Dialog
        open={open}
        onClose={locked ? undefined : handleClose}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={headerSx}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Add Notice
              </Typography>

              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Create a new notice
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
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              multiline
              minRows={5}
              sx={fieldSx}
            />

            <TextField
              select
              label="Department *"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={locked || loadingDept}
              size="small"
              fullWidth
              sx={fieldSx}
            >
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.departmentName} ({d.division})
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Button variant="outlined" component="label" disabled={locked}>
                Upload File
                <input
                  hidden
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Button>

              {file && (
                <Typography fontSize={12} mt={1}>
                  Selected file: {file.name}
                </Typography>
              )}
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  disabled={locked}
                />
              }
              label="Pinned notice"
            />

            <Typography fontSize={12} color="text.secondary">
              User ID: {getLoggedInUserId() || "Not found"}
            </Typography>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.primary.main, 0.08)
              }}
            >
              <Stack direction="row" spacing={1}>
                <InfoRoundedIcon fontSize="small" />
                <Typography fontSize={12}>
                  Notice will appear on the portal homepage.
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={locked}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={locked || !title.trim() || !content.trim() || !departmentId}
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Create</DialogTitle>

        <DialogContent>
          <Typography>
            Create notice <b>{title}</b> ?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>No</Button>

          <Button onClick={handleConfirm} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : "Yes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
