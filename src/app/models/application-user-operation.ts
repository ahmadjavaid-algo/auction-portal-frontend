// models/application-user-operation.ts

export interface ApplicationUserOperation {
  userId: number;
  userName: string;
  firstName: string;
  email: string;

  passwordHash: string;
  oldPasswordHash: string;
  newPasswordHash: string;
  resetCode: string;

  success: boolean;
  message?: string | null;
  token?: string | null;
  permissions?: string[] | null;
}

export interface LoginRequest {
  userName: string;
  passwordHash: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPasswordHash: string;
  resetCode: string;
}

// NEW: payload for /ApplicationUserOperations/changepassword
export interface ChangePasswordRequest {
  userId: number;
  oldPasswordHash: string;
  newPasswordHash: string;
}

export type LoginResponse = ApplicationUserOperation;
