// constants/approvalRoles.js

const APPROVAL_ROLES = {
  RECOMMENDING_APPROVAL_INITIAL: "Recommending Approval Initial",
  RECOMMENDING_APPROVAL: "Recommending Approval",
  AFD_INITIAL: "AFD Chief Initial",
  AFD_SIGNATURE: "AFD Chief Signature",
  ARD_INITIAL: "ARD Initial",
  RD_SIGNATURE: "Regional Director Signature",
  HR_INITIAL: "HR Initial",
  HR_SIGNATURE: "HR Signature",
};

// Extracted array of just the string values for Mongoose enum validation
const APPROVAL_ROLE_VALUES = Object.values(APPROVAL_ROLES);

// Optional: A map of roles to their descriptions if you need to serve this to the frontend
const APPROVAL_ROLE_DESCRIPTIONS = {
  [APPROVAL_ROLES.RECOMMENDING_APPROVAL_INITIAL]:
    "Initial check before the main recommendation for approval.",
  [APPROVAL_ROLES.RECOMMENDING_APPROVAL]:
    "Initial review and recommendation for approval.",
  [APPROVAL_ROLES.AFD_INITIAL]: "Review by the Administrative Chief.",
  [APPROVAL_ROLES.AFD_SIGNATURE]:
    "Main signature for Finance/Admin operations.",
  [APPROVAL_ROLES.ARD_INITIAL]:
    "Final Review by the Assistant Regional Director.",
  [APPROVAL_ROLES.RD_SIGNATURE]: "Final approval by the Regional Director.",
  [APPROVAL_ROLES.HR_INITIAL]: "Initial check by Human Resources.",
  [APPROVAL_ROLES.HR_SIGNATURE]: "Signature of the HR Management Officer.",
};

module.exports = {
  APPROVAL_ROLES,
  APPROVAL_ROLE_VALUES,
  APPROVAL_ROLE_DESCRIPTIONS,
};
