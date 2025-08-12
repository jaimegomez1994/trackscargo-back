import { UserInvitationRepository } from '../repositories/userInvitation.repository';
import { UserRepository } from '../repositories/user.repository';
import { prisma } from '../lib/prisma';
import type { 
  CreateInvitationDTO, 
  AcceptInvitationDTO, 
  InvitationDetailsResponse,
  InvitationResponse,
  UserListResponse 
} from '../types/invitation.types';
import bcrypt from 'bcrypt';

export class InvitationService {
  static async createInvitation(
    organizationId: string,
    invitedByUserId: string,
    data: CreateInvitationDTO
  ): Promise<InvitationResponse> {
    const { email, role = 'member' } = data;

    // Check if user already exists in this organization
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser && existingUser.organizationId === organizationId) {
      throw new Error('User is already a member of this organization');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await UserInvitationRepository.findByOrganizationAndEmail(
      organizationId, 
      email
    );
    if (existingInvitation) {
      throw new Error('An invitation is already pending for this email');
    }

    const invitation = await UserInvitationRepository.create({
      organizationId,
      email,
      role,
      invitedByUserId,
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/invite/${invitation.invitationToken}`;

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitationToken: invitation.invitationToken,
      invitationLink,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  static async getInvitationDetails(token: string): Promise<InvitationDetailsResponse> {
    const invitation = await UserInvitationRepository.findByToken(token);
    
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    const isValid = await UserInvitationRepository.isValid(token);

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
      invitedByName: invitation.invitedBy.displayName || invitation.invitedBy.email,
      expiresAt: invitation.expiresAt.toISOString(),
      isValid,
    };
  }

  static async acceptInvitation(
    token: string, 
    data: AcceptInvitationDTO
  ): Promise<{ message: string }> {
    const invitation = await UserInvitationRepository.findByToken(token);
    
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    const isValid = await UserInvitationRepository.isValid(token);
    if (!isValid) {
      throw new Error('Invitation is invalid or has expired');
    }

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(invitation.email);
    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    await UserRepository.create({
      email: invitation.email,
      passwordHash,
      displayName: data.displayName,
      organizationId: invitation.organizationId,
      role: invitation.role,
      invitedByUserId: invitation.invitedByUserId,
    });

    // Mark invitation as accepted
    await UserInvitationRepository.markAsAccepted(invitation.id);

    return { message: 'Invitation accepted successfully' };
  }

  static async getOrganizationUsers(organizationId: string): Promise<UserListResponse[]> {
    const users = await UserRepository.findByOrganization(organizationId);
    
    return users.map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName || user.email,
      role: user.role,
      joinedAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      isOwner: user.role === 'owner',
    }));
  }

  static async removeUser(
    organizationId: string, 
    userIdToRemove: string, 
    requestingUserId: string
  ): Promise<{ message: string }> {
    const requestingUser = await UserRepository.findById(requestingUserId);
    
    if (!requestingUser || requestingUser.organizationId !== organizationId) {
      throw new Error('Unauthorized');
    }

    if (requestingUser.role !== 'owner') {
      throw new Error('Only organization owners can remove users');
    }

    if (userIdToRemove === requestingUserId) {
      throw new Error('You cannot remove yourself');
    }

    const userToRemove = await UserRepository.findById(userIdToRemove);
    if (!userToRemove || userToRemove.organizationId !== organizationId) {
      throw new Error('User not found in this organization');
    }

    // Note: This will cascade delete due to foreign key constraints
    // User's shipments and events will remain but user reference will be set to null
    await prisma.user.delete({
      where: { id: userIdToRemove }
    });

    return { message: 'User removed successfully' };
  }
}