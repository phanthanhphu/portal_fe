import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

/**
 * FormsDepartmentPopup
 *
 * - Show menu Forms cap 2 theo phong ban
 * - Click vao 1 phong ban -> goi API /api/forms/search theo division + departmentName
 * - Mo popup dep, co o search local de tim nhanh form trong phong ban do
 * - Popup duoc render bang portal ra document.body de khong bi an duoi header/dropdown
 */
export default function FormsDepartmentPopup({
  departments = [],
  loading = false,
  error = null,
  formsApiBase,
  apiBaseUrl = "",
  formsPagePath = "/forms",
  onPreview,
  onDownload,
  popupOpen = false,
  selectedDepartment = null,
  onOpenPopup,
  onClosePopup,
}) {
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState(null);
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

  const normalizeForm = (item) => ({
    id: item.id,
    title: item.title || "Biểu mẫu",
    description: item.description || "",
    fileType: item.fileType || inferFileType(item.fileUrl),
    fileUrl: toAbsoluteUrl(item.fileUrl),
    previewUrl: item.previewUrl ? toAbsoluteUrl(item.previewUrl) : null,
    departmentId: item.departmentId || "",
    departmentName: item.departmentName || "Chưa xác định",
    division: item.division || "",
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  });

  const fetchDepartmentForms = async (department) => {
    if (!department || !formsApiBase) return;

    const cacheKey = getDepartmentKey(department);
    if (cache[cacheKey]) {
      setForms(cache[cacheKey]);
      setFormsError(null);
      return;
    }

    setFormsLoading(true);
    setFormsError(null);

    try {
      const params = new URLSearchParams({
        division: department.division || "",
        departmentName: department.departmentName || "",
        title: "",
        description: "",
        page: "0",
        size: "200",
        sort: "createdAt,desc",
      });

      const response = await fetch(`${formsApiBase}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch forms: ${response.status}`);
      }

      const data = await response.json();
      const normalizedForms = (data.content || []).map(normalizeForm);

      setForms(normalizedForms);
      setCache((prev) => ({
        ...prev,
        [cacheKey]: normalizedForms,
      }));
    } catch (err) {
      setForms([]);
      setFormsError("Không tải được danh sách form của phòng ban này.");
    } finally {
      setFormsLoading(false);
    }
  };

  useEffect(() => {
    if (!popupOpen || !selectedDepartment) return;
    setSearchKeyword("");
    fetchDepartmentForms(selectedDepartment);
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

  const filteredForms = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return forms;

    return forms.filter((form) => {
      return (
        String(form.title || "").toLowerCase().includes(keyword) ||
        String(form.description || "").toLowerCase().includes(keyword) ||
        String(form.fileType || "").toLowerCase().includes(keyword)
      );
    });
  }, [forms, searchKeyword]);

  const handleFallbackOpenPage = (department) => {
    const url = `${formsPagePath}?division=${encodeURIComponent(
      department?.division || "",
    )}&departmentName=${encodeURIComponent(department?.departmentName || "")}`;
    window.location.href = url;
  };

  const handleFallbackPreview = (form) => {
    if (typeof onPreview === "function") {
      onPreview(form);
      return;
    }
    if (form.fileUrl) {
      window.open(form.fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleFallbackDownload = (form) => {
    if (typeof onDownload === "function") {
      onDownload(form);
      return;
    }
    if (form.fileUrl) {
      const link = document.createElement("a");
      link.href = form.fileUrl;
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
      <div className="fdp-overlay" onClick={onClosePopup}>
        <div className="fdp-popup" onClick={(e) => e.stopPropagation()}>
          <div className="fdp-popup__head">
            <div>
              <p className="fdp-popup__kicker">Forms Department Library</p>
              <h3 className="fdp-popup__title">
                {selectedDepartment?.departmentName || "Phòng ban"}
              </h3>

              <div className="fdp-popup__meta">
                <span className="fdp-popup__badge">
                  {selectedDepartment?.division || "Division"}
                </span>
                <span className="fdp-popup__badge">
                  {formsLoading ? "Đang tải..." : `${forms.length} form`}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="fdp-popup__close"
              onClick={onClosePopup}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="fdp-popup__toolbar">
            <label className="fdp-search">
              <span className="fdp-search__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                className="fdp-search__input"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm form trong phòng ban này..."
              />
            </label>
          </div>

          <div className="fdp-popup__body">
            {formsError ? <div className="fdp-empty">{formsError}</div> : null}
            {!formsError && formsLoading ? (
              <div className="fdp-empty">Đang tải danh sách form...</div>
            ) : null}
            {!formsError && !formsLoading && filteredForms.length === 0 ? (
              <div className="fdp-empty">
                {forms.length === 0
                  ? "Phòng ban này hiện chưa có form."
                  : "Không có form phù hợp với từ khóa tìm kiếm."}
              </div>
            ) : null}

            {!formsError && !formsLoading && filteredForms.length > 0 ? (
              <div className="fdp-forms-grid">
                {filteredForms.map((form) => (
                  <article key={form.id} className="fdp-form-card">
                    <div className="fdp-form-card__top">
                      <span className="fdp-form-card__file">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z" />
                          <path d="M14 3.5V8h4" />
                          <path d="M9 12h6" />
                          <path d="M9 16h6" />
                        </svg>
                      </span>

                      <div className="fdp-form-card__copy">
                        <strong>{form.title}</strong>
                        <p>{form.description || "Biểu mẫu nội bộ của phòng ban."}</p>
                      </div>
                    </div>

                    <div className="fdp-form-card__meta">
                      {form.division ? <span>{form.division}</span> : null}
                      {form.departmentName ? <span>{form.departmentName}</span> : null}
                      {form.fileType ? <span>{form.fileType}</span> : null}
                      {form.createdAt ? <span>{formatDateTime(form.createdAt)}</span> : null}
                    </div>

                    <div className="fdp-form-card__actions">
                      <button
                        type="button"
                        className="fdp-btn fdp-btn--dark"
                        onClick={() => handleFallbackPreview(form)}
                      >
                        Xem
                      </button>

                      <button
                        type="button"
                        className="fdp-btn fdp-btn--ghost"
                        onClick={() => handleFallbackDownload(form)}
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
        .fdp-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .fdp-card {
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

        .fdp-card:hover {
          transform: translateY(-2px);
          border-color: rgba(54, 108, 255, 0.18);
          box-shadow: 0 18px 32px rgba(31, 55, 95, 0.1);
        }

        .fdp-card__left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .fdp-card__icon {
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

        .fdp-card__icon svg {
          width: 20px;
          height: 20px;
        }

        .fdp-card__text {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .fdp-card__text strong {
          display: block;
          color: #183153;
          font-size: 0.92rem;
          line-height: 1.35;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .fdp-card__text span {
          color: #6f86aa;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .fdp-card__pill {
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

        .fdp-empty {
          padding: 18px;
          border-radius: 18px;
          text-align: center;
          color: #6982a8;
          background: #f8fbff;
          border: 1px dashed rgba(150, 172, 207, 0.34);
        }

        .fdp-overlay {
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

        .fdp-popup {
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

        .fdp-popup__head {
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

        .fdp-popup__kicker {
          margin: 0 0 8px;
          color: #4d74b8;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fdp-popup__title {
          margin: 0;
          color: #122947;
          font-size: 1.35rem;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .fdp-popup__sub {
          margin: 8px 0 0;
          color: #6e86aa;
          font-size: 0.92rem;
          line-height: 1.65;
        }

        .fdp-popup__meta {
          margin-top: 14px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .fdp-popup__badge {
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

        .fdp-popup__close {
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

        .fdp-popup__close:hover {
          transform: translateY(-1px);
          background: #edf5ff;
        }

        .fdp-popup__toolbar {
          padding: 16px 24px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          border-bottom: 1px solid rgba(140, 163, 201, 0.14);
          background: rgba(255,255,255,0.84);
        }

        .fdp-search {
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

        .fdp-search__icon {
          width: 18px;
          height: 18px;
          color: #89a0c1;
          flex-shrink: 0;
        }

        .fdp-search__icon svg {
          width: 18px;
          height: 18px;
        }

        .fdp-search__input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #16304f;
          font-size: 0.95rem;
        }

        .fdp-search__input::placeholder {
          color: #9ab0cb;
        }

        .fdp-open-page {
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

        .fdp-popup__body {
          min-height: 0;
          flex: 1;
          overflow: auto;
          padding: 20px 24px 24px;
        }

        .fdp-popup__body::-webkit-scrollbar {
          width: 8px;
        }

        .fdp-popup__body::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(132, 155, 192, 0.28);
        }

        .fdp-forms-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .fdp-form-card {
          padding: 16px;
          border-radius: 22px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border: 1px solid rgba(145, 170, 208, 0.16);
          box-shadow: 0 12px 24px rgba(24, 49, 91, 0.06);
          display: grid;
          gap: 12px;
        }

        .fdp-form-card__top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .fdp-form-card__file {
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

        .fdp-form-card__file svg {
          width: 20px;
          height: 20px;
        }

        .fdp-form-card__copy {
          min-width: 0;
          display: grid;
          gap: 8px;
        }

        .fdp-form-card__copy strong {
          color: #183153;
          font-size: 0.95rem;
          line-height: 1.45;
        }

        .fdp-form-card__copy p {
          margin: 0;
          color: #6b84a9;
          font-size: 0.84rem;
          line-height: 1.65;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .fdp-form-card__meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .fdp-form-card__meta span {
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

        .fdp-form-card__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .fdp-btn {
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

        .fdp-btn--dark {
          color: #fff;
          background: linear-gradient(135deg, #1f3463 0%, #0f1e40 100%);
        }

        .fdp-btn--ghost {
          color: #183153;
          background: #ffffff;
          border: 1px solid rgba(145, 170, 208, 0.18);
        }

        @media (max-width: 960px) {
          .fdp-grid,
          .fdp-forms-grid {
            grid-template-columns: 1fr;
          }

          .fdp-popup__toolbar {
            grid-template-columns: 1fr;
          }

          .fdp-overlay {
            padding: 76px 12px 18px;
          }

          .fdp-popup {
            max-height: calc(100vh - 94px);
            border-radius: 22px;
          }
        }
      `}</style>

      {error ? <div className="fdp-empty">{error}</div> : null}
      {!error && loading ? <div className="fdp-empty">Đang tải phòng ban...</div> : null}
      {!error && !loading && departments.length === 0 ? (
        <div className="fdp-empty">Chưa có phòng ban.</div>
      ) : null}

      {!error && !loading && departments.length > 0 ? (
        <div className="fdp-grid">
          {departments.map((department) => (
            <button
              key={department.id}
              type="button"
              className="fdp-card"
              onClick={() => onOpenPopup?.(department)}
            >
              <span className="fdp-card__left">
                <span className="fdp-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3.5 7.5h5l2 2h10v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
                    <path d="M3.5 7.5v-.5a2 2 0 0 1 2-2h4" />
                  </svg>
                </span>

                <span className="fdp-card__text">
                  <strong>{department.departmentName}</strong>
                  <span>{department.division || "Division"}</span>
                </span>
              </span>

              <span className="fdp-card__pill">Mở</span>
            </button>
          ))}
        </div>
      ) : null}

      {popupNode ? createPortal(popupNode, document.body) : null}
    </>
  );
}
