import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma';

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
};

export const generateUniqueSlug = async (name: string): Promise<string> => {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  // Check if slug exists and generate unique one
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

export const generateInvitationToken = (): string => {
  return uuidv4();
};