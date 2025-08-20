import { UserInvitationRepository } from '../repositories/userInvitation.repository';
import { UserRepository } from '../repositories/user.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { prisma } from '../lib/prisma';
import { EmailService } from './email.service';
import type { 
  CreateInvitationDTO, 
  AcceptInvitationDTO, 
  InvitationDetailsResponse,
  InvitationResponse,
  UserListResponse,
  PendingInvitationResponse
} from '../types/invitation.types';
import bcrypt from 'bcrypt';

export class InvitationService {
  static async createInvitation(
    organizationId: string,
    invitedByUserId: string,
    data: CreateInvitationDTO,
    sendEmail: boolean = true
  ): Promise<InvitationResponse & { emailSent?: boolean; emailError?: string }> {
    const { email, role = 'member' } = data;

    // Check if user already exists in this organization
    const existingUser = await UserRepository.findByEmailAndOrganization(email, organizationId);
    if (existingUser) {
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

    // Generate invitation link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/invite/${invitation.invitationToken}`;

    // Get organization and inviter details for email
    const organization = await OrganizationRepository.findById(organizationId);
    const inviter = await UserRepository.findById(invitedByUserId);

    const response: InvitationResponse & { emailSent?: boolean; emailError?: string } = {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitationToken: invitation.invitationToken,
      invitationLink,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };

    // Send email if requested and we have the required data
    if (sendEmail && organization && inviter) {
      try {
        const emailResult = await EmailService.sendInvitationEmail(
          email,
          inviter.displayName || inviter.email,
          organization.name,
          invitationLink
        );

        response.emailSent = emailResult.success;
        if (!emailResult.success) {
          response.emailError = emailResult.error;
          console.warn(`Failed to send invitation email to ${email}:`, emailResult.error);
        } else {
          console.log(`Invitation email sent successfully to ${email}`);
        }
      } catch (error) {
        response.emailSent = false;
        response.emailError = error instanceof Error ? error.message : 'Unknown email error';
        console.error(`Error sending invitation email to ${email}:`, error);
      }
    } else if (sendEmail) {
      response.emailSent = false;
      response.emailError = 'Missing organization or inviter data';
    }

    return response;
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

    // Check if user already exists in this organization
    const existingUser = await UserRepository.findByEmailAndOrganization(invitation.email, invitation.organizationId);
    if (existingUser) {
      throw new Error('A user with this email already exists in this organization');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const newUser = await UserRepository.create({
      email: invitation.email,
      passwordHash,
      displayName: data.displayName,
      organizationId: invitation.organizationId,
      role: invitation.role,
      invitedByUserId: invitation.invitedByUserId,
    });

    // Mark invitation as accepted
    await UserInvitationRepository.markAsAccepted(invitation.id);

    // Send welcome email
    try {
      const organization = await OrganizationRepository.findById(invitation.organizationId);
      if (organization) {
        await EmailService.sendWelcomeEmail(
          invitation.email,
          data.displayName,
          organization.name
        );
        console.log(`Welcome email sent to ${invitation.email}`);
      }
    } catch (error) {
      console.warn(`Failed to send welcome email to ${invitation.email}:`, error);
      // Don't fail the invitation acceptance if email fails
    }

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

  static async getOrganizationTeamMembers(organizationId: string): Promise<{
    users: UserListResponse[];
    pendingInvitations: PendingInvitationResponse[];
  }> {
    // Get accepted users
    const users = await UserRepository.findByOrganization(organizationId);
    
    // Get pending invitations (not yet accepted)
    const pendingInvitations = await UserInvitationRepository.findPendingByOrganization(organizationId);
    
    return {
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName || user.email,
        role: user.role,
        joinedAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        isOwner: user.role === 'owner',
      })),
      pendingInvitations: pendingInvitations.map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        invitedAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
        invitedByName: invitation.invitedBy?.displayName || invitation.invitedBy?.email || 'Unknown',
        isExpired: new Date() > invitation.expiresAt,
      }))
    };
  }

  static async cancelInvitation(
    organizationId: string,
    invitationId: string,
    requestingUserId: string
  ): Promise<{ message: string }> {
    const requestingUser = await UserRepository.findById(requestingUserId);
    
    if (!requestingUser || requestingUser.organizationId !== organizationId) {
      throw new Error('Unauthorized');
    }

    if (requestingUser.role !== 'owner') {
      throw new Error('Only organization owners can cancel invitations');
    }

    // Find the invitation
    const invitation = await UserInvitationRepository.findByOrganization(organizationId);
    const targetInvitation = invitation.find(inv => inv.id === invitationId && !inv.acceptedAt);
    
    if (!targetInvitation) {
      throw new Error('Invitation not found or already accepted');
    }

    // Delete the invitation
    await UserInvitationRepository.delete(invitationId);

    return { message: 'Invitation cancelled successfully' };
  }

  static async resendInvitation(
    organizationId: string,
    invitationId: string,
    requestingUserId: string
  ): Promise<InvitationResponse & { emailSent?: boolean; emailError?: string }> {
    const requestingUser = await UserRepository.findById(requestingUserId);
    
    if (!requestingUser || requestingUser.organizationId !== organizationId) {
      throw new Error('Unauthorized');
    }

    if (requestingUser.role !== 'owner') {
      throw new Error('Only organization owners can resend invitations');
    }

    // Find the invitation
    const invitation = await UserInvitationRepository.findByOrganization(organizationId);
    const targetInvitation = invitation.find(inv => inv.id === invitationId && !inv.acceptedAt);
    
    if (!targetInvitation) {
      throw new Error('Invitation not found or already accepted');
    }

    if (targetInvitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired. Please create a new invitation.');
    }

    // Generate invitation link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/invite/${targetInvitation.invitationToken}`;

    // Get organization details for email
    const organization = await OrganizationRepository.findById(organizationId);

    const response: InvitationResponse & { emailSent?: boolean; emailError?: string } = {
      id: targetInvitation.id,
      email: targetInvitation.email,
      role: targetInvitation.role,
      invitationToken: targetInvitation.invitationToken,
      invitationLink,
      expiresAt: targetInvitation.expiresAt.toISOString(),
      createdAt: targetInvitation.createdAt.toISOString(),
    };

    // Send email if we have the required data
    if (organization && requestingUser) {
      try {
        const emailResult = await EmailService.sendInvitationEmail(
          targetInvitation.email,
          requestingUser.displayName || requestingUser.email,
          organization.name,
          invitationLink
        );

        response.emailSent = emailResult.success;
        if (!emailResult.success) {
          response.emailError = emailResult.error;
          console.warn(`Failed to resend invitation email to ${targetInvitation.email}:`, emailResult.error);
        } else {
          console.log(`Invitation email resent successfully to ${targetInvitation.email}`);
        }
      } catch (error) {
        response.emailSent = false;
        response.emailError = error instanceof Error ? error.message : 'Unknown email error';
        console.error(`Error resending invitation email to ${targetInvitation.email}:`, error);
      }
    } else {
      response.emailSent = false;
      response.emailError = 'Missing organization or inviter data';
    }

    return response;
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

    // Clean up any invitation records for this user's email before deleting
    await prisma.userInvitation.deleteMany({
      where: { 
        organizationId: organizationId,
        email: userToRemove.email 
      }
    });

    // Note: This will cascade delete due to foreign key constraints
    // User's shipments and events will remain but user reference will be set to null
    await prisma.user.delete({
      where: { id: userIdToRemove }
    });

    return { message: 'User removed successfully' };
  }
}