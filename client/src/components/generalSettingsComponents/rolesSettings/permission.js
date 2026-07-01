// src/components/roles/permission.js

export const SUPER_ADMIN_PERM = "*";

export const PERMISSION_GROUPS = [
  {
    name: "Employee Management",
    permissions: [
      {
        id: "employees.view",
        label: "View Employees",
        hint: "Access the employee directory.",
      },
      {
        id: "employees.create",
        label: "Create Employees",
        hint: "Add new employees to the system.",
      },
      {
        id: "employees.edit",
        label: "Edit Employees",
        hint: "Modify existing employee records.",
      },
      {
        id: "employees.delete",
        label: "Delete Employees",
        hint: "Remove employees from the system.",
      },
      {
        id: "employees.change_role",
        label: "Change Roles",
        hint: "Assign new roles to employees.",
      },
    ],
  },
  {
    name: "Self Service",
    permissions: [
      {
        id: "employees.view_self",
        label: "View Own Profile",
        hint: "View personal profile details.",
      },
      {
        id: "employees.edit_self",
        label: "Edit Own Profile",
        hint: "Update personal contact details.",
      },
      {
        id: "employees.upload_signature",
        label: "Upload Signature",
        hint: "Upload an e-signature.",
      },
      {
        id: "employees.reset_password_self",
        label: "Change Password",
        hint: "Allow user to change their password.",
      },
    ],
  },
  {
    name: "CTO & Leaves",
    permissions: [
      {
        id: "cto.view_self",
        label: "View Own CTO",
        hint: "View personal CTO records.",
      },
      {
        id: "cto.create",
        label: "Apply for CTO",
        hint: "Submit a CTO application.",
      },
      {
        id: "cto.credits_manage",
        label: "Manage CTO Credits",
        hint: "Add or rollback CTO credits.",
      },
      {
        id: "cto.credits_view",
        label: "View Global Credits",
        hint: "View all employee CTO balances.",
      },
      {
        id: "cto.applications_view",
        label: "View All Applications",
        hint: "View global CTO application list.",
      },
      {
        id: "cto.records_view",
        label: "View Employee Records",
        hint: "View specific employee CTO history.",
      },
      {
        id: "cto.view_application",
        label: "Approver: View Assigned",
        hint: "View CTO applications assigned for approval.",
      },
      {
        id: "cto.manage_application",
        label: "Approver: Manage Assigned",
        hint: "Approve or reject assigned CTO applications.",
      },
      {
        id: "cto.dashboard.self_view",
        label: "Dashboard: Personal",
        hint: "Access the personal CTO dashboard.",
      },
    ],
  },
  {
    name: "Wellness Leaves",
    permissions: [
      {
        id: "wellness.view_self",
        label: "View Own Wellness",
        hint: "View personal wellness records.",
      },
      {
        id: "wellness.manage",
        label: "Add Credited Wellness Leave",
        hint: "View all Credited Wellness Leave",
      },
      {
        id: "wellness.manage_self",
        label: "Apply for Wellness",
        hint: "Submit wellness leave applications.",
      },
      {
        id: "wellness.view_all",
        label: "View All Applications",
        hint: "View global wellness application list.",
      },
      {
        id: "wellness.view_application",
        label: "Approver: View Assigned",
        hint: "View wellness applications assigned for approval.",
      },
      {
        id: "wellness.manage_application",
        label: "Approver: Manage Assigned",
        hint: "Approve or reject assigned wellness applications.",
      },
      {
        id: "wellness.dashboard.self_view",
        label: "Dashboard: Personal",
        hint: "Access the personal wellness dashboard:",
      },
    ],
  },
  {
    name: "System & Administration",
    permissions: [
      {
        id: "admin.view",
        label: "Admin Dashboard",
        hint: "Access the master Admin Dashboard.",
      },
      {
        id: "audit.view",
        label: "View Audit Logs",
        hint: "Read-only access to system audit logs.",
      },
    ],
  },
  {
    name: "Settings & Configuration",
    permissions: [
      // {
      //   id: "settings.view",
      //   label: "View Settings",
      //   hint: "Access the settings hub.",
      // },
      // {
      //   id: "settings.edit",
      //   label: "Edit Legacy Settings",
      //   hint: "Edit standard legacy configurations.",
      // },
      {
        id: "settings.general",
        label: "Core Settings",
        hint: "Edit working days and core settings.",
      },
      {
        id: "settings.sessions",
        label: "Session Settings",
        hint: "Manage session timeouts.",
      },
      {
        id: "settings.email",
        label: "Email Settings",
        hint: "Configure system email notifications.",
      },
      {
        id: "settings.cto_workflow",
        label: "Workflow Routes",
        hint: "Manage approval route templates.",
      },
    ],
  },
  {
    name: "Resource Management",
    permissions: [
      {
        id: "designations.manage",
        label: "Manage Designations",
        hint: "Create, edit, or delete designations.",
      },
      {
        id: "roles.view",
        label: "View Roles",
        hint: "View existing roles in the system.",
      },
      {
        id: "roles.manage",
        label: "Manage Roles",
        hint: "Create, edit, or delete roles.",
      },
      {
        id: "projects.manage",
        label: "Manage Projects",
        hint: "Create, edit, or delete projects.",
      },
      {
        id: "backups.manage",
        label: "Manage Backups",
        hint: "Trigger system backups and restores.",
      },

      // ✅ Added Salary Grade Permissions Here
      {
        id: "salary_grades.view",
        label: "View Salary Grades",
        hint: "View the master salary grade table.",
      },
      {
        id: "salary_grades.manage",
        label: "Manage Salary Grades",
        hint: "Edit and update salary grade monetary amounts.",
      },
    ],
  },
];
