import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function inferFileType(fileUrl) {
  if (!fileUrl) return "FILE";
  const cleanUrl = fileUrl.split("?")[0].split("#")[0];
  return cleanUrl.split(".").pop()?.toUpperCase() || "FILE";
}

function isEmbeddableFile(fileType, url) {
  const type = (fileType || inferFileType(url) || "").toUpperCase();
  return ["PDF", "PNG", "JPG", "JPEG", "WEBP", "GIF", "TXT"].includes(type);
}

function toAbsoluteUrl(apiBaseUrl, path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${apiBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

function normalizeNoticeItem(item, apiBaseUrl) {
  if (!item) return null;

  const fileUrl = item.fileUrl ? toAbsoluteUrl(apiBaseUrl, item.fileUrl) : "";
  const fileType = fileUrl ? (item.fileType || inferFileType(item.fileUrl)) : "NO FILE";

  return {
    id: item.id,
    title: item.title || "Notice",
    content: item.content || "",
    pinned: !!item.pinned,
    fileUrl,
    previewUrl:
      fileUrl && isEmbeddableFile(fileType, fileUrl)
        ? fileUrl
        : item.previewUrl
          ? toAbsoluteUrl(apiBaseUrl, item.previewUrl)
          : null,
    fileType,
    departmentName: item.departmentName || "",
    division: item.division || "",
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function decodeHtmlEntities(value = "") {
  if (typeof document === "undefined") {
    return String(value)
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
}

function stripNoticeHtml(html = "") {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/(p|div|li|h[1-6]|tr|table)>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function sanitizeNoticeHtml(html = "") {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+on\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function NoticeMoreStyles() {
  return (
    <style>{`
      .portal-notice-description {
        margin-top: 8px;
        display: grid;
        gap: 6px;
      }

      .portal-notice-description__text {
        margin: 0;
        color: var(--portal-text-soft, #436182);
        font-size: 0.78rem;
        line-height: 1.55;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }

      .portal-notice-description__toggle {
        width: fit-content;
        min-height: 26px;
        padding: 0 10px;
        border: 1px solid rgba(39, 73, 255, 0.12);
        border-radius: 999px;
        background: rgba(39, 73, 255, 0.08);
        color: var(--portal-primary, #2749ff);
        font-size: 0.72rem;
        font-weight: 800;
        cursor: pointer;
      }

      .portal-notice-description__toggle:hover {
        background: rgba(39, 73, 255, 0.12);
      }

      .portal-notice-more-backdrop {
        position: fixed;
        inset: 0;
        z-index: 12000;
        padding: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(8, 18, 39, 0.46);
        backdrop-filter: blur(12px);
      }

      .portal-notice-more-dialog {
        width: min(880px, 100%);
        max-height: min(86vh, 820px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 34px 90px rgba(10, 27, 58, 0.26);
        border: 1px solid rgba(255, 255, 255, 0.92);
      }

      .portal-notice-more-dialog__head {
        padding: 18px 20px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        border-bottom: 1px solid #e5e7eb;
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      }

      .portal-notice-more-dialog__head strong {
        display: block;
        margin-bottom: 5px;
        color: #111827;
        font-size: 1rem;
        line-height: 1.35;
      }

      .portal-notice-more-dialog__head span {
        display: block;
        color: #6b7280;
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1.4;
      }

      .portal-notice-more-dialog__close {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border: none;
        border-radius: 14px;
        background: #f3f4f6;
        color: #111827;
        font-size: 1.25rem;
        cursor: pointer;
      }

      .portal-notice-more-dialog__close:hover {
        background: #e5e7eb;
      }

      .portal-notice-more-dialog__body {
        min-height: 0;
        overflow: auto;
        padding: 20px;
        background: #f8fafc;
      }

      .portal-notice-more-dialog__paper {
        padding: 22px;
        border-radius: 18px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        color: #111827;
        font-size: 0.92rem;
        line-height: 1.75;
      }

      .portal-notice-more-dialog__paper p {
        margin: 0.55em 0;
      }

      .portal-notice-more-dialog__paper ul,
      .portal-notice-more-dialog__paper ol {
        padding-left: 24px;
        margin: 0.8em 0;
      }

      .portal-notice-more-dialog__paper table {
        width: 100%;
        border-collapse: collapse;
        margin: 1em 0;
      }

      .portal-notice-more-dialog__paper th,
      .portal-notice-more-dialog__paper td {
        border: 1px solid #d1d5db;
        padding: 8px;
        vertical-align: top;
      }

      .portal-notice-more-dialog__paper img {
        max-width: 100%;
        height: auto;
      }

      .portal-notice-more-dialog__actions {
        padding: 12px 20px;
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid #e5e7eb;
        background: #ffffff;
      }

      .portal-notice-more-dialog__button {
        min-height: 36px;
        padding: 0 16px;
        border: none;
        border-radius: 999px;
        background: #111827;
        color: #ffffff;
        font-weight: 800;
        cursor: pointer;
      }

      @media (max-width: 768px) {
        .portal-notice-more-backdrop {
          padding: 12px;
        }

        .portal-notice-more-dialog {
          max-height: 92vh;
          border-radius: 18px;
        }

        .portal-notice-more-dialog__body {
          padding: 14px;
        }

        .portal-notice-more-dialog__paper {
          padding: 16px;
        }
      }
    `}</style>
  );
}

export function LinksHoverMenu({
  apps,
  loading,
  error,
  IconExternal,
}) {
  const ExternalIcon = IconExternal;

  return (
    <div className="portal-links-hover-menu">
      <div className="portal-links-hover-menu__column">
        <div className="portal-dropdown-head">
          <strong>Internal links</strong>
          <span>{loading ? "Loading..." : `${apps.length} items`}</span>
        </div>

        <div className="portal-links-hover-menu__list">
          {error ? <div className="portal-dropdown-empty">{error}</div> : null}

          {!error && loading ? (
            <div className="portal-dropdown-empty">Loading links...</div>
          ) : null}

          {!error && !loading && apps.length === 0 ? (
            <div className="portal-dropdown-empty">No links yet.</div>
          ) : null}

          {!error && !loading && apps.map((app) => (
            <a
              key={app.id}
              href={app.url}
              target="_blank"
              rel="noreferrer"
              className="portal-links-hover-menu__item"
            >
              <span className="portal-dropdown-appicon">
                {app.icon ? <img src={app.icon} alt={app.name} /> : app.name.slice(0, 1)}
              </span>
              <span>{app.name}</span>
              <span className="portal-links-hover-menu__arrow">
                {ExternalIcon ? <ExternalIcon /> : null}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DocumentHoverMenu({
  activeMenuType,
  activeMenuDepartment,
  shouldShowMenuFileColumn,
  documentTypes,
  loadingForms,
  errorForms,
  departments,
  loadingDepartments,
  errorDepartments,
  activeMenuForms,
  activeMenuFormsLoading,
  activeMenuFormsError,
  onMouseEnter,
  onMouseLeave,
  onHoverType,
  onHoverDepartment,
  onPreview,
  onDownload,
  FileTypeBadge,
  FileActions,
  IconFileText,
  IconBuilding,
  IconArrowRight,
}) {
  const FileTextIcon = IconFileText;
  const BuildingIcon = IconBuilding;
  const ArrowRightIcon = IconArrowRight;

  return (
    <div
      className={`portal-document-hover-menu ${activeMenuType ? "has-type" : ""} ${shouldShowMenuFileColumn ? "has-file-panel" : ""} ${activeMenuDepartment ? "has-department" : ""}`.trim()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="portal-document-hover-menu__column">
        <div className="portal-dropdown-head">
          <strong>Document Type</strong>
          <span>{loadingForms ? "Loading..." : `${documentTypes.length} items`}</span>
        </div>

        <div className="portal-document-hover-menu__list">
          {errorForms ? <div className="portal-dropdown-empty">{errorForms}</div> : null}

          {!errorForms && loadingForms ? (
            <div className="portal-dropdown-empty">Loading document types...</div>
          ) : null}

          {!errorForms && !loadingForms && documentTypes.length === 0 ? (
            <div className="portal-dropdown-empty">No document types.</div>
          ) : null}

          {!errorForms && !loadingForms && documentTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`portal-document-hover-menu__item ${
                activeMenuType?.id === type.id ? "is-active" : ""
              }`}
              onMouseEnter={() => onHoverType(type)}
            >
              <span className="portal-dropdown-folder">
                {FileTextIcon ? <FileTextIcon /> : null}
              </span>
              <span>{type.name}</span>
              <span className="portal-document-hover-menu__arrow">
                {ArrowRightIcon ? <ArrowRightIcon /> : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeMenuType ? (
        <div className="portal-document-hover-menu__column portal-document-hover-menu__column--departments">
          <div className="portal-dropdown-head">
            <strong>Department</strong>
            <span>{loadingDepartments ? "Loading..." : `${departments.length} items`}</span>
          </div>

          <div className="portal-document-hover-menu__list">
            {errorDepartments ? <div className="portal-dropdown-empty">{errorDepartments}</div> : null}

            {!errorDepartments && loadingDepartments ? (
              <div className="portal-dropdown-empty">Loading departments...</div>
            ) : null}

            {!errorDepartments && !loadingDepartments && departments.length === 0 ? (
              <div className="portal-dropdown-empty">No departments.</div>
            ) : null}

            {!errorDepartments && !loadingDepartments && departments.map((department) => (
              <button
                key={department.id}
                type="button"
                className={`portal-document-hover-menu__item ${
                  activeMenuDepartment?.id === department.id ? "is-active" : ""
                }`}
                onMouseEnter={() => onHoverDepartment(activeMenuType, department)}
              >
                <span className="portal-dropdown-folder">
                  {BuildingIcon ? <BuildingIcon /> : null}
                </span>
                <span>{department.departmentName}</span>
                <span className="portal-document-hover-menu__arrow">
                  {ArrowRightIcon ? <ArrowRightIcon /> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {shouldShowMenuFileColumn ? (
        <div className="portal-document-hover-menu__column portal-document-hover-menu__column--files">
          <div className="portal-dropdown-head">
            <strong>Files</strong>
            <span>{!activeMenuDepartment ? "Select department" : activeMenuFormsLoading ? "Loading..." : `${activeMenuForms.length} files`}</span>
          </div>

          <div className="portal-document-hover-menu__files">
            {!activeMenuDepartment ? (
              <div className="portal-dropdown-empty">Hover a department to view files.</div>
            ) : null}

            {activeMenuDepartment && activeMenuFormsLoading ? (
              <div className="portal-dropdown-empty">Loading files...</div>
            ) : null}

            {activeMenuDepartment && activeMenuFormsError ? (
              <div className="portal-dropdown-empty">{activeMenuFormsError}</div>
            ) : null}

            {activeMenuDepartment && !activeMenuFormsLoading && !activeMenuFormsError && activeMenuForms.length === 0 ? (
              <div className="portal-dropdown-empty">No files found.</div>
            ) : null}

            {activeMenuDepartment && !activeMenuFormsLoading && !activeMenuFormsError && activeMenuForms.map((form) => (
              <div key={form.id} className="portal-document-hover-file">
                <div className="portal-document-hover-file__main">
                  {FileTypeBadge ? <FileTypeBadge item={form} /> : null}
                  <div>
                    <strong>{form.title}</strong>
                    <span>{form.typeName} • {form.departmentName}</span>
                  </div>
                </div>

                {FileActions ? (
                  <FileActions
                    item={form}
                    onPreview={onPreview}
                    onDownload={onDownload}
                    compact
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NoticeDescription({ content, title = "Notice Content", subTitle = "Full notice content", maxLength = 160 }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const html = String(content || "").trim();
  const text = stripNoticeHtml(html);
  const shouldShowMore = text.length > maxLength;

  useEffect(() => {
    if (!dialogOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setDialogOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen]);

  if (!text) return null;

  return (
    <>
      <div className="portal-notice-description">
        <p className="portal-notice-description__text">{text}</p>

        {shouldShowMore ? (
          <button
            type="button"
            className="portal-notice-description__toggle"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDialogOpen(true);
            }}
          >
            More
          </button>
        ) : null}
      </div>

      {dialogOpen && createPortal(
        <div
          className="portal-notice-more-backdrop"
          role="presentation"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="portal-notice-more-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Notice content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="portal-notice-more-dialog__head">
              <div>
                <strong>Notice Content</strong>
                <span>{title || subTitle}</span>
              </div>

              <button
                type="button"
                className="portal-notice-more-dialog__close"
                onClick={() => setDialogOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="portal-notice-more-dialog__body">
              <div
                className="portal-notice-more-dialog__paper"
                dangerouslySetInnerHTML={{
                  __html: sanitizeNoticeHtml(html || "<p>No content</p>"),
                }}
              />
            </div>

            <div className="portal-notice-more-dialog__actions">
              <button
                type="button"
                className="portal-notice-more-dialog__button"
                onClick={() => setDialogOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function NoticeHoverMenu({
  departments,
  loading,
  error,
  noticesApiBase,
  apiBaseUrl,
  onPreview,
  onDownload,
  FileTypeBadge,
  FileActions,
  formatDateTime,
  onLayoutChange,
  IconBuilding,
  IconArrowRight,
}) {
  const [activeDepartmentId, setActiveDepartmentId] = useState("");
  const [noticePanelSticky, setNoticePanelSticky] = useState(false);
  const [noticesByDepartment, setNoticesByDepartment] = useState({});
  const [loadingByDepartment, setLoadingByDepartment] = useState({});
  const [errorByDepartment, setErrorByDepartment] = useState({});
  const BuildingIcon = IconBuilding;
  const ArrowRightIcon = IconArrowRight;

  const activeDepartment = useMemo(
    () => departments.find((department) => department.id === activeDepartmentId) || null,
    [departments, activeDepartmentId],
  );

  const activeDepartmentKey = activeDepartment?.departmentName || "";
  const activeNotices = activeDepartmentKey ? noticesByDepartment[activeDepartmentKey] || [] : [];
  const activeLoading = activeDepartmentKey ? Boolean(loadingByDepartment[activeDepartmentKey]) : false;
  const activeError = activeDepartmentKey ? errorByDepartment[activeDepartmentKey] || "" : "";
  const hasNoticePanel = Boolean(activeDepartment || noticePanelSticky);

  useEffect(() => {
    onLayoutChange?.({
      hasDepartment: Boolean(activeDepartment),
      hasNoticePanel,
    });
  }, [activeDepartment, hasNoticePanel, onLayoutChange]);

  const fetchNoticesByDepartment = async (department, { force = false } = {}) => {
    if (!department?.departmentName) return;

    const key = department.departmentName;

    if (!force && noticesByDepartment[key]) return;

    setLoadingByDepartment((prev) => ({ ...prev, [key]: true }));
    setErrorByDepartment((prev) => ({ ...prev, [key]: "" }));

    try {
      const params = new URLSearchParams({
        userId: "",
        departmentName: department.departmentName,
        skipDepartmentFilter: "false",
        includeFeaturedPinned: "false",
        title: "",
        content: "",
        page: "0",
        size: "80",
      });

      const response = await fetch(`${noticesApiBase}/search?${params.toString()}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) throw new Error("Failed to fetch notices by department");

      const data = await response.json();
      const normalizedNotices = (data.content || [])
        .map((item) => normalizeNoticeItem(item, apiBaseUrl))
        .filter(Boolean);

      setNoticesByDepartment((prev) => ({ ...prev, [key]: normalizedNotices }));
    } catch (fetchError) {
      setErrorByDepartment((prev) => ({ ...prev, [key]: "Unable to load notices." }));
      setNoticesByDepartment((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingByDepartment((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleHoverDepartment = async (department) => {
    if (!department?.id) return;

    setActiveDepartmentId(department.id);
    setNoticePanelSticky(true);
    await fetchNoticesByDepartment(department);
  };

  return (
    <>
      <NoticeMoreStyles />

      <div
        className={`portal-notice-cascade-menu ${hasNoticePanel ? "has-notice-panel" : ""} ${activeDepartment ? "has-department" : ""}`.trim()}
      >
        <div className="portal-notice-cascade-menu__column">
          <div className="portal-dropdown-head">
            <strong>Department</strong>
            <span>{loading ? "Loading..." : `${departments.length} items`}</span>
          </div>

          <div className="portal-notice-cascade-menu__list">
            {error ? <div className="portal-dropdown-empty">{error}</div> : null}

            {!error && loading ? (
              <div className="portal-dropdown-empty">Loading departments...</div>
            ) : null}

            {!error && !loading && departments.length === 0 ? (
              <div className="portal-dropdown-empty">No departments.</div>
            ) : null}

            {!error && !loading && departments.map((department) => (
              <button
                key={department.id}
                type="button"
                className={`portal-notice-cascade-menu__item ${
                  activeDepartment?.id === department.id ? "is-active" : ""
                }`}
                onMouseEnter={() => handleHoverDepartment(department)}
              >
                <span className="portal-dropdown-folder">
                  {BuildingIcon ? <BuildingIcon /> : null}
                </span>
                <span>{department.departmentName}</span>
                <span className="portal-notice-cascade-menu__arrow">
                  {ArrowRightIcon ? <ArrowRightIcon /> : null}
                </span>
              </button>
            ))}
          </div>
        </div>

        {hasNoticePanel ? (
          <div className="portal-notice-cascade-menu__column portal-notice-cascade-menu__column--notices">
            <div className="portal-dropdown-head">
              <strong>Notice</strong>
              <span>
                {!activeDepartment
                  ? "Select department"
                  : activeLoading
                    ? "Loading..."
                    : `${activeNotices.length} items`}
              </span>
            </div>

            <div className="portal-notice-cascade-menu__notices">
              {!activeDepartment ? (
                <div className="portal-dropdown-empty">Hover a department to view notices.</div>
              ) : null}

              {activeDepartment && activeLoading ? (
                <div className="portal-dropdown-empty">Loading notices...</div>
              ) : null}

              {activeDepartment && activeError ? (
                <div className="portal-dropdown-empty">{activeError}</div>
              ) : null}

              {activeDepartment && !activeLoading && !activeError && activeNotices.length === 0 ? (
                <div className="portal-dropdown-empty">No notices found.</div>
              ) : null}

              {activeDepartment && !activeLoading && !activeError && activeNotices.map((notice) => (
                <div key={notice.id} className="portal-notice-cascade-card">
                  <div className="portal-notice-cascade-card__main">
                    {FileTypeBadge ? <FileTypeBadge item={notice} /> : null}
                    <div>
                      <strong>{notice.title}</strong>
                      <span>
                        {notice.departmentName || activeDepartment.departmentName}
                        {notice.createdAt && formatDateTime ? ` • ${formatDateTime(notice.createdAt)}` : ""}
                      </span>
                      {notice.content ? (
                        <NoticeDescription
                          content={notice.content}
                          title={notice.title}
                          subTitle={notice.departmentName || activeDepartment.departmentName}
                        />
                      ) : null}
                    </div>
                  </div>

                  {FileActions ? (
                    <FileActions
                      item={notice}
                      onPreview={onPreview}
                      onDownload={onDownload}
                      compact
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
