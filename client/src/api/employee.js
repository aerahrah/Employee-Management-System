import API from "./api";

export const addEmployee = async (credentials) => {
  const res = await API.post("/employee/", credentials);
  return res.data;
};

export const getEmployees = async () => {
  const res = await API.get("/employee/");
  console.log(res.data);
  return res.data;
};

export const getEmployeeById = async (id) => {
  const res = await API.get(`/employee/${id}`);
  return res.data;
};
