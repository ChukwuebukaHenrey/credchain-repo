// ─────────────────────────────────────────────────────────────
// CredChain Frontend — API service
// A single global Axios instance targeting the backend (port 5000),
// plus a named async wrapper for every one of the 14 endpoints.
// Each wrapper includes a try/catch with error logging.
// ─────────────────────────────────────────────────────────────

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Global Axios instance.
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach the JWT (if present) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('credchain_token')) || null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server rejects our token (401), the session is no longer valid —
// drop the stored token so the UI falls back to the login screen.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('credchain_token');
      }
      console.warn('session expired');
    }
    return Promise.reject(error);
  }
);

// Shared error logger — keeps every wrapper consistent.
function logError(scope, error) {
  if (error.response) {
    console.error(`[api:${scope}] ${error.response.status}`, error.response.data);
  } else if (error.request) {
    console.error(`[api:${scope}] no response from server`, error.message);
  } else {
    console.error(`[api:${scope}] request error`, error.message);
  }
}

// ── Health ───────────────────────────────────────────────────
export async function healthCheck() {
  try {
    const { data } = await api.get('/health');
    return data;
  } catch (error) {
    logError('healthCheck', error);
    throw error;
  }
}

// ── AUTH ─────────────────────────────────────────────────────

// POST /api/auth/register
export async function register(payload) {
  try {
    const { data } = await api.post('/api/auth/register', payload);
    return data;
  } catch (error) {
    logError('register', error);
    throw error;
  }
}

// POST /api/auth/login
export async function login(payload) {
  try {
    const { data } = await api.post('/api/auth/login', payload);
    return data;
  } catch (error) {
    logError('login', error);
    throw error;
  }
}

// ── USERS / STUDENTS ─────────────────────────────────────────

// GET /api/student/:id
export async function getStudent(id) {
  try {
    const { data } = await api.get(`/api/student/${id}`);
    return data;
  } catch (error) {
    logError('getStudent', error);
    throw error;
  }
}

// PUT /api/student/profile
export async function updateStudentProfile(payload) {
  try {
    const { data } = await api.put('/api/student/profile', payload);
    return data;
  } catch (error) {
    logError('updateStudentProfile', error);
    throw error;
  }
}

// GET /api/student/profile/:credchainId
export async function getPublicProfile(credchainId) {
  try {
    const { data } = await api.get(`/api/student/profile/${credchainId}`);
    return data;
  } catch (error) {
    logError('getPublicProfile', error);
    throw error;
  }
}

// ── ISSUING ──────────────────────────────────────────────────

// POST /api/issuer/verify
export async function verifyIssuer(payload) {
  try {
    const { data } = await api.post('/api/issuer/verify', payload);
    return data;
  } catch (error) {
    logError('verifyIssuer', error);
    throw error;
  }
}

// POST /api/issuer/issueCredential
export async function issueCredential(payload) {
  try {
    const { data } = await api.post('/api/issuer/issueCredential', payload);
    return data;
  } catch (error) {
    logError('issueCredential', error);
    throw error;
  }
}

// ── VALIDATION (accept / reject) ─────────────────────────────

// POST /api/credential/accept/:id
export async function acceptCredential(id, payload = {}) {
  try {
    const { data } = await api.post(`/api/credential/accept/${id}`, payload);
    return data;
  } catch (error) {
    logError('acceptCredential', error);
    throw error;
  }
}

// POST /api/credential/reject/:id
export async function rejectCredential(id, payload = {}) {
  try {
    const { data } = await api.post(`/api/credential/reject/${id}`, payload);
    return data;
  } catch (error) {
    logError('rejectCredential', error);
    throw error;
  }
}

// ── CHAT ─────────────────────────────────────────────────────

// POST /api/chat/send
export async function sendChatMessage(payload) {
  try {
    const { data } = await api.post('/api/chat/send', payload);
    return data;
  } catch (error) {
    logError('sendChatMessage', error);
    throw error;
  }
}

// GET /api/chat/history/:userId
export async function getChatHistory(userId) {
  try {
    const { data } = await api.get(`/api/chat/history/${userId}`);
    return data;
  } catch (error) {
    logError('getChatHistory', error);
    throw error;
  }
}

// ── AI PROXY ─────────────────────────────────────────────────

// POST /api/ai/generateCV  (backend → ai-cv-engine :8001)
export async function generateCV(payload) {
  try {
    const { data } = await api.post('/api/ai/generateCV', payload);
    return data;
  } catch (error) {
    logError('generateCV', error);
    throw error;
  }
}

// POST /api/ai/analyzeSkills  (backend → ai-insights-engine :8002)
export async function analyzeSkills(payload) {
  try {
    const { data } = await api.post('/api/ai/analyzeSkills', payload);
    return data;
  } catch (error) {
    logError('analyzeSkills', error);
    throw error;
  }
}

// Convenience aggregate export.
export default {
  api,
  healthCheck,
  register,
  login,
  getStudent,
  updateStudentProfile,
  getPublicProfile,
  verifyIssuer,
  issueCredential,
  acceptCredential,
  rejectCredential,
  sendChatMessage,
  getChatHistory,
  generateCV,
  analyzeSkills,
};
