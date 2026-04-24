import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import factoryImage from "../../assets/svg/logos/corporation.png";
import { API_BASE_URL } from "../../config";

import AddDepartmentDialog from "./AddDepartmentDialog";
import EditDepartmentDialog from "./EditDepartmentDialog";
import DepartmentSearch from "./DepartmentSearch";

const API_URL = `${API_BASE_URL}/api/departments`;

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search states
  const [searchDivision, setSearchDivision] = useState("");
  const [searchDeptName, setSearchDeptName] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  const closeNotification = () =>
    setNotification((prev) => ({ ...prev, open: false }));

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

  // Fetch departments
  const fetchDepartments = useCallback(async (filters = {}) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (filters.departmentName?.trim()) {
        params.append("departmentName", filters.departmentName.trim());
      }

      if (filters.division?.trim()) {
        params.append("division", filters.division.trim());
      }

      const url = `${API_URL}/search${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await fetch(url, {
        headers: { accept: "*/*" }
      });

      if (!res.ok) {
        throw new Error(await parseError(res, "Failed to fetch departments"));
      }

      const data = await res.json();

      const mapped = (data || []).map((dep) => ({
        id: dep.id,
        departmentName: dep.departmentName,
        division: dep.division,
        createdAt: dep.createdAt,
        image: factoryImage
      }));

      setDepartments(mapped);

    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: error.message || "Không thể tải danh sách phòng ban",
        severity: "error"
      });
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data initially when the component mounts
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleConfirmDelete = async () => {
    if (!selectedDepartment) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/${selectedDepartment.id}`, {
        method: "DELETE",
        headers: { accept: "*/*" }
      });

      if (!res.ok) {
        throw new Error(await parseError(res, "Delete failed"));
      }

      setDeleteDialogOpen(false);
      setSelectedDepartment(null);

      await fetchDepartments();

      setNotification({
        open: true,
        message: "Department deleted successfully",
        severity: "success"
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: error.message,
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dep) => {
    setSelectedDepartment(dep);
    setEditDialogOpen(true);
  };

  const handleDelete = (dep) => {
    setSelectedDepartment(dep);
    setDeleteDialogOpen(true);
  };

  // Trigger search
  const handleSearch = useCallback((filters) => {
    setSearchDeptName(filters?.departmentName || "");
    setSearchDivision(filters?.division || "");
    fetchDepartments(filters);
  }, [fetchDepartments]);

  const handleReset = useCallback(() => {
    setSearchDeptName("");
    setSearchDivision("");
    fetchDepartments();
  }, [fetchDepartments]);

  const buckets = useMemo(() => {
    const visible = departments.slice(0, 16);
    return [
      visible.slice(0, 4),
      visible.slice(4, 8),
      visible.slice(8, 12),
      visible.slice(12, 16)
    ];
  }, [departments]);

  return (
    <Box sx={{ p: 2, background: "#f9fafb", minHeight: "100vh" }}>
     <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography fontWeight={700}>Department</Typography>

        <Button
          startIcon={<AddIcon fontSize="small" />}
          variant="contained"
          onClick={() => setAddDialogOpen(true)}
          sx={{
            height: 34,
            px: 1.25,
            borderRadius: 1.2,
            textTransform: 'none',
            fontWeight: 400,
            backgroundColor: '#111827',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#0b1220',
              boxShadow: 'none',
            },
          }}
        >
          Add Department
        </Button>
      </Stack>

      <DepartmentSearch
        searchValue={searchDivision}
        departmentNameValue={searchDeptName}
        onSearchChange={setSearchDivision}
        onDepartmentNameChange={setSearchDeptName}
        onSearch={handleSearch}
        onReset={handleReset}
        disabled={loading}
      />

      <Paper sx={{ p: 2 }}>
        {loading && (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && departments.length === 0 && (
          <Stack alignItems="center" sx={{ py: 6, color: "text.secondary" }}>
            <Typography>No departments found</Typography>
          </Stack>
        )}

        {!loading && departments.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2,1fr)",
                lg: "repeat(4,1fr)"
              },
              gap: 2
            }}
          >
            {buckets.map((list, i) => (
              <Paper key={i} sx={{ p: 2 }}>
                {list.map((dep) => (
                  <Stack
                    key={dep.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      border: "1px solid #eee",
                      borderRadius: 2,
                      p: 1,
                      mb: 1
                    }}
                  >
                    <Stack direction="row" spacing={1}>
                      <Box
                        component="img"
                        src={dep.image}
                        sx={{ width: 40, height: 40 }}
                      />
                      <Box>
                        <Typography fontWeight={600}>{dep.departmentName}</Typography>
                        <Typography fontSize={13} color="gray">
                          {dep.division || "—"}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row">
                      <IconButton onClick={() => handleEdit(dep)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(dep)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))}
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Department</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{selectedDepartment?.departmentName}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <EditDepartmentDialog
        open={editDialogOpen}
        department={selectedDepartment}
        onClose={(updated) => {
          setEditDialogOpen(false);
          if (updated) {
            fetchDepartments(); // Refresh data after edit
          }
        }}
      />

      <AddDepartmentDialog
        open={addDialogOpen}
        onClose={(created) => {
          setAddDialogOpen(false);
          if (created) {
            fetchDepartments(); // Refresh data after adding
          }
        }}
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={closeNotification}
      >
        <Alert severity={notification.severity}>{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
}