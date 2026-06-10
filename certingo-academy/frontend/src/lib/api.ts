import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

export const academyApi = {
  onboarding: (data: any) => api.post('/api/academy/onboarding', data),
  getDashboard: (userId: string) => api.get(`/api/academy/dashboard/${userId}`),
  getNextLesson: (userId: string) => api.get(`/api/academy/lesson/next/${userId}`),
  submitLesson: (userId: string, data: any) => api.post(`/api/academy/lesson/submit/${userId}`, data),
  startExam: (userId: string) => api.post(`/api/academy/exam/start/${userId}`),
  getAdminQuestions: () => api.get('/api/academy/admin/questions'),
  getCertificationSkills: (certId: string) => api.get(`/api/academy/certification/${certId}/skills`),
  startDiagnostic: (userId: string) => api.post(`/api/academy/diagnostic/start/${userId}`),
  submitDiagnostic: (userId: string, answers: any[]) => api.post(`/api/academy/diagnostic/submit/${userId}`, answers),
  getNextPractice: (userId: string) => api.get(`/api/academy/practice/next/${userId}`),
  submitPractice: (userId: string, data: any) => api.post(`/api/academy/practice/submit/${userId}`, data),
};

export default api;
