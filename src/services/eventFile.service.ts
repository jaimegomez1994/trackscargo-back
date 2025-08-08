import { EventFileRepository } from '../repositories/eventFile.repository';
import { createClient } from '@supabase/supabase-js';
import type { EventFile } from '@prisma/client';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export interface EventFileResponse {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface FileUploadData {
  eventId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
}

export interface FileDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
  originalName: string;
  size: number;
  mimeType: string;
}

export class EventFileService {
  static async uploadFile(
    eventId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    uploadedBy?: string
  ): Promise<EventFileResponse> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Generate unique filename
    const fileExt = originalName.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
    const filePath = `events/${eventId}/${uniqueName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('event-files')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Save file metadata to database
    const eventFile = await EventFileRepository.create({
      eventId,
      filename: filePath,
      originalName,
      fileSize: fileBuffer.length,
      mimeType,
      uploadedBy
    });

    return this.formatFileResponse(eventFile);
  }

  static async getEventFiles(eventId: string): Promise<EventFileResponse[]> {
    const files = await EventFileRepository.findByEventId(eventId);
    return files.map(file => this.formatFileResponse(file));
  }

  static async getDownloadUrl(fileId: string): Promise<FileDownloadResponse> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const eventFile = await EventFileRepository.findById(fileId);
    if (!eventFile) {
      throw new Error('File not found');
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('event-files')
      .createSignedUrl(eventFile.filename, 3600);

    if (error) {
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }

    return {
      downloadUrl: data.signedUrl,
      expiresIn: 3600,
      originalName: eventFile.originalName,
      size: eventFile.fileSize,
      mimeType: eventFile.mimeType
    };
  }

  static async deleteFile(fileId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const eventFile = await EventFileRepository.findById(fileId);
    if (!eventFile) {
      throw new Error('File not found');
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('event-files')
      .remove([eventFile.filename]);

    if (storageError) {
      console.warn('Failed to delete from storage:', storageError.message);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await EventFileRepository.delete(fileId);
  }

  static async deleteEventFiles(eventId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Get all files for the event
    const files = await EventFileRepository.findByEventId(eventId);
    
    if (files.length > 0) {
      // Delete from Supabase Storage
      const filePaths = files.map(file => file.filename);
      const { error: storageError } = await supabase.storage
        .from('event-files')
        .remove(filePaths);

      if (storageError) {
        console.warn('Failed to delete some files from storage:', storageError.message);
      }
    }

    // Delete from database
    await EventFileRepository.deleteByEventId(eventId);
  }

  private static formatFileResponse(file: EventFile): EventFileResponse {
    return {
      id: file.id,
      originalName: file.originalName,
      size: file.fileSize,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt.toISOString()
    };
  }
}