import { Request, Response } from 'express';
import { InvitationService } from '../services/invitation.service';

export class InvitationController {
  // POST /api/users/invite
  static async createInvitation(req: Request, res: Response) {
    try {
      const { organizationId, userId } = req.user!;
      const invitationData = req.body;

      const invitation = await InvitationService.createInvitation(
        organizationId,
        userId,
        invitationData
      );

      res.status(201).json({
        message: 'Invitation created successfully',
        invitation
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create invitation'
      });
    }
  }

  // GET /api/invitations/:token
  static async getInvitationDetails(req: Request, res: Response) {
    try {
      const { token } = req.params;
      
      const invitation = await InvitationService.getInvitationDetails(token);
      
      res.json(invitation);
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Invitation not found'
      });
    }
  }

  // POST /api/invitations/:token/accept
  static async acceptInvitation(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const acceptData = req.body;

      const result = await InvitationService.acceptInvitation(token, acceptData);
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to accept invitation'
      });
    }
  }

  // GET /api/users
  static async getOrganizationUsers(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      
      const users = await InvitationService.getOrganizationUsers(organizationId);
      
      res.json({ users });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      });
    }
  }

  // DELETE /api/users/:id
  static async removeUser(req: Request, res: Response) {
    try {
      const { organizationId, userId: requestingUserId } = req.user!;
      const { id: userIdToRemove } = req.params;

      const result = await InvitationService.removeUser(
        organizationId,
        userIdToRemove,
        requestingUserId
      );
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to remove user'
      });
    }
  }
}