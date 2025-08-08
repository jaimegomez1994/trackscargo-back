import { Request, Response } from 'express';
import { EventFileService } from '../services/eventFile.service';
import { prisma } from '../lib/prisma';

export class EventFileController {
  static async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const eventId = req.params.eventId;

      // Check if event exists
      const event = await prisma.travelEvent.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return res.status(404).json({ error: 'Tracking event not found' });
      }

      console.log('Uploading file to event:', {
        eventId,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const uploadedFile = await EventFileService.uploadFile(
        eventId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        // TODO: Add user authentication to get uploadedBy
        undefined
      );

      console.log('File uploaded and saved successfully');

      res.json({
        success: true,
        message: 'File uploaded successfully!',
        file: uploadedFile
      });
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  }

  static async getEventFiles(req: Request, res: Response) {
    try {
      const eventId = req.params.eventId;

      // Check if event exists
      const event = await prisma.travelEvent.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return res.status(404).json({ error: 'Tracking event not found' });
      }

      const files = await EventFileService.getEventFiles(eventId);

      res.json({
        eventId,
        files
      });
    } catch (error) {
      console.error('List files error:', error);
      const message = error instanceof Error ? error.message : 'Failed to list files';
      res.status(500).json({ error: message });
    }
  }

  static async downloadFile(req: Request, res: Response) {
    try {
      const fileId = req.params.fileId;

      const downloadData = await EventFileService.getDownloadUrl(fileId);

      console.log('Signed URL generated successfully');

      res.json(downloadData);
    } catch (error) {
      console.error('Download URL error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate download URL';
      const statusCode = message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: message });
    }
  }

  static async deleteFile(req: Request, res: Response) {
    try {
      const fileId = req.params.fileId;

      // Get file info before deletion for response
      const eventFile = await prisma.eventFile.findUnique({
        where: { id: fileId }
      });

      if (!eventFile) {
        return res.status(404).json({ error: 'File not found' });
      }

      console.log('Deleting file:', {
        fileId,
        filename: eventFile.filename,
        originalName: eventFile.originalName
      });

      await EventFileService.deleteFile(fileId);

      console.log('File deleted successfully');

      res.json({
        success: true,
        message: 'File deleted successfully',
        deletedFile: {
          id: eventFile.id,
          originalName: eventFile.originalName
        }
      });
    } catch (error) {
      console.error('Delete file error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete file';
      const statusCode = message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: message });
    }
  }
}