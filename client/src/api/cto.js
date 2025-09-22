import API from "./api";

export const addCreditRequest = async (formData) => {
  const res = await API.post("/cto/credits", formData);
  return res.data;
};
