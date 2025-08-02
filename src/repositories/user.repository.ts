import { prisma } from '../lib/prisma';
import type { User, Organization } from '@prisma/client';

export class UserRepository {
  static async findByEmail(email: string): Promise<(User & { organization: Organization }) | null> {
    return await prisma.user.findUnique({
      where: { email },
      include: { organization: true }
    });
  }

  static async findById(id: string): Promise<(User & { organization: Organization }) | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: { organization: true }
    });
  }

  static async create(data: {
    email: string;
    passwordHash?: string | null;
    googleId?: string | null;
    displayName?: string | null;
    organizationId: string;
    role: string;
    avatarUrl?: string | null;
    invitedByUserId?: string | null;
  }): Promise<User> {
    return await prisma.user.create({
      data
    });
  }

  static async updateLastLogin(userId: string): Promise<User> {
    return await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  static async findByOrganization(organizationId: string): Promise<User[]> {
    return await prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' }
    });
  }
}