export interface CreateInvitationDTO {
  email: string;
  role?: string;
}

export interface AcceptInvitationDTO {
  password: string;
  displayName: string;
}

export interface InvitationDetailsResponse {
  id: string;
  email: string;
  role: string;
  organizationName: string;
  invitedByName: string;
  expiresAt: string;
  isValid: boolean;
}

export interface InvitationResponse {
  id: string;
  email: string;
  role: string;
  invitationToken: string;
  invitationLink: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserListResponse {
  id: string;
  email: string;
  displayName: string;
  role: string;
  joinedAt: string;
  lastLoginAt?: string;
  isOwner: boolean;
}

export interface PendingInvitationResponse {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  expiresAt: string;
  invitedByName: string;
  isExpired: boolean;
}