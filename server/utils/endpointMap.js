// utils/endpointMap.js

const endpointMap = [
  /* =========================
     Employee Routes
     Mounted: /employee
  ========================= */
  { pattern: /^\/employee$/, method: "POST", name: "Create Employee" },
  { pattern: /^\/employee$/, method: "GET", name: "View Employees" },
  { pattern: /^\/employee\/login$/, method: "POST", name: "Employee Login" },
  { pattern: /^\/employee\/logout$/, method: "POST", name: "Employee Logout" },

  {
    pattern: /^\/employee\/my-profile$/,
    method: "GET",
    name: "View My Profile",
  },
  {
    pattern: /^\/employee\/my-profile$/,
    method: "PUT",
    name: "Update My Profile",
  },
  {
    pattern: /^\/employee\/my-profile\/signature$/,
    method: "POST",
    name: "Upload Signature",
  },
  {
    pattern: /^\/employee\/my-profile\/reset-password$/,
    method: "PUT",
    name: "Reset My Password",
  },

  {
    pattern: /^\/employee\/memos\/me$/,
    method: "GET",
    name: "View My Memos",
  },
  {
    pattern: /^\/employee\/memos\/\w+$/,
    method: "GET",
    name: "View Employee Memos",
  },

  {
    pattern: /^\/employee\/my-wellness-balance$/,
    method: "GET",
    name: "View My Wellness Balance",
  },
  {
    pattern: /^\/employee\/\w+\/wellness-balance$/,
    method: "GET",
    name: "View Employee Wellness Balance",
  },

  {
    pattern: /^\/employee\/salary-grades$/,
    method: "GET",
    name: "View All Salary Grades",
  },
  {
    pattern: /^\/employee\/salary-grades\/\w+$/,
    method: "GET",
    name: "View Salary Grade Details",
  },
  {
    pattern: /^\/employee\/salary-grades\/\w+$/,
    method: "PUT",
    name: "Update Salary Grade",
  },

  {
    pattern: /^\/employee\/\w+$/,
    method: "GET",
    name: "View Employee Details",
  },
  { pattern: /^\/employee\/\w+$/, method: "PUT", name: "Update Employee" },
  {
    pattern: /^\/employee\/\w+\/role$/,
    method: "POST",
    name: "Update Employee Role",
  },

  /* =========================
     User Preferences Routes
     Mounted: /user-preferences
  ========================= */
  {
    pattern: /^\/settings\/preferences\/me$/,
    method: "GET",
    name: "View My Preferences",
  },
  {
    pattern: /^\/settings\/preferences\/me$/,
    method: "PATCH",
    name: "Update My Preferences",
  },
  {
    pattern: /^\/settings\/preferences\/me\/reset$/,
    method: "POST",
    name: "Reset My Preferences",
  },
  {
    pattern: /^\/settings\/preferences\/options$/,
    method: "GET",
    name: "View Preference Options",
  },

  /* =========================
     Wellness Routes
     Mounted: /wellness
  ========================= */
  // Wellness Applications
  {
    pattern: /^\/wellness\/applications\/apply$/,
    method: "POST",
    name: "Apply for Wellness Leave",
  },
  {
    pattern: /^\/wellness\/applications\/all$/,
    method: "GET",
    name: "View All Wellness Applications",
  },
  {
    pattern: /^\/wellness\/applications\/employee\/\w+$/,
    method: "GET",
    name: "View Employee Wellness Applications",
  },
  {
    pattern: /^\/wellness\/applications\/my-application$/,
    method: "GET",
    name: "View My Wellness Applications",
  },
  {
    pattern: /^\/wellness\/applications\/\w+\/cancel$/,
    method: "PATCH",
    name: "Cancel Wellness Application",
  },

  // Wellness Approvals
  {
    pattern: /^\/wellness\/applications\/pending-count$/,
    method: "GET",
    name: "View Pending Wellness Count",
  },
  {
    pattern: /^\/wellness\/applications\/approvers\/my-approvals$/,
    method: "GET",
    name: "View My Wellness Approvals",
  },
  {
    pattern: /^\/wellness\/applications\/approvers\/my-approvals\/\w+$/,
    method: "GET",
    name: "View Wellness Application Details",
  },
  {
    pattern: /^\/wellness\/applications\/approver\/\w+\/approve$/,
    method: "POST",
    name: "Approve Wellness Application",
  },
  {
    pattern: /^\/wellness\/applications\/approver\/\w+\/reject$/,
    method: "PUT",
    name: "Reject Wellness Application",
  },

  // Wellness Credits
  {
    pattern: /^\/wellness\/credits\/employee-details\/\w+$/,
    method: "GET",
    name: "View Employee Details (Wellness)",
  },
  {
    pattern: /^\/wellness\/credits\/add$/,
    method: "POST",
    name: "Add Wellness Credit Request",
  },
  {
    pattern: /^\/wellness\/credits\/\w+\/rollback$/,
    method: "PUT",
    name: "Rollback Wellness Credit",
  },
  {
    pattern: /^\/wellness\/credits\/all$/,
    method: "GET",
    name: "View All Wellness Credit Requests",
  },
  {
    pattern: /^\/wellness\/credits\/employee\/\w+$/,
    method: "GET",
    name: "View Employee Wellness Credit History",
  },
  {
    pattern: /^\/wellness\/credits\/my-credits$/,
    method: "GET",
    name: "View My Wellness Credits",
  },

  /* =========================
     CTO Routes
     Mounted: /cto
  ========================= */

  // Credits
  {
    pattern: /^\/cto\/credits$/,
    method: "POST",
    name: "Add CTO Credit Request",
  },
  {
    pattern: /^\/cto\/credits\/all$/,
    method: "GET",
    name: "View All Credit Requests",
  },
  {
    pattern: /^\/cto\/credits\/my-credits$/,
    method: "GET",
    name: "View My Credits",
  },
  {
    pattern: /^\/cto\/credits\/\w+\/history$/,
    method: "GET",
    name: "View Employee Credit History",
  },
  {
    pattern: /^\/cto\/credits\/\w+\/rollback$/,
    method: "PATCH",
    name: "Rollback CTO Credit",
  },
  {
    pattern: /^\/cto\/employee\/\w+\/details$/,
    method: "GET",
    name: "View Employee Details (CTO)",
  },

  // Applications
  {
    pattern: /^\/cto\/applications\/apply$/,
    method: "POST",
    name: "Apply for CTO",
  },
  {
    pattern: /^\/cto\/applications\/all$/,
    method: "GET",
    name: "View All CTO Applications",
  },
  {
    pattern: /^\/cto\/applications\/my-application$/,
    method: "GET",
    name: "View My CTO Applications",
  },
  {
    pattern: /^\/cto\/applications\/employee\/\w+$/,
    method: "GET",
    name: "View Employee CTO Applications",
  },
  {
    pattern: /^\/cto\/applications\/\w+\/cancel$/,
    method: "PATCH",
    name: "Cancel CTO Application",
  },

  // Approver flow
  {
    pattern: /^\/cto\/applications\/pending-count$/,
    method: "GET",
    name: "View Pending CTO Count",
  },
  {
    pattern: /^\/cto\/applications\/approvers$/,
    method: "GET",
    name: "View Approver Options",
  },
  {
    pattern: /^\/cto\/applications\/approvers\/my-approvals$/,
    method: "GET",
    name: "View My CTO Approvals",
  },
  {
    pattern: /^\/cto\/applications\/approvers\/my-approvals\/\w+$/,
    method: "GET",
    name: "View CTO Application Details",
  },
  {
    pattern: /^\/cto\/applications\/approver\/\w+\/approve$/,
    method: "POST",
    name: "Approve CTO Application",
  },
  {
    pattern: /^\/cto\/applications\/approver\/\w+\/reject$/,
    method: "PUT",
    name: "Reject CTO Application",
  },

  /* =========================
     CTO Dashboard
     Mounted: /cto (ctoDashboardRoutes)
  ========================= */
  { pattern: /^\/cto\/dashboard$/, method: "GET", name: "View Dashboard" },

  /* =========================
     CTO Approver Settings
     Mounted: /cto/settings
  ========================= */
  { pattern: /^\/cto\/settings$/, method: "GET", name: "View CTO Settings" },
  {
    pattern: /^\/cto\/settings\/\w+$/,
    method: "GET",
    name: "View CTO Setting By Designation",
  },
  {
    pattern: /^\/cto\/settings$/,
    method: "POST",
    name: "Upsert CTO Approver Setting",
  },
  {
    pattern: /^\/cto\/settings\/\w+$/,
    method: "DELETE",
    name: "Delete CTO Approver Setting",
  },

  /* =========================
     Designations
     Mounted: /settings/designation
  ========================= */
  {
    pattern: /^\/settings\/designation$/,
    method: "GET",
    name: "View All Designations",
  },
  {
    pattern: /^\/settings\/designation\/options$/,
    method: "GET",
    name: "View Designation Options",
  },
  {
    pattern: /^\/settings\/designation\/\w+$/,
    method: "GET",
    name: "View Designation Details",
  },
  {
    pattern: /^\/settings\/designation$/,
    method: "POST",
    name: "Create Designation",
  },
  {
    pattern: /^\/settings\/designation\/\w+$/,
    method: "PUT",
    name: "Update Designation",
  },
  {
    pattern: /^\/settings\/designation\/\w+\/status$/,
    method: "PATCH",
    name: "Update Designation Status",
  },
  {
    pattern: /^\/settings\/designation\/\w+$/,
    method: "DELETE",
    name: "Delete Designation",
  },

  /* =========================
     Projects
     Mounted: /settings/projects
  ========================= */
  {
    pattern: /^\/settings\/projects$/,
    method: "POST",
    name: "Create Project",
  },
  { pattern: /^\/settings\/projects$/, method: "GET", name: "View Projects" },
  {
    pattern: /^\/settings\/projects\/options$/,
    method: "GET",
    name: "View Project Options",
  },
  {
    pattern: /^\/settings\/projects\/\w+$/,
    method: "GET",
    name: "View Project Details",
  },
  {
    pattern: /^\/settings\/projects\/\w+$/,
    method: "PATCH",
    name: "Update Project",
  },
  {
    pattern: /^\/settings\/projects\/\w+\/status$/,
    method: "PATCH",
    name: "Update Project Status",
  },
  {
    pattern: /^\/settings\/projects\/\w+$/,
    method: "DELETE",
    name: "Delete Project",
  },

  /* =========================
     General Settings
     Mounted: /settings/general
  ========================= */
  {
    pattern: /^\/settings\/general\/session$/,
    method: "GET",
    name: "View Session Settings",
  },
  {
    pattern: /^\/settings\/general\/session$/,
    method: "PUT",
    name: "Update Session Settings",
  },
  {
    pattern: /^\/settings\/general\/working-days$/,
    method: "GET",
    name: "View Working Days Settings",
  },
  {
    pattern: /^\/settings\/general\/working-days$/,
    method: "PUT",
    name: "Update Working Days Settings",
  },

  /* =========================
     MongoDB Backup
     Mounted: /settings/mongodb
  ========================= */
  {
    pattern: /^\/settings\/mongodb$/,
    method: "GET",
    name: "List CTO Backups",
  },
  {
    pattern: /^\/settings\/mongodb$/,
    method: "POST",
    name: "Create CTO Backup",
  },
  {
    pattern: /^\/settings\/mongodb\/\w+\/download$/,
    method: "GET",
    name: "Download CTO Backup",
  },
  {
    pattern: /^\/settings\/mongodb\/restore$/,
    method: "POST",
    name: "Restore CTO Backup",
  },
  {
    pattern: /^\/settings\/mongodb\/[^/]+$/,
    method: "DELETE",
    name: "Delete CTO Backup",
  },

  /* =========================
     Email Notification Settings
     Mounted: /email-notification-settings
  ========================= */
  {
    pattern: /^\/email-notification-settings$/,
    method: "GET",
    name: "View Email Notification Settings",
  },
  {
    pattern: /^\/email-notification-settings\/[^/]+\/?$/,
    method: "PUT",
    name: "Update Email Notification Setting",
  },
];

const getEndpointName = (url, method) => {
  const match = endpointMap.find(
    (e) => e.method === method && e.pattern.test(url),
  );
  return match ? match.name : `${method} ${url}`;
};

module.exports = getEndpointName;
