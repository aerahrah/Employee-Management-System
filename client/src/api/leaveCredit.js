import API from "./api"; // Correctly importing your custom Axios instance

// Adjust the base URL depending on how you mounted the router in server.js
// e.g., if you mounted it as app.use("/api/leave-credit", leaveCreditRoutes)
const BASE_URL = "/leave";

/**
 * Get basic employee details for the crediting form
 * @param {string} employeeId
 */
export const getEmployeeDetails = async (employeeId) => {
  const response = await API.get(`${BASE_URL}/employee-details/${employeeId}`);
  return response.data;
};

/**
 * Add Leave Credits (VL/SL) to employees
 * Uses FormData to support file uploads via multer
 * @param {Object} payload
 */
export const addLeaveCreditRequest = async (payload) => {
  const formData = new FormData();

  // Append standard text fields
  if (payload.leaveType) formData.append("leaveType", payload.leaveType);
  if (payload.days) formData.append("days", payload.days); // Or hours if your backend uses hours
  if (payload.memoNo) formData.append("memoNo", payload.memoNo);
  if (payload.dateApproved)
    formData.append("dateApproved", payload.dateApproved);
  if (payload.clientRequestId)
    formData.append("clientRequestId", payload.clientRequestId);

  // Arrays must be stringified when sent via FormData
  if (payload.employees && Array.isArray(payload.employees)) {
    formData.append("employees", JSON.stringify(payload.employees));
  }

  // Append the actual file if it was provided
  if (payload.file) {
    formData.append("file", payload.file);
  }

  const response = await API.post(`${BASE_URL}/add`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/**
 * Rollback a credited memo
 * @param {string} creditId
 */
export const rollbackLeaveCreditRequest = async (creditId) => {
  const response = await API.put(`${BASE_URL}/${creditId}/rollback`);
  return response.data;
};

/**
 * Update Leave Balances directly (Organic employees only)
 * @param {string} employeeId
 * @param {Object} payload - { vlDays: number, slDays: number }
 */
export const updateLeaveBalances = async (employeeId, payload) => {
  const response = await API.put(
    `${BASE_URL}/employee/${employeeId}/balances`,
    payload,
  );
  return response.data;
};

/**
 * Get a list of all credited memos (Admin/HR view)
 * @param {Object} params - page, limit, search, status, leaveType
 */
export const getAllLeaveCreditRequests = async (params = {}) => {
  const response = await API.get(`${BASE_URL}/all`, { params });
  return response.data;
};

/**
 * Get credit history for a specific employee (Admin/HR view)
 * @param {Object} options
 * @param {string} options.employeeId
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} options.search
 * @param {string} options.status
 * @param {string} options.leaveType
 */
export const getEmployeeLeaveCredits = async ({ employeeId, ...params }) => {
  if (!employeeId) throw new Error("Employee ID is required");
  const response = await API.get(`${BASE_URL}/employee/${employeeId}`, {
    params,
  });
  return response.data;
};

/**
 * Get personal credit history (Self-service view)
 * @param {Object} params - page, limit, search, status, leaveType
 */
export const getMyLeaveCredits = async (params = {}) => {
  const response = await API.get(`${BASE_URL}/my-credits`, { params });
  return response.data;
};
