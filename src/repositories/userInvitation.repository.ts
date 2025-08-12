import { prisma } from '../lib/prisma';
import type { UserInvitation, Organization, User } from '@prisma/client';
import crypto from 'crypto';

export class UserInvitationRepository {
  static async create(data: {
    organizationId: string;
    email: string;
    role: string;
    invitedByUserId: string;
  }): Promise<UserInvitation> {
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    return await prisma.userInvitation.create({
      data: {
        ...data,
        invitationToken,
        expiresAt,
      }
    });
  }

  static async findByToken(token: string): Promise<(UserInvitation & { 
    organization: Organization;
    invitedBy: User;
  }) | null> {
    return await prisma.userInvitation.findUnique({
      where: { invitationToken: token },
      include: {
        organization: true,
        invitedBy: true,
      }
    });
  }

  static async findByOrganizationAndEmail(
    organizationId: string, 
    email: string
  ): Promise<UserInvitation | null> {
    return await prisma.userInvitation.findFirst({
      where: {
        organizationId,
        email,
        acceptedAt: null, // Only pending invitations
        expiresAt: {
          gt: new Date() // Not expired
        }
      }
    });
  }

  static async findByOrganization(organizationId: string): Promise<UserInvitation[]> {
    return await prisma.userInvitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async markAsAccepted(id: string): Promise<UserInvitation> {
    return await prisma.userInvitation.update({
      where: { id },
      data: { acceptedAt: new Date() }
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.userInvitation.delete({
      where: { id }
    });
  }

  static async isValid(token: string): Promise<boolean> {
    const invitation = await prisma.userInvitation.findUnique({
      where: { invitationToken: token }
    });

    if (!invitation) return false;
    if (invitation.acceptedAt) return false; // Already accepted
    if (invitation.expiresAt < new Date()) return false; // Expired

    return true;
  }
}