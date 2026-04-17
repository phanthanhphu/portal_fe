// src/pages/AppsSection.js
import React, { useState, useMemo } from "react";
import SectionTitle from "../components/SectionTitle";
import SearchInput from "../components/SearchInput";
import GlassCard from "../components/GlassCard";

const apps = [
  { name: "Chat nội bộ", url: "#", icon: "💬", desc: "Trao đổi công việc nhanh" },
  { name: "Email công ty", url: "#", icon: "📧", desc: "Kiểm tra email hằng ngày" },
  { name: "CRM / Sales", url: "#", icon: "📊", desc: "Theo dõi khách hàng và doanh số" },
  { name: "Báo cáo công việc", url: "#", icon: "📝", desc: "Nộp báo cáo định kỳ" },
  { name: "Kho tài liệu", url: "#", icon: "📁", desc: "Lưu trữ file và tài nguyên nội bộ" },
  { name: "Chấm công", url: "#", icon: "⏰", desc: "Theo dõi thời gian làm việc" },
  { name: "Lịch họp", url: "#", icon: "📅", desc: "Xem lịch họp phòng ban" },
  { name: "Helpdesk IT", url: "#", icon: "🛠️", desc: "Gửi yêu cầu hỗ trợ kỹ thuật" },
];

export default function AppsSection() {
  const [appSearch, setAppSearch] = useState("");

  const filteredApps = useMemo(() => {
    const keyword = appSearch.trim().toLowerCase();
    if (!keyword) return apps;
    return apps.filter((app) =>
      app.name.toLowerCase().includes(keyword) || 
      app.desc.toLowerCase().includes(keyword)
    );
  }, [appSearch]);

  return (
    <GlassCard className="portal-panel portal-panel--fixed">
      <SectionTitle
        icon="📱"
        title="Ứng dụng cần thiết"
        subtitle="Có tìm kiếm và cuộn để chứa nhiều ứng dụng hơn"
      />

      <SearchInput
        value={appSearch}
        onChange={setAppSearch}
        placeholder="Tìm ứng dụng, hệ thống, chức năng..."
      />

      <div className="panel-scroll">
        <div className="apps-grid">
          {filteredApps.map((app) => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noreferrer"
              className="app-card"
            >
              <div className="app-card__icon"><span>{app.icon}</span></div>
              <div className="app-card__content">
                <div>
                  <div className="app-card__title">{app.name}</div>
                  <div className="app-card__desc">{app.desc}</div>
                </div>
                <span className="app-card__arrow">↗</span>
              </div>
            </a>
          ))}

          {!filteredApps.length && (
            <div className="empty-state">Không tìm thấy ứng dụng phù hợp.</div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}