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
  useMediaQuery
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";

import { API_BASE_URL } from "../../config";

const API_BASE = `${API_BASE_URL}/api/departments`;

export default function AddDepartmentDialog({
  open,
  onClose,
  onSuccess
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

  const locked = saving;

  const toast = (msg, severity = "success") => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

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

    if (!open) return;

    setDepartmentName("");
    setDivision("");
    setSaving(false);
    setConfirmOpen(false);

  }, [open]);

  const handleClose = () => {

    if (locked) return;

    setConfirmOpen(false);
    onClose?.();

  };

  const canSubmit = division.trim() && departmentName.trim();

  const handleSubmit = () => {

    if (!division.trim())
      return toast("Division is required.", "error");

    if (!departmentName.trim())
      return toast("Department Name is required.", "error");

    setConfirmOpen(true);

  };

  /*
  ===============================
  API CALL (ĐÃ FIX)
  ===============================
  */

  const createDepartment = async () => {

    const params = new URLSearchParams({
      division: division.trim(),
      departmentName: departmentName.trim()
    });

    const response = await fetch(
      `${API_BASE}?${params.toString()}`,
      {
        method: "POST",
        headers: {
          accept: "*/*"
        }
      }
    );

    if (!response.ok) {
      throw new Error(await parseError(response, "Create department failed"));
    }

    try {
      return await response.json();
    } catch {
      return {
        division: division.trim(),
        departmentName: departmentName.trim()
      };
    }
  };

  const handleConfirm = async () => {

    setConfirmOpen(false);
    setSaving(true);

    try {

      const result = await createDepartment();

      toast("Department added successfully!", "success");

      onSuccess?.(result);

      onClose?.(true);

    } catch (err) {

      console.error(err);

      toast(err.message || "Add department failed", "error");

    } finally {

      setSaving(false);

    }

  };

  /*
  ===============================
  STYLE
  ===============================
  */

  const paperSx = useMemo(() => ({
    borderRadius: fullScreen ? 0 : 4,
    overflow: "hidden",
    boxShadow: `0 22px 70px ${alpha("#000", 0.25)}`,
    border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
    background: alpha("#FFFFFF", 0.92),
    backdropFilter: "blur(14px)"
  }), [fullScreen, theme]);

  const headerSx = {
    py: 2,
    px: 2.5,
    color: "white",
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  };

  const gradientBtnSx = {
    borderRadius: 999,
    px: 2.2,
    py: 1.1,
    fontWeight: 800,
    textTransform: "uppercase",
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  };

  /*
  ===============================
  UI
  ===============================
  */

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

            <Typography fontWeight={900}>
              Add Department
            </Typography>

            <IconButton onClick={handleClose} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>

          </Stack>

        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <br/>

          <Stack spacing={2}>

            <TextField
              label="Division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              fullWidth
            />

            <TextField
              label="Department Name"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              fullWidth
            />

          </Stack>

        </DialogContent>

        <DialogActions sx={{ p: 2 }}>

          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            variant="contained"
            sx={gradientBtnSx}
          >
            {saving ? <CircularProgress size={20}/> : "Add"}
          </Button>

        </DialogActions>

      </Dialog>

      {/* CONFIRM */}

      <Dialog
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >

        <DialogTitle>
          Confirm Add
        </DialogTitle>

        <DialogContent>

          <Typography>
            Add department <b>{departmentName}</b> under division <b>{division}</b> ?
          </Typography>

        </DialogContent>

        <DialogActions>

          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>
            No
          </Button>

          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20}/> : "Yes"}
          </Button>

        </DialogActions>

      </Dialog>

      {/* SNACKBAR */}

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

    </>
  );

}