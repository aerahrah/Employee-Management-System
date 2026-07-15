import API from "./api";

const unwrap = (res) => res?.data;

const safeError = (err, fallback = "Request failed") => {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;
  const e = new Error(msg);
  e.status = err?.response?.status;
  throw e;
};

// Update this to match your Express server route (e.g., 'settings/revocation')
const BASE_PATH = "settings/revocation";

/**
 * Fetches the current global revocation settings (isEnabled and approvers array).
 * Maps to backend: GET /
 */
export const fetchRevocationSettings = async () => {
  try {
    const res = await API.get(BASE_PATH, {
      withCredentials: true,
    });
    return unwrap(res)?.data;
  } catch (err) {
    safeError(err, "Failed to fetch revocation settings");
  }
};

/**
 * Updates the global revocation settings.
 * Expected payload: { isEnabled: boolean, approvers: string[] }
 * Requires backend permission: settings.revocation_workflow
 * Maps to backend: PUT (or PATCH) /
 */
export const updateRevocationSettings = async (payload) => {
  try {
    const res = await API.put(BASE_PATH, payload, {
      withCredentials: true,
    });
    return unwrap(res)?.data;
  } catch (err) {
    safeError(err, "Failed to update revocation settings");
  }
};
