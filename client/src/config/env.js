// Pull the base URL from Vite's environment variables, with a fallback to localhost
const defaultApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// Strip trailing slash if it exists to prevent double slashes (e.g., http://localhost:3000//api)
export const API_BASE_URL = String(defaultApiBaseUrl).replace(/\/$/, "");

export const buildApiUrl = (path = "") => {
  if (!path) {
    return API_BASE_URL;
  }

  const rawPath = String(path);

  // If the path is already a fully qualified external URL, return it as-is
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  // Ensure the path always starts with exactly one slash
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
