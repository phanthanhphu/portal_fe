import React, { useEffect, useMemo, useState } from "react";

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

function NoticeDescription({ content, maxLength = 120 }) {
  const [expanded, setExpanded] = useState(false);
  const text = String(content || "").trim();

  if (!text) return null;

  const shouldCollapse = text.length > maxLength;

  return (
    <div className={`portal-notice-description `.trim()}>
      <p className="portal-notice-description__text">{text}</p>

      {shouldCollapse ? (
        <button
          type="button"
          className="portal-notice-description__toggle"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          aria-expanded={expanded}
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      ) : null}
    </div>
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
                    {notice.content ? <NoticeDescription content={notice.content} /> : null}
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
  );
}
