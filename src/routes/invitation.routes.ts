import { Router } from 'express';
import { InvitationController } from '../controllers/invitation.controller';
import { requireAuth } from '../middleware/jwt-auth';

const router = Router();

// User management (authenticated routes)
router.post('/users/invite', requireAuth, InvitationController.createInvitation);
router.get('/users', requireAuth, InvitationController.getOrganizationUsers);
router.get('/users/team-members', requireAuth, InvitationController.getOrganizationTeamMembers);
router.delete('/users/:id', requireAuth, InvitationController.removeUser);

// Invitation handling (public routes)
router.get('/invitations/:token', InvitationController.getInvitationDetails);
router.post('/invitations/:token/accept', InvitationController.acceptInvitation);

// Invitation management (authenticated routes)
router.post('/invitations/:id/resend', requireAuth, InvitationController.resendInvitation);
router.delete('/invitations/:id', requireAuth, InvitationController.cancelInvitation);

export default router;