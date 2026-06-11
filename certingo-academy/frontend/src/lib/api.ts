import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

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
  getAdminQuestions: () => api.get('/api/academy/admin/questions'),
};

export default api;
