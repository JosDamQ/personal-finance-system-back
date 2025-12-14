export interface UpdateUserDTO {
  name?: string;
  phone?: string | null;
  email?: string;
}

export interface UpdatePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  oauthProvider: string | null;
  createdAt: Date;
}
