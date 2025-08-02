import { prisma } from '../lib/prisma';
import type { Organization, User } from '@prisma/client';

export class OrganizationRepository {
  static async create(data: {
    name: string;
    slug: string;
    ownerUserId: string;
    plan?: string;
  }): Promise<Organization> {
    return await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        ownerUserId: data.ownerUserId,
        plan: data.plan || 'free',
        billingStatus: 'active'
      }
    });
  }

  static async findBySlug(slug: string): Promise<Organization | null> {
    return await prisma.organization.findUnique({
      where: { slug }
    });
  }

  static async findById(id: string): Promise<Organization | null> {
    return await prisma.organization.findUnique({
      where: { id }
    });
  }

  static async createWithOwner(orgData: {
    name: string;
    slug: string;
  }, userData: {
    email: string;
    passwordHash: string;
    displayName?: string;
  }): Promise<{ organization: Organization; user: User }> {
    return await prisma.$transaction(async (tx) => {
      // Create organization first
      const organization = await tx.organization.create({
        data: {
          name: orgData.name,
          slug: orgData.slug,
          ownerUserId: '', // Will update after creating user
          plan: 'free',
          billingStatus: 'active'
        }
      });

      // Create owner user
      const user = await tx.user.create({
        data: {
          email: userData.email,
          passwordHash: userData.passwordHash,
          displayName: userData.displayName,
          organizationId: organization.id,
          role: 'owner'
        }
      });

      // Update organization with owner user ID
      const updatedOrganization = await tx.organization.update({
        where: { id: organization.id },
        data: { ownerUserId: user.id }
      });

      return { organization: updatedOrganization, user };
    });
  }
}