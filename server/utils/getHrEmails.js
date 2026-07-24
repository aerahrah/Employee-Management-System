// utils/getHrEmails.js
const Employee = require("../models/employeeModel"); // Adjust path to your Employee model
const Role = require("../models/roleModel"); // Adjust path to your Role model

async function getRevocationApproverEmails() {
  try {
    // 1. Find all Roles that include the specific permission
    const rolesWithPermission = await Role.find({
      permissions: "revocation.manage_application",
    }).select("_id");

    // Extract the ObjectIds of those roles
    const roleIds = rolesWithPermission.map((role) => role._id);

    // If no roles have this permission, return an empty array early
    if (roleIds.length === 0) {
      return [];
    }

    // 2. Find all Active employees who hold any of those roles
    const approvers = await Employee.find({
      role: { $in: roleIds },
      status: "Active", // Using the 'status' enum from your Employee schema
    }).select("email");

    // 3. Extract the emails and filter out any null/undefined values
    return approvers.map((employee) => employee.email).filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch revocation approver emails:", error);
    return [];
  }
}

module.exports = { getRevocationApproverEmails };
