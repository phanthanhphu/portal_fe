import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import companyLogo from "../../assets/images/background/youngone-logo.png";

import backgroundA from "../../assets/images/background/background1.JPG";
import backgroundB from "../../assets/images/background/background2.JPG";
import backgroundC from "../../assets/images/background/background3.JPG";
import coreValuesImage from "../../assets/images/background/Core_Values_ENG.jpg";

import "./PageHome.css";
import { LinksHoverMenu, DocumentHoverMenu, NoticeHoverMenu } from "./HeaderHoverMenus";

import { API_BASE_URL } from '../../config';

const API_ORIGIN = API_BASE_URL.replace(/\/$/, '');

const APPS_API_BASE = `${API_ORIGIN}/api/app-links`;
const FORMS_API_BASE = `${API_ORIGIN}/api/forms`;
const DOCUMENT_TYPES_API_BASE = `${API_ORIGIN}/api/document-types`;
const NOTICES_API_BASE = `${API_ORIGIN}/api/notices`;
const DEPARTMENTS_API_BASE = `${API_ORIGIN}/api/departments`;

const FORMS_PAGE_PATH = "/forms";
const NOTICES_PAGE_PATH = "/notices";
const MENU_MAX_VISIBLE_ITEMS = 4;

function toAbsoluteUrl(path) {
  if (!path) return "";

  const raw = String(path).trim();
  const origin = API_ORIGIN; // https://homepage.youngone.com.vn:8081

  try {
    const parsed = new URL(raw, origin);

    const isLocalFile =
      parsed.pathname.startsWith("/uploads") ||
      parsed.pathname.startsWith("/files") ||
      parsed.pathname.startsWith("/api") ||
      parsed.pathname.startsWith("/ws");

    if (isLocalFile) {
      return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return raw;
  } catch {
    if (raw.startsWith("/")) return `${origin}${raw}`;
    return `${origin}/${raw}`;
  }
}

function normalizeExternalUrl(value) {
  const rawUrl = String(value || "").trim();

  if (!rawUrl) return "#";
  if (/^(https?:\/\/|mailto:|tel:|sms:)/i.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith("//")) return `${window.location.protocol}${rawUrl}`;
  if (rawUrl.startsWith("/") || rawUrl.startsWith("#")) return rawUrl;

  // Browser address bar auto-fixes values like "10.232.132.47:8081" or "intranet.local".
  // React <a href> does not, so the portal accidentally routes them through the current app.
  const looksLikeHost =
    /^(\d{1,3}\.){3}\d{1,3}(:\d+)?([/?#].*)?$/i.test(rawUrl) ||
    /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(rawUrl) ||
    /^[a-z0-9-]+:\d+([/?#].*)?$/i.test(rawUrl);

  return looksLikeHost ? `http://${rawUrl}` : rawUrl;
}

function openExternalUrl(event, value) {
  const targetUrl = normalizeExternalUrl(value);

  if (!targetUrl || targetUrl === "#") {
    event?.preventDefault();
    return;
  }

  // Open immediately from the click event, with noopener, to avoid slow portal-side navigation.
  event?.preventDefault();
  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

function getPreviewFileUrlParam(fileUrl) {
  const rawUrl = String(fileUrl || "").trim();
  if (!rawUrl) return "";

  try {
    const apiBase = new URL(API_ORIGIN, window.location.origin);
    const parsedUrl = new URL(rawUrl, apiBase.origin);

    // The backend preview endpoint should receive the internal file path, not a full URL.
    // Passing http://host/files/... can be rejected by the backend as an external URL.
    if (parsedUrl.origin === apiBase.origin) {
      return `${parsedUrl.pathname}${parsedUrl.search}`;
    }
  } catch (error) {
    // Keep the original value below when URL parsing is not available.
  }

  return rawUrl;
}


function normalizeFileUrl(value) {
  return String(value || "").trim();
}

function getFileNameFromUrl(fileUrl) {
  if (!fileUrl) return "file";

  try {
    const cleanUrl = String(fileUrl).split("?")[0].split("#")[0];
    const rawName = cleanUrl.substring(cleanUrl.lastIndexOf("/") + 1);
    return decodeURIComponent(rawName) || "file";
  } catch {
    return String(fileUrl).split("/").pop() || "file";
  }
}

function addUniqueFileUrl(urls, value) {
  const cleanUrl = normalizeFileUrl(value);
  const absoluteUrl = cleanUrl ? toAbsoluteUrl(cleanUrl) : "";

  if (absoluteUrl && !urls.includes(absoluteUrl)) {
    urls.push(absoluteUrl);
  }
}

function collectUrlValues(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleanValue = value.trim();

    if (!cleanValue) return [];

    // Support backend accidentally sending JSON string: "[\"/files/a\",\"/files/b\"]"
    if (cleanValue.startsWith("[") && cleanValue.endsWith("]")) {
      try {
        const parsed = JSON.parse(cleanValue);
        return Array.isArray(parsed) ? parsed : [cleanValue];
      } catch {
        return [cleanValue];
      }
    }

    // Support backend accidentally sending comma/newline separated URLs
    if (cleanValue.includes(",") || cleanValue.includes("\n")) {
      return cleanValue
        .split(/[,\\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [cleanValue];
  }

  return [];
}

function getItemFileUrls(item) {
  const urls = [];

  /*
   * Form API in some responses can use different field shapes.
   * Priority:
   * 1. fileUrls array
   * 2. filesUrls / fileUrlList fallback if backend naming differs
   * 3. previewUrls fallback because Form previewUrls usually mirrors fileUrls
   * 4. old single fileUrl
   */
  [
    item?.fileUrls,
    item?.filesUrls,
    item?.fileUrlList,
    item?.previewUrls,
  ].forEach((value) => {
    collectUrlValues(value).forEach((url) => addUniqueFileUrl(urls, url));
  });

  if (urls.length === 0) {
    addUniqueFileUrl(urls, item?.fileUrl);
  }

  return urls;
}

function getItemPreviewUrls(item) {
  const urls = [];

  [
    item?.previewUrls,
    item?.fileUrls,
    item?.filesUrls,
    item?.fileUrlList,
  ].forEach((value) => {
    collectUrlValues(value).forEach((url) => addUniqueFileUrl(urls, url));
  });

  if (urls.length === 0) {
    addUniqueFileUrl(urls, item?.previewUrl);
  }

  if (urls.length === 0) {
    addUniqueFileUrl(urls, item?.fileUrl);
  }

  return urls;
}

function getFileScopedItem(item, fileUrl, index = 0) {
  const previewUrls = getItemPreviewUrls(item);
  const previewUrl = previewUrls[index] || fileUrl;
  const fileType = inferFileType(fileUrl);

  return {
    ...item,
    fileUrl,
    previewUrl,
    fileType,

    // Item created from the More popup must represent only this selected file.
    // This keeps popup download as "download one file", while the main item download can download all files.
    fileUrls: [fileUrl],
    previewUrls: [previewUrl],
    __fileScopedItem: true,
  };
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
  return getItemFileUrls(item).length > 0;
}

function getDisplayFileType(item) {
  if (!hasAttachedFile(item)) return "NO FILE";

  const firstFileUrl = getItemFileUrls(item)[0] || item?.fileUrl;

  return String(item?.fileType || inferFileType(firstFileUrl) || "FILE").toUpperCase();
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

  if (previewState.previewKind === "pdf") {
    return `${type || "File"} PDF preview`;
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

function normalizeDepartmentIds(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeTypeDepartments(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();

  return value
    .map((item) => {
      const id = String(item?.idDepartment || item?.departmentId || item?.id || "").trim();
      const departmentName = String(item?.name || item?.departmentName || "Unspecified").trim();
      const division = String(item?.division || "").trim();

      if (!id) return null;
      if (seen.has(id)) return null;
      seen.add(id);

      return {
        id,
        idDepartment: id,
        departmentName: departmentName || "Unspecified",
        name: departmentName || "Unspecified",
        division,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.departmentName || "").localeCompare(String(b.departmentName || ""), "vi"));
}

function departmentHasNoticeIds(department) {
  return Array.isArray(department?.noticeIds) && department.noticeIds.length > 0;
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

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}


function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
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

function getDownloadFileNameByUrl(item, fileUrl, index = 0) {
  const urlFileName = getFileNameFromUrl(fileUrl);

  if (urlFileName && urlFileName !== "file") {
    return urlFileName;
  }

  const rawName = item?.title || item?.name || "tai-lieu";
  const extension = String(inferFileType(fileUrl) || "file").toLowerCase();

  return `${rawName}-${index + 1}.${extension}`;
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

function shouldUsePdfPreview(item) {
  return Boolean(item?.fileUrl || getItemFileUrls(item)[0]);
}

function isPreviewPublicUrl(url = "") {
  const value = String(url || "");

  return value.includes("/api/files/preview-pdf")
    || value.includes("/files/")
    || value.includes("/uploads/");
}

async function fetchPreviewBlob(fileUrl, accept = "*/*") {
  const token = localStorage.getItem("token");
  const headers = {
    Accept: accept || "*/*",
  };

  // Không gắn Authorization cho file public/preview.
  // Tránh trường hợp token cũ/hết hạn làm riêng API preview bị 403.
  if (token && !isPreviewPublicUrl(fileUrl)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(fileUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch preview file: ${response.status}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || response.headers.get("content-type") || "";
  return { blob, mimeType };
}

async function buildFilePreviewAsPdf(item) {
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

  const backendFileUrl = getPreviewFileUrlParam(item?.fileUrl || "");

  if (!backendFileUrl) {
    throw new Error("Missing file URL for PDF preview.");
  }

  const previewPdfUrl = `${API_ORIGIN}/api/files/preview-pdf?fileUrl=${encodeURIComponent(backendFileUrl)}`;

  const response = await fetch(
    previewPdfUrl,
    {
      method: "GET",
      headers: {
        // Vẫn ưu tiên nhận PDF, nhưng cho phép backend trả JSON/text khi có lỗi.
        Accept: "application/pdf, application/json, text/plain, */*",
      },
    },
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
      backendMessage || `Failed to convert file to PDF: ${response.status}`,
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

  // Main rule: preview should be PDF for every attached file type.
  // If backend cannot convert a specific type, the old viewer below remains as a fallback.
  try {
    return {
      ...(await buildFilePreviewAsPdf(item)),
      originalFileType,
    };
  } catch (error) {
    console.warn("PDF preview conversion failed, falling back to legacy preview:", error);
  }

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
        ...(await buildFilePreviewAsPdf(item)),
        originalFileType,
      };
    } catch (error) {
      console.warn("PDF preview conversion failed:", error);
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
            <div class="portal-docx-preview__content">${result.value || "<p>No content available to display.</p>"}</div>
            ${messages ? `<div class="portal-docx-preview__notes"><strong>Formatting notes</strong><ul>${messages}</ul></div>` : ""}
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

function FileActions({ item, onPreview, onDownload, compact = false, previewOpen = false, onMoreFilesOpenChange }) {
  const [showMoreFiles, setShowMoreFiles] = useState(false);
  const fileUrls = getItemFileUrls(item);
  const firstFileUrl = fileUrls[0] || "";

  useEffect(() => {
    onMoreFilesOpenChange?.(showMoreFiles);

    return () => {
      onMoreFilesOpenChange?.(false);
    };
  }, [showMoreFiles, onMoreFilesOpenChange]);

  const moreFileUrls = fileUrls.slice(1);
  const firstFileItem = firstFileUrl ? getFileScopedItem(item, firstFileUrl, 0) : item;

  if (!firstFileUrl) {
    return (
      <div className={`portal-file-actions ${compact ? "is-compact" : ""}`}>
        <button
          type="button"
          className="portal-btn portal-btn--ghost"
          disabled
          title="This item has no attached file"
        >
          No file
        </button>
      </div>
    );
  }

  return (
    <div className={`portal-file-actions ${compact ? "is-compact" : ""} ${showMoreFiles ? "is-showing-more-files" : ""}`}>
      <button
        type="button"
        className="portal-btn portal-btn--ghost portal-btn--view"
        onClick={() => onPreview(firstFileItem)}
        title={`View ${getFileNameFromUrl(firstFileUrl)}`}
        aria-label={`View ${getFileNameFromUrl(firstFileUrl)}`}
      >
        <span className="portal-btn__icon" aria-hidden="true">
          <IconEye />
        </span>
      </button>

      <button
        type="button"
        className="portal-btn portal-btn--ghost portal-btn--download-icon"
        onClick={() => onDownload(item)}
        title={
          fileUrls.length > 1
            ? `Download all ${fileUrls.length} files`
            : `Download ${getFileNameFromUrl(firstFileUrl)}`
        }
        aria-label={
          fileUrls.length > 1
            ? `Download all ${fileUrls.length} files`
            : `Download ${getFileNameFromUrl(firstFileUrl)}`
        }
      >
        <span className="portal-btn__icon" aria-hidden="true">
          <IconDownload />
        </span>
      </button>

      {moreFileUrls.length > 0 ? (
        <button
          type="button"
          className="portal-btn portal-btn--ghost portal-btn--more-files"
          onClick={() => setShowMoreFiles((prev) => !prev)}
          title={showMoreFiles ? "Hide file list" : `View ${moreFileUrls.length} more files`}
        >
          {showMoreFiles ? "Hide" : `+${moreFileUrls.length} more`}
        </button>
      ) : null}

      {showMoreFiles && typeof document !== "undefined"
        ? createPortal(
            <div
              className={`portal-more-file-popup-backdrop ${previewOpen ? "is-behind-preview" : ""}`}
              role="presentation"
              onClick={() => setShowMoreFiles(false)}
            >
              <div
                className="portal-more-file-popup"
                role="dialog"
                aria-modal="true"
                aria-label="File list"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="portal-more-file-popup__head">
                  <div>
                    <strong>{item?.title || "File list"}</strong>
                    <span>{fileUrls.length} files attached</span>
                  </div>

                  <button
                    type="button"
                    className="portal-more-file-popup__close"
                    onClick={() => setShowMoreFiles(false)}
                    aria-label="Close file list"
                  >
                    ×
                  </button>
                </div>

                <div className="portal-more-file-list portal-more-file-list--popup">
                  {fileUrls.map((fileUrl, index) => {
                    const fileItem = getFileScopedItem(item, fileUrl, index);
                    const fileName = getFileNameFromUrl(fileUrl);
                    const fileType = inferFileType(fileUrl);

                    return (
                      <div className="portal-more-file-item" key={`${fileUrl}-${index}`}>
                        <span className="portal-more-file-name" title={fileName}>
                          <small>{fileType}</small>
                          <strong>{fileName}</strong>
                        </span>

                        <span className="portal-more-file-actions">
                          <button
                            type="button"
                            className="portal-more-file-view-btn"
                            onClick={() => {
                              onPreview(fileItem);
                            }}
                            title={`View ${fileName}`}
                            aria-label={`View ${fileName}`}
                          >
                            <span className="portal-btn__icon" aria-hidden="true">
                              <IconEye />
                            </span>
                          </button>
                          <button
                            type="button"
                            className="portal-more-file-download-icon"
                            onClick={() => onDownload(fileItem)}
                            title={`Download ${fileName}`}
                            aria-label={`Download ${fileName}`}
                          >
                            <span className="portal-btn__icon" aria-hidden="true">
                              <IconDownload />
                            </span>
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
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
  onHoverOpen,
  previewOpen = false,
}) {

  return (
    <div
      className="portal-dept-card portal-document-type-card"
      onMouseEnter={() => onHoverOpen(type)}
    >
      <div className="portal-dept-card__head portal-document-type-card__head">
        <div className="portal-dept-card__title">
          <span className="portal-dept-card__icon">
            <IconFileText />
          </span>
          <div>
            <strong>{type.name || "Document"}</strong>
          </div>
        </div>

        <button
          type="button"
          className={`portal-document-type-card__toggle ${isOpen ? "is-open" : ""}`}
          onClick={() => onToggle(type)}
          title={isOpen ? "Collapse" : "Open document list"}
        >
          {isOpen ? <IconChevronUp /> : <IconChevronDown />}
        </button>
      </div>

      {isOpen ? (
        <div className="portal-document-type-card__body">
          {loading ? <div className="portal-empty">Loading {type.name}...</div> : null}
          {error ? <div className="portal-empty">{error}</div> : null}

          {!loading && !error && forms.length === 0 ? (
            <div className="portal-empty">No documents found for type {type.name}.</div>
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

                  <FileActions item={form} onPreview={onPreview} onDownload={onDownload} compact previewOpen={previewOpen} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


function decodeHtmlText(value) {
  const raw = String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");

  if (typeof document === "undefined") {
    return raw
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = raw;
  return textarea.value.replace(/\s+/g, " ").trim();
}

function sanitizeNoticeHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function isHtmlContent(value) {
  return /<([a-z][\w-]*)(\s|>|\/)/i.test(String(value || ""));
}

function ExpandableText({ text, featured = false, title = "", subtitle = "", onOpenChange }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const value = String(text || "").trim();
  const plainText = useMemo(() => decodeHtmlText(value), [value]);
  const hasRichHtml = isHtmlContent(value);
  const shouldShowMore = plainText.length > 180 || hasRichHtml;

  useEffect(() => {
    onOpenChange?.(moreOpen);
    return () => onOpenChange?.(false);
  }, [moreOpen, onOpenChange]);

  useEffect(() => {
    if (!moreOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moreOpen]);

  if (!plainText) return null;

  const dialogSubtitle = title || subtitle || "Full notice content";

  return (
    <div className={`portal-expandable-text ${featured ? "is-featured" : ""}`.trim()}>
      <p className="portal-expandable-text__preview">{plainText}</p>

      {shouldShowMore ? (
        <button
          type="button"
          className="portal-expandable-text__toggle"
          onClick={() => setMoreOpen(true)}
          aria-label="View full notice content"
        >
          <span>More</span>
          <IconArrowRight />
        </button>
      ) : null}

      {moreOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="portal-notice-more-backdrop"
              role="presentation"
              onClick={() => setMoreOpen(false)}
            >
              <div
                className="portal-notice-more-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Notice content"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="portal-notice-more-modal__head">
                  <div>
                    <strong>Notice Content</strong>
                    <span title={dialogSubtitle}>{dialogSubtitle}</span>
                  </div>

                  <button
                    type="button"
                    className="portal-notice-more-modal__close"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close notice content"
                  >
                    ×
                  </button>
                </div>

                <div className="portal-notice-more-modal__body">
                  <div className="portal-notice-more-modal__paper">
                    {hasRichHtml ? (
                      <div
                        className="portal-notice-rich-content"
                        dangerouslySetInnerHTML={{ __html: sanitizeNoticeHtml(value) }}
                      />
                    ) : (
                      <p className="portal-notice-rich-content">{plainText}</p>
                    )}
                  </div>
                </div>

                <div className="portal-notice-more-modal__actions">
                  <button
                    type="button"
                    className="portal-notice-more-modal__button"
                    onClick={() => setMoreOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function DocumentWorkspaceCascade({
  documentTypes,
  loadingForms,
  errorForms,
  activeType,
  activeForms,
  activeFormsLoading,
  activeFormsError,
  fileSearch,
  onFileSearchChange,
  onHoverType,
  onToggleType,
  onPreview,
  onDownload,
  previewOpen = false,
}) {
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const selectRef = useRef(null);
  const typeCloseTimerRef = useRef(null);
  const typeHoverTimerRef = useRef(null);
  const activeTypeId = activeType?.id || "";


  const clearTypeCloseTimer = () => {
    if (typeCloseTimerRef.current) {
      window.clearTimeout(typeCloseTimerRef.current);
      typeCloseTimerRef.current = null;
    }
  };

  const clearTypeHoverTimer = () => {
    if (typeHoverTimerRef.current) {
      window.clearTimeout(typeHoverTimerRef.current);
      typeHoverTimerRef.current = null;
    }
  };


  const openTypeMenu = () => {
    clearTypeCloseTimer();
    setTypeMenuOpen(true);
  };

  const scheduleCloseTypeMenu = () => {
    clearTypeCloseTimer();
    clearTypeHoverTimer();
    typeCloseTimerRef.current = window.setTimeout(() => {
      setTypeMenuOpen(false);
    }, 220);
  };


  useEffect(() => {
    if (activeTypeId || documentTypes.length === 0) return;
    onHoverType?.(documentTypes[0]);
  }, [activeTypeId, documentTypes, onHoverType]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (selectRef.current && selectRef.current.contains(event.target)) return;
      setTypeMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    return () => {
      clearTypeCloseTimer();
      clearTypeHoverTimer();
    };
  }, []);

  const handleHoverPickType = (type) => {
    if (!type?.id) return;

    clearTypeCloseTimer();
    clearTypeHoverTimer();

    // Debounce hover selection so moving the mouse across Type items does not
    // continuously reload the Document list and make the menu feel unstable.
    if (type.id === activeTypeId) return;

    typeHoverTimerRef.current = window.setTimeout(() => {
      onHoverType?.(type);
      typeHoverTimerRef.current = null;
    }, 140);
  };

  const handleClickPickType = (type) => {
    if (!type?.id) return;
    clearTypeCloseTimer();
    clearTypeHoverTimer();
    onToggleType?.(type);
    setTypeMenuOpen(false);
  };


  const activeTypeName = activeType?.name || documentTypes[0]?.name || "Select type";
  const activeSearchScope = activeTypeName;

  return (
    <div className="portal-document-select-board">
      <div className="portal-document-select-head">
        <div className="portal-document-select-title">
          <span className="portal-panel__title-icon">
            <IconFileText />
          </span>
          <div>
            <h2>Documents</h2>
            <span>{loadingForms ? "Loading..." : `${documentTypes.length} types available`}</span>
          </div>
        </div>

        <div className="portal-document-select-controls">
          <div
            className="portal-document-type-select"
            ref={selectRef}
            onMouseEnter={openTypeMenu}
            onMouseLeave={scheduleCloseTypeMenu}
          >
            <button
              type="button"
              className={`portal-document-type-select__trigger ${typeMenuOpen ? "is-open" : ""}`}
              onClick={() => setTypeMenuOpen((prev) => !prev)}
              onFocus={openTypeMenu}
            >
              <span>
                <small>Type</small>
                <strong>{activeTypeName}</strong>
              </span>
              <i aria-hidden="true">
                <IconChevronDown />
              </i>
            </button>

            {typeMenuOpen ? (
              <div
                className="portal-document-type-select__menu"
                role="listbox"
                onMouseEnter={openTypeMenu}
                onMouseLeave={scheduleCloseTypeMenu}
              >
                {documentTypes.map((type) => {
                  const isActive = activeTypeId === type.id;
                  const departmentCount = Array.isArray(type.departments) ? type.departments.length : 0;

                  return (
                    <button
                      key={type.id}
                      type="button"
                      className={`portal-document-type-option ${isActive ? "is-active" : ""}`}
                      onMouseEnter={() => handleHoverPickType(type)}
                      onFocus={() => handleHoverPickType(type)}
                      onClick={() => handleClickPickType(type)}
                      role="option"
                      aria-selected={isActive}
                    >
                      <span className="portal-document-type-option__icon">
                        <IconFileText />
                      </span>
                      <span className="portal-document-type-option__text">
                        <strong>{type.name || "Document"}</strong>
                        <small>{departmentCount} departments</small>
                      </span>
                      {isActive ? <span className="portal-document-type-option__active">Active</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

        </div>
      </div>

      {errorForms ? <div className="portal-empty">{errorForms}</div> : null}

      {!errorForms && loadingForms && documentTypes.length === 0 ? (
        <div className="portal-empty">Loading document types...</div>
      ) : null}

      {!errorForms && !loadingForms && documentTypes.length === 0 ? (
        <div className="portal-empty">No document types yet.</div>
      ) : null}

      {!errorForms && documentTypes.length > 0 ? (
        <>
          <SearchInput
            value={fileSearch}
            onChange={onFileSearchChange}
            placeholder={`Search documents in ${activeSearchScope}...`}
          />

          <div className="portal-document-list-one-row">
            {activeFormsLoading ? <div className="portal-empty">Loading documents...</div> : null}
            {activeFormsError ? <div className="portal-empty">{activeFormsError}</div> : null}

            {!activeFormsLoading && !activeFormsError && activeForms.length === 0 ? (
              <div className="portal-empty">No documents found for this type.</div>
            ) : null}

            {!activeFormsLoading && !activeFormsError && activeForms.map((form) => (
              <article key={form.id} className="portal-document-list-row">
                <div className="portal-document-list-row__main">
                  <FileTypeBadge item={form} />
                  <div>
                    <strong>{form.title}</strong>
                    <span>
                      {form.typeName || activeTypeName}
                      {form.departmentName ? ` • ${form.departmentName}` : ""}
                    </span>
                  </div>
                </div>

                <FileActions item={form} onPreview={onPreview} onDownload={onDownload} compact previewOpen={previewOpen} />
              </article>
            ))}
          </div>
        </>
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
            <div className="portal-empty">Loading file...</div>
          ) : previewState.error ? (
            <div className="portal-empty">
              <p>{previewState.error}</p>
              {previewState.item ? (
                <div className="portal-file-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="portal-btn portal-btn--dark" onClick={() => onDownload(previewState.item)}>
                    Download file
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
            <div className="portal-docx-preview" dangerouslySetInnerHTML={{ __html: previewState.docHtml || "<p>No content available to display.</p>" }} />
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
                  <div className="portal-empty">This sheet has no data to display.</div>
                )}
              </div>
            </div>
          ) : previewState.previewKind === "text" ? (
            <pre className="portal-text-preview">{previewState.textContent || "No text content available."}</pre>
          ) : previewState.previewKind === "office-fallback" ? (
            <div className="portal-empty">
              <p>
                Unable to display the file format correctly <strong>{previewState.originalFileType || "Office"}</strong> in the browser.
              </p>
              <p>
                Please configure the backend API <strong>/api/files/preview-pdf</strong> to convert DOC/DOCX/XLS/XLSX/PPT/PPTX to PDF,
                or download the file to open it with the appropriate application.
              </p>
              {previewState.item ? (
                <div className="portal-file-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="portal-btn portal-btn--dark" onClick={() => onDownload(previewState.item)}>
                    Download file
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="portal-empty">
              Direct preview is not supported for this file. Please download it and open it with the appropriate application.
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
  onMouseEnter,
  onMouseLeave,
  children,
  count,
  popoverClassName = "",
  popoverStyle = undefined,
  viewportSafe = false,
}) {
  const dropdownRef = useRef(null);
  const popoverRef = useRef(null);
  const [viewportPopoverStyle, setViewportPopoverStyle] = useState({});
  const [isPopoverPositioned, setIsPopoverPositioned] = useState(!viewportSafe);
  const wasOpenRef = useRef(false);
  const isOpening = Boolean(isOpen && !wasOpenRef.current);

  useLayoutEffect(() => {
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !viewportSafe) {
      setViewportPopoverStyle({});
      setIsPopoverPositioned(!viewportSafe);
      return undefined;
    }

    let animationFrameId = 0;

    const calculatePopoverPosition = () => {
      const dropdownElement = dropdownRef.current;
      const popoverElement = popoverRef.current;
      if (!dropdownElement || !popoverElement) return;

      const viewportGap = 12;
      const triggerRect = dropdownElement.getBoundingClientRect();
      const maxWidth = Math.max(280, window.innerWidth - viewportGap * 2);
      const popoverClass = String(popoverClassName || "");
      const isDocumentMegaMenu = popoverClass.includes("portal-document-mega-menu");
      const isNoticeMegaMenu = popoverClass.includes("portal-notice-mega-menu");
      const isLinksMegaMenu = popoverClass.includes("portal-links-mega-menu");
      const isCascadeMegaMenu = isDocumentMegaMenu || isNoticeMegaMenu;
      const isDocumentTypeActive = popoverClass.includes("is-type-active");
      const isDocumentDepartmentActive = popoverClass.includes("is-department-active");
      const isFilePanelVisible = popoverClass.includes("is-file-panel-visible");
      const preferredWidth = Math.min(
        isLinksMegaMenu
          ? 360
          : isNoticeMegaMenu
            ? isFilePanelVisible || isDocumentDepartmentActive
              ? 760
              : 360
            : isCascadeMegaMenu
              ? isFilePanelVisible || isDocumentDepartmentActive
                ? 960
                : isDocumentTypeActive
                  ? 650
                  : 360
              : 660,
        maxWidth,
      );
      const measuredWidth = Math.min(
        Math.max(popoverElement.offsetWidth || preferredWidth, preferredWidth),
        maxWidth,
      );

      let left;
      // Keep cascade menus anchored to the trigger left edge.
      // This prevents the Document Type menu from jumping left/right when columns appear.
      if (isLinksMegaMenu || isNoticeMegaMenu || isDocumentMegaMenu) {
        left = triggerRect.left;
      } else {
        left = triggerRect.left + triggerRect.width / 2 - measuredWidth / 2;
      }
      left = Math.max(viewportGap, Math.min(left, window.innerWidth - measuredWidth - viewportGap));

      setViewportPopoverStyle({
        "--portal-safe-popover-top": `${triggerRect.bottom + 10}px`,
        "--portal-safe-popover-left": `${left}px`,
        "--portal-safe-popover-width": `${measuredWidth}px`,
        position: "fixed",
        maxWidth: `calc(100vw - ${viewportGap * 2}px)`,
      });
      setIsPopoverPositioned(true);
    };

    const updatePopoverPosition = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(calculatePopoverPosition);
    };

    calculatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isOpen, viewportSafe, popoverClassName]);

  const isSafePopoverReady = !viewportSafe || (isPopoverPositioned && !isOpening);

  const mergedPopoverStyle = viewportSafe
    ? {
        ...popoverStyle,
        ...viewportPopoverStyle,
        ...(!isSafePopoverReady
          ? {
              visibility: "hidden",
              opacity: 0,
              pointerEvents: "none",
              position: "fixed",
              top: "-9999px",
              left: "-9999px",
              transform: "translate3d(0, -4px, 0)",
            }
          : {}),
      }
    : popoverStyle;

  return (
    <div
      ref={dropdownRef}
      className={`portal-nav-dropdown ${isOpen ? "is-open" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
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
          ref={popoverRef}
          className={`portal-nav-popover ${popoverClassName}`.trim()}
          style={mergedPopoverStyle}
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
  const [coreValuesPopupOpen, setCoreValuesPopupOpen] = useState(true);

  const [appNameSearch, setAppNameSearch] = useState("");
  const [documentTypeSearch, setDocumentTypeSearch] = useState("");
  const [workspaceFileSearch, setWorkspaceFileSearch] = useState("");
  const [noticeSearch, setNoticeSearch] = useState("");

  const [apps, setApps] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [workspaceDocumentTypes, setWorkspaceDocumentTypes] = useState([]);
  const [workspaceTypesLoading, setWorkspaceTypesLoading] = useState(false);
  const [workspaceTypesError, setWorkspaceTypesError] = useState(null);
  const [defaultDocumentTypeId, setDefaultDocumentTypeId] = useState("");
  const [openDocumentTypeIds, setOpenDocumentTypeIds] = useState([]);
  const [formsByTypeId, setFormsByTypeId] = useState({});
  const [loadingFormsByTypeId, setLoadingFormsByTypeId] = useState({});
  const [errorFormsByTypeId, setErrorFormsByTypeId] = useState({});
  const [notices, setNotices] = useState([]);
  const [featuredPinnedNotice, setFeaturedPinnedNotice] = useState(null);
  const [priorityPinnedNotice, setPriorityPinnedNotice] = useState(null);

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

  const [hoverTypeId, setHoverTypeId] = useState("");
  const [hoverDepartmentId, setHoverDepartmentId] = useState("");
  const [documentFilePanelSticky, setDocumentFilePanelSticky] = useState(false);
  const [workspaceTypeId, setWorkspaceTypeId] = useState("");
  const [menuFormsByKey, setMenuFormsByKey] = useState({});
  const [loadingMenuFormsByKey, setLoadingMenuFormsByKey] = useState({});
  const [errorMenuFormsByKey, setErrorMenuFormsByKey] = useState({});

  const [noticePopupOpen, setNoticePopupOpen] = useState(false);
  const [selectedNoticeDepartment, setSelectedNoticeDepartment] = useState(null);
  const [noticeWindowStart, setNoticeWindowStart] = useState(0);
  const [noticeHoverPaused, setNoticeHoverPaused] = useState(false);
  const [noticeMoreFilesPopupOpen, setNoticeMoreFilesPopupOpen] = useState(false);
  const [menuHoverPaused, setMenuHoverPaused] = useState(false);
  const menuHoverLeaveTimerRef = useRef(null);
  const [noticeMenuLayout, setNoticeMenuLayout] = useState({
    hasDepartment: false,
    hasNoticePanel: false,
  });
  const [isScrollAtTopZone, setIsScrollAtTopZone] = useState(true);

  const navRef = useRef(null);
  const keepHoverMenuAfterPreviewRef = useRef(false);
  const homeRealtimeRefreshRef = useRef(null);
  const socketRefreshingRef = useRef(false);
  const realtimeMessageTimerRef = useRef(null);

  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeMessage, setRealtimeMessage] = useState("");

  const handleMenuAreaEnter = () => {
    if (menuHoverLeaveTimerRef.current) {
      window.clearTimeout(menuHoverLeaveTimerRef.current);
      menuHoverLeaveTimerRef.current = null;
    }

    setMenuHoverPaused(true);
  };

  const handleMenuAreaLeave = () => {
    if (menuHoverLeaveTimerRef.current) {
      window.clearTimeout(menuHoverLeaveTimerRef.current);
    }

    // Delay close/pause release so moving from trigger to popup does not close the menu.
    menuHoverLeaveTimerRef.current = window.setTimeout(() => {
      setMenuHoverPaused(false);
    }, 450);
  };

  useClickOutside(navRef, () => {
    if (formsPopupOpen || noticePopupOpen || previewState.open || menuHoverPaused) return;
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
        name: item.name || "Application",
        url: normalizeExternalUrl(item.url),
        icon: item.icon ? toAbsoluteUrl(item.icon) : "",
      }));

      setApps(normalizedApps);
    } catch (error) {
      setErrorApps("Unable to load links.");
      setApps([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    setErrorDepartments(null);

    try {
      const params = new URLSearchParams({ skipDepartmentFilter: "false" });
      const response = await fetch(`${DEPARTMENTS_API_BASE}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch departments");
      const data = await response.json();
      const rawDepartments = Array.isArray(data?.departments)
        ? data.departments
        : Array.isArray(data)
          ? data
          : [];

      const normalizedDepartments = rawDepartments
        .map((item) => ({
          id: item.id || item.idDepartment || item.departmentId,
          division: item.division || "",
          departmentName: item.departmentName || item.name || "Unspecified",
          noticeIds: normalizeDepartmentIds(item.noticeIds),
        }))
        .filter((item) => item.id)
        .sort((a, b) => a.departmentName.localeCompare(b.departmentName, "vi"));

      setDepartments(normalizedDepartments);
    } catch (error) {
      setErrorDepartments("Unable to load departments.");
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const normalizeFormItem = (item, type) => {
    const fileUrls = getItemFileUrls(item);
    const previewUrls = getItemPreviewUrls(item);
    const finalPreviewUrls = previewUrls.length > 0 ? previewUrls : fileUrls;
    const fileUrl = fileUrls[0] || "";
    const previewUrl = finalPreviewUrls[0] || fileUrl || null;

    return {
      id: item.id,
      typeId: item.typeId || type?.id || "",
      typeName: type?.name || item.typeName || "Document",
      title: item.title || "Form",
      fileType: fileUrl ? (item.fileType || inferFileType(fileUrl)) : "NO FILE",
      fileUrl,
      previewUrl,
      fileUrls,
      previewUrls: finalPreviewUrls,
      departmentName: item.departmentName || "Unspecified",
      division: item.division || "",
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
    };
  };

  const fetchFormsByType = async (type, { title = "", departmentName = "", force = false } = {}) => {
    if (!type?.id) return;

    if (!force && !departmentName && formsByTypeId[type.id]) {
      return;
    }

    setLoadingFormsByTypeId((prev) => ({ ...prev, [type.id]: true }));
    setErrorFormsByTypeId((prev) => ({ ...prev, [type.id]: null }));

    try {
      const params = new URLSearchParams({
        userId: "",
        departmentName,
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
        [type.id]: `Unable to load documents for type ${type.name}.`,
      }));
      setFormsByTypeId((prev) => ({ ...prev, [type.id]: [] }));
    } finally {
      setLoadingFormsByTypeId((prev) => ({ ...prev, [type.id]: false }));
    }
  };

  const getTypeDepartmentKey = (typeId, departmentId) => `${typeId || ""}__${departmentId || ""}`;

  const fetchFormsByTypeAndDepartment = async (type, department, { title = "", force = false } = {}) => {
    if (!type?.id || !department?.departmentName) return;

    const key = getTypeDepartmentKey(type.id, department.id);

    if (!force && menuFormsByKey[key]) {
      return;
    }

    setLoadingMenuFormsByKey((prev) => ({ ...prev, [key]: true }));
    setErrorMenuFormsByKey((prev) => ({ ...prev, [key]: null }));

    try {
      const params = new URLSearchParams({
        userId: "",
        departmentName: department.departmentName,
        title,
        description: "",
        typeId: type.id,
        page: "0",
        size: "80",
      });

      const response = await fetch(`${FORMS_API_BASE}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch forms by type and department");

      const data = await response.json();
      const normalizedForms = (data.content || []).map((item) => normalizeFormItem(item, type));

      setMenuFormsByKey((prev) => ({ ...prev, [key]: normalizedForms }));
    } catch (error) {
      setErrorMenuFormsByKey((prev) => ({
        ...prev,
        [key]: "Unable to load files.",
      }));
      setMenuFormsByKey((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingMenuFormsByKey((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleHoverMenuType = async (type) => {
    if (!type?.id) return;

    clearDocumentMenuCloseTimer();
    setOpenDropdown("forms");

    const isSwitchingType = Boolean(hoverTypeId && hoverTypeId !== type.id);
    const shouldKeepFilePanel = Boolean(hoverDepartmentId || documentFilePanelSticky);

    setHoverTypeId(type.id);

    // Khi hover ngược về Type đang chọn, giữ nguyên cột File để layout không bị co/rút.
    // Khi chuyển sang Type khác, chỉ xóa Department cũ nhưng vẫn giữ khung File bên phải.
    if (isSwitchingType) {
      setHoverDepartmentId("");
    }

    if (shouldKeepFilePanel) {
      setDocumentFilePanelSticky(true);
    }

    if ((!Array.isArray(type.departments) || type.departments.length === 0) && departments.length === 0 && !loadingDepartments) {
      await fetchDepartments();
    }
  };

  const handleHoverMenuDepartment = async (type, department) => {
    if (!type?.id || !department?.id) return;

    clearDocumentMenuCloseTimer();
    setOpenDropdown("forms");
    setHoverDepartmentId(department.id);
    setDocumentFilePanelSticky(true);
    await fetchFormsByTypeAndDepartment(type, department);
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
            name: item.name || "Document",
            departments: normalizeTypeDepartments(item.departments),
            createdAt: item.createdAt || null,
            updatedAt: item.updatedAt || null,
          })),
      );

      setDocumentTypes(normalizedTypes);
      setWorkspaceDocumentTypes(normalizedTypes);

      const defaultType = normalizedTypes[0] || null;

      if (defaultType) {
        setDefaultDocumentTypeId(defaultType.id);
        setOpenDocumentTypeIds([defaultType.id]);
        setWorkspaceTypeId(defaultType.id);
        await fetchFormsByType(defaultType, { title: "", force: true });
      } else {
        setWorkspaceTypeId("");
      }
    } catch (error) {
      setErrorForms("Unable to load document types.");
      setDocumentTypes([]);
      setWorkspaceDocumentTypes([]);
      setDefaultDocumentTypeId("");
      setOpenDocumentTypeIds([]);
    } finally {
      setLoadingForms(false);
    }
  };


  const normalizeDocumentTypes = (data) => sortDocumentTypes(
    (Array.isArray(data) ? data : [])
      .filter((item) => item?.id)
      .map((item) => ({
        id: item.id,
        name: item.name || "Document",
        departments: normalizeTypeDepartments(item.departments),
        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null,
      })),
  );

  const fetchWorkspaceDocumentTypesByName = async (name = "") => {
    const keyword = String(name || "").trim();

    if (!keyword) {
      setWorkspaceDocumentTypes(documentTypes);
      setWorkspaceTypesError(null);

      const nextType = documentTypes.find((type) => type.id === workspaceTypeId) || documentTypes[0] || null;
      if (nextType && nextType.id !== workspaceTypeId) {
        setWorkspaceTypeId(nextType.id);
        await fetchFormsByType(nextType, { title: workspaceFileSearch.trim(), departmentName: "", force: false });
      }

      return;
    }

    setWorkspaceTypesLoading(true);
    setWorkspaceTypesError(null);

    try {
      const params = new URLSearchParams({ name: keyword });
      const response = await fetch(`${DOCUMENT_TYPES_API_BASE}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to search document types");

      const data = await response.json();
      const normalizedTypes = normalizeDocumentTypes(data);

      setWorkspaceDocumentTypes(normalizedTypes);

      const nextType = normalizedTypes.find((type) => type.id === workspaceTypeId) || normalizedTypes[0] || null;

      if (nextType) {
        if (nextType.id !== workspaceTypeId) {
          setWorkspaceTypeId(nextType.id);
          setWorkspaceFileSearch("");
        }

        await fetchFormsByType(nextType, { title: workspaceFileSearch.trim(), departmentName: "", force: false });
      } else {
        setWorkspaceTypeId("");
        setWorkspaceFileSearch("");
      }
    } catch (error) {
      setWorkspaceTypesError("Unable to search document types.");
    } finally {
      setWorkspaceTypesLoading(false);
    }
  };

  const normalizeNoticeItem = (item) => {
    if (!item) return null;

    const fileUrls = getItemFileUrls(item);
    const previewUrls = getItemPreviewUrls(item);
    const fileUrl = fileUrls[0] || (item.fileUrl ? toAbsoluteUrl(item.fileUrl) : "");
    const fileType = fileUrl ? (item.fileType || inferFileType(fileUrl)) : "NO FILE";
    const previewUrl = previewUrls[0]
      || (fileUrl && isEmbeddableFile(fileType, fileUrl) ? fileUrl : (item.previewUrl ? toAbsoluteUrl(item.previewUrl) : null));

    const priorityPinned = Boolean(
      item.priorityPinned
      || item.isPriorityPinned
      || item.priorityPin
      || item.priority
    );

    return {
      id: item.id,
      title: item.title || "Notice",
      content: item.content || "",
      pinned: Boolean(item.pinned || priorityPinned),
      priorityPinned,
      fileUrl,
      previewUrl,
      fileUrls,
      previewUrls: previewUrls.length > 0 ? previewUrls : fileUrls,
      fileType,
      departmentName: item.departmentName || "",
      division: item.division || "",
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
    };
  };

  const normalizeNoticeList = (value) => {
    if (!value) return [];

    return (Array.isArray(value) ? value : [value])
      .map(normalizeNoticeItem)
      .filter(Boolean);
  };

  const getNoticeIdentity = (notice) => {
    if (!notice) return "";

    const id = String(notice.id || "").trim();
    if (id) return `id:${id}`;

    return `title:${String(notice.title || "").trim().toLowerCase()}`;
  };

  const isSameNotice = (a, b) => {
    if (!a || !b) return false;

    const aId = String(a.id || "").trim();
    const bId = String(b.id || "").trim();

    if (aId && bId) return aId === bId;

    return String(a.title || "").trim().toLowerCase()
      === String(b.title || "").trim().toLowerCase();
  };

  const dedupeNoticeList = (items) => {
    const seen = new Set();

    return items.filter((item) => {
      const key = getNoticeIdentity(item);

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    });
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

      const normalizedContentNotices = normalizeNoticeList(data.content);

      const explicitFeaturedPinnedNotices = dedupeNoticeList([
        ...normalizeNoticeList(data.featuredPinnedNotice),
        ...normalizeNoticeList(data.featuredPinnedNotices),
        ...normalizeNoticeList(data.heroPinnedNotice),
        ...normalizeNoticeList(data.pinnedNotice),
      ]);

      const explicitPriorityPinnedNotices = dedupeNoticeList([
        ...normalizeNoticeList(data.priorityPinnedNotice),
        ...normalizeNoticeList(data.priorityPinnedNotices),
        ...normalizeNoticeList(data.priorityNotice),
      ]);

      const apiPinnedNotices = dedupeNoticeList([
        ...normalizeNoticeList(data.pinnedNotices),
        ...normalizeNoticeList(data.pinnedNoticeList),
      ]);

      const contentPinnedNotices = normalizedContentNotices.filter((item) => item.pinned);

      const normalizedFeaturedPinnedNotice =
        explicitFeaturedPinnedNotices[0]
        || apiPinnedNotices[0]
        || contentPinnedNotices[0]
        || null;

      const normalizedPriorityPinnedNotice =
        explicitPriorityPinnedNotices.find((item) => !isSameNotice(item, normalizedFeaturedPinnedNotice))
        || apiPinnedNotices.find((item) => !isSameNotice(item, normalizedFeaturedPinnedNotice))
        || contentPinnedNotices.find((item) => !isSameNotice(item, normalizedFeaturedPinnedNotice))
        || null;

      const pinnedKeys = new Set(
        [normalizedFeaturedPinnedNotice, normalizedPriorityPinnedNotice]
          .filter(Boolean)
          .map(getNoticeIdentity),
      );

      const normalizedNotices = normalizedContentNotices.filter((item) => !pinnedKeys.has(getNoticeIdentity(item)));

      setFeaturedPinnedNotice(normalizedFeaturedPinnedNotice);
      setPriorityPinnedNotice(normalizedPriorityPinnedNotice);
      setNotices(normalizedNotices);
    } catch (error) {
      setErrorNotices("Unable to load notices.");
      setFeaturedPinnedNotice(null);
      setPriorityPinnedNotice(null);
      setNotices([]);
    } finally {
      setLoadingNotices(false);
    }
  };

  const showRealtimeMessage = (message) => {
    if (realtimeMessageTimerRef.current) {
      window.clearTimeout(realtimeMessageTimerRef.current);
    }

    setRealtimeMessage(message);

    realtimeMessageTimerRef.current = window.setTimeout(() => {
      setRealtimeMessage("");
      realtimeMessageTimerRef.current = null;
    }, 4200);
  };

  const refreshHomeDataBySocket = async (event = {}) => {
    const module = String(event?.module || "ALL").toUpperCase();
    const action = String(event?.action || "UPDATED").toUpperCase();

    const refreshTasks = [];

    if (module === "ALL" || module === "APP_LINK") {
      refreshTasks.push(fetchApps(appNameSearch.trim()));
    }

    if (module === "ALL" || module === "DEPARTMENT") {
      refreshTasks.push(fetchDepartments());
    }

    if (
      module === "ALL" ||
      module === "DOCUMENT_TYPE" ||
      module === "FORM" ||
      module === "DEPARTMENT"
    ) {
      refreshTasks.push(fetchDocumentTypes());
    }

    if (module === "ALL" || module === "NOTICE" || module === "DEPARTMENT") {
      refreshTasks.push(fetchNotices());
    }

    if (refreshTasks.length === 0) return;

    await Promise.all(refreshTasks);

    showRealtimeMessage(`${module} ${action} - data updated`);
  };

  useEffect(() => {
    homeRealtimeRefreshRef.current = refreshHomeDataBySocket;
  });

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_ORIGIN}/ws`),
      reconnectDelay: 5000,
      debug: () => {},

      onConnect: () => {
        setRealtimeConnected(true);
        console.log("Portal realtime connected");

        client.subscribe("/topic/app-events", async (message) => {
          let event = {
            module: "ALL",
            action: "UPDATED",
            id: "",
          };

          try {
            event = JSON.parse(message.body);
          } catch {
            // Keep fallback event above.
          }

          console.log("Portal realtime event received:", event);

          if (socketRefreshingRef.current) {
            return;
          }

          socketRefreshingRef.current = true;
          showRealtimeMessage(`${String(event?.module || "ALL").toUpperCase()} ${String(event?.action || "UPDATED").toUpperCase()} - syncing...`);

          try {
            await homeRealtimeRefreshRef.current?.(event);
          } catch (error) {
            console.error("Portal realtime refresh failed:", error);
            showRealtimeMessage("Realtime received, but refresh failed");
          } finally {
            socketRefreshingRef.current = false;
          }
        });
      },

      onDisconnect: () => {
        setRealtimeConnected(false);
        console.log("Portal realtime disconnected");
      },

      onStompError: (frame) => {
        setRealtimeConnected(false);
        console.error("Portal realtime STOMP error:", frame);
      },

      onWebSocketError: (error) => {
        setRealtimeConnected(false);
        console.error("Portal realtime socket error:", error);
      },
    });

    client.activate();

    return () => {
      setRealtimeConnected(false);

      if (realtimeMessageTimerRef.current) {
        window.clearTimeout(realtimeMessageTimerRef.current);
        realtimeMessageTimerRef.current = null;
      }

      client.deactivate();
    };
  }, []);

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
    const timeout = setTimeout(() => {
      fetchWorkspaceDocumentTypesByName(documentTypeSearch.trim());
    }, 320);

    return () => clearTimeout(timeout);
  }, [documentTypeSearch, documentTypes]);

  useEffect(() => {
    if (!workspaceActiveType) return;

    const timeout = setTimeout(() => {
      fetchFormsByType(workspaceActiveType, {
        title: workspaceFileSearch.trim(),
        departmentName: "",
        force: true,
      });
    }, 320);

    return () => clearTimeout(timeout);
  }, [workspaceFileSearch, workspaceTypeId]);

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

    // Giữ menu hover phía sau sau khi đóng popup preview.
    window.setTimeout(() => {
      keepHoverMenuAfterPreviewRef.current = false;
    }, 120);
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
        error: "This item has no attached file.",
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

      // All preview files should go through backend PDF preview.
      // This keeps DOC/DOCX/XLS/XLSX/CSV/PPT/PPTX/PDF/IMG/TXT and other files
      // in one preview flow instead of mixing direct image/text/Office preview paths.
      if (shouldUsePdfPreview(item)) {
        try {
          const previewData = await buildFilePreviewAsPdf(item);

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
        } catch (pdfError) {
          console.warn("PDF preview conversion failed:", pdfError);
          setPreviewState({
            ...EMPTY_PREVIEW_STATE,
            open: true,
            loading: false,
            error: "Unable to convert this file to PDF preview. Please check the backend preview-pdf service or download the original file.",
            item,
            fileName: getDownloadFileName(item),
            originalFileType,
          });
          return;
        }
      }

      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        loading: false,
        error: "This item has no attached file.",
        item,
        fileName: getDownloadFileName(item),
        originalFileType,
      });
    } catch (error) {
      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        error: "Unable to load the file for preview. Please try downloading it.",
        item,
        fileName: getDownloadFileName(item),
      });
    }
  };

  const handleOpenMenuPreview = async (item) => {
    // Khi bấm Xem trong hover menu, không để sự kiện rời chuột đóng menu phía sau popup.
    keepHoverMenuAfterPreviewRef.current = true;
    await handleOpenPreview(item);
  };


  const handleDownloadFile = async (item) => {
    const fileUrls = getItemFileUrls(item);

    if (fileUrls.length === 0) {
      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        error: "This item has no attached file to download.",
        item,
        fileName: getDownloadFileName(item),
      });
      return;
    }

    const failedFiles = [];

    for (let index = 0; index < fileUrls.length; index += 1) {
      const fileUrl = fileUrls[index];

      try {
        const { blob } = await fetchProtectedFile(fileUrl);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = blobUrl;
        link.download = getDownloadFileNameByUrl(item, fileUrl, index);
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        // Small delay helps browsers register each download when multiple files are triggered together.
        if (fileUrls.length > 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      } catch (error) {
        console.error("Unable to download file:", fileUrl, error);
        failedFiles.push(fileUrl);
      }
    }

    if (failedFiles.length > 0) {
      setPreviewState({
        ...EMPTY_PREVIEW_STATE,
        open: true,
        error:
          fileUrls.length > 1
            ? `Unable to download ${failedFiles.length}/${fileUrls.length} files. Please check your token or file access permission.`
            : "Unable to download the file. Please check your token or file access permission.",
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

    // Allow every type, including the default "Form" type, to be opened or collapsed.
    // Form still opens automatically on first page load in fetchDocumentTypes().
    setOpenDocumentTypeIds((prev) => (
      alreadyOpen
        ? prev.filter((id) => id !== type.id)
        : [...prev, type.id]
    ));

    if (willOpen && !formsByTypeId[type.id]) {
      fetchFormsByType(type, { title: "", force: false });
    }
  };

  const handleHoverOpenDocumentType = (type) => {
    if (!type?.id) return;

    setOpenDocumentTypeIds((prev) => (
      prev.includes(type.id) ? prev : [...prev, type.id]
    ));

    if (!formsByTypeId[type.id] && !loadingFormsByTypeId[type.id]) {
      fetchFormsByType(type, { title: "", force: false });
    }
  };

  const getDepartmentsForDocumentType = (type) => {
    const mappedDepartments = Array.isArray(type?.departments) ? type.departments : [];

    if (mappedDepartments.length === 0) {
      return [];
    }

    return mappedDepartments
      .map((mappedDepartment) => {
        const id = mappedDepartment.id || mappedDepartment.idDepartment || mappedDepartment.departmentId;
        const fullDepartment = departments.find((department) => department.id === id);

        return {
          ...mappedDepartment,
          ...(fullDepartment || {}),
          id,
          idDepartment: id,
          departmentName:
            fullDepartment?.departmentName ||
            mappedDepartment.departmentName ||
            mappedDepartment.name ||
            "Unspecified",
          name:
            fullDepartment?.departmentName ||
            mappedDepartment.name ||
            mappedDepartment.departmentName ||
            "Unspecified",
          division: fullDepartment?.division || mappedDepartment.division || "",
        };
      })
      .filter((department) => department.id)
      .sort((a, b) => String(a.departmentName || "").localeCompare(String(b.departmentName || ""), "vi"));
  };

  const noticeMenuDepartments = useMemo(
    () => departments.filter(departmentHasNoticeIds),
    [departments],
  );

  const activeMenuType = useMemo(() => {
    if (!hoverTypeId) return null;
    return documentTypes.find((type) => type.id === hoverTypeId) || null;
  }, [documentTypes, hoverTypeId]);

  const activeMenuDepartments = useMemo(
    () => getDepartmentsForDocumentType(activeMenuType),
    [activeMenuType, departments],
  );

  const activeMenuDepartment = useMemo(() => {
    return activeMenuDepartments.find((department) => department.id === hoverDepartmentId) || null;
  }, [activeMenuDepartments, hoverDepartmentId]);

  const activeMenuFormsKey = activeMenuType && activeMenuDepartment
    ? getTypeDepartmentKey(activeMenuType.id, activeMenuDepartment.id)
    : "";

  const activeMenuForms = activeMenuFormsKey ? menuFormsByKey[activeMenuFormsKey] || [] : [];
  const activeMenuFormsLoading = activeMenuFormsKey
    ? Boolean(loadingMenuFormsByKey[activeMenuFormsKey])
    : false;
  const activeMenuFormsError = activeMenuFormsKey
    ? errorMenuFormsByKey[activeMenuFormsKey]
    : null;

  const workspaceActiveType = useMemo(() => {
    if (!workspaceTypeId) return null;
    return workspaceDocumentTypes.find((type) => type.id === workspaceTypeId) || null;
  }, [workspaceDocumentTypes, workspaceTypeId]);


  const workspaceFormsKey = workspaceActiveType?.id || "";

  const workspaceRawForms = workspaceFormsKey ? formsByTypeId[workspaceFormsKey] || [] : [];
  const workspaceFormsLoading = workspaceFormsKey
    ? Boolean(loadingFormsByTypeId[workspaceFormsKey])
    : false;
  const workspaceFormsError = workspaceFormsKey
    ? errorFormsByTypeId[workspaceFormsKey]
    : null;

  const workspaceActiveForms = workspaceRawForms;


  const handleWorkspaceHoverType = async (type) => {
    if (!type?.id) return;

    const isSwitchingType = Boolean(workspaceTypeId && workspaceTypeId !== type.id);

    setWorkspaceTypeId(type.id);

    if (isSwitchingType) {
      setWorkspaceFileSearch("");
    }

    await fetchFormsByType(type, {
      title: isSwitchingType ? "" : workspaceFileSearch.trim(),
      departmentName: "",
      force: isSwitchingType,
    });
  };

  const handleWorkspaceToggleType = async (type) => {
    if (!type?.id) return;

    const isSwitchingType = workspaceTypeId !== type.id;

    setWorkspaceTypeId(type.id);

    if (isSwitchingType) {
      setWorkspaceFileSearch("");
    }

    await fetchFormsByType(type, {
      title: isSwitchingType ? "" : workspaceFileSearch.trim(),
      departmentName: "",
      force: isSwitchingType,
    });
  };

  const shouldShowMenuFileColumn = Boolean(
    activeMenuType && (activeMenuDepartment || documentFilePanelSticky),
  );

  const documentMenuCloseTimerRef = useRef(null);

  const clearDocumentMenuCloseTimer = () => {
    if (documentMenuCloseTimerRef.current) {
      window.clearTimeout(documentMenuCloseTimerRef.current);
      documentMenuCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearDocumentMenuCloseTimer();
  }, []);

  const openDocumentMegaMenu = () => {
    clearDocumentMenuCloseTimer();

    if (openDropdown !== "forms") {
      setHoverTypeId("");
      setHoverDepartmentId("");
      setDocumentFilePanelSticky(false);
    }

    setOpenDropdown("forms");

    if (documentTypes.length === 0 && !loadingForms) {
      fetchDocumentTypes();
    }

    if (departments.length === 0 && !loadingDepartments) {
      fetchDepartments();
    }
  };

  const closeDocumentMegaMenu = () => {
    clearDocumentMenuCloseTimer();

    if (keepHoverMenuAfterPreviewRef.current) {
      return;
    }

    documentMenuCloseTimerRef.current = window.setTimeout(() => {
      if (keepHoverMenuAfterPreviewRef.current || formsPopupOpen) {
        documentMenuCloseTimerRef.current = null;
        return;
      }

      setOpenDropdown(null);
      setHoverTypeId("");
      setHoverDepartmentId("");
      setDocumentFilePanelSticky(false);

      documentMenuCloseTimerRef.current = null;
    }, 420);
  };

  const resetNoticeMenuLayout = () => {
    setNoticeMenuLayout({ hasDepartment: false, hasNoticePanel: false });
  };

  const openNoticeMegaMenu = () => {
    setOpenDropdown("notice");

    if (departments.length === 0 && !loadingDepartments) {
      fetchDepartments();
    }
  };

  const closeNoticeMegaMenu = () => {
    if (keepHoverMenuAfterPreviewRef.current) {
      return;
    }

    setOpenDropdown(null);
    resetNoticeMenuLayout();
  };

  const heroPinnedNotice = useMemo(
    () => featuredPinnedNotice || notices[0] || null,
    [featuredPinnedNotice, notices],
  );

  const priorityPinnedDisplayNotice = useMemo(
    () => {
      const isDifferentFromHero = (notice) => notice && !isSameNotice(notice, heroPinnedNotice);

      if (isDifferentFromHero(priorityPinnedNotice)) {
        return priorityPinnedNotice;
      }

      return notices.find((item) => item.pinned && isDifferentFromHero(item)) || null;
    },
    [priorityPinnedNotice, notices, heroPinnedNotice],
  );

  const searchableNotices = useMemo(
    () => notices.filter(
      (item) =>
        item.id !== heroPinnedNotice?.id &&
        item.id !== priorityPinnedDisplayNotice?.id,
    ),
    [notices, heroPinnedNotice, priorityPinnedDisplayNotice],
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

  const noticeAutoSlidePaused = noticeHoverPaused || noticeMoreFilesPopupOpen || previewState.open;

  useEffect(() => {
    if (filteredNotices.length <= 5 || noticeAutoSlidePaused) return undefined;

    const intervalId = window.setInterval(() => {
      setNoticeWindowStart((prev) => (prev + 1) % filteredNotices.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, [filteredNotices.length, noticeAutoSlidePaused]);

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

  const noticeDisplayCount = (priorityPinnedDisplayNotice ? 1 : 0) + filteredNotices.length;

  const divisionCount = useMemo(() => {
    return new Set(
      departments.map((item) => item.division).filter(Boolean),
    ).size;
  }, [departments]);

  const pinnedCount = useMemo(
    () =>
      (featuredPinnedNotice?.pinned ? 1 : 0) +
      (priorityPinnedNotice?.pinned ? 1 : 0) +
      notices.filter(
        (item) =>
          item.pinned &&
          item.id !== featuredPinnedNotice?.id &&
          item.id !== priorityPinnedNotice?.id,
      ).length,
    [featuredPinnedNotice, priorityPinnedNotice, notices],
  );

  const heroPinnedNoticeTime = useMemo(() => {
    if (!heroPinnedNotice) return "No data yet";

    return formatDateTime(heroPinnedNotice.updatedAt || heroPinnedNotice.createdAt) || "No data yet";
  }, [heroPinnedNotice]);

  const mobileDropdownStyle = {
    "--menu-visible-items": String(MENU_MAX_VISIBLE_ITEMS),
    "--menu-visible-rows": String(MENU_MAX_VISIBLE_ITEMS),
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
          <div className="portal-shell portal-topbar" ref={navRef}
          onMouseEnter={handleMenuAreaEnter}
          onMouseLeave={handleMenuAreaLeave}>
            <span className="portal-brand__mark">
              <img src={companyLogo} alt="YOUNGONE" />
            </span>
            <span className="portal-brand__text">
              <strong>BROADPEAK SOC TRANG</strong>
              <small>HOME PAGE</small>
            </span>
            

            <nav className="portal-nav">
              <MenuDropdown
                label="Links"
                icon={<IconLink />}
                isOpen={openDropdown === "links"}
                onToggle={() => setOpenDropdown((prev) => (prev === "links" ? null : "links"))}
                onMouseEnter={() => setOpenDropdown("links")}
                onMouseLeave={() => setOpenDropdown(null)}
                count={apps.length || undefined}
                popoverClassName="portal-menu-six portal-menu-four portal-links-mega-menu"
                viewportSafe
              >
                <LinksHoverMenu
                  apps={apps}
                  loading={loadingApps}
                  error={errorApps}
                  IconExternal={IconExternal}
                />
              </MenuDropdown>

              <MenuDropdown
                label="Document"
                icon={<IconFolder />}
                isOpen={openDropdown === "forms"}
                onToggle={() => {
                  if (openDropdown === "forms") {
                    setOpenDropdown(null);
                    return;
                  }

                  openDocumentMegaMenu();
                }}
                onMouseEnter={openDocumentMegaMenu}
                onMouseLeave={closeDocumentMegaMenu}
                count={documentTypes.length || undefined}
                popoverClassName={`portal-menu-six portal-menu-four portal-document-mega-menu ${activeMenuType ? "is-type-active" : ""} ${shouldShowMenuFileColumn ? "is-file-panel-visible" : ""} ${activeMenuDepartment ? "is-department-active" : ""}`.trim()}
                viewportSafe
              >
                <DocumentHoverMenu
                  activeMenuType={activeMenuType}
                  activeMenuDepartment={activeMenuDepartment}
                  shouldShowMenuFileColumn={shouldShowMenuFileColumn}
                  documentTypes={documentTypes}
                  loadingForms={loadingForms}
                  errorForms={errorForms}
                  departments={activeMenuDepartments}
                  loadingDepartments={loadingDepartments && activeMenuDepartments.length === 0}
                  errorDepartments={errorDepartments}
                  activeMenuForms={activeMenuForms}
                  activeMenuFormsLoading={activeMenuFormsLoading}
                  activeMenuFormsError={activeMenuFormsError}
                  onMouseEnter={openDocumentMegaMenu}
                  onMouseLeave={closeDocumentMegaMenu}
                  onHoverType={handleHoverMenuType}
                  onHoverDepartment={handleHoverMenuDepartment}
                  onPreview={handleOpenMenuPreview}
                  onDownload={handleDownloadFile}
                  FileTypeBadge={FileTypeBadge}
                  FileActions={FileActions}
                  IconFileText={IconFileText}
                  IconBuilding={IconBuilding}
                  IconArrowRight={IconArrowRight}
                />
              </MenuDropdown>

              <MenuDropdown
                label="Notice"
                icon={<IconBell />}
                isOpen={openDropdown === "notice"}
                onToggle={() => {
                  if (openDropdown === "notice") {
                    closeNoticeMegaMenu();
                    return;
                  }

                  openNoticeMegaMenu();
                }}
                onMouseEnter={openNoticeMegaMenu}
                onMouseLeave={closeNoticeMegaMenu}
                count={noticeMenuDepartments.length || undefined}
                popoverClassName={`portal-menu-six portal-menu-four portal-notice-mega-menu ${noticeMenuLayout.hasDepartment ? "is-department-active" : ""} ${noticeMenuLayout.hasNoticePanel ? "is-file-panel-visible" : ""}`.trim()}
                viewportSafe
              >
                <NoticeHoverMenu
                  departments={noticeMenuDepartments}
                  loading={loadingDepartments}
                  error={errorDepartments}
                  noticesApiBase={NOTICES_API_BASE}
                  apiBaseUrl={API_ORIGIN}
                  onPreview={handleOpenMenuPreview}
                  onDownload={handleDownloadFile}
                  FileTypeBadge={FileTypeBadge}
                  FileActions={FileActions}
                  formatDateTime={formatDateTime}
                  onLayoutChange={setNoticeMenuLayout}
                  IconBuilding={IconBuilding}
                  IconArrowRight={IconArrowRight}
                />
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
                    href={app.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    onClick={(event) => openExternalUrl(event, app.url)}
                    className="portal-mobile-subitem"
                  >
                    {app.name}
                  </a>
                ))}
              </MobileDropdown>

              <MobileDropdown
                label="Document"
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
              <div className="portal-hero__surface">
                <div
                  className="portal-hero-bg portal-hero-bg-one"
                  style={{ backgroundImage: `url(${backgroundA})` }}
                />
                <div
                  className="portal-hero-bg portal-hero-bg-two"
                  style={{ backgroundImage: `url(${backgroundB})` }}
                />
                <div
                  className="portal-hero-bg portal-hero-bg-three"
                  style={{ backgroundImage: `url(${backgroundC})` }}
                />
                <div className="portal-hero__copy">
                  <div className="portal-tag">HOME PAGE</div>
                  <h1>Internal portal for notices, documents, and links.</h1>

                  <div className="portal-hero__intro">
                    <p>
                      A website that brings together important notices, internal documents, and work links from departments,
                      helping users search faster and save time.
                    </p>
                  </div>

                  <div className="portal-hero__chips">
                    <span className="portal-chip">Pinned notice</span>
                    <span className="portal-chip">Internal documents</span>
                    <span className="portal-chip">Work links</span>
                    <span className="portal-chip">Quick search</span>
                  </div>

                  <div className="portal-hero-latest-notice">
                    <div className="portal-hero-latest-notice__badge">
                      <span className="portal-hero-latest-notice__badge-icon">
                        <IconPin />
                      </span>
                      <span>Pinned notice</span>
                    </div>

                    {heroPinnedNotice ? (
                      <>
                        <h3>{heroPinnedNotice.title}</h3>
                        <ExpandableText
                          text={heroPinnedNotice.content || "This notice does not have a description yet."}
                          featured
                          title={heroPinnedNotice.title}
                          subtitle="Pinned notice"
                          onOpenChange={setNoticeMoreFilesPopupOpen}
                        />
                        <div className="portal-meta-row portal-hero-latest-notice__meta">
                          <FileTypeBadge item={heroPinnedNotice} />
                          {getDepartmentDisplayName(heroPinnedNotice) ? (
                            <span className="portal-meta-pill">{getDepartmentDisplayName(heroPinnedNotice)}</span>
                          ) : null}
                          <span className="portal-meta-pill">
                            <IconClock />
                            {heroPinnedNoticeTime}
                          </span>
                          <FileActions item={heroPinnedNotice} onPreview={handleOpenPreview} onDownload={handleDownloadFile} compact previewOpen={previewState.open} />
                        </div>
                      </>
                    ) : (
                      <p>No pinned notice is available to display here.</p>
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
                      placeholder="Search application name..."
                    />

                    <div className="portal-panel__scroll">
                      {loadingApps ? <div className="portal-empty">Loading links...</div> : null}
                      {errorApps ? <div className="portal-empty">{errorApps}</div> : null}

                      {!loadingApps && !errorApps ? (
                        <div className="portal-links-grid">
                          {apps.map((app) => (
                            <a
                              key={app.id}
                              href={app.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              onClick={(event) => openExternalUrl(event, app.url)}
                              className="portal-link-card"
                            >
                              <div className="portal-link-card__left">
                                <div className="portal-link-card__icon">
                                  {app.icon ? <img src={app.icon} alt={app.name} /> : app.name.slice(0, 1)}
                                </div>
                                <div className="portal-link-card__text">
                                  <strong>{app.name}</strong>
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

                  <article className="portal-panel portal-panel--document-workspace">
                    <div className="portal-panel__scroll">
                      {(loadingForms || workspaceTypesLoading) && workspaceDocumentTypes.length === 0 ? <div className="portal-empty">Loading document types...</div> : null}
                      {(workspaceTypesError || errorForms) ? <div className="portal-empty">{workspaceTypesError || errorForms}</div> : null}

                      {!loadingForms && !workspaceTypesLoading && !(workspaceTypesError || errorForms) && workspaceDocumentTypes.length === 0 ? (
                        <div className="portal-empty">No document types found.</div>
                      ) : null}

                      {!(workspaceTypesError || errorForms) && workspaceDocumentTypes.length > 0 ? (
                        <DocumentWorkspaceCascade
                          documentTypes={workspaceDocumentTypes}
                          loadingForms={loadingForms || workspaceTypesLoading}
                          errorForms={workspaceTypesError || errorForms}
                          activeType={workspaceActiveType}
                          activeForms={workspaceActiveForms}
                          activeFormsLoading={workspaceFormsLoading}
                          activeFormsError={workspaceFormsError}
                          fileSearch={workspaceFileSearch}
                          onFileSearchChange={setWorkspaceFileSearch}
                          onHoverType={handleWorkspaceHoverType}
                          onToggleType={handleWorkspaceToggleType}
                          onPreview={handleOpenPreview}
                          onDownload={handleDownloadFile}
                          previewOpen={previewState.open}
                        />
                      ) : null}
                    </div>
                  </article>
                </div>

                <article className="portal-panel portal-panel--notice">
                  <PanelHeader
                    title="Notices"
                    icon={<IconBell />}
                    count={noticeDisplayCount}
                  />

                  <div className="portal-notice-column">
                    {priorityPinnedDisplayNotice ? (
                      <div className="portal-featured-notice-wrap">
                        <div className="portal-featured-notice">
                          <div className="portal-featured-notice__badge">
                            <span className="portal-featured-notice__badge-icon">
                              <IconPin />
                            </span>
                            <span>Priority pinned</span>
                          </div>
                          <h3>{priorityPinnedDisplayNotice.title}</h3>
                          <ExpandableText
                            text={priorityPinnedDisplayNotice.content}
                            featured
                            title={priorityPinnedDisplayNotice.title}
                            subtitle="Priority pinned"
                            onOpenChange={setNoticeMoreFilesPopupOpen}
                          />
                          <div className="portal-notice-meta-actions is-featured">
                            <div className="portal-meta-row portal-meta-row--notice">
                              <FileTypeBadge item={priorityPinnedDisplayNotice} />
                              {getDepartmentDisplayName(priorityPinnedDisplayNotice) ? (
                                <span className="portal-meta-pill">{getDepartmentDisplayName(priorityPinnedDisplayNotice)}</span>
                              ) : null}
                              {priorityPinnedDisplayNotice.createdAt ? (
                                <span className="portal-meta-pill">
                                  <IconClock />
                                  {formatDateTime(priorityPinnedDisplayNotice.createdAt)}
                                </span>
                              ) : null}
                            </div>
                            <FileActions item={priorityPinnedDisplayNotice} onPreview={handleOpenPreview} onDownload={handleDownloadFile} compact previewOpen={previewState.open} onMoreFilesOpenChange={setNoticeMoreFilesPopupOpen} />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="portal-toolbar portal-toolbar--notice-search">
                      <SearchInput
                        value={noticeSearch}
                        onChange={setNoticeSearch}
                        placeholder="Search notices or posted date..."
                      />
                    </div>

                    <div
                      className="portal-notice-list-scroll"
                      onMouseEnter={() => setNoticeHoverPaused(true)}
                      onMouseLeave={() => setNoticeHoverPaused(false)}
                    >
                      {loadingNotices ? <div className="portal-empty">Loading notices...</div> : null}
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
                                <ExpandableText
                                  text={notice.content}
                                  title={notice.title}
                                  subtitle={getDepartmentDisplayName(notice) || "Notice"}
                                  onOpenChange={setNoticeMoreFilesPopupOpen}
                                />
                                <div className="portal-notice-meta-actions">
                                  <div className="portal-meta-row portal-meta-row--notice">
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
                                  <FileActions item={notice} onPreview={handleOpenPreview} onDownload={handleDownloadFile} compact previewOpen={previewState.open} onMoreFilesOpenChange={setNoticeMoreFilesPopupOpen} />
                                </div>
                              </div>
                            </div>
                          ))}

                          {filteredNotices.length === 0 ? (
                            <div className="portal-empty">
                              No matching notices found, but the pinned notice is still shown above.
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
              Developed by BSL IT
            </div>
          </div>
        </footer>
      </div>

      <button
        type="button"
        className="portal-scroll-toggle"
        onClick={handleTogglePageEdge}
        aria-label={isScrollAtTopZone ? "Scroll to bottom" : "Scroll to top"}
        title={isScrollAtTopZone ? "Go to bottom" : "Go to top"}
      >
        {isScrollAtTopZone ? <IconChevronDown /> : <IconChevronUp />}
      </button>

      {coreValuesPopupOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="portal-core-popup-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label="Core Values"
            >
              <div className="portal-core-popup-card">
                <button
                  type="button"
                  className="portal-core-popup-close"
                  onClick={() => setCoreValuesPopupOpen(false)}
                  aria-label="Close popup"
                  title="Close"
                >
                  ×
                </button>
                <img
                  src={coreValuesImage}
                  alt="Core Values"
                  className="portal-core-popup-image"
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      <PreviewModal previewState={previewState} onClose={closePreview} onDownload={handleDownloadFile} onSelectSheet={handlePreviewSheetChange} />
    </>
  );
}

