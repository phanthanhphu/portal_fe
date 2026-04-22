import React, { useEffect, useMemo, useRef, useState } from "react";
import companyLogo from "./youngone-logo.png";
import companyBg from "./background.JPG";
import "./PageHome.css";
import FormsDepartmentPopup from "./FormsDepartmentPopup";
import NoticeDepartmentPopup from "./NoticeDepartmentPopup";
import { API_BASE_URL } from "../config";

const APPS_API_BASE = `${API_BASE_URL}/api/app-links`;
const FORMS_API_BASE = `${API_BASE_URL}/api/forms`;
const NOTICES_API_BASE = `${API_BASE_URL}/api/notices`;
const DEPARTMENTS_API_BASE = `${API_BASE_URL}/api/departments`;

const FORMS_PAGE_PATH = "/forms";
const NOTICES_PAGE_PATH = "/notices";
const COMPANY_BG_URL = companyBg;
const MENU_MAX_VISIBLE_ITEMS = 6;
const MENU_DESKTOP_ITEMS_PER_ROW = 2;

function toAbsoluteUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function inferFileType(fileUrl) {
  if (!fileUrl) return "FILE";
  const cleanUrl = fileUrl.split("?")[0].split("#")[0];
  return cleanUrl.split(".").pop()?.toUpperCase() || "FILE";
}

function isEmbeddableFile(fileType, url) {
  const type = (fileType || inferFileType(url) || "").toUpperCase();
  return ["PDF", "PNG", "JPG", "JPEG", "WEBP", "GIF", "TXT"].includes(type);
}

function formatDateTime(createdAtArray) {
  if (!Array.isArray(createdAtArray) || createdAtArray.length < 6) return "";
  const [year, month, day, hour, minute] = createdAtArray;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${dd}/${mm}/${year} • ${hh}:${min}`;
}

function dateArrayToMillis(dateArray) {
  if (!Array.isArray(dateArray) || dateArray.length < 6) return 0;
  const [year, month, day, hour, minute, second = 0, nano = 0] = dateArray;
  const milli = Math.floor(nano / 1000000);
  return new Date(year, month - 1, day, hour, minute, second, milli).getTime();
}

function useClickOutside(ref, callback) {
  useEffect(() => {
    const handle = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      callback();
    };

    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, callback]);
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13V10.5" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 13.5 14 9.5" />
      <path d="M7.5 16a4 4 0 0 1 0-5.7l2.1-2.1a4 4 0 1 1 5.7 5.7L14 15" />
      <path d="M16.5 8a4 4 0 0 1 0 5.7l-2.1 2.1a4 4 0 0 1-5.7-5.7L10 9" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.5 7.5h5l2 2h10v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <path d="M3.5 7.5v-.5a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6.5 16.5h11l-1.2-1.8a5 5 0 0 1-.8-2.7v-1.2a4.5 4.5 0 1 0-9 0V12a5 5 0 0 1-.8 2.7z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 13v4.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5H11" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m14.5 4 5.5 5.5-2.8.7-2.5 5.9-2.3-2.3-4.4 4.4-1.8-1.8 4.4-4.4-2.3-2.3 5.9-2.5z" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 15.5 20 18l2.5 1-2.5 1L19 22.5 18 20l-2.5-1 2.5-1z" />
      <path d="M5 15.5 6 18l2.5 1-2.5 1L5 22.5 4 20l-2.5-1 2.5-1z" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5H14v15" />
      <path d="M14 20V10.5A1.5 1.5 0 0 1 15.5 9H20v11" />
      <path d="M8 8h2" />
      <path d="M8 12h2" />
      <path d="M8 16h2" />
      <path d="M17 13h1.5" />
      <path d="M17 16h1.5" />
      <path d="M3 20h18" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

const EMPTY_PREVIEW_STATE = {
  open: false,
  loading: false,
  error: "",
  item: null,
  blobUrl: "",
  mimeType: "",
  fileName: "",
  previewKind: "other",
  docHtml: "",
  workbookSheets: [],
  activeSheetName: "",
  textContent: "",
};

function getDownloadFileName(item) {
  if (!item) return "tai-lieu";
  const rawName = item.title || item.name || "tai-lieu";
  if (rawName.includes(".")) return rawName;
  const extension = (item.fileType || inferFileType(item.fileUrl) || "file").toLowerCase();
  return `${rawName}.${extension}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPreviewKind(item, mimeType = "") {
  const normalizedMime = String(mimeType || "").toLowerCase();
  const fileType = String(item?.fileType || inferFileType(item?.fileUrl) || "").toUpperCase();

  if (normalizedMime.startsWith("image/")) return "image";
  if (normalizedMime.includes("pdf")) return "pdf";
  if (
    normalizedMime.includes("wordprocessingml") ||
    normalizedMime.includes("msword") ||
    fileType === "DOCX"
  ) {
    return "docx";
  }
  if (fileType === "DOC") return "doc";
  if (
    normalizedMime.includes("spreadsheetml") ||
    normalizedMime.includes("excel") ||
    normalizedMime.includes("text/csv") ||
    ["XLS", "XLSX", "CSV"].includes(fileType)
  ) {
    return "spreadsheet";
  }
  if (normalizedMime.startsWith("text/") || fileType === "TXT") return "text";
  if (["PNG", "JPG", "JPEG", "WEBP", "GIF"].includes(fileType)) return "image";
  if (fileType === "PDF") return "pdf";
  return "other";
}

async function buildPreviewData(item, blob, mimeType = "") {
  const previewKind = getPreviewKind(item, mimeType);

  if (previewKind === "image" || previewKind === "pdf") {
    return {
      previewKind,
      blobUrl: URL.createObjectURL(blob),
      docHtml: "",
      workbookSheets: [],
      activeSheetName: "",
      textContent: "",
    };
  }

  if (previewKind === "docx") {
    const mammothModule = await import("mammoth/mammoth.browser");
    const mammoth = mammothModule.default || mammothModule;
    const arrayBuffer = await blob.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const messages = Array.isArray(result.messages)
      ? result.messages
          .map((message) => `<li>${escapeHtml(message.message || message.type || "")}</li>`)
          .join("")
      : "";

    return {
      previewKind,
      blobUrl: "",
      docHtml: `
        <div class="portal-docx-preview__content">${result.value || "<p>Không có nội dung để hiển thị.</p>"}</div>
        ${messages ? `<div class="portal-docx-preview__notes"><strong>Lưu ý định dạng</strong><ul>${messages}</ul></div>` : ""}
      `,
      workbookSheets: [],
      activeSheetName: "",
      textContent: "",
    };
  }

  if (previewKind === "spreadsheet") {
    const xlsxModule = await import("xlsx");
    const XLSX = xlsxModule.default || xlsxModule;
    const arrayBuffer = await blob.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const workbookSheets = (workbook.SheetNames || []).map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      });

      const normalizedRows = rows.slice(0, 80).map((row) =>
        Array.from({ length: Math.min(16, Math.max(...rows.slice(0, 80).map((r) => (Array.isArray(r) ? r.length : 0)), 1)) }, (_, idx) => row[idx] ?? "")
      );

      return {
        name: sheetName,
        rows: normalizedRows,
      };
    });

    return {
      previewKind,
      blobUrl: "",
      docHtml: "",
      workbookSheets,
      activeSheetName: workbookSheets[0]?.name || "",
      textContent: "",
    };
  }

  if (previewKind === "text") {
    const textContent = await blob.text();
    return {
      previewKind,
      blobUrl: "",
      docHtml: "",
      workbookSheets: [],
      activeSheetName: "",
      textContent,
    };
  }

  if (previewKind === "doc") {
    return {
      previewKind,
      blobUrl: "",
      docHtml: "",
      workbookSheets: [],
      activeSheetName: "",
      textContent: "",
    };
  }

  return {
    previewKind: "other",
    blobUrl: "",
    docHtml: "",
    workbookSheets: [],
    activeSheetName: "",
    textContent: "",
  };
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="portal-search">
      <span className="portal-search__icon">
        <IconSearch />
      </span>
      <input
        className="portal-search__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function FileActions({ item, onPreview, onDownload, compact = false }) {
  return (
    <div className={`portal-file-actions ${compact ? "is-compact" : ""}`}>
      <button
        type="button"
        className="portal-btn portal-btn--dark"
        onClick={() => onPreview(item)}
      >
        Xem
      </button>
      <button
        type="button"
        className="portal-btn portal-btn--ghost"
        onClick={() => onDownload(item)}
      >
        Tải
      </button>
    </div>
  );
}

