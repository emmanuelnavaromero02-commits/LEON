import axios, { AxiosError } from 'axios';
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '@/types/auth';
import { clearSession, getToken } from '@/lib/auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 15000,
});

// Attach the bearer token (when present) to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 (missing/expired token) wipe the session and send the user to /login.
// Login/register 401s are handled inline by the form, not here.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isAuthAttempt = url.includes('/api/auth/login') || url.includes('/api/auth/register');
    if (status === 401 && !isAuthAttempt && typeof window !== 'undefined') {
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: RegisterPayload) => api.post<AuthResponse>('/api/auth/register', data),
  login: (data: LoginPayload) => api.post<AuthResponse>('/api/auth/login', data),
  me: () => api.get<AuthUser>('/api/auth/me'),
};

export const academyApi = {
  // Student APIs
  onboarding: (data: any) => api.post('/api/academy/onboarding', data),
  getDashboard: (userId: string) => api.get(`/api/academy/dashboard/${userId}`),
  getNextLesson: (userId: string) => api.get(`/api/academy/lesson/next/${userId}`),
  submitLesson: (userId: string, data: any) => api.post(`/api/academy/lesson/submit/${userId}`, data),
  startDiagnostic: (userId: string) => api.post(`/api/academy/diagnostic/start/${userId}`),
  submitDiagnostic: (userId: string, answers: any[]) => api.post(`/api/academy/diagnostic/submit/${userId}`, answers),
  getNextPractice: (userId: string) => api.get(`/api/academy/practice/next/${userId}`),
  submitPractice: (userId: string, data: any) => api.post(`/api/academy/practice/submit/${userId}`, data),
  startExam: (userId: string) => api.post(`/api/academy/exam/start/${userId}`),

  // Student Stats & Readiness
  getReadiness: (userId: string) => api.get(`/api/academy/learning-stats/readiness/${userId}`),
  getMissions: (userId: string) => api.get(`/api/academy/learning-stats/missions/${userId}`),
  getNotebook: (userId: string) => api.get(`/api/academy/learning-stats/notebook/${userId}`),
  getWeakTopics: (userId: string) => api.get(`/api/academy/learning-stats/weak-topics/${userId}`),

  // Admin APIs
  getSystemStatus: () => api.get('/api/admin/control-room/status'),
  getPacks: () => api.get('/api/admin/marketplace/packs'),
  importPack: (packId: string) => api.post('/api/admin/marketplace/packs/import', { pack_id: packId }),
  getAuditEvents: () => api.get('/api/admin/audit/events'),
  getSecrets: () => api.get('/api/admin/secrets'),
  createSecret: (data: any) => api.post('/api/admin/secrets', data),
  getMCPServers: () => api.get('/api/admin/mcp/servers'),
  testAIGeneration: (data: any) => api.post('/api/admin/ai-studio/generate-test', data),
  getAdminQuestions: () => api.get('/api/admin/content-studio/questions'),
};

export default api;
