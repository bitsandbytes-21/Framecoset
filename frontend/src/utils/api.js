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

export const checkEvaluation = async (contentId, userId, areaType = 'marketing') => {
  const response = await api.get('/check-evaluation', {
    params: { content_id: contentId, user_id: userId, area_type: areaType }
  });
  return response.data;
};

// Repository endpoints now return BOTH `items` (one entry per content_id with
// all its evaluations attached) and `evaluations` (the raw per-row list, kept
// for any caller that still wants flat data).
export const getRepository = async () => {
  const response = await api.get('/repository');
  return response.data;
};

export const getPoliticalRepository = async () => {
  const response = await api.get('/political-repository');
  return response.data;
};

export const getUnannotated = async () => {
  const response = await api.get('/unannotated');
  return response.data;
};

// Fetch every evaluation submitted against a single piece of content. Used by
// the Stats page when a user clicks an image to see all annotators' scores.
export const getContentEvaluations = async (contentId, areaType = 'marketing') => {
  const response = await api.get(`/content/${contentId}/evaluations`, {
    params: { area_type: areaType },
  });
  return response.data;
};

const buildStatsParams = (category, prompt) => {
  const params = {};
  if (category) params.category = category;
  if (prompt) params.prompt = prompt;
  return params;
};

export const getStats = async (category, prompt) => {
  const response = await api.get('/stats', {
    params: buildStatsParams(category, prompt),
  });
  return response.data;
};

export const getPoliticalStats = async (category, prompt) => {
  const response = await api.get('/political-stats', {
    params: buildStatsParams(category, prompt),
  });
  return response.data;
};

// Trigger an Excel download in the browser. ``areaType`` is one of
// 'marketing', 'political', or 'all'. Optional ``category`` and ``prompt``
// filters narrow the rows written to the workbook.
export const downloadEvaluationsExcel = async (areaType, category, prompt) => {
  const response = await api.get(`/export/${areaType}`, {
    params: buildStatsParams(category, prompt),
    responseType: 'blob',
  });

  // Pull filename out of Content-Disposition if present, otherwise build one.
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const fallback = `${areaType}_evaluations${category ? `_${category}` : ''}.xlsx`;
  const filename = match ? match[1] : fallback;

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
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