function PreviewModal({ previewState, onClose, onDownload, onSelectSheet }) {
  if (!previewState.open) return null;

  const activeSheet = previewState.workbookSheets.find(
    (sheet) => sheet.name === previewState.activeSheetName,
  ) || previewState.workbookSheets[0] || null;

  return (
    <div className="portal-modal-backdrop" onClick={onClose}>
      <div className="portal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="portal-modal-head">
          <div>
            <div className="portal-modal-kicker">Preview</div>
            <h3>{previewState.fileName || previewState.item?.title || previewState.item?.name}</h3>
            {previewState.item?.title ? <p>{previewState.item.title}</p> : null}
          </div>
          <button type="button" className="portal-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="portal-modal-body">
          {previewState.loading ? (
            <div className="portal-empty">Đang tải file...</div>
          ) : previewState.error ? (
            <div className="portal-empty">
              <p>{previewState.error}</p>
              {previewState.item ? (
                <div className="portal-file-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="portal-btn portal-btn--dark" onClick={() => onDownload(previewState.item)}>
                    Tải file
                  </button>
                </div>
              ) : null}
            </div>
          ) : previewState.previewKind === "image" && previewState.blobUrl ? (
            <img
              src={previewState.blobUrl}
              alt={previewState.fileName || previewState.item?.title || "preview"}
              className="portal-modal-frame"
              style={{ objectFit: "contain" }}
            />
          ) : previewState.previewKind === "pdf" && previewState.blobUrl ? (
            <iframe
              title={previewState.fileName || previewState.item?.title || previewState.item?.name}
              src={previewState.blobUrl}
              className="portal-modal-frame"
            />
          ) : previewState.previewKind === "docx" ? (
            <div className="portal-docx-preview" dangerouslySetInnerHTML={{ __html: previewState.docHtml || "<p>Không có nội dung để hiển thị.</p>" }} />
          ) : previewState.previewKind === "spreadsheet" ? (
            <div className="portal-sheet-preview">
              <div className="portal-sheet-preview__tabs">
                {previewState.workbookSheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    type="button"
                    className={`portal-sheet-preview__tab ${sheet.name === activeSheet?.name ? "is-active" : ""}`}
                    onClick={() => onSelectSheet(sheet.name)}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>

              <div className="portal-sheet-preview__table-wrap">
                {activeSheet?.rows?.length ? (
                  <table className="portal-sheet-preview__table">
                    <tbody>
                      {activeSheet.rows.map((row, rowIndex) => (
                        <tr key={`${activeSheet.name}-${rowIndex}`}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${activeSheet.name}-${rowIndex}-${cellIndex}`}>
                              {String(cell ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="portal-empty">Sheet này chưa có dữ liệu để hiển thị.</div>
                )}
              </div>
            </div>
          ) : previewState.previewKind === "text" ? (
            <pre className="portal-text-preview">{previewState.textContent || "Không có nội dung văn bản."}</pre>
          ) : previewState.previewKind === "doc" ? (
            <div className="portal-empty">
              File .doc cũ chưa preview trực tiếp ổn định trên web. Bạn hãy đổi sang .docx hoặc PDF để xem read-only đẹp hơn.
            </div>
          ) : (
            <div className="portal-empty">
              Chưa hỗ trợ preview trực tiếp cho file này. Bạn hãy tải file để mở bằng ứng dụng phù hợp.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuDropdown({
  label,
  icon,
  isOpen,
  onToggle,
  children,
  count,
  popoverClassName = "",
  popoverStyle = undefined,
}) {
  return (
    <div className={`portal-nav-dropdown ${isOpen ? "is-open" : ""}`}>
      <button type="button" className="portal-nav-trigger" onClick={onToggle}>
        <span className="portal-nav-trigger__icon">{icon}</span>
        <span>{label}</span>
        {typeof count === "number" ? <span className="portal-nav-trigger__count">{count}</span> : null}
        <span className="portal-nav-trigger__chevron">
          <IconChevronDown />
        </span>
      </button>
      {isOpen ? (
        <div
          className={`portal-nav-popover ${popoverClassName}`.trim()}
          style={popoverStyle}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MobileDropdown({
  label,
  icon,
  isOpen,
  onToggle,
  children,
  bodyClassName = "",
  bodyStyle = undefined,
}) {
  return (
    <div className="portal-mobile-group">
      <button type="button" className="portal-mobile-group__trigger" onClick={onToggle}>
        <span className="portal-mobile-group__left">
          <span className="portal-nav-trigger__icon">{icon}</span>
          <span>{label}</span>
        </span>
        <span className={`portal-mobile-group__chevron ${isOpen ? "is-open" : ""}`}>
          <IconChevronDown />
        </span>
      </button>
      {isOpen ? (
        <div
          className={`portal-mobile-group__body ${bodyClassName}`.trim()}
          style={bodyStyle}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function PanelHeader({ title, icon, count }) {
  return (
    <div className="portal-panel__head">
      <div className="portal-panel__head-left">
        <div className="portal-panel__title-icon">{icon}</div>
        <h2>{title}</h2>
      </div>
      {typeof count === "number" ? <div className="portal-panel__count">{count}</div> : null}
    </div>
  );
}

function OverviewCard({ icon, title, value, subtitle }) {
  return (
    <article className="portal-overview-card">
      <div className="portal-overview-card__icon">{icon}</div>
      <div className="portal-overview-card__content">
        <strong>{title}</strong>
        <div className="portal-overview-card__value">{value}</div>
        <span>{subtitle}</span>
      </div>
    </article>
  );
}

export default function PageHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const [appNameSearch, setAppNameSearch] = useState("");
  const [formTitleSearch, setFormTitleSearch] = useState("");
  const [noticeSearch, setNoticeSearch] = useState("");

  const [apps, setApps] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [forms, setForms] = useState([]);
  const [notices, setNotices] = useState([]);

  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingNotices, setLoadingNotices] = useState(false);

  const [errorApps, setErrorApps] = useState(null);
  const [errorDepartments, setErrorDepartments] = useState(null);
  const [errorForms, setErrorForms] = useState(null);
  const [errorNotices, setErrorNotices] = useState(null);

  const [previewState, setPreviewState] = useState(EMPTY_PREVIEW_STATE);
  const [formsPopupOpen, setFormsPopupOpen] = useState(false);
  const [selectedFormsDepartment, setSelectedFormsDepartment] = useState(null);
  const [noticePopupOpen, setNoticePopupOpen] = useState(false);
  const [selectedNoticeDepartment, setSelectedNoticeDepartment] = useState(null);
  const [noticeWindowStart, setNoticeWindowStart] = useState(0);
  const [isScrollAtTopZone, setIsScrollAtTopZone] = useState(true);

  const navRef = useRef(null);

  useClickOutside(navRef, () => {
    if (formsPopupOpen || noticePopupOpen || previewState.open) return;
    setOpenDropdown(null);
  });

  const fetchApps = async (nameKeyword = "") => {
    setLoadingApps(true);
    setErrorApps(null);

    try {
      const params = new URLSearchParams({
        name: nameKeyword,
        desc: "",
        page: "0",
        size: "24",
        sortBy: "id",
        sortDir: "asc",
      });

      const response = await fetch(`${APPS_API_BASE}/search?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch apps");

      const data = await response.json();
      const normalizedApps = (data.content || []).map((item) => ({
        id: item.id,
        name: item.name || "Ứng dụng",
        url: item.url ? toAbsoluteUrl(item.url) : "#",
        icon: item.icon ? toAbsoluteUrl(item.icon) : "",
      }));

      setApps(normalizedApps);
    } catch (error) {
      setErrorApps("Không tải được links.");
      setApps([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    setErrorDepartments(null);

    try {
      const response = await fetch(DEPARTMENTS_API_BASE, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch departments");
      const data = await response.json();

      const normalizedDepartments = (data || [])
        .map((item) => ({
          id: item.id,
          division: item.division || "",
          departmentName: item.departmentName || "Chưa xác định",
        }))
        .sort((a, b) => a.departmentName.localeCompare(b.departmentName, "vi"));

      setDepartments(normalizedDepartments);
    } catch (error) {
      setErrorDepartments("Không tải được phòng ban.");
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchForms = async ({ title = "" } = {}) => {
    setLoadingForms(true);
    setErrorForms(null);

    try {
      const params = new URLSearchParams({
        departmentName: "",
        title,
        description: "",
        page: "0",
        size: "80",
        sort: "createdAt,desc",
      });

      const response = await fetch(`${FORMS_API_BASE}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch forms");
      const data = await response.json();

      const normalizedForms = (data.content || []).map((item) => ({
        id: item.id,
        title: item.title || "Biểu mẫu",
        fileType: item.fileType || inferFileType(item.fileUrl),
        fileUrl: toAbsoluteUrl(item.fileUrl),
        previewUrl: item.previewUrl ? toAbsoluteUrl(item.previewUrl) : null,
        departmentName: item.departmentName || "Chưa xác định",
        division: item.division || "",
        createdAt: item.createdAt || null,
      }));

      setForms(normalizedForms);
    } catch (error) {
      setErrorForms("Không tải được forms.");
      setForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  const fetchNotices = async () => {
    setLoadingNotices(true);
    setErrorNotices(null);

    try {
      const params = new URLSearchParams({
        title: "",
        content: "",
        page: "0",
        size: "60",
      });

      const response = await fetch(`${NOTICES_API_BASE}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch notices");
      const data = await response.json();

      const normalizedNotices = (data.content || [])
        .map((item) => {
          const fileUrl = toAbsoluteUrl(item.fileUrl);
          const fileType = inferFileType(item.fileUrl);

          return {
            id: item.id,
            title: item.title || "Thông báo",
            content: item.content || "",
            pinned: !!item.pinned,
            fileUrl,
            previewUrl: isEmbeddableFile(fileType, fileUrl) ? fileUrl : null,
            fileType,
            createdAt: item.createdAt || null,
          };
        })
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return dateArrayToMillis(b.createdAt) - dateArrayToMillis(a.createdAt);
        });

      setNotices(normalizedNotices);
    } catch (error) {
      setErrorNotices("Không tải được thông báo.");
      setNotices([]);
    } finally {
      setLoadingNotices(false);
    }
  };

  useEffect(() => {
    fetchApps("");
    fetchDepartments();
    fetchForms({ title: "" });
    fetchNotices();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchApps(appNameSearch.trim());
    }, 260);

    return () => clearTimeout(timeout);
  }, [appNameSearch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchForms({ title: formTitleSearch.trim() });
    }, 260);

    return () => clearTimeout(timeout);
  }, [formTitleSearch]);

  useEffect(() => {
    return () => {
      if (previewState.blobUrl) {
        URL.revokeObjectURL(previewState.blobUrl);
      }
    };
  }, [previewState.blobUrl]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      if (previewState.open) {
        closePreview();
        return;
      }

      if (formsPopupOpen) {
        setFormsPopupOpen(false);
        setSelectedFormsDepartment(null);
        return;
      }

      if (noticePopupOpen) {
        setNoticePopupOpen(false);
        setSelectedNoticeDepartment(null);
        return;
      }

      setOpenDropdown(null);
      setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewState.open, formsPopupOpen, noticePopupOpen]);

  const closePreview = () => {
    setPreviewState((prev) => {
      if (prev.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl);
      }
      return EMPTY_PREVIEW_STATE;
    });
  };

  const handlePreviewSheetChange = (sheetName) => {
    setPreviewState((prev) => ({
      ...prev,
      activeSheetName: sheetName,
    }));
  };

  const fetchProtectedFile = async (fileUrl) => {
    const token = localStorage.getItem("token");
    const headers = { Accept: "*/*" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(fileUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || response.headers.get("content-type") || "";
    return { blob, mimeType };
  };

  const handleOpenPreview = async (item) => {
    if (!item?.fileUrl) {
      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        error: "File này chưa có đường dẫn để xem.",
        item,
        fileName: getDownloadFileName(item),
      });
      return;
    }

    setPreviewState((prev) => {
      if (prev.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl);
      }
      return {
        ...EMPTY_PREVIEW_STATE,
        open: true,
        loading: true,
        item,
        fileName: getDownloadFileName(item),
      };
    });

    try {
      const { blob, mimeType } = await fetchProtectedFile(item.fileUrl);
      const previewData = await buildPreviewData(item, blob, mimeType);

      setPreviewState({
        open: true,
        loading: false,
        error: "",
        item,
        mimeType,
        fileName: getDownloadFileName(item),
        ...previewData,
      });
    } catch (error) {
      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        error: "Không tải được file để preview. Bạn hãy thử tải file xuống.",
        item,
        fileName: getDownloadFileName(item),
      });
    }
  };

  const handleDownloadFile = async (item) => {
    if (!item?.fileUrl) return;

    try {
      const { blob } = await fetchProtectedFile(item.fileUrl);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getDownloadFileName(item);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        error: "Không tải được file. Bạn hãy kiểm tra token hoặc quyền truy cập file.",
        item,
        fileName: getDownloadFileName(item),
      });
    }
  };

  const groupedForms = useMemo(() => {
    const map = new Map();

    forms.forEach((form) => {
      const key = form.departmentName || "Chưa xác định";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(form);
    });

    return Array.from(map.entries())
      .map(([name, items]) => ({ name, forms: items }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [forms]);

  const featuredNotice = useMemo(
    () => notices.find((item) => item.pinned) || notices[0] || null,
    [notices],
  );

  const searchableNotices = useMemo(
    () => notices.filter((item) => item.id !== featuredNotice?.id),
    [notices, featuredNotice],
  );

  const filteredNotices = useMemo(() => {
    const keyword = noticeSearch.trim().toLowerCase();
    if (!keyword) return searchableNotices;

    return searchableNotices.filter(
      (notice) =>
        notice.title.toLowerCase().includes(keyword) ||
        notice.content.toLowerCase().includes(keyword) ||
        formatDateTime(notice.createdAt).toLowerCase().includes(keyword),
    );
  }, [searchableNotices, noticeSearch]);

  useEffect(() => {
    setNoticeWindowStart(0);
  }, [noticeSearch, filteredNotices.length]);

useEffect(() => {
  if (filteredNotices.length <= 5) return undefined;

  const intervalId = window.setInterval(() => {
    setNoticeWindowStart((prev) => (prev + 1) % filteredNotices.length);
  }, 3200);

  return () => window.clearInterval(intervalId);
}, [filteredNotices.length]);

const visibleNotices = useMemo(() => {
  if (filteredNotices.length <= 5) {
    return filteredNotices.map((notice, index) => ({
      notice,
      displayIndex: index + 1,
    }));
  }

  return Array.from({ length: 5 }, (_, offset) => {
    const absoluteIndex = (noticeWindowStart + offset) % filteredNotices.length;
    return {
      notice: filteredNotices[absoluteIndex],
      displayIndex: absoluteIndex + 1,
    };
  });
}, [filteredNotices, noticeWindowStart]);

  const noticeDisplayCount = (featuredNotice ? 1 : 0) + filteredNotices.length;

  const divisionCount = useMemo(() => {
    return new Set(
      departments.map((item) => item.division).filter(Boolean),
    ).size;
  }, [departments]);

  const pinnedCount = useMemo(
    () => notices.filter((item) => item.pinned).length,
    [notices],
  );

  const latestNoticeTime = useMemo(() => {
    if (!notices.length) return "Chưa có dữ liệu";
    return formatDateTime(notices[0].createdAt) || "Chưa có dữ liệu";
  }, [notices]);

  const desktopDropdownStyle = {
    "--menu-visible-items": String(MENU_MAX_VISIBLE_ITEMS),
    "--menu-visible-rows": String(
      Math.ceil(MENU_MAX_VISIBLE_ITEMS / MENU_DESKTOP_ITEMS_PER_ROW),
    ),
  };

  const mobileDropdownStyle = {
    "--menu-visible-items": String(MENU_MAX_VISIBLE_ITEMS),
  };

  useEffect(() => {
    const handleScrollState = () => {
      setIsScrollAtTopZone(window.scrollY <= 160);
    };

    handleScrollState();
    window.addEventListener("scroll", handleScrollState, { passive: true });

    return () => window.removeEventListener("scroll", handleScrollState);
  }, []);

  const handleTogglePageEdge = () => {
    const targetTop = isScrollAtTopZone
      ? Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        )
      : 0;

    window.scrollTo({
      top: targetTop,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="portal-page">
        <header className="portal-header">
          <div className="portal-shell portal-topbar" ref={navRef}>
            <a href="/" className="portal-brand">
              <span className="portal-brand__mark">
                <img src={companyLogo} alt="YOUNGONE" />
              </span>
              <span className="portal-brand__text">
                <strong>YOUNGONE BSL</strong>
                <small>Internal portal</small>
              </span>
            </a>

            <nav className="portal-nav">
              <a href="/" className="portal-nav-home">
                <span className="portal-nav-trigger__icon">
                  <IconHome />
                </span>
                <span>Home</span>
              </a>

              <MenuDropdown
                label="Links"
                icon={<IconLink />}
                isOpen={openDropdown === "links"}
                onToggle={() => setOpenDropdown((prev) => (prev === "links" ? null : "links"))}
                count={apps.length || undefined}
                popoverClassName="portal-menu-six"
                popoverStyle={desktopDropdownStyle}
              >
                <div className="portal-dropdown-head">
                  <strong>Liên kết nội bộ</strong>
                  <span>{loadingApps ? "Đang tải..." : `${apps.length} mục`}</span>
                </div>
                <div className="portal-dropdown-list portal-dropdown-list--apps">
                  {errorApps ? <div className="portal-dropdown-empty">{errorApps}</div> : null}
                  {!errorApps && loadingApps ? <div className="portal-dropdown-empty">Đang tải links...</div> : null}
                  {!errorApps && !loadingApps && apps.length === 0 ? (
                    <div className="portal-dropdown-empty">Chưa có links.</div>
                  ) : null}

                  {!errorApps &&
                    !loadingApps &&
                    apps.map((app) => (
                      <a
                        key={app.id}
                        href={app.url}
                        target="_blank"
                        rel="noreferrer"
                        className="portal-dropdown-item"
                      >
                        <span className="portal-dropdown-item__left">
                          <span className="portal-dropdown-appicon">
                            {app.icon ? <img src={app.icon} alt={app.name} /> : app.name.slice(0, 1)}
                          </span>
                          <span>{app.name}</span>
                        </span>
                        <span className="portal-dropdown-item__right">
                          <IconExternal />
                        </span>
                      </a>
                    ))}
                </div>
              </MenuDropdown>

              <MenuDropdown
                label="Forms"
                icon={<IconFolder />}
                isOpen={openDropdown === "forms"}
                onToggle={() => setOpenDropdown((prev) => (prev === "forms" ? null : "forms"))}
                count={departments.length || undefined}
                popoverClassName="portal-menu-six"
                popoverStyle={desktopDropdownStyle}
              >
                <div className="portal-menu-six" style={desktopDropdownStyle}>
                  <FormsDepartmentPopup
                  departments={departments}
                  loading={loadingDepartments}
                  error={errorDepartments}
                  formsApiBase={FORMS_API_BASE}
                  apiBaseUrl={API_BASE_URL}
                  formsPagePath={FORMS_PAGE_PATH}
                  onPreview={handleOpenPreview}
                  onDownload={handleDownloadFile}
                  popupOpen={formsPopupOpen}
                  selectedDepartment={selectedFormsDepartment}
                  onOpenPopup={(department) => {
                    setSelectedFormsDepartment(department);
                    setFormsPopupOpen(true);
                    setOpenDropdown("forms");
                  }}
                  onClosePopup={() => {
                    setFormsPopupOpen(false);
                    setSelectedFormsDepartment(null);
                  }}
                />
                </div>
              </MenuDropdown>

              <MenuDropdown
                label="Notice"
                icon={<IconBell />}
                isOpen={openDropdown === "notice"}
                onToggle={() => setOpenDropdown((prev) => (prev === "notice" ? null : "notice"))}
                count={departments.length || undefined}
                popoverClassName="portal-menu-six"
                popoverStyle={desktopDropdownStyle}
              >
                <div className="portal-menu-six" style={desktopDropdownStyle}>
                  <NoticeDepartmentPopup
                  departments={departments}
                  loading={loadingDepartments}
                  error={errorDepartments}
                  noticesApiBase={NOTICES_API_BASE}
                  apiBaseUrl={API_BASE_URL}
                  noticesPagePath={NOTICES_PAGE_PATH}
                  onPreview={handleOpenPreview}
                  onDownload={handleDownloadFile}
                  popupOpen={noticePopupOpen}
                  selectedDepartment={selectedNoticeDepartment}
                  onOpenPopup={(department) => {
                    setSelectedNoticeDepartment(department);
                    setNoticePopupOpen(true);
                    setOpenDropdown("notice");
                  }}
                  onClosePopup={() => {
                    setNoticePopupOpen(false);
                    setSelectedNoticeDepartment(null);
                  }}
                />
                </div>
              </MenuDropdown>
            </nav>

            <button
              type="button"
              className="portal-mobile-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          {mobileMenuOpen ? (
            <div className="portal-shell portal-mobile-menu">
              <a href="/" className="portal-mobile-link">
                <span className="portal-nav-trigger__icon">
                  <IconHome />
                </span>
                <span>Home</span>
              </a>

              <MobileDropdown
                label="Links"
                icon={<IconLink />}
                isOpen={openDropdown === "mobile-links"}
                onToggle={() =>
                  setOpenDropdown((prev) => (prev === "mobile-links" ? null : "mobile-links"))
                }
                bodyClassName="portal-mobile-group__body--scroll-6"
                bodyStyle={mobileDropdownStyle}
              >
                {apps.map((app) => (
                  <a
                    key={app.id}
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="portal-mobile-subitem"
                  >
                    {app.name}
                  </a>
                ))}
              </MobileDropdown>

              <MobileDropdown
                label="Forms"
                icon={<IconFolder />}
                isOpen={openDropdown === "mobile-forms"}
                onToggle={() =>
                  setOpenDropdown((prev) => (prev === "mobile-forms" ? null : "mobile-forms"))
                }
                bodyClassName="portal-mobile-group__body--scroll-6"
                bodyStyle={mobileDropdownStyle}
              >
                {departments.map((department) => (
                  <a
                    key={department.id}
                    href={`${FORMS_PAGE_PATH}?departmentName=${encodeURIComponent(department.departmentName)}`}
                    className="portal-mobile-subitem"
                  >
                    {department.departmentName}
                  </a>
                ))}
              </MobileDropdown>

              <MobileDropdown
                label="Notice"
                icon={<IconBell />}
                isOpen={openDropdown === "mobile-notice"}
                onToggle={() =>
                  setOpenDropdown((prev) => (prev === "mobile-notice" ? null : "mobile-notice"))
                }
                bodyClassName="portal-mobile-group__body--scroll-6"
                bodyStyle={mobileDropdownStyle}
              >
                {departments.map((department) => (
                  <a
                    key={department.id}
                    href={`${NOTICES_PAGE_PATH}?division=${encodeURIComponent(department.division || "")}&departmentName=${encodeURIComponent(department.departmentName)}`}
                    className="portal-mobile-subitem"
                  >
                    {department.departmentName}
                  </a>
                ))}
              </MobileDropdown>
            </div>
          ) : null}
        </header>

        <main className="portal-main">
          <section className="portal-hero">
            <div className="portal-shell">
              <div
                className="portal-hero__surface"
                style={{ backgroundImage: `linear-gradient(120deg, rgba(7, 16, 39, 0.72), rgba(7, 16, 39, 0.34)), url(${COMPANY_BG_URL})` }}
              >
                <div className="portal-hero__copy">
                  <div className="portal-tag">YOUNGONE CORPORATION</div>
                  <h1>Trusted performance manufacturing since 1974.</h1>

                  <div className="portal-hero__intro">
                    <p>
                      Founded by Kihak Sung in 1974, Youngone Corporation was built on a love of
                      nature and outdoor pursuits.
                    </p>

                    <p>
                      For nearly 50 years, global outdoor and apparel brands have trusted
                      Youngone for quality, reliability, service and continuous improvement.
                    </p>
                  </div>

                  <div className="portal-hero__chips">
                    <span className="portal-chip">Founded in 1974</span>
                    <span className="portal-chip">Outdoor expertise</span>
                    <span className="portal-chip">Quality & reliability</span>
                    <span className="portal-chip">Trusted for 50 years</span>
                  </div>
                </div>

                <div className="portal-hero__card portal-hero__card--company">
                  <div className="portal-hero__logo-box">
                    <img src={companyLogo} alt="YOUNGONE" className="portal-hero__logo" />
                    <div className="portal-hero__logo-copy">
                      <strong>YOUNGONE, BSL</strong>
                      <span>Global outdoor gear and apparel manufacturing facility</span>
                    </div>
                  </div>

                  <div className="portal-hero-stat">
                    <small>Founded</small>
                    <strong>2017</strong>
                  </div>
                  <div className="portal-hero-stat">
                    <small>Factories</small>
                    <strong>7</strong>
                  </div>
                  <div className="portal-hero-stat">
                    <small>Workers</small>
                    <strong>8,000+</strong>
                  </div>
                  <div className="portal-hero-stat">
                    <small>Lines</small>
                    <strong>240+</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="portal-workspace">
            <div className="portal-shell">
              <div className="portal-grid">
                <div className="portal-grid__left">
                  <article className="portal-panel">
                    <PanelHeader title="Links" icon={<IconLink />} count={apps.length} />

                    <SearchInput
                      value={appNameSearch}
                      onChange={setAppNameSearch}
                      placeholder="Tìm tên ứng dụng..."
                    />

                    <div className="portal-panel__scroll">
                      {loadingApps ? <div className="portal-empty">Đang tải links...</div> : null}
                      {errorApps ? <div className="portal-empty">{errorApps}</div> : null}

                      {!loadingApps && !errorApps ? (
                        <div className="portal-links-grid">
                          {apps.map((app) => (
                            <a
                              key={app.id}
                              href={app.url}
                              target="_blank"
                              rel="noreferrer"
                              className="portal-link-card"
                            >
                              <div className="portal-link-card__left">
                                <div className="portal-link-card__icon">
                                  {app.icon ? <img src={app.icon} alt={app.name} /> : app.name.slice(0, 1)}
                                </div>
                                <div className="portal-link-card__text">
                                  <strong>{app.name}</strong>
                                  <span>Mở nhanh</span>
                                </div>
                              </div>
                              <span className="portal-link-card__arrow">
                                <IconExternal />
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>

                  <article className="portal-panel">
                    <PanelHeader
                      title="Forms"
                      icon={<IconFileText />}
                      count={groupedForms.length}
                    />

                    <SearchInput
                      value={formTitleSearch}
                      onChange={setFormTitleSearch}
                      placeholder="Tìm form hoặc biểu mẫu..."
                    />

                    <div className="portal-panel__scroll">
                      {loadingForms ? <div className="portal-empty">Đang tải forms...</div> : null}
                      {errorForms ? <div className="portal-empty">{errorForms}</div> : null}

                      {!loadingForms && !errorForms && groupedForms.length === 0 ? (
                        <div className="portal-empty">Không có forms phù hợp.</div>
                      ) : null}

                      {!loadingForms && !errorForms ? (
                        <div className="portal-dept-stack">
                          {groupedForms.map((group) => (
                            <div key={group.name} className="portal-dept-card">
                              <div className="portal-dept-card__head">
                                <div className="portal-dept-card__title">
                                  <span className="portal-dept-card__icon">
                                    <IconBuilding />
                                  </span>
                                  <div>
                                    <strong>{group.name}</strong>
                                    <span>{group.forms.length} form</span>
                                  </div>
                                </div>
                              </div>

                              <div className="portal-form-rows">
                                {group.forms.map((form) => (
                                  <div key={form.id} className="portal-form-row">
                                    <div className="portal-form-row__content">
                                      <strong>{form.title}</strong>
                                      <div className="portal-meta-row">
                                        {form.division ? <span className="portal-meta-pill">{form.division}</span> : null}
                                        <span className="portal-meta-pill">{form.fileType}</span>
                                        {form.createdAt ? (
                                          <span className="portal-meta-pill">{formatDateTime(form.createdAt)}</span>
                                        ) : null}
                                      </div>
                                    </div>

                                    <FileActions item={form} onPreview={handleOpenPreview} onDownload={handleDownloadFile} compact />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                </div>

                <article className="portal-panel portal-panel--notice">
                  <PanelHeader
                    title="Notice"
                    icon={<IconBell />}
                    count={noticeDisplayCount}
                  />

                  <div className="portal-notice-column">
                    {featuredNotice ? (
                      <div className="portal-featured-notice-wrap">
                        <div className="portal-featured-notice">
                          <div className="portal-featured-notice__badge">
                            <span className="portal-featured-notice__badge-icon">
                              <IconPin />
                            </span>
                            <span>Ghim ưu tiên</span>
                          </div>
                          <h3>{featuredNotice.title}</h3>
                          <p>{featuredNotice.content}</p>
                          <div className="portal-meta-row">
                            <span className="portal-meta-pill">
                              <IconFileText />
                              {featuredNotice.fileType}
                            </span>
                            {featuredNotice.createdAt ? (
                              <span className="portal-meta-pill">
                                <IconClock />
                                {formatDateTime(featuredNotice.createdAt)}
                              </span>
                            ) : null}
                          </div>
                          <FileActions item={featuredNotice} onPreview={handleOpenPreview} onDownload={handleDownloadFile} />
                        </div>
                      </div>
                    ) : null}

                    <div className="portal-toolbar portal-toolbar--notice-search">
                      <SearchInput
                        value={noticeSearch}
                        onChange={setNoticeSearch}
                        placeholder="Tìm notice hoặc ngày đăng..."
                      />
                    </div>

                    <div className="portal-notice-list-scroll">
                      {loadingNotices ? <div className="portal-empty">Đang tải notices...</div> : null}
                      {errorNotices ? <div className="portal-empty">{errorNotices}</div> : null}

                      {!loadingNotices && !errorNotices ? (
                        <div className="portal-notice-stack">
                          {visibleNotices.map(({ notice, displayIndex }) => (
                            <div key={notice.id} className="portal-notice-card">
                              <div className="portal-notice-card__index">
                                {String(displayIndex).padStart(2, "0")}
                              </div>
                              <div className="portal-notice-card__body">
                                <strong>{notice.title}</strong>
                                <p>{notice.content}</p>
                                <div className="portal-meta-row">
                                  <span className="portal-meta-pill">
                                    <IconFileText />
                                    {notice.fileType}
                                  </span>
                                  {notice.createdAt ? (
                                    <span className="portal-meta-pill">
                                      <IconClock />
                                      {formatDateTime(notice.createdAt)}
                                    </span>
                                  ) : null}
                                </div>
                                <FileActions item={notice} onPreview={handleOpenPreview} onDownload={handleDownloadFile} compact />
                              </div>
                            </div>
                          ))}

                          {filteredNotices.length === 0 ? (
                            <div className="portal-empty">
                              Không có notice phù hợp, nhưng thông báo ghim vẫn đang hiển thị ở trên.
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </section>

        </main>

        <footer className="portal-footer">
          <div className="portal-shell portal-footer__inner">
            <div className="portal-footer__links">
              <a href="/terms-and-conditions" className="portal-footer__link">
                Terms & Conditions
              </a>
              <a href="/privacy-policy" className="portal-footer__link">
                Privacy Policy
              </a>
            </div>

            <div className="portal-footer__credit">
              Phát triển bởi IT BSL
            </div>
          </div>
        </footer>
      </div>

      <button
        type="button"
        className="portal-scroll-toggle"
        onClick={handleTogglePageEdge}
        aria-label={isScrollAtTopZone ? "Cuộn xuống cuối trang" : "Cuộn lên đầu trang"}
        title={isScrollAtTopZone ? "Xuống cuối trang" : "Lên đầu trang"}
      >
        {isScrollAtTopZone ? <IconChevronDown /> : <IconChevronUp />}
      </button>

      <PreviewModal previewState={previewState} onClose={closePreview} onDownload={handleDownloadFile} onSelectSheet={handlePreviewSheetChange} />
    </>
  );
}
