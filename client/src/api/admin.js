import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000',
});

export const loginAdmin = async (credentials) => {
  const res = await API.post('/admin/login', credentials);
  return res.data;
};