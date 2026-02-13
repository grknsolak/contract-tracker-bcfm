import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3000',
  withCredentials: true
});

export const me = () => api.get('/api/me');
export const login = (email, password) => api.post('/api/login', { email, password });
export const logout = () => api.post('/api/logout');

export const listContracts = () => api.get('/api/contracts');
export const addContract = (data) => api.post('/api/contracts', data);
export const updateContract = (id, data) => api.put(`/api/contracts/${id}`, data);
export const removeContract = (id) => api.delete(`/api/contracts/${id}`);

export const listCustomers = () => api.get('/api/customers');
export const addCustomer = (name, status) => api.post('/api/customers', { name, status });
export const updateCustomer = (id, name, status) => api.put(`/api/customers/${id}`, { name, status });
export const removeCustomer = (id) => api.delete(`/api/customers/${id}`);
export const syncCustomers = () => api.post('/api/customers/sync');

export const listRevenue = () => api.get('/api/revenue-history');
export const addRevenue = (data) => api.post('/api/revenue-history', data);
export const updateRevenue = (id, data) => api.put(`/api/revenue-history/${id}`, data);
export const removeRevenue = (id) => api.delete(`/api/revenue-history/${id}`);

export const listContractHistory = (customerId) => api.get(`/api/contract-history/${customerId}`);
export const addContractHistory = (data) => api.post('/api/contract-history', data);
export const removeContractHistory = (id) => api.delete(`/api/contract-history/${id}`);
