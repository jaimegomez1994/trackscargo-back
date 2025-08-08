import { prisma } from '../lib/prisma';
import type { EventFile } from '@prisma/client';

export class EventFileRepository {
  static async create(data: {
    eventId: string;
    filename: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    uploadedBy?: string | null;
  }): Promise<EventFile> {
    return await prisma.eventFile.create({
      data
    });
  }

  static async findByEventId(eventId: string): Promise<EventFile[]> {
    return await prisma.eventFile.findMany({
      where: { eventId },
      orderBy: { uploadedAt: 'desc' }
    });
  }

  static async findById(id: string): Promise<EventFile | null> {
    return await prisma.eventFile.findUnique({
      where: { id }
    });
  }

  static async delete(id: string): Promise<EventFile> {
    return await prisma.eventFile.delete({
      where: { id }
    });
  }

  static async deleteByEventId(eventId: string): Promise<void> {
    await prisma.eventFile.deleteMany({
      where: { eventId }
    });
  }
}