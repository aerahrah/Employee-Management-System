import API from "./api";

export const addCreditRequest = async (formData) => {
  const res = await API.post("/cto/credits", formData);
  return res.data;
};

export const fetchAllCreditRequests = async () => {
  const res = await API.get("/cto/credits/all", {
    withCredentials: true,
  });
  return res.data.credits;
};

export const fetchRecentCreditRequest = async () => {
  const res = await API.get("/cto/credits/recent", {
    withCredentials: true,
  });
  return res.data.credits;
};

export const cancelCreditRequest = async (creditId) => {
  const res = await API.patch(
    `/cto/credits/${creditId}/cancel`,
    {},
    {
      withCredentials: true,
    }
  );
  return res.data.credit;
};

export const rollbackCreditCto = async (creditId) => {
  const res = await API.patch(
    `/cto/credits/${creditId}/rollback`,
    {},
    {
      withCredentials: true,
    }
  );
  return res.data.credit;
};
