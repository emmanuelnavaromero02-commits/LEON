// Auth domain types — Phase 1 (client authentication).
// Typing for the rest of the API surface arrives in a later phase.

export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'INSTRUCTOR'
  | 'REVIEWER'
  | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string; // "bearer"
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
  tenant_slug?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  tenant_slug?: string;
}

// Body for POST /api/academy/onboarding — creates/updates the profile of the
// authenticated user (identity comes from the bearer token, not the body).
export interface OnboardingPayload {
  background: string;
  preferred_style: string;
  weekly_time_minutes: number;
  exam_deadline?: string;
  confidence_level: number;
  target_certification_id?: string;
}
