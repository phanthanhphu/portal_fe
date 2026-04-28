import React, { useEffect, useMemo, useRef, useState } from "react";
import companyLogo from "./youngone-logo.png";
import companyBg from "./background.JPG";
import "./PageHome.css";
import FormsDepartmentPopup from "./FormsDepartmentPopup";
import NoticeDepartmentPopup from "./NoticeDepartmentPopup";
import { API_BASE_URL } from "../config";

const APPS_API_BASE = `${API_BASE_URL}/api/app-links`;
const FORMS_API_BASE = `${API_BASE_URL}/api/forms`;
const DOCUMENT_TYPES_API_BASE = `${API_BASE_URL}/api/document-types`;
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

function hasAttachedFile(item) {
  return Boolean(String(item?.fileUrl || "").trim());
}

function getDisplayFileType(item) {
  if (!hasAttachedFile(item)) return "NO FILE";

  return String(item?.fileType || inferFileType(item?.fileUrl) || "FILE").toUpperCase();
}

const OFFICE_PREVIEW_TYPES = new Set(["DOC", "DOCX", "XLS", "XLSX", "CSV", "PPT", "PPTX"]);

function isOfficePreviewFile(item, mimeType = "") {
  const type = String(item?.fileType || inferFileType(item?.fileUrl) || "").toUpperCase();
  const normalizedMime = String(mimeType || "").toLowerCase();

  return (
    OFFICE_PREVIEW_TYPES.has(type) ||
    normalizedMime.includes("word") ||
    normalizedMime.includes("excel") ||
    normalizedMime.includes("spreadsheet") ||
    normalizedMime.includes("presentation") ||
    normalizedMime.includes("powerpoint")
  );
}

function getPreviewDisplayType(previewState) {
  const type = String(previewState.originalFileType || previewState.item?.fileType || inferFileType(previewState.item?.fileUrl) || "").toUpperCase();

  if (previewState.previewKind === "pdf" && OFFICE_PREVIEW_TYPES.has(type)) {
    return `${type} preview`;
  }

  if (previewState.previewKind === "office-fallback") return `${type || "Office"} preview`;

  return "Preview";
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

function getDepartmentDisplayName(item) {
  return [item?.departmentName, item?.division]
    .filter(Boolean)
    .join(" • ");
}

function dateArrayToMillis(dateArray) {
  if (!Array.isArray(dateArray) || dateArray.length < 6) return 0;
  const [year, month, day, hour, minute, second = 0, nano = 0] = dateArray;
  const milli = Math.floor(nano / 1000000);
  return new Date(year, month - 1, day, hour, minute, second, milli).getTime();
}

function isFormDocumentType(type) {
  return String(type?.name || "").trim().toLowerCase() === "form";
}

function sortDocumentTypes(types) {
  return [...types].sort((a, b) => {
    const aIsForm = isFormDocumentType(a);
    const bIsForm = isFormDocumentType(b);

    if (aIsForm && !bIsForm) return -1;
    if (!aIsForm && bIsForm) return 1;

    return String(a.name || "").localeCompare(String(b.name || ""), "vi");
  });
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


function OfficeAppIcon({ app, colorStart, colorMid, colorEnd, panelColor, letter }) {
  const gradientId = `office-${app}-gradient`;
  const panelGradientId = `office-${app}-panel-gradient`;
  const shadowId = `office-${app}-shadow`;

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={colorStart} />
          <stop offset="0.52" stopColor={colorMid} />
          <stop offset="1" stopColor={colorEnd} />
        </linearGradient>
        <linearGradient id={panelGradientId} x1="14" y1="18" x2="34" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={panelColor} />
          <stop offset="1" stopColor={colorEnd} />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>

      <rect
        x="8"
        y="7"
        width="48"
        height="50"
        rx="13"
        fill={`url(#${gradientId})`}
        filter={`url(#${shadowId})`}
      />

      <path
        d="M8 20C8 12.82 13.82 7 21 7h22c7.18 0 13 5.82 13 13v5H8v-5Z"
        fill="#ffffff"
        opacity="0.22"
      />
      <path d="M32 7h11c7.18 0 13 5.82 13 13v37H32V7Z" fill="#ffffff" opacity="0.12" />
      <path d="M8 38h48v6H8v-6Z" fill="#000000" opacity="0.10" />

      <rect
        x="5"
        y="18"
        width="33"
        height="31"
        rx="6"
        fill={`url(#${panelGradientId})`}
        filter={`url(#${shadowId})`}
      />

      <text
        x="21.5"
        y="39.5"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        {letter}
      </text>
    </svg>
  );
}

function IconFileWord() {
  return (
    <OfficeAppIcon
      app="word"
      colorStart="#41A5FF"
      colorMid="#185ABD"
      colorEnd="#0F3D91"
      panelColor="#256FE6"
      letter="W"
    />
  );
}

function IconFileExcel() {
  return (
    <OfficeAppIcon
      app="excel"
      colorStart="#33C481"
      colorMid="#107C41"
      colorEnd="#0B5C2E"
      panelColor="#168D4A"
      letter="X"
    />
  );
}

function IconFilePowerPoint() {
  return (
    <OfficeAppIcon
      app="powerpoint"
      colorStart="#FF8A65"
      colorMid="#D24726"
      colorEnd="#B33116"
      panelColor="#C43E1C"
      letter="P"
    />
  );
}

function IconFilePdf() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="pdf-file-gradient" x1="14" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF2B33" />
          <stop offset="1" stopColor="#E91F2A" />
        </linearGradient>
        <filter id="pdf-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.22" />
        </filter>
      </defs>

      <path
        d="M12 5h27l13 13v34c0 4.42-3.58 8-8 8H20c-4.42 0-8-3.58-8-8V5Z"
        fill="url(#pdf-file-gradient)"
        filter="url(#pdf-file-shadow)"
      />
      <path d="M39 5v13h13L39 5Z" fill="#FF8A8F" opacity="0.88" />
      <path d="M39 18h13v1.5c0 1.2-1 2.2-2.2 2.2H41.2c-1.2 0-2.2-1-2.2-2.2V18Z" fill="#C71925" opacity="0.22" />

      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill="#ffffff"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.5"
      >
        PDF
      </text>
    </svg>
  );
}

