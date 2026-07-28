const LEGACY_BASE_PATH = "/rentycar";

export function getAppBasePath() {
  if (typeof window === "undefined") return undefined;

  const path = window.location.pathname;
  return path === LEGACY_BASE_PATH || path.startsWith(`${LEGACY_BASE_PATH}/`)
    ? LEGACY_BASE_PATH
    : undefined;
}

export function getAppUrl(path = "/") {
  const basePath = getAppBasePath() ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
