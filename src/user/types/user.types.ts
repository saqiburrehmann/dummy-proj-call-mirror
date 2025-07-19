export type UserRole = 'user' | 'admin';

export interface CreateUserInput {
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: UserRole;
}
