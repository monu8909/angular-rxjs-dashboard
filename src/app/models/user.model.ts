export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

export type UserRole = User['role'];

export const USER_ROLES: UserRole[] = ['Admin', 'Editor', 'Viewer'];

export const ROLE_COLORS: Record<UserRole, string> = {
  Admin: '#FF6384',
  Editor: '#36A2EB',
  Viewer: '#FFCE56',
};
