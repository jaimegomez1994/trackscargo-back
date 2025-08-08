import { Router } from 'express';
import multer from 'multer';
import { EventFileController } from '../controllers/eventFile.controller';

const router = Router();

// Configure multer for file uploads - use memory storage for Supabase
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Event file routes
router.post('/events/:eventId/files', upload.single('file'), EventFileController.uploadFile);
router.get('/events/:eventId/files', EventFileController.getEventFiles);
router.get('/files/:fileId/download', EventFileController.downloadFile);
router.delete('/files/:fileId', EventFileController.deleteFile);

export { router as eventFileRoutes };