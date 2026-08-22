export type UserRole = 'customer' | 'print_shop' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}
