import axios, { AxiosError } from 'axios';
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '@/types/auth';
import type {
  AIGenerationPayload,
  AIGenerationResponse,
  AuditEvent,
  CreateKnowledgeDocumentPayload,
  CreateMCPServerPayload,
  CreateSecretPayload,
  DashboardData,
  DiagnosticAnswer,
  DiagnosticResult,
  DiagnosticStartResponse,
  ExamStartResponse,
  ImportPackResponse,
  KnowledgeDocument,
  Lesson,
  LessonSubmission,
  MarketplacePack,
  MCPServer,
  MCPTool,
  Mission,
  NextPracticeResponse,
  NotebookEntry,
  OnboardingResponse,
  PracticeResult,
  PracticeSubmission,
  ReadinessStats,
  ReviewActionResponse,
  ReviewQuestion,
  ReviewStatus,
  Secret,
  SystemStatus,
  WeakTopic,
} from '@/types/api';
import type { OnboardingPayload } from '@/types/auth';
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
  onboarding: (data: OnboardingPayload) =>
    api.post<OnboardingResponse>('/api/academy/onboarding', data),
  getDashboard: (userId: string) =>
    api.get<DashboardData>(`/api/academy/dashboard/${userId}`),
  getNextLesson: (userId: string) =>
    api.get<Lesson>(`/api/academy/lesson/next/${userId}`),
  submitLesson: (userId: string, data: LessonSubmission) =>
    api.post<PracticeResult>(`/api/academy/lesson/submit/${userId}`, data),
  startDiagnostic: (userId: string) =>
    api.post<DiagnosticStartResponse>(`/api/academy/diagnostic/start/${userId}`),
  submitDiagnostic: (userId: string, answers: DiagnosticAnswer[]) =>
    api.post<DiagnosticResult>(`/api/academy/diagnostic/submit/${userId}`, answers),
  getNextPractice: (userId: string) =>
    api.get<NextPracticeResponse>(`/api/academy/practice/next/${userId}`),
  submitPractice: (userId: string, data: PracticeSubmission) =>
    api.post<PracticeResult>(`/api/academy/practice/submit/${userId}`, data),
  startExam: (userId: string) =>
    api.post<ExamStartResponse>(`/api/academy/exam/start/${userId}`),

  // Student Stats & Readiness
  getReadiness: (userId: string) =>
    api.get<ReadinessStats>(`/api/academy/learning-stats/readiness/${userId}`),
  getMissions: (userId: string) =>
    api.get<Mission[]>(`/api/academy/learning-stats/missions/${userId}`),
  getNotebook: (userId: string) =>
    api.get<NotebookEntry[]>(`/api/academy/learning-stats/notebook/${userId}`),
  getWeakTopics: (userId: string) =>
    api.get<WeakTopic[]>(`/api/academy/learning-stats/weak-topics/${userId}`),

  // Admin — control room
  getSystemStatus: () => api.get<SystemStatus>('/api/admin/control-room/status'),

  // Admin — marketplace
  getPacks: () => api.get<MarketplacePack[]>('/api/admin/marketplace/packs'),
  importPack: (packId: string) =>
    api.post<ImportPackResponse>('/api/admin/marketplace/packs/import', { pack_id: packId }),

  // Admin — audit
  getAuditEvents: () => api.get<AuditEvent[]>('/api/admin/audit/events'),

  // Admin — secrets vault
  getSecrets: () => api.get<Secret[]>('/api/admin/secrets'),
  createSecret: (data: CreateSecretPayload) => api.post<Secret>('/api/admin/secrets', data),
  deleteSecret: (id: string) => api.delete<void>(`/api/admin/secrets/${id}`),

  // Admin — MCP registry
  getMCPServers: () => api.get<MCPServer[]>('/api/admin/mcp/servers'),
  createMCPServer: (data: CreateMCPServerPayload) =>
    api.post<MCPServer>('/api/admin/mcp/servers', data),
  getMCPServerTools: (id: string) =>
    api.get<MCPTool[]>(`/api/admin/mcp/servers/${id}/tools`),
  deleteMCPServer: (id: string) => api.delete<void>(`/api/admin/mcp/servers/${id}`),

  // Admin — knowledge base
  getKnowledgeDocuments: () =>
    api.get<KnowledgeDocument[]>('/api/admin/knowledge-base/documents'),
  createKnowledgeDocument: (data: CreateKnowledgeDocumentPayload) =>
    api.post<KnowledgeDocument>('/api/admin/knowledge-base/documents', data),
  deleteKnowledgeDocument: (id: string) =>
    api.delete<void>(`/api/admin/knowledge-base/documents/${id}`),

  // Admin — AI studio
  testAIGeneration: (data: AIGenerationPayload) =>
    api.post<AIGenerationResponse>('/api/admin/ai-studio/generate-test', data),

  // Admin — content studio (question review queue)
  getAdminQuestions: (status?: ReviewStatus) =>
    api.get<ReviewQuestion[]>('/api/admin/content-studio/questions', {
      params: status ? { status } : undefined,
    }),
  approveQuestion: (questionId: string) =>
    api.post<ReviewActionResponse>('/api/admin/content-studio/approve', {
      question_id: questionId,
    }),
  rejectQuestion: (questionId: string) =>
    api.post<ReviewActionResponse>('/api/admin/content-studio/reject', {
      question_id: questionId,
    }),
};

export default api;
