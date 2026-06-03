// src/api/salaryGrade.js
import API from "./api";

export const fetchSalaryGrades = async (params = {}) => {
  const res = await API.get("/employee/salary-grades", {
    params,
    withCredentials: true,
  });
  return res.data;
};

export const getSalaryGradeById = async (id) => {
  const res = await API.get(`/employee/salary-grades/${id}`);
  return res.data;
};

export const updateSalaryGrade = async (id, amount) => {
  const res = await API.put(`/employee/salary-grades/${id}`, { amount });
  return res.data;
};
