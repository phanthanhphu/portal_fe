// DepartmentFormsSection.js
import React, { useState, useMemo } from "react";
import SectionTitle from "./SectionTitle";
import SearchInput from "./SearchInput";
import GlassCard from "./GlassCard";
import FileActions from "./FileActions";

const departmentForms = [
  // === Paste toàn bộ departmentForms từ code gốc của bạn vào đây ===
  {
    name: "Phòng Nhân sự",
    forms: [
      { id: "hr-1", title: "Đơn nghỉ phép", description: "Biểu mẫu xin nghỉ phép dành cho nhân viên.", fileType: "PDF", fileUrl: "#", previewUrl: "#" },
      { id: "hr-2", title: "Đơn tăng ca", description: "Biểu mẫu đăng ký tăng ca theo ca làm việc.", fileType: "PDF", fileUrl: "#", previewUrl: "#" },
      { id: "hr-3", title: "Phiếu cập nhật hồ sơ", description: "Cập nhật thông tin cá nhân và hồ sơ nhân sự.", fileType: "DOCX", fileUrl: "#", previewUrl: "#" },
      { id: "hr-4", title: "Phiếu xác nhận công tác", description: "Xác nhận lịch công tác nội bộ hoặc bên ngoài.", fileType: "DOCX", fileUrl: "#", previewUrl: "#" },
    ],
  },
  {
    name: "Phòng Kế toán",
    forms: [
      { id: "kt-1", title: "Đề nghị thanh toán", description: "Mẫu đề nghị thanh toán chi phí phát sinh.", fileType: "XLSX", fileUrl: "#", previewUrl: "#" },
      { id: "kt-2", title: "Tạm ứng", description: "Mẫu đăng ký tạm ứng cho công tác và mua hàng.", fileType: "XLSX", fileUrl: "#", previewUrl: "#" },
      { id: "kt-3", title: "Hoàn ứng", description: "Mẫu quyết toán và hoàn ứng chi phí.", fileType: "XLSX", fileUrl: "#", previewUrl: "#" },
      { id: "kt-4", title: "Xác nhận công nợ", description: "Biểu mẫu xác nhận công nợ đối tác.", fileType: "PDF", fileUrl: "#", previewUrl: "#" },
    ],
  },
  // ... (tiếp tục paste hết các phòng còn lại: Kinh doanh, Hành chính, Sản xuất)
];

export default function DepartmentFormsSection({ onPreview }) {
  const [formSearch, setFormSearch] = useState("");

  const filteredDepartmentForms = useMemo(() => {
    const keyword = formSearch.trim().toLowerCase();
    if (!keyword) return departmentForms;

    return departmentForms
      .map((dept) => ({
        ...dept,
        forms: dept.forms.filter(
          (form) =>
            form.title.toLowerCase().includes(keyword) ||
            form.description.toLowerCase().includes(keyword) ||
            dept.name.toLowerCase().includes(keyword)
        ),
      }))
      .filter((dept) => dept.forms.length > 0 || dept.name.toLowerCase().includes(keyword));
  }, [formSearch]);

  return (
    <GlassCard className="portal-panel portal-panel--fixed">
      <SectionTitle
        icon="🗂️"
        title="Form mẫu các phòng ban"
        subtitle="Mỗi biểu mẫu đều có xem nhanh popup và tải xuống"
      />

      <SearchInput
        value={formSearch}
        onChange={setFormSearch}
        placeholder="Tìm phòng ban hoặc tên biểu mẫu..."
      />

      <div className="panel-scroll panel-scroll--stack">
        {filteredDepartmentForms.map((dept) => (
          <div key={dept.name} className="form-department-card">
            <div className="form-department-card__header">
              <h3>{dept.name}</h3>
              <span>{dept.forms.length} biểu mẫu</span>
            </div>

            <div className="form-grid">
              {dept.forms.map((form) => (
                <div key={form.id} className="form-button" style={{ cursor: "default" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{form.title}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {form.description}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "rgba(241,245,249,0.95)", color: "#475569", fontSize: 12, fontWeight: 600, marginTop: 12 }}>
                      {form.fileType}
                    </div>
                    <FileActions item={form} onPreview={onPreview} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!filteredDepartmentForms.length && <div className="empty-state">Không tìm thấy biểu mẫu phù hợp.</div>}
      </div>
    </GlassCard>
  );
}