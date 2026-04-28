import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generateContent = async (data) => {
  const response = await api.post('/generate', data);
  return response.data;
};

export const saveEvaluation = async (data) => {
  const response = await api.post('/evaluate', data);
  return response.data;
};

export const savePoliticalEvaluation = async (data) => {
  const response = await api.post('/evaluate-political', data);
  return response.data;
};

export const checkEvaluation = async (contentId, userId) => {
  const response = await api.get('/check-evaluation', {
    params: { content_id: contentId, user_id: userId }
  });
  return response.data;
};

export const getRepository = async () => {
  const response = await api.get('/repository');
  return response.data;
};

export const getPoliticalRepository = async () => {
  const response = await api.get('/political-repository');
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

export const getPoliticalStats = async () => {
  const response = await api.get('/political-stats');
  return response.data;
};

export const getModels = async () => {
  const response = await api.get('/models');
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const getBiasCodes = async () => {
  const response = await api.get('/bias-codes');
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