function IconFileImage() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="image-file-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A78BFA" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <filter id="image-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.20" />
        </filter>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="13" fill="url(#image-file-gradient)" filter="url(#image-file-shadow)" />
      <circle cx="24" cy="23" r="5" fill="#ffffff" opacity="0.95" />
      <path d="M15 46 28 33l8 8 5-5 9 10H15Z" fill="#ffffff" opacity="0.95" />
    </svg>
  );
}

function IconFileTextType() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="txt-file-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#667085" />
          <stop offset="1" stopColor="#344054" />
        </linearGradient>
        <filter id="txt-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect x="11" y="6" width="42" height="52" rx="10" fill="url(#txt-file-gradient)" filter="url(#txt-file-shadow)" />
      <path d="M21 23h22M21 32h22M21 41h15" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IconFileGeneric() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="generic-file-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <filter id="generic-file-shadow" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.18" />
        </filter>
      </defs>
      <path d="M13 5h28l10 10v40c0 3.3-2.7 6-6 6H19c-3.3 0-6-2.7-6-6V5Z" fill="url(#generic-file-gradient)" filter="url(#generic-file-shadow)" />
      <path d="M41 5v10h10L41 5Z" fill="#CBD5E1" opacity="0.9" />
      <path d="M22 28h20M22 37h20M22 46h14" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IconNoFile() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="nofile-gradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#CBD5E1" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      <path d="M13 5h28l10 10v40c0 3.3-2.7 6-6 6H19c-3.3 0-6-2.7-6-6V5Z" fill="url(#nofile-gradient)" />
      <path d="M41 5v10h10L41 5Z" fill="#E2E8F0" />
      <path d="m22 42 20-20M22 22l20 20" stroke="#64748B" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function getFileTypeBadgeMeta(item) {
  const type = getDisplayFileType(item);

  if (["DOC", "DOCX"].includes(type)) {
    return {
      title: "Word file",
      icon: <IconFileWord />,
    };
  }

  if (["XLS", "XLSX", "CSV"].includes(type)) {
    return {
      title: "Excel file",
      icon: <IconFileExcel />,
    };
  }

  if (["PPT", "PPTX"].includes(type)) {
    return {
      title: "PowerPoint file",
      icon: <IconFilePowerPoint />,
    };
  }

  if (type === "PDF") {
    return {
      title: "PDF file",
      icon: <IconFilePdf />,
    };
  }

  if (["PNG", "JPG", "JPEG", "WEBP", "GIF"].includes(type)) {
    return {
      title: "Image file",
      icon: <IconFileImage />,
    };
  }

  if (type === "TXT") {
    return {
      title: "Text file",
      icon: <IconFileTextType />,
    };
  }

  if (type === "NO FILE") {
    return {
      title: "No file attached",
      icon: <IconNoFile />,
    };
  }

  return {
    title: `${type || "File"} file`,
    icon: <IconFileGeneric />,
  };
}

function FileTypeBadge({ item }) {
  const meta = getFileTypeBadgeMeta(item);

  return (
    <span
      title={meta.title}
      aria-label={meta.title}
      style={{
        width: 46,
        height: 46,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      {meta.icon}
    </span>
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
  originalFileType: "",
};

function getDownloadFileName(item) {
  if (!item) return "tai-lieu";
  if (!hasAttachedFile(item)) return "khong-co-file";
  const rawName = item.title || item.name || "tai-lieu";
  if (rawName.includes(".")) return rawName;
  const extension = (item.fileType || inferFileType(item.fileUrl) || "file").toLowerCase();
  return `${rawName}.${extension}`;
}

function stripFileExtension(value) {
  return String(value || "").replace(/\.[^/.]+$/, "").trim();
}

function getPreviewSubtitle(previewState) {
  const title = previewState.item?.title || "";
  const fileName = previewState.fileName || "";

  if (!title) return "";
  if (title === fileName) return "";

  const normalizedTitle = stripFileExtension(title).toLowerCase();
  const normalizedFileName = stripFileExtension(fileName).toLowerCase();

  if (normalizedTitle && normalizedFileName && normalizedTitle === normalizedFileName) {
    return "";
  }

  return title;
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
  if (normalizedMime.includes("pdf") || fileType === "PDF") return "pdf";

  if (
    ["DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX"].includes(fileType) ||
    normalizedMime.includes("word") ||
    normalizedMime.includes("excel") ||
    normalizedMime.includes("spreadsheet") ||
    normalizedMime.includes("presentation") ||
    normalizedMime.includes("powerpoint")
  ) {
    return "office";
  }

  if (normalizedMime.includes("text/csv") || fileType === "CSV") return "spreadsheet";
  if (normalizedMime.startsWith("text/") || fileType === "TXT") return "text";
  if (["PNG", "JPG", "JPEG", "WEBP", "GIF"].includes(fileType)) return "image";

  return "other";
}

function isOfficeFileForPreview(item) {
  const fileType = String(item?.fileType || inferFileType(item?.fileUrl) || "").toUpperCase();

  return ["DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX"].includes(fileType);
}

async function fetchPreviewBlob(fileUrl, accept = "*/*") {
  const token = localStorage.getItem("token");
  const headers = { Accept: accept };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(fileUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch preview file: ${response.status}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || response.headers.get("content-type") || "";
  return { blob, mimeType };
}

async function buildOfficePreviewAsPdf(item) {
  const previewUrl = item?.previewUrl || "";
  const previewFileType = inferFileType(previewUrl);

  if (previewUrl && previewFileType === "PDF") {
    const { blob } = await fetchPreviewBlob(previewUrl, "application/pdf");
    return {
      previewKind: "pdf",
      blobUrl: URL.createObjectURL(blob),
      docHtml: "",
      workbookSheets: [],
      activeSheetName: "",
      textContent: "",
    };
  }

  const token = localStorage.getItem("token");
  const headers = { Accept: "application/pdf" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    `${API_BASE_URL}/api/files/preview-pdf?fileUrl=${encodeURIComponent(item?.fileUrl || "")}`,
    { headers },
  );

  if (!response.ok) {
    let backendMessage = "";

    try {
      const errorData = await response.json();
      backendMessage = errorData?.message || "";
    } catch (error) {
      try {
        backendMessage = await response.text();
      } catch (ignored) {
        backendMessage = "";
      }
    }

    throw new Error(
      backendMessage || `Failed to convert Office file to PDF: ${response.status}`,
    );
  }

  const pdfBlob = await response.blob();
  return {
    previewKind: "pdf",
    blobUrl: URL.createObjectURL(pdfBlob),
    docHtml: "",
    workbookSheets: [],
    activeSheetName: "",
    textContent: "",
  };
}

async function buildPreviewData(item, blob, mimeType = "") {
  const previewKind = getPreviewKind(item, mimeType);
  const originalFileType = String(item?.fileType || inferFileType(item?.fileUrl) || "").toUpperCase();

  if (previewKind === "image" || previewKind === "pdf") {
    return {
      previewKind,
      blobUrl: URL.createObjectURL(blob),
      docHtml: "",
      workbookSheets: [],
      activeSheetName: "",
      textContent: "",
      originalFileType,
    };
  }

  if (previewKind === "office") {
    try {
      return {
        ...(await buildOfficePreviewAsPdf(item)),
        originalFileType,
      };
    } catch (error) {
      console.warn("Office PDF preview conversion failed:", error);
    }

    if (originalFileType === "DOCX") {
      try {
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
          previewKind: "docx",
          blobUrl: "",
          docHtml: `
            <div class="portal-docx-preview__content">${result.value || "<p>Không có nội dung để hiển thị.</p>"}</div>
            ${messages ? `<div class="portal-docx-preview__notes"><strong>Lưu ý định dạng</strong><ul>${messages}</ul></div>` : ""}
          `,
          workbookSheets: [],
          activeSheetName: "",
          textContent: "",
          originalFileType,
        };
      } catch (error) {
        console.warn("DOCX HTML fallback failed:", error);
      }
    }

    if (["XLS", "XLSX"].includes(originalFileType)) {
      try {
        return {
          ...(await buildSpreadsheetFallback(blob)),
          originalFileType,
        };
      } catch (error) {
        console.warn("Spreadsheet fallback failed:", error);
      }
    }

    return {
      previewKind: "office-fallback",
      blobUrl: "",
      docHtml: "",
      workbookSheets: [],
      activeSheetName: "",
      textContent: "",
      originalFileType,
    };
  }

  if (previewKind === "spreadsheet") {
    return {
      ...(await buildSpreadsheetFallback(blob)),
      originalFileType,
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
      originalFileType,
    };
  }

  return {
    previewKind: "other",
    blobUrl: "",
    docHtml: "",
    workbookSheets: [],
    activeSheetName: "",
    textContent: "",
    originalFileType,
  };
}

async function buildSpreadsheetFallback(blob) {
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

    const visibleRows = rows.slice(0, 120);
    const maxColumnCount = Math.min(
      20,
      Math.max(...visibleRows.map((row) => (Array.isArray(row) ? row.length : 0)), 1),
    );

    const normalizedRows = visibleRows.map((row) =>
      Array.from({ length: maxColumnCount }, (_, idx) => row[idx] ?? ""),
    );

    return {
      name: sheetName,
      rows: normalizedRows,
    };
  });

  return {
    previewKind: "spreadsheet",
    blobUrl: "",
    docHtml: "",
    workbookSheets,
    activeSheetName: workbookSheets[0]?.name || "",
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
  if (!hasAttachedFile(item)) {
    return (
      <div className={`portal-file-actions ${compact ? "is-compact" : ""}`}>
        <button
          type="button"
          className="portal-btn portal-btn--ghost"
          disabled
          title="Mục này chưa có file đính kèm"
        >
          Không có file
        </button>
      </div>
    );
  }

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

function DocumentTypeSection({
  type,
  isOpen,
  forms,
  loading,
  error,
  onToggle,
  onPreview,
  onDownload,
}) {
  const loaded = Array.isArray(forms);
  const countText = loaded
    ? `${forms.length} ducument`
    : "Bấm mũi tên để tải";

  return (
    <div className="portal-dept-card portal-document-type-card">
      <div className="portal-dept-card__head portal-document-type-card__head">
        <div className="portal-dept-card__title">
          <span className="portal-dept-card__icon">
            <IconFileText />
          </span>
          <div>
            <strong>{type.name || "Ducument"}</strong>
            <span>{countText}</span>
          </div>
        </div>

        <button
          type="button"
          className={`portal-document-type-card__toggle ${isOpen ? "is-open" : ""}`}
          onClick={() => onToggle(type)}
          title={isOpen ? "Thu gọn" : "Mở danh sách ducument"}
        >
          {isOpen ? <IconChevronUp /> : <IconChevronDown />}
        </button>
      </div>

      {isOpen ? (
        <div className="portal-document-type-card__body">
          {loading ? <div className="portal-empty">Đang tải {type.name}...</div> : null}
          {error ? <div className="portal-empty">{error}</div> : null}

          {!loading && !error && forms.length === 0 ? (
            <div className="portal-empty">Chưa có ducument thuộc loại {type.name}.</div>
          ) : null}

          {!loading && !error && forms.length > 0 ? (
            <div className="portal-form-rows">
              {forms.map((form) => (
                <div key={form.id} className="portal-form-row">
                  <div className="portal-form-row__content">
                    <strong>{form.title}</strong>
                    <div className="portal-meta-row">
                      {form.departmentName ? <span className="portal-meta-pill">{form.departmentName}</span> : null}
                      {form.division ? <span className="portal-meta-pill">{form.division}</span> : null}
                      <FileTypeBadge item={form} />
                      {form.createdAt ? (
                        <span className="portal-meta-pill">{formatDateTime(form.createdAt)}</span>
                      ) : null}
                    </div>
                  </div>

                  <FileActions item={form} onPreview={onPreview} onDownload={onDownload} compact />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PreviewModal({ previewState, onClose, onDownload, onSelectSheet }) {
  if (!previewState.open) return null;

  const activeSheet = previewState.workbookSheets.find(
    (sheet) => sheet.name === previewState.activeSheetName,
  ) || previewState.workbookSheets[0] || null;
  const previewTitle = previewState.fileName || previewState.item?.title || previewState.item?.name || "Preview";
  const previewSubtitle = getPreviewSubtitle(previewState);

  return (
    <div className="portal-modal-backdrop" onClick={onClose}>
      <div className="portal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="portal-modal-head">
          <div>
            <div className="portal-modal-kicker">{getPreviewDisplayType(previewState)}</div>
            <h3>{previewTitle}</h3>
            {previewSubtitle ? <p>{previewSubtitle}</p> : null}
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
          ) : previewState.previewKind === "office-fallback" ? (
            <div className="portal-empty">
              <p>
                Không thể hiển thị đúng định dạng file <strong>{previewState.originalFileType || "Office"}</strong> ở trình duyệt.
              </p>
              <p>
                Hãy cấu hình backend API <strong>/api/files/preview-pdf</strong> để convert DOC/DOCX/XLS/XLSX/PPT/PPTX sang PDF,
                hoặc tải file xuống để mở bằng ứng dụng phù hợp.
              </p>
              {previewState.item ? (
                <div className="portal-file-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="portal-btn portal-btn--dark" onClick={() => onDownload(previewState.item)}>
                    Tải file
                  </button>
                </div>
              ) : null}
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
  const [documentTypes, setDocumentTypes] = useState([]);
  const [defaultDocumentTypeId, setDefaultDocumentTypeId] = useState("");
  const [openDocumentTypeIds, setOpenDocumentTypeIds] = useState([]);
  const [formsByTypeId, setFormsByTypeId] = useState({});
  const [loadingFormsByTypeId, setLoadingFormsByTypeId] = useState({});
  const [errorFormsByTypeId, setErrorFormsByTypeId] = useState({});
  const [notices, setNotices] = useState([]);
  const [featuredPinnedNotice, setFeaturedPinnedNotice] = useState(null);

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

  const normalizeFormItem = (item, type) => {
    const fileUrl = item.fileUrl ? toAbsoluteUrl(item.fileUrl) : "";

    return {
      id: item.id,
      typeId: item.typeId || type?.id || "",
      typeName: type?.name || item.typeName || "Ducument",
      title: item.title || "Biểu mẫu",
      fileType: fileUrl ? (item.fileType || inferFileType(item.fileUrl)) : "NO FILE",
      fileUrl,
      previewUrl: item.previewUrl ? toAbsoluteUrl(item.previewUrl) : null,
      departmentName: item.departmentName || "Chưa xác định",
      division: item.division || "",
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
    };
  };

  const fetchFormsByType = async (type, { title = "", force = false } = {}) => {
    if (!type?.id) return;

    if (!force && formsByTypeId[type.id]) {
      return;
    }

    setLoadingFormsByTypeId((prev) => ({ ...prev, [type.id]: true }));
    setErrorFormsByTypeId((prev) => ({ ...prev, [type.id]: null }));

    try {
      const params = new URLSearchParams({
        userId: "",
        departmentName: "",
        title,
        description: "",
        typeId: type.id,
        page: "0",
        size: "80",
      });

      const response = await fetch(`${FORMS_API_BASE}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch forms by type");

      const data = await response.json();
      const normalizedForms = (data.content || []).map((item) => normalizeFormItem(item, type));

      setFormsByTypeId((prev) => ({ ...prev, [type.id]: normalizedForms }));
    } catch (error) {
      setErrorFormsByTypeId((prev) => ({
        ...prev,
        [type.id]: `Không tải được ducument loại ${type.name}.`,
      }));
      setFormsByTypeId((prev) => ({ ...prev, [type.id]: [] }));
    } finally {
      setLoadingFormsByTypeId((prev) => ({ ...prev, [type.id]: false }));
    }
  };

  const fetchDocumentTypes = async () => {
    setLoadingForms(true);
    setErrorForms(null);

    try {
      const response = await fetch(DOCUMENT_TYPES_API_BASE, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch document types");

      const data = await response.json();
      const normalizedTypes = sortDocumentTypes(
        (Array.isArray(data) ? data : [])
          .filter((item) => item?.id)
          .map((item) => ({
            id: item.id,
            name: item.name || "Ducument",
            createdAt: item.createdAt || null,
            updatedAt: item.updatedAt || null,
          })),
      );

      setDocumentTypes(normalizedTypes);

      const defaultType = normalizedTypes.find(isFormDocumentType) || normalizedTypes[0] || null;

      if (defaultType) {
        setDefaultDocumentTypeId(defaultType.id);
        setOpenDocumentTypeIds([defaultType.id]);
        await fetchFormsByType(defaultType, { title: formTitleSearch.trim(), force: true });
      }
    } catch (error) {
      setErrorForms("Không tải được loại ducument.");
      setDocumentTypes([]);
      setDefaultDocumentTypeId("");
      setOpenDocumentTypeIds([]);
    } finally {
      setLoadingForms(false);
    }
  };

  const normalizeNoticeItem = (item) => {
    if (!item) return null;

    const fileUrl = item.fileUrl ? toAbsoluteUrl(item.fileUrl) : "";
    const fileType = fileUrl ? (item.fileType || inferFileType(item.fileUrl)) : "NO FILE";

    return {
      id: item.id,
      title: item.title || "Thông báo",
      content: item.content || "",
      pinned: !!item.pinned,
      fileUrl,
      previewUrl: fileUrl && isEmbeddableFile(fileType, fileUrl) ? fileUrl : (item.previewUrl ? toAbsoluteUrl(item.previewUrl) : null),
      fileType,
      departmentName: item.departmentName || "",
      division: item.division || "",
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
    };
  };


  const fetchNotices = async () => {
    setLoadingNotices(true);
    setErrorNotices(null);

    try {
      const params = new URLSearchParams({
        userId: "",
        skipDepartmentFilter: "true",
        includeFeaturedPinned: "true",
        title: "",
        content: "",
        page: "0",
        size: "30",
      });

      const response = await fetch(`${NOTICES_API_BASE}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch notices");
      const data = await response.json();

      const normalizedFeaturedPinnedNotice = normalizeNoticeItem(data.featuredPinnedNotice);
      const normalizedNotices = (data.content || [])
        .map(normalizeNoticeItem)
        .filter(Boolean);

      setFeaturedPinnedNotice(normalizedFeaturedPinnedNotice);
      setNotices(normalizedNotices);
    } catch (error) {
      setErrorNotices("Không tải được thông báo.");
      setFeaturedPinnedNotice(null);
      setNotices([]);
    } finally {
      setLoadingNotices(false);
    }
  };

  useEffect(() => {
    fetchApps("");
    fetchDepartments();
    fetchDocumentTypes();
    fetchNotices();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchApps(appNameSearch.trim());
    }, 260);

    return () => clearTimeout(timeout);
  }, [appNameSearch]);

  useEffect(() => {
    if (documentTypes.length === 0) return undefined;

    const timeout = setTimeout(() => {
      const title = formTitleSearch.trim();
      const openTypes = documentTypes.filter((type) => openDocumentTypeIds.includes(type.id));

      openTypes.forEach((type) => {
        fetchFormsByType(type, { title, force: true });
      });
    }, 260);

    return () => clearTimeout(timeout);
  }, [formTitleSearch, documentTypes, openDocumentTypeIds]);

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
    if (!hasAttachedFile(item)) {
      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        error: "Mục này chưa có file đính kèm.",
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
      const originalFileType = String(item?.fileType || inferFileType(item?.fileUrl) || "").toUpperCase();

      // Optimization:
      // Office files should go directly to backend PDF preview.
      // Do not download the original DOC/XLS/PPT to the browser first.
      // This avoids double network work: browser download + backend convert.
      if (isOfficeFileForPreview(item)) {
        try {
          const previewData = await buildOfficePreviewAsPdf(item);

          setPreviewState({
            open: true,
            loading: false,
            error: "",
            item,
            mimeType: "application/pdf",
            fileName: getDownloadFileName(item),
            originalFileType,
            ...previewData,
          });
          return;
        } catch (officeError) {
          console.warn("Office PDF preview conversion failed:", officeError);
          // Fall through to old browser-side fallback for DOCX/XLSX where possible.
        }
      }

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
    if (!hasAttachedFile(item)) {
      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        error: "Mục này chưa có file đính kèm để tải xuống.",
        item,
        fileName: getDownloadFileName(item),
      });
      return;
    }

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

  const documentTypeSections = useMemo(() => {
    return documentTypes.map((type) => ({
      type,
      isOpen: openDocumentTypeIds.includes(type.id),
      forms: formsByTypeId[type.id] || [],
      loaded: Boolean(formsByTypeId[type.id]),
      loading: Boolean(loadingFormsByTypeId[type.id]),
      error: errorFormsByTypeId[type.id] || null,
    }));
  }, [documentTypes, openDocumentTypeIds, formsByTypeId, loadingFormsByTypeId, errorFormsByTypeId]);

  const handleToggleDocumentType = (type) => {
    if (!type?.id) return;

    const alreadyOpen = openDocumentTypeIds.includes(type.id);
    const willOpen = !alreadyOpen;

    // Cho phép mọi type, kể cả type ưu tiên "Form", được bấm mở/thu gọn.
    // Form vẫn tự mở lần đầu khi load web trong fetchDocumentTypes().
    setOpenDocumentTypeIds((prev) => (
      alreadyOpen
        ? prev.filter((id) => id !== type.id)
        : [...prev, type.id]
    ));

    if (willOpen && !formsByTypeId[type.id]) {
      fetchFormsByType(type, { title: formTitleSearch.trim(), force: false });
    }
  };

  const featuredNotice = useMemo(
    () => featuredPinnedNotice || notices[0] || null,
    [featuredPinnedNotice, notices],
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
    () => (featuredPinnedNotice?.pinned ? 1 : 0) + notices.filter((item) => item.pinned).length,
    [featuredPinnedNotice, notices],
  );

  const heroPinnedNotice = featuredNotice;

  const heroPinnedNoticeTime = useMemo(() => {
    if (!heroPinnedNotice) return "Chưa có dữ liệu";

    return formatDateTime(heroPinnedNotice.updatedAt || heroPinnedNotice.createdAt) || "Chưa có dữ liệu";
  }, [heroPinnedNotice]);

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
                <strong>BROADPEAK SOC TRANG</strong>
                <small>HOME PAGE</small>
              </span>
            </a>

            <nav className="portal-nav">
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
                label="Ducument"
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
                label="Ducument"
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
                  <div className="portal-tag">HOME PAGE</div>
                  <h1>Cổng thông tin nội bộ cho thông báo, ducument và link.</h1>

                  <div className="portal-hero__intro">
                    <p>
                      Website tổng hợp thông báo quan trọng, ducument nội bộ và link làm việc từ các bộ phận,
                      giúp user tra cứu nhanh và tiết kiệm thời gian.
                    </p>
                  </div>

                  <div className="portal-hero__chips">
                    <span className="portal-chip">Thông báo ghim</span>
                    <span className="portal-chip">Ducument nội bộ</span>
                    <span className="portal-chip">Link làm việc</span>
                    <span className="portal-chip">Tra cứu nhanh</span>
                  </div>

                  <div className="portal-hero-latest-notice">
                    <div className="portal-hero-latest-notice__badge">
                      <span className="portal-hero-latest-notice__badge-icon">
                        <IconPin />
                      </span>
                      <span>Thông báo ghim</span>
                    </div>

                    {heroPinnedNotice ? (
                      <>
                        <h3>{heroPinnedNotice.title}</h3>
                        <p>{heroPinnedNotice.content || "Thông báo này chưa có nội dung mô tả."}</p>
                        <div className="portal-meta-row portal-hero-latest-notice__meta">
                          <FileTypeBadge item={heroPinnedNotice} />
                          {getDepartmentDisplayName(heroPinnedNotice) ? (
                            <span className="portal-meta-pill">{getDepartmentDisplayName(heroPinnedNotice)}</span>
                          ) : null}
                          <span className="portal-meta-pill">
                            <IconClock />
                            {heroPinnedNoticeTime}
                          </span>
                          <FileActions item={heroPinnedNotice} onPreview={handleOpenPreview} onDownload={handleDownloadFile} compact />
                        </div>
                      </>
                    ) : (
                      <p>Chưa có thông báo ghim để hiển thị tại đây.</p>
                    )}
                  </div>
                </div>

                <div className="portal-hero__card portal-hero__card--company">
                  <div className="portal-hero__logo-box">
                    <img src={companyLogo} alt="YOUNGONE" className="portal-hero__logo" />
                    <div className="portal-hero__logo-copy">
                      <strong>BROADPEAK SOC TRANG</strong>
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
                      title="Ducument"
                      icon={<IconFileText />}
                      count={documentTypes.length}
                    />

                    <SearchInput
                      value={formTitleSearch}
                      onChange={setFormTitleSearch}
                      placeholder="Tìm ducument hoặc tài liệu..."
                    />

                    <div className="portal-panel__scroll">
                      {loadingForms && documentTypes.length === 0 ? <div className="portal-empty">Đang tải loại ducument...</div> : null}
                      {errorForms ? <div className="portal-empty">{errorForms}</div> : null}

                      {!loadingForms && !errorForms && documentTypeSections.length === 0 ? (
                        <div className="portal-empty">Chưa có loại ducument.</div>
                      ) : null}

                      {!errorForms && documentTypeSections.length > 0 ? (
                        <div className="portal-dept-stack portal-document-type-stack">
                          {documentTypeSections.map((section) => (
                            <DocumentTypeSection
                              key={section.type.id}
                              type={section.type}
                              isOpen={section.isOpen}
                              forms={section.forms}
                              loading={section.loading}
                              error={section.error}
                              onToggle={handleToggleDocumentType}
                              onPreview={handleOpenPreview}
                              onDownload={handleDownloadFile}
                            />
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
                            <FileTypeBadge item={featuredNotice} />
                            {getDepartmentDisplayName(featuredNotice) ? (
                              <span className="portal-meta-pill">{getDepartmentDisplayName(featuredNotice)}</span>
                            ) : null}
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
                                  <FileTypeBadge item={notice} />
                                  {getDepartmentDisplayName(notice) ? (
                                    <span className="portal-meta-pill">{getDepartmentDisplayName(notice)}</span>
                                  ) : null}
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
              Developed by IT BSL
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
