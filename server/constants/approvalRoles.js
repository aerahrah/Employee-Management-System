// constants/approvalRoles.js

const APPROVAL_ROLES = {
  PO_INITIAL: "Provincial Officer Initial",
  PO_OPTIONAL: "Provincial Officer (Optional)",
  TOD_SIGNATURE: "TOD Chief Signature",
  AFD_INITIAL: "AFD Chief Initial",
  AFD_SIGNATURE: "AFD Chief Signature",
  ARD_INITIAL: "ARD Initial",
  RD_SIGNATURE: "Regional Director Signature",
  HRMO_SIGNATURE: "HRMO Signature",
};

// Extracted array of just the string values for Mongoose enum validation
const APPROVAL_ROLE_VALUES = Object.values(APPROVAL_ROLES);

// Optional: A map of roles to their descriptions if you need to serve this to the frontend
const APPROVAL_ROLE_DESCRIPTIONS = {
  [APPROVAL_ROLES.PO_INITIAL]: "First check by the Provincial Head.",
  [APPROVAL_ROLES.PO_OPTIONAL]: "Second PO check (only if needed).",
  [APPROVAL_ROLES.TOD_SIGNATURE]: "Main signature for Technical operations.",
  [APPROVAL_ROLES.AFD_INITIAL]: "Review by the Administrative Chief.",
  [APPROVAL_ROLES.AFD_SIGNATURE]:
    "Main signature for Finance/Admin operations.",
  [APPROVAL_ROLES.ARD_INITIAL]:
    "Final Review by the Assistant Regional Director.",
  [APPROVAL_ROLES.RD_SIGNATURE]: "Final approval by the Regional Director.",
  [APPROVAL_ROLES.HRMO_SIGNATURE]: "Signature of the HR Management Officer.",
};

module.exports = {
  APPROVAL_ROLES,
  APPROVAL_ROLE_VALUES,
  APPROVAL_ROLE_DESCRIPTIONS,
};
