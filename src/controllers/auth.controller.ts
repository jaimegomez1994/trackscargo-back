import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import type { CreateOrganizationDTO, LoginDTO } from '../types/auth.types';

export class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const data: CreateOrganizationDTO = req.body;
      const result = await AuthService.createOrganization(data);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Signup error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = message.includes('already exists') ? 400 : 500;
      
      res.status(statusCode).json({ error: message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const data: LoginDTO = req.body;
      const result = await AuthService.login(data);
      
      res.json(result);
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = message.includes('Invalid') || message.includes('not active') ? 401 : 500;
      
      res.status(statusCode).json({ error: message });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await AuthService.getCurrentUser(req.user.userId);
      res.json(result);
    } catch (error) {
      console.error('Get user error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({ error: message });
    }
  }
}