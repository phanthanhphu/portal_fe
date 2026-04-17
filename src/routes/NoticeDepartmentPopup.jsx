import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

/**
 * NoticeDepartmentPopup
 *
 * - Show menu Notice cap 2 theo phong ban
 * - Click vao 1 phong ban -> goi API /api/notices/search theo division + departmentName
 * - Mo popup dep, co o search local de tim nhanh notice trong phong ban do
 * - Popup duoc render bang portal ra document.body de khong bi an duoi header/dropdown
 */
export default function NoticeDepartmentPopup({
  departments = [],
  loading = false,
  error = null,
  noticesApiBase,
  apiBaseUrl = "",
  noticesPagePath = "/notices",
  onPreview,
  onDownload,
  popupOpen = false,
  selectedDepartment = null,
  onOpenPopup,
  onClosePopup,
}) {
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticesError, setNoticesError] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [cache, setCache] = useState({});

  const toAbsoluteUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${apiBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const inferFileType = (fileUrl) => {
    if (!fileUrl) return "FILE";
    const cleanUrl = fileUrl.split("?")[0].split("#")[0];
    return cleanUrl.split(".").pop()?.toUpperCase() || "FILE";
  };

  const formatDateTime = (createdAtArray) => {
    if (!Array.isArray(createdAtArray) || createdAtArray.length < 6) return "";
    const [year, month, day, hour, minute] = createdAtArray;
    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const hh = String(hour).padStart(2, "0");
    const min = String(minute).padStart(2, "0");
    return `${dd}/${mm}/${year} • ${hh}:${min}`;
  };

  const getDepartmentKey = (department) =>
    `${department?.division || ""}__${department?.departmentName || ""}`;

  const normalizeNotice = (item) => ({
    id: item.id,
    title: item.title || "Thông báo",
    content: item.content || "",
    fileType: item.fileType || inferFileType(item.fileUrl),
    fileUrl: toAbsoluteUrl(item.fileUrl),
    previewUrl: item.previewUrl ? toAbsoluteUrl(item.previewUrl) : null,
    departmentId: item.departmentId || "",
    departmentName: item.departmentName || "Chưa xác định",
    division: item.division || "",
    pinned: !!item.pinned,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  });

  const fetchDepartmentNotices = async (department) => {
    if (!department || !noticesApiBase) return;

    const cacheKey = getDepartmentKey(department);
    if (cache[cacheKey]) {
      setNotices(cache[cacheKey]);
      setNoticesError(null);
      return;
    }

    setNoticesLoading(true);
    setNoticesError(null);

    try {
      const params = new URLSearchParams({
        division: department.division || "",
        departmentName: department.departmentName || "",
        title: "",
        content: "",
        page: "0",
        size: "200",
        sort: "createdAt,desc",
      });

      const response = await fetch(`${noticesApiBase}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notices: ${response.status}`);
      }

      const data = await response.json();
      const normalizedNotices = (data.content || []).map(normalizeNotice);

      setNotices(normalizedNotices);
      setCache((prev) => ({
        ...prev,
        [cacheKey]: normalizedNotices,
      }));
    } catch (err) {
      console.error(err);
      setNotices([]);
      setNoticesError("Không tải được danh sách notice của phòng ban này.");
    } finally {
      setNoticesLoading(false);
    }
  };

  useEffect(() => {
    if (!popupOpen || !selectedDepartment) return;
    setSearchKeyword("");
    fetchDepartmentNotices(selectedDepartment);
  }, [popupOpen, selectedDepartment]);

  useEffect(() => {
    if (!popupOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClosePopup?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [popupOpen, onClosePopup]);

  const filteredNotices = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return notices;

    return notices.filter((notice) => {
      return (
        String(notice.title || "").toLowerCase().includes(keyword) ||
        String(notice.content || "").toLowerCase().includes(keyword) ||
        String(notice.fileType || "").toLowerCase().includes(keyword)
      );
    });
  }, [notices, searchKeyword]);

  const handleFallbackOpenPage = (department) => {
    const url = `${noticesPagePath}?division=${encodeURIComponent(
      department?.division || "",
    )}&departmentName=${encodeURIComponent(department?.departmentName || "")}`;
    window.location.href = url;
  };

  const handleFallbackPreview = (notice) => {
    if (typeof onPreview === "function") {
      onPreview(notice);
      return;
    }
    if (notice.fileUrl) {
      window.open(notice.fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleFallbackDownload = (notice) => {
    if (typeof onDownload === "function") {
      onDownload(notice);
      return;
    }
    if (notice.fileUrl) {
      const link = document.createElement("a");
      link.href = notice.fileUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const popupNode = popupOpen
    ? (
      <div className="ndp2-overlay" onClick={onClosePopup}>
        <div className="ndp2-popup" onClick={(e) => e.stopPropagation()}>
          <div className="ndp2-popup__head">
            <div>
              <p className="ndp2-popup__kicker">Notice Department Library</p>
              <h3 className="ndp2-popup__title">
                {selectedDepartment?.departmentName || "Phòng ban"}
              </h3>

              <div className="ndp2-popup__meta">
                <span className="ndp2-popup__badge">
                  {selectedDepartment?.division || "Division"}
                </span>
                <span className="ndp2-popup__badge">
                  {noticesLoading ? "Đang tải..." : `${notices.length} notice`}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="ndp2-popup__close"
              onClick={onClosePopup}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="ndp2-popup__toolbar">
            <label className="ndp2-search">
              <span className="ndp2-search__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                className="ndp2-search__input"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm notice trong phòng ban này..."
              />
            </label>
          </div>

          <div className="ndp2-popup__body">
            {noticesError ? <div className="ndp2-empty">{noticesError}</div> : null}
            {!noticesError && noticesLoading ? (
              <div className="ndp2-empty">Đang tải danh sách notice...</div>
            ) : null}
            {!noticesError && !noticesLoading && filteredNotices.length === 0 ? (
              <div className="ndp2-empty">
                {notices.length === 0
                  ? "Phòng ban này hiện chưa có notice."
                  : "Không có notice phù hợp với từ khóa tìm kiếm."}
              </div>
            ) : null}

            {!noticesError && !noticesLoading && filteredNotices.length > 0 ? (
              <div className="ndp2-notices-grid">
                {filteredNotices.map((notice) => (
                  <article key={notice.id} className="ndp2-notice-card">
                    <div className="ndp2-notice-card__top">
                      <span className="ndp2-notice-card__icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M6.5 16.5h11l-1.2-1.8a5 5 0 0 1-.8-2.7v-1.2a4.5 4.5 0 1 0-9 0V12a5 5 0 0 1-.8 2.7z" />
                          <path d="M10 18.5a2 2 0 0 0 4 0" />
                        </svg>
                      </span>

                      <div className="ndp2-notice-card__copy">
                        <strong>{notice.title}</strong>
                        <p>{notice.content || "Thông báo nội bộ của phòng ban."}</p>
                      </div>
                    </div>

                    <div className="ndp2-notice-card__meta">
                      {notice.division ? <span>{notice.division}</span> : null}
                      {notice.departmentName ? <span>{notice.departmentName}</span> : null}
                      {notice.fileType ? <span>{notice.fileType}</span> : null}
                      {notice.pinned ? <span className="is-pinned">Pinned</span> : null}
                      {notice.createdAt ? <span>{formatDateTime(notice.createdAt)}</span> : null}
                    </div>

                    <div className="ndp2-notice-card__actions">
                      <button
                        type="button"
                        className="ndp2-btn ndp2-btn--dark"
                        onClick={() => handleFallbackPreview(notice)}
                      >
                        Xem
                      </button>

                      <button
                        type="button"
                        className="ndp2-btn ndp2-btn--ghost"
                        onClick={() => handleFallbackDownload(notice)}
                      >
                        Tải
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
    : null;

  return (
    <>
      <style>{`
        .ndp2-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .ndp2-card {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 20px;
          border: 1px solid rgba(144, 169, 205, 0.18);
          background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
          box-shadow: 0 10px 22px rgba(31, 55, 95, 0.06);
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .ndp2-card:hover {
          transform: translateY(-2px);
          border-color: rgba(54, 108, 255, 0.18);
          box-shadow: 0 18px 32px rgba(31, 55, 95, 0.1);
        }

        .ndp2-card__left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ndp2-card__icon {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: linear-gradient(180deg, #f5f9ff 0%, #edf5ff 100%);
          border: 1px solid rgba(167, 189, 221, 0.22);
          color: #5f8fd9;
        }

        .ndp2-card__icon svg {
          width: 20px;
          height: 20px;
        }

        .ndp2-card__text {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .ndp2-card__text strong {
          display: block;
          color: #183153;
          font-size: 0.92rem;
          line-height: 1.35;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .ndp2-card__text span {
          color: #6f86aa;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .ndp2-card__pill {
          min-height: 30px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #f2f7ff;
          color: #5f83c5;
          border: 1px solid rgba(167, 189, 221, 0.22);
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .ndp2-empty {
          padding: 18px;
          border-radius: 18px;
          text-align: center;
          color: #6982a8;
          background: #f8fbff;
          border: 1px dashed rgba(150, 172, 207, 0.34);
        }

        .ndp2-overlay {
          position: fixed;
          inset: 0;
          z-index: 9400;
          padding: 84px 22px 28px;
          background: rgba(10, 22, 42, 0.42);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow: auto;
        }

        .ndp2-popup {
          width: min(1120px, 100%);
          max-height: calc(100vh - 112px);
          overflow: hidden;
          border-radius: 30px;
          background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
          box-shadow: 0 34px 90px rgba(10, 27, 58, 0.24);
          border: 1px solid rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          margin: 0 auto;
        }

        .ndp2-popup__head {
          padding: 22px 24px 18px;
          border-bottom: 1px solid rgba(140, 163, 201, 0.16);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          background:
            radial-gradient(circle at top right, rgba(98, 188, 255, 0.12), transparent 28%),
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,252,255,0.94));
        }

        .ndp2-popup__kicker {
          margin: 0 0 8px;
          color: #4d74b8;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ndp2-popup__title {
          margin: 0;
          color: #122947;
          font-size: 1.35rem;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .ndp2-popup__sub {
          margin: 8px 0 0;
          color: #6e86aa;
          font-size: 0.92rem;
          line-height: 1.65;
        }

        .ndp2-popup__meta {
          margin-top: 14px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ndp2-popup__badge {
          min-height: 32px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: linear-gradient(180deg, #f5f9ff 0%, #edf5ff 100%);
          color: #4f76bb;
          border: 1px solid rgba(163, 186, 221, 0.22);
          font-size: 0.76rem;
          font-weight: 800;
        }

        .ndp2-popup__close {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border: none;
          border-radius: 16px;
          background: #f5f9ff;
          color: #32538c;
          cursor: pointer;
          font-size: 1.4rem;
          transition: transform 0.18s ease, background 0.18s ease;
        }

        .ndp2-popup__close:hover {
          transform: translateY(-1px);
          background: #edf5ff;
        }

        .ndp2-popup__toolbar {
          padding: 16px 24px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          border-bottom: 1px solid rgba(140, 163, 201, 0.14);
          background: rgba(255,255,255,0.84);
        }

        .ndp2-search {
          min-height: 54px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          border-radius: 18px;
          border: 1px solid rgba(145, 170, 208, 0.2);
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .ndp2-search__icon {
          width: 18px;
          height: 18px;
          color: #89a0c1;
          flex-shrink: 0;
        }

        .ndp2-search__icon svg {
          width: 18px;
          height: 18px;
        }

        .ndp2-search__input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #16304f;
          font-size: 0.95rem;
        }

        .ndp2-search__input::placeholder {
          color: #9ab0cb;
        }

        .ndp2-open-page {
          min-height: 54px;
          padding: 0 16px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(135deg, #2f5eff 0%, #6cc4ff 100%);
          color: #fff;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 18px 32px rgba(47, 94, 255, 0.2);
          white-space: nowrap;
        }

        .ndp2-popup__body {
          min-height: 0;
          flex: 1;
          overflow: auto;
          padding: 20px 24px 24px;
        }

        .ndp2-popup__body::-webkit-scrollbar {
          width: 8px;
        }

        .ndp2-popup__body::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(132, 155, 192, 0.28);
        }

        .ndp2-notices-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .ndp2-notice-card {
          padding: 16px;
          border-radius: 22px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border: 1px solid rgba(145, 170, 208, 0.16);
          box-shadow: 0 12px 24px rgba(24, 49, 91, 0.06);
          display: grid;
          gap: 12px;
        }

        .ndp2-notice-card__top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .ndp2-notice-card__icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: linear-gradient(180deg, #f5f9ff 0%, #edf5ff 100%);
          color: #5f8fd9;
          border: 1px solid rgba(163, 186, 221, 0.22);
        }

        .ndp2-notice-card__icon svg {
          width: 20px;
          height: 20px;
        }

        .ndp2-notice-card__copy {
          min-width: 0;
          display: grid;
          gap: 8px;
        }

        .ndp2-notice-card__copy strong {
          color: #183153;
          font-size: 0.95rem;
          line-height: 1.45;
        }

        .ndp2-notice-card__copy p {
          margin: 0;
          color: #6b84a9;
          font-size: 0.84rem;
          line-height: 1.65;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .ndp2-notice-card__meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ndp2-notice-card__meta span {
          min-height: 28px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: #f4f8ff;
          color: #5e7ea8;
          border: 1px solid rgba(163, 186, 221, 0.18);
          font-size: 0.72rem;
          font-weight: 800;
        }

        .ndp2-notice-card__meta span.is-pinned {
          background: rgba(255, 237, 177, 0.55);
          color: #8b6a00;
          border-color: rgba(239, 197, 83, 0.24);
        }

        .ndp2-notice-card__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ndp2-btn {
          min-height: 38px;
          padding: 0 14px;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
        }

        .ndp2-btn--dark {
          color: #fff;
          background: linear-gradient(135deg, #1f3463 0%, #0f1e40 100%);
        }

        .ndp2-btn--ghost {
          color: #183153;
          background: #ffffff;
          border: 1px solid rgba(145, 170, 208, 0.18);
        }

        @media (max-width: 960px) {
          .ndp2-grid,
          .ndp2-notices-grid {
            grid-template-columns: 1fr;
          }

          .ndp2-popup__toolbar {
            grid-template-columns: 1fr;
          }

          .ndp2-overlay {
            padding: 76px 12px 18px;
          }

          .ndp2-popup {
            max-height: calc(100vh - 94px);
            border-radius: 22px;
          }
        }
      `}</style>

      {error ? <div className="ndp2-empty">{error}</div> : null}
      {!error && loading ? <div className="ndp2-empty">Đang tải phòng ban...</div> : null}
      {!error && !loading && departments.length === 0 ? (
        <div className="ndp2-empty">Chưa có phòng ban.</div>
      ) : null}

      {!error && !loading && departments.length > 0 ? (
        <div className="ndp2-grid">
          {departments.map((department) => (
            <button
              key={department.id}
              type="button"
              className="ndp2-card"
              onClick={() => onOpenPopup?.(department)}
            >
              <span className="ndp2-card__left">
                <span className="ndp2-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6.5 16.5h11l-1.2-1.8a5 5 0 0 1-.8-2.7v-1.2a4.5 4.5 0 1 0-9 0V12a5 5 0 0 1-.8 2.7z" />
                    <path d="M10 18.5a2 2 0 0 0 4 0" />
                  </svg>
                </span>

                <span className="ndp2-card__text">
                  <strong>{department.departmentName}</strong>
                  <span>{department.division || "Division"}</span>
                </span>
              </span>

              <span className="ndp2-card__pill">Mở</span>
            </button>
          ))}
        </div>
      ) : null}

      {popupNode ? createPortal(popupNode, document.body) : null}
    </>
  );
}
