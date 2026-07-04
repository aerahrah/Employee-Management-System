import API from "./api"; // Update this path to where your Axios instance is located

/**
 * =========================================
 * CALENDAR API SERVICES
 * =========================================
 */

/**
 * Fetch the logged-in employee's personal calendar events.
 * * @param {Object} params - Optional query parameters
 * @param {string} [params.status] - Filter by status (e.g., "APPROVED", "PENDING", "REJECTED")
 * @returns {Promise<Object>} The API response data containing the events array
 */
export const getMyCalendarEvents = async (params = {}) => {
  try {
    const response = await API.get("/calendar/my-events", { params });
    return response.data; // Returns { success, count, data: [...] }
  } catch (error) {
    console.error("Error fetching personal calendar events:", error);
    throw error;
  }
};

/**
 * Fetch all employees' calendar events.
 * Requires the 'calendar.view_all' role permission.
 * * @param {Object} params - Optional query parameters
 * @param {string} [params.status] - Filter by status (e.g., "APPROVED", "PENDING")
 * @param {string} [params.employeeId] - Filter by a specific employee's ID
 * @returns {Promise<Object>} The API response data containing the events array
 */
export const getAllCalendarEvents = async (params = {}) => {
  try {
    const response = await API.get("/calendar/all", { params });
    return response.data; // Returns { success, count, data: [...] }
  } catch (error) {
    console.error("Error fetching all calendar events:", error);
    throw error;
  }
};
