export interface RegisterDTO {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  role: string;
  sessionId: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  oauthProvider: string | null;
  createdAt: Date;
}

export interface OAuthDTO {
  idToken: string;
  provider: "google" | "apple";
}

export interface GooglePayload {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export interface ApplePayload {
  sub: string; // Apple user ID
  email: string;
  email_verified?: boolean | string;
  name?: string;
}
