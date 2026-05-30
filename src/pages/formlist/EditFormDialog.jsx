import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Tooltip,
  Chip,
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import { API_BASE_URL } from "../../config";

const API_BASE = `${API_BASE_URL}/api/forms`;
const DEPT_API = `${API_BASE_URL}/api/departments`;
const TYPE_API = `${API_BASE_URL}/api/document-types`;
const MAX_FILES = 5;

const normalizeUrl = (value) => String(value || "").trim();

const uniqueUrls = (urls = []) => {
  const result = [];

  urls.forEach((url) => {
    const cleanUrl = normalizeUrl(url);

    if (cleanUrl && !result.includes(cleanUrl)) {
      result.push(cleanUrl);
    }
  });

  return result;
};

const getFileName = (fileUrl) => {
  if (!fileUrl) return "No file";

  try {
    return decodeURIComponent(String(fileUrl).split("/").pop().split("?")[0]) || "file";
  } catch {
    return "file";
  }
};

const formatFileSize = (size = 0) => {
  if (!size) return "0 MB";
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const getFileUrlsFromForm = (form) => {
  const urls = [];

  if (Array.isArray(form?.fileUrls)) {
    form.fileUrls.forEach((url) => {
      const cleanUrl = normalizeUrl(url);

      if (cleanUrl && !urls.includes(cleanUrl)) {
        urls.push(cleanUrl);
      }
    });
  }

  // fallback data cũ
  if (urls.length === 0 && form?.fileUrl) {
    const cleanUrl = normalizeUrl(form.fileUrl);

    if (cleanUrl) {
      urls.push(cleanUrl);
    }
  }

  return urls;
};

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
  const [typeId, setTypeId] = useState("");

  /*
   * keepFileUrls = file cũ còn giữ lại.
   * Đây là field DUY NHẤT gửi về BE cho file cũ.
   *
   * useRef để tránh lỗi React setState chưa kịp cập nhật:
   * Khi bấm xóa file 1 rồi bấm Update nhanh, submit vẫn lấy đúng ref mới nhất.
   */
  const [keepFileUrls, setKeepFileUrls] = useState([]);
  const keepFileUrlsRef = useRef([]);

  const [removedFileUrls, setRemovedFileUrls] = useState([]);
  const removedFileUrlsRef = useRef([]);

  const [newFiles, setNewFiles] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [saving, setSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const totalActiveFiles = keepFileUrls.length + newFiles.length;

  const toast = (msg, severity = "success") => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const syncKeepFileUrls = (nextUrls) => {
    const cleanUrls = uniqueUrls(nextUrls);
    keepFileUrlsRef.current = cleanUrls;
    setKeepFileUrls(cleanUrls);
  };

  const syncRemovedFileUrls = (nextUrls) => {
    const cleanUrls = uniqueUrls(nextUrls);
    removedFileUrlsRef.current = cleanUrls;
    setRemovedFileUrls(cleanUrls);
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
        setDepartmentId(form?.departmentId || "");
      } else {
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

  const fetchDocumentTypes = async () => {
    setLoadingTypes(true);

    try {
      const res = await fetch(TYPE_API, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          Accept: "*/*",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to load document types");
      }

      const data = await res.json();
      setDocumentTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast(err.message || "Failed to load document types", "error");
      setDocumentTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDepartmentId("");
      setTypeId("");
      syncKeepFileUrls([]);
      syncRemovedFileUrls([]);
      setNewFiles([]);
      setDepartments([]);
      setDocumentTypes([]);
      setIsAdmin(false);
      setLoadingDept(false);
      setLoadingTypes(false);
      setSaving(false);
      return;
    }

    if (!form) return;

    const initialKeepUrls = getFileUrlsFromForm(form);

    setTitle(form.title || "");
    setDescription(form.description || "");
    setDepartmentId(form.departmentId || "");
    setTypeId(form.typeId || "");
    syncKeepFileUrls(initialKeepUrls);
    syncRemovedFileUrls([]);
    setNewFiles([]);
    setSaving(false);

    fetchDepartments();
    fetchDocumentTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  const handleClose = () => {
    if (saving) return;

    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const handleNewFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    setNewFiles((prev) => {
      const availableSlots = MAX_FILES - keepFileUrlsRef.current.length - prev.length;

      if (availableSlots <= 0) {
        toast(`Form này đã đủ ${MAX_FILES} file`, "error");
        return prev;
      }

      const acceptedFiles = selectedFiles.slice(0, availableSlots);

      if (selectedFiles.length > availableSlots) {
        toast(`Chỉ nhận thêm ${availableSlots} file. Tối đa ${MAX_FILES} file`, "warning");
      }

      return [...prev, ...acceptedFiles];
    });
  };

  const handleRemoveExistingFile = (fileUrl) => {
    const cleanUrl = normalizeUrl(fileUrl);

    if (!cleanUrl) return;

    const nextKeepUrls = keepFileUrlsRef.current.filter((url) => url !== cleanUrl);
    syncKeepFileUrls(nextKeepUrls);

    const nextRemovedUrls = uniqueUrls([...removedFileUrlsRef.current, cleanUrl]);
    syncRemovedFileUrls(nextRemovedUrls);
  };

  const handleUndoRemoveExistingFile = (fileUrl) => {
    const cleanUrl = normalizeUrl(fileUrl);

    if (!cleanUrl) return;

    const nextRemovedUrls = removedFileUrlsRef.current.filter((url) => url !== cleanUrl);
    syncRemovedFileUrls(nextRemovedUrls);

    const nextKeepUrls = uniqueUrls([...keepFileUrlsRef.current, cleanUrl]);
    syncKeepFileUrls(nextKeepUrls);
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!departmentId) return "Department is required";
    if (!typeId) return "Type is required";

    const totalFiles = keepFileUrlsRef.current.length + newFiles.length;

    if (totalFiles > MAX_FILES) return `You can upload maximum ${MAX_FILES} files`;

    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast(err, "error");

    setSaving(true);

    try {
      const keepUrlsPayload = uniqueUrls(keepFileUrlsRef.current);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("departmentId", departmentId);
      formData.append("typeId", typeId);

      /*
       * QUAN TRỌNG:
       * Chỉ gửi fileUrls còn giữ lại.
       * Ví dụ cũ có [1,2], xóa 1 thì payload chỉ có fileUrls=2.
       * Nếu user xóa hết file cũ thì vẫn phải gửi fileUrls = "".
       * Nếu không gửi field này, backend sẽ hiểu là FE cũ và giữ nguyên file cũ.
       */
      if (keepUrlsPayload.length > 0) {
        keepUrlsPayload.forEach((fileUrl) => {
          formData.append("fileUrls", fileUrl);
        });
      } else {
        formData.append("fileUrls", "");
      }

      // Gửi thêm removeFileUrls để tương thích backend cũ/mới.
      uniqueUrls(removedFileUrlsRef.current).forEach((fileUrl) => {
        formData.append("removeFileUrls", fileUrl);
      });

      // Chỉ gửi file mới chọn từ máy
      newFiles.forEach((selectedFile) => {
        formData.append("files", selectedFile);
      });

      console.log("========= EDIT FORM FILE PAYLOAD =========");
      console.log("fileUrls sent to BE:", keepUrlsPayload);
      console.log("removeFileUrls sent to BE:", uniqueUrls(removedFileUrlsRef.current));
      console.log("new files:", newFiles.map((f) => f.name));

      // Debug chính xác FormData thực sự gửi đi
      const formDataDebug = [];
      for (const [key, value] of formData.entries()) {
        formDataDebug.push([
          key,
          value instanceof File ? value.name : value,
        ]);
      }
      console.table(formDataDebug);

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

      /*
       * UI-only fix:
       * Backend response may still return old fileUrls.
       * The UI must trust the fileUrls currently kept in this dialog.
       *
       * Example:
       * old fileUrls = [1, 2]
       * user removes 1
       * keepFileUrlsRef.current = [2]
       * UI response must become fileUrls = [2]
       */
      const originalUrls = getFileUrlsFromForm(form);
      const returnedUrls = getFileUrlsFromForm(result);

      // If user uploaded new files, keep newly returned backend urls.
      const newlyReturnedUrls = returnedUrls.filter((url) => !originalUrls.includes(url));
      const finalFileUrls = uniqueUrls([...keepUrlsPayload, ...newlyReturnedUrls]);

      const fixedResultForUI = {
        ...result,
        fileUrl: finalFileUrls[0] || null,
        previewUrl: finalFileUrls[0] || null,
        fileUrls: finalFileUrls,
        previewUrls: finalFileUrls,
      };

      toast("Form updated successfully!", "success");
      onSuccess?.(fixedResultForUI);
      handleClose();
    } catch (err) {
      console.error(err);
      toast(err.message || "An error occurred while updating", "error");
    } finally {
      setSaving(false);
    }
  };

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
        onClose={saving ? undefined : handleClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: paperSx }}
      >
        <DialogTitle sx={headerSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Edit Form
              </Typography>
              <Typography fontSize={13} sx={{ opacity: 0.9 }}>
                Current files: {totalActiveFiles}/{MAX_FILES}
              </Typography>
            </Box>

            <IconButton onClick={handleClose} sx={{ color: "white" }} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <br></br>
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

            <TextField
              select
              label="Type *"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              fullWidth
              required
              disabled={saving || loadingTypes}
            >
              {documentTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography fontSize={13} fontWeight={700}>
                  Files ({totalActiveFiles}/{MAX_FILES})
                </Typography>

                {removedFileUrls.length > 0 && (
                  <Chip
                    size="small"
                    color="warning"
                    label={`${removedFileUrls.length} removed`}
                  />
                )}
              </Stack>

              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUploadIcon />}
                disabled={saving || totalActiveFiles >= MAX_FILES}
                sx={{ py: 1.5, borderStyle: "dashed", borderWidth: 2 }}
              >
                Add more files ({totalActiveFiles}/{MAX_FILES})
                <input
                  hidden
                  multiple
                  type="file"
                  onChange={handleNewFilesChange}
                />
              </Button>

              <Stack spacing={1} sx={{ mt: 1.2 }}>
                {keepFileUrls.length === 0 && newFiles.length === 0 && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No file selected
                  </Typography>
                )}

                {keepFileUrls.map((fileUrl) => (
                  <Stack
                    key={fileUrl}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{
                      px: 1.2,
                      py: 0.8,
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      background: "#fff",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                      <InsertDriveFileRoundedIcon fontSize="small" color="primary" />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {getFileName(fileUrl)}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          Existing file
                        </Typography>
                      </Box>
                    </Stack>

                    <Tooltip title="Remove current file">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveExistingFile(fileUrl)}
                        disabled={saving}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}

                {removedFileUrls.map((fileUrl) => (
                  <Stack
                    key={`removed-${fileUrl}`}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{
                      px: 1.2,
                      py: 0.8,
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
                      borderRadius: 2,
                      background: alpha(theme.palette.warning.main, 0.06),
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "warning.dark" }} noWrap>
                      Will delete from source: {getFileName(fileUrl)}
                    </Typography>

                    <Button
                      size="small"
                      onClick={() => handleUndoRemoveExistingFile(fileUrl)}
                      disabled={saving}
                    >
                      Undo
                    </Button>
                  </Stack>
                ))}

                {newFiles.map((selectedFile, index) => (
                  <Stack
                    key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{
                      px: 1.2,
                      py: 0.8,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                      borderRadius: 2,
                      background: alpha(theme.palette.success.main, 0.06),
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                      <InsertDriveFileRoundedIcon fontSize="small" color="success" />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {selectedFile.name}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          New file • {formatFileSize(selectedFile.size)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Tooltip title="Remove new file">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveNewFile(index)}
                        disabled={saving}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
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
              loadingTypes ||
              !title.trim() ||
              !departmentId ||
              !typeId ||
              totalActiveFiles > MAX_FILES
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
