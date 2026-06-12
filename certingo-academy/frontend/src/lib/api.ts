import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

// Request Interceptor: Add Multi-Tenant Headers
api.interceptors.request.use((config) => {
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('certingo_tenant_id') || 'default-demo-tenant' : 'default-demo-tenant';
  config.headers['X-Tenant-ID'] = tenantId;
  config.headers['X-Request-Source'] = 'certingo-web-client';
  return config;
});

// Response Interceptor: Global Error Handling & Retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Simple retry logic for 503 errors (server booting)
    if (error.response?.status === 503 && !originalRequest._retry) {
      originalRequest._retry = true;
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(originalRequest);
    }

    if (error.response?.status === 401) {
       // Global redirect to onboarding if user is purged/invalid
       if (typeof window !== 'undefined') window.location.href = '/onboarding';
    }

    return Promise.reject(error);
  }
);

export const academyApi = {
  // Student APIs
  getActiveCertifications: () => api.get('/api/academy/certifications'),
  onboarding: (data: any) => api.post('/api/academy/onboarding', data),
  getDashboard: (userId: string, certId?: string) => api.get(`/api/academy/dashboard/${userId}`, { params: { cert_id: certId } }),
  getNextLesson: (userId: string, certId: string) => api.get(`/api/academy/lesson/next/${userId}`, { params: { cert_id: certId } }),
  submitLesson: (userId: string, data: any) => api.post(`/api/academy/lesson/submit/${userId}`, data),
  startDiagnostic: (userId: string, certId: string) => api.post(`/api/academy/diagnostic/start/${userId}`, null, { params: { cert_id: certId } }),
  submitDiagnostic: (userId: string, answers: any[]) => api.post(`/api/academy/diagnostic/submit/${userId}`, answers),
  getNextPractice: (userId: string, cert_id?: string) => api.get(`/api/academy/practice/next/${userId}`, { params: { cert_id } }),
  submitPractice: (userId: string, data: any) => api.post(`/api/academy/practice/submit/${userId}`, data),
  startExam: (userId: string, certId: string) => api.post(`/api/academy/exam/start/${userId}`, null, { params: { cert_id: certId } }),

  // Student Stats & Readiness
  getReadiness: (userId: string, certId: string) => api.get(`/api/academy/learning-stats/readiness/${userId}`, { params: { cert_id: certId } }),
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
  getAdminQuestions: () => api.get('/api/academy/admin/questions'),
};

export default api;
