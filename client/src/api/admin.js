import API from "./api";

export const loginAdmin = async (credentials) => {
  const res = await API.post("/admin/login", credentials);
  return res.data;
};
