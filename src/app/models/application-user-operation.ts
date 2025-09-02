export interface ApplicationUserOperation {
  // Common/user info
  userId: number;
  userName: string;
  firstName: string;
  email: string;

  // Login / password fields (front-end sends plain password; backend can hash)
  passwordHash: string;
  oldPasswordHash: string;
  newPasswordHash: string;
  resetCode: string;

  // Response fields
  success: boolean;
  message?: string | null;
  token?: string | null;
  permissions?: string[] | null;
}

// Minimal payload we’ll send for login
export interface LoginRequest {
  userName: string;      // server expects UserName
  passwordHash: string;  // server expects PasswordHash (we send plain text)
}

// What we expect back for login
export type LoginResponse = ApplicationUserOperation;
