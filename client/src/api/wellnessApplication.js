import API from "./api";

const unwrap = (res) => res?.data;

const withParams = (params = {}) => ({ params });

const withCreds = (params = {}) => ({ params, withCredentials: true });

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

/* =========================
   WELLNESS APPLICATIONS (Employee / Admin)
========================= */

export const addWellnessApplicationRequest = async (payload) => {
  try {
    const res = await API.post("/wellness/applications/apply", payload, {
      withCredentials: true,
    });
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to submit Wellness Leave application");
  }
};

export const fetchAllWellnessApplications = async (params = {}) => {
  try {
    const res = await API.get("/wellness/applications/all", withCreds(params));
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch Wellness Leave applications");
  }
};

export const fetchMyWellnessApplications = async (params = {}) => {
  try {
    const res = await API.get(
      "/wellness/applications/my-application",
      withCreds(params),
    );

    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch your Wellness Leave applications");
  }
};

export const fetchEmployeeWellnessApplications = async (
  employeeId,
  params = {},
) => {
  try {
    const res = await API.get(
      `/wellness/applications/employee/${employeeId}`,
      withCreds(params),
    );

    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch employee's Wellness Leave applications");
  }
};

// ✅ NEW: Fetch a specific Wellness application by ID (Admin/HR View)
export const fetchWellnessApplicationById = async (applicationId) => {
  try {
    const res = await API.get(
      `/wellness/applications/${applicationId}`,
      withCreds(),
    );
    return unwrap(res)?.data ?? unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch Wellness Leave application details");
  }
};

export const cancelWellnessApplicationRequest = async (id) => {
  try {
    const res = await API.patch(
      `/wellness/applications/${id}/cancel`,
      {},
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to cancel Wellness Leave application");
  }
};

// ✅ Follow-up Request
export const followUpWellnessApplicationRequest = async (applicationId) => {
  try {
    const res = await API.post(
      `/wellness/applications/${applicationId}/follow-up`,
      {},
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to send follow-up request");
  }
};

// ✅ NEW: Fetch Revocation Requests for HR Dashboard
export const fetchWellnessRevocationRequests = async (params = {}) => {
  try {
    const res = await API.get(
      "/wellness/applications/revocations",
      withCreds(params),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch wellness revocation requests");
  }
};

// ✅ NEW: Step 1 - Employee requests revocation
export const requestRevocationWellness = async (applicationId, payload) => {
  try {
    const res = await API.post(
      `/wellness/applications/${applicationId}/revoke-request`,
      payload, // expects { reason, attachmentUrl }
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to request revocation");
  }
};

// ✅ NEW: Step 2 - HR approves or rejects revocation request
export const processRevocationWellnessRequest = async (
  applicationId,
  payload,
) => {
  try {
    const res = await API.patch(
      `/wellness/applications/${applicationId}/revoke-process`,
      payload, // expects { action: "APPROVE" | "REJECT", remarks }
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to process revocation request");
  }
};

/* =========================
   WELLNESS APPROVERS FLOW
========================= */

export const fetchPendingWellnessCount = async () => {
  try {
    const res = await API.get(
      "/wellness/applications/pending-count",
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch pending Wellness Leave count");
  }
};

export const fetchMyWellnessApplicationsApprovals = async (params = {}) => {
  try {
    const res = await API.get(
      "/wellness/applications/approvers/my-approvals",
      withCreds(params),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch your Wellness Leave approvals");
  }
};

export const getWellnessApplicationById = async (id) => {
  try {
    console.log(id);
    const res = await API.get(`/wellness/applications/${id}`, withCreds());
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch Wellness Leave application details");
  }
};

export const approveWellnessApplicationRequest = async (applicationId) => {
  try {
    const res = await API.post(
      `/wellness/applications/approver/${applicationId}/approve`,
      {},
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to approve Wellness Leave application");
  }
};

export const rejectWellnessApplicationRequest = async (
  applicationId,
  remarks,
) => {
  try {
    const res = await API.put(
      `/wellness/applications/approver/${applicationId}/reject`,
      { remarks },
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to reject Wellness Leave application");
  }
};

/* =========================
   WELLNESS CREDITS (HR / Admin)
========================= */

export const fetchWellnessEmployeeDetails = async (employeeId) => {
  try {
    const res = await API.get(
      `/wellness/credits/employee-details/${employeeId}`,
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch employee details for Wellness crediting");
  }
};

export const addWellnessCreditRequest = async (payload) => {
  try {
    // Uses standard JSON payload since file uploads were removed
    const res = await API.post("/wellness/credits/add", payload, withCreds());
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to add Wellness Credits");
  }
};

export const rollbackWellnessCreditRequest = async (creditId) => {
  try {
    const res = await API.put(
      `/wellness/credits/${creditId}/rollback`,
      {},
      withCreds(),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to rollback Wellness Credit");
  }
};

export const fetchAllWellnessCredits = async (params = {}) => {
  try {
    const res = await API.get("/wellness/credits/all", withCreds(params));
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch all Wellness Credits");
  }
};

export const fetchEmployeeWellnessCredits = async (employeeId, params = {}) => {
  try {
    const res = await API.get(
      `/wellness/credits/employee/${employeeId}`,
      withCreds(params),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch employee's Wellness Credits");
  }
};

export const fetchMyWellnessCredits = async (params = {}) => {
  try {
    const res = await API.get(
      "/wellness/credits/my-credits",
      withCreds(params),
    );
    return unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch your Wellness Credits");
  }
};

/* =========================
   DASHBOARD
========================= */

export const fetchWellnessDashboard = async () => {
  try {
    const res = await API.get("/wellness/dashboard", withCreds());

    console.log(res.data);
    return unwrap(res)?.data ?? unwrap(res);
  } catch (err) {
    safeError(err, "Failed to fetch Wellness Leave dashboard summary");
  }
};
