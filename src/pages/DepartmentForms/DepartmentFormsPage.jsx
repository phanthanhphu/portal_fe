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

import axios from "axios";
import { API_BASE_URL } from "../../config";

const FILE_TYPES = ["PDF", "IMAGE", "DOC", "DOCX", "XLS", "XLSX", "FILE"];

export default function AddDepartmentFormDialog({
  open,
  onCancel,
  onOk,
  departmentId,
  disabled = false
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileType, setFileType] = useState("PDF");
  const [fileUrl, setFileUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [snackbarMessage, setSnackbarMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setFileType("PDF");
      setFileUrl("");
      setPreviewUrl("");
      setSaving(false);
      setConfirmOpen(false);
    }
  }, [open]);

  const toast = (msg, severity = "success") => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const locked = saving || disabled;

  const validate = () => {
    if (!departmentId) return "Department ID is required";
    if (!title.trim()) return "Title is required";
    if (!description.trim()) return "Description is required";
    if (!fileUrl.trim()) return "File URL is required";
    if (!fileType.trim()) return "File Type is required";
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
      const now = new Date().toISOString();

      const payload = {
        id: "",
        title: title.trim(),
        description: description.trim(),
        fileType,
        fileUrl: fileUrl.trim(),
        previewUrl: previewUrl.trim(),
        createdAt: now,
        updatedAt: now
      };

      await axios.post(
        `${API_BASE_URL}/api/department-forms/${departmentId}/forms`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
            Accept: "*/*"
          }
        }
      );

      toast("Department form created successfully");
      onOk?.();
      onCancel?.();
    } catch (err) {
      console.error(err);
      toast(
        err?.response?.data?.message || "Create department form failed",
        "error"
      );
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
                Add Department Form
              </Typography>

              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Create a new department form
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
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              multiline
              minRows={4}
              sx={fieldSx}
            />

            <TextField
              select
              label="File Type"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              sx={fieldSx}
            >
              {FILE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="File URL"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              sx={fieldSx}
              placeholder="https://example.com/file.pdf"
            />

            <TextField
              label="Preview URL"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              sx={fieldSx}
              placeholder="https://example.com/preview.pdf"
            />

            <Typography fontSize={12} color="text.secondary">
              Department ID: {departmentId || "Not found"}
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
                  Form will be created inside this department.
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
            disabled={locked}
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
            Create department form <b>{title}</b> ?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>No</Button>

          <Button onClick={handleConfirm} variant="contained">
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