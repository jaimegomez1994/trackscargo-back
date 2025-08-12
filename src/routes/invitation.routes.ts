import { Router } from 'express';
import { InvitationController } from '../controllers/invitation.controller';
import { requireAuth } from '../middleware/jwt-auth';

const router = Router();

// User management (authenticated routes)
router.post('/users/invite', requireAuth, InvitationController.createInvitation);
router.get('/users', requireAuth, InvitationController.getOrganizationUsers);
router.delete('/users/:id', requireAuth, InvitationController.removeUser);

// Invitation handling (public routes)
router.get('/invitations/:token', InvitationController.getInvitationDetails);
router.post('/invitations/:token/accept', InvitationController.acceptInvitation);

export default router;