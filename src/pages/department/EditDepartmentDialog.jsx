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
  useMediaQuery
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";

import { API_BASE_URL } from "../../config";
const API_BASE = `${API_BASE_URL}/api/departments`;

export default function EditDepartmentDialog({
  open,
  onClose,
  department,
  disabled = false
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [departmentName, setDepartmentName] = useState("");
  const [division, setDivision] = useState("");

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [snackbarMessage, setSnackbarMessage] = useState("");

  /*
  ===============================
  PARSE ERROR (FIX CHÍNH)
  ===============================
  */
  const parseError = async (res, defaultMsg) => {
    try {
      const err = await res.json();
      return err.message || defaultMsg;
    } catch {
      try {
        return await res.text();
      } catch {
        return defaultMsg;
      }
    }
  };

  useEffect(() => {
    if (department && open) {
      setDepartmentName(department.departmentName || "");
      setDivision(department.division || "");
    }
  }, [department, open]);

  const toast = (msg, severity = "success") => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleClose = () => {
    if (saving || disabled) return;
    onClose?.();
  };

  const handleSubmit = () => {
    if (!division.trim()) return toast("Division is required.", "error");
    if (!departmentName.trim()) return toast("Department Name is required.", "error");

    setConfirmOpen(true);
  };

  /*
  ===============================
  API CALL (ĐÃ FIX)
  ===============================
  */

  const updateDepartment = async () => {

    if (!department?.id) throw new Error("Department ID missing");

    const params = new URLSearchParams({
      division: division.trim(),
      departmentName: departmentName.trim()
    });

    const response = await fetch(
      `${API_BASE}/${department.id}?${params.toString()}`,
      {
        method: "PUT",
        headers: {
          accept: "*/*"
        }
      }
    );

    if (!response.ok) {
      throw new Error(await parseError(response, "Update department failed"));
    }

    return response.json();
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setSaving(true);

    try {

      await updateDepartment();

      toast("Department updated successfully!", "success");

      onClose?.(true);

    } catch (err) {

      console.error(err);

      toast(err.message || "Update failed", "error");

    } finally {

      setSaving(false);

    }
  };

  const paperSx = useMemo(
    () => ({
      borderRadius: fullScreen ? 0 : 4,
      overflow: "hidden",
      boxShadow: `0 22px 70px ${alpha("#000", 0.25)}`,
      border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
      background:
        theme.palette.mode === "dark"
          ? alpha(theme.palette.background.paper, 0.72)
          : alpha("#FFFFFF", 0.92),
      backdropFilter: "blur(14px)"
    }),
    [fullScreen, theme]
  );

  const headerSx = useMemo(
    () => ({
      py: 2,
      px: 2.5,
      color: "white",
      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
    }),
    [theme]
  );

  const fieldSx = useMemo(
    () => ({
      "& .MuiOutlinedInput-root": {
        borderRadius: 3,
        backgroundColor: alpha(theme.palette.common.white, 0.65)
      }
    }),
    [theme]
  );

  const gradientBtnSx = {
    borderRadius: 999,
    px: 2.2,
    py: 1.1,
    fontWeight: 800,
    textTransform: "uppercase",
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  };

  const outlineBtnSx = {
    borderRadius: 999,
    px: 2.2,
    py: 1.1,
    fontWeight: 800
  };

  const locked = saving || disabled;

  const titleName = departmentName || department?.departmentName || "Unknown";

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
          <Stack direction="row" justifyContent="space-between">
            <Box>
              <Typography sx={{ fontWeight: 900 }}>
                Edit Department
              </Typography>
              <Typography sx={{ fontSize: 13 }}>
                Update division and department name
              </Typography>
            </Box>

            <IconButton onClick={handleClose} disabled={locked} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <br></br>
        <DialogContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              label="Division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Department Name"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              disabled={locked}
              size="small"
              fullWidth
              sx={fieldSx}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={locked} variant="outlined" sx={outlineBtnSx}>
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={locked} variant="contained" sx={gradientBtnSx}>
            {saving ? <CircularProgress size={20} color="inherit" /> : "Update"}
          </Button>
        </DialogActions>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={5000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert severity={snackbarSeverity}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Dialog>

      {/* CONFIRM */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Confirm Update
        </DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to update <b>{titleName}</b> ?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined">
            No
          </Button>

          <Button onClick={handleConfirm} variant="contained">
            {saving ? <CircularProgress size={20} /> : "Yes"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}