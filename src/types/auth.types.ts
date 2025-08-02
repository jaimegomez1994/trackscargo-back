export interface CreateOrganizationDTO {
  organizationName: string;
  displayName: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    avatarUrl?: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan?: string;
  };
}

export interface UserInfo {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  avatarUrl?: string | null;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  maxUsers?: number | null;
  maxShipmentsPerMonth?: number | null;
}