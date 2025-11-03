import { UserRepository } from '../repositories/user.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { hashPassword, comparePassword } from '../lib/password';
import { generateToken, JWTPayload } from '../lib/jwt';
import { generateUniqueSlug } from '../lib/utils';
import { EmailService } from './email.service';
import crypto from 'crypto';
import type { CreateOrganizationDTO, LoginDTO, AuthResponse, UserInfo, OrganizationInfo } from '../types/auth.types';

export class AuthService {
  static async createOrganization(data: CreateOrganizationDTO): Promise<AuthResponse> {
    const { organizationName, displayName, email, password } = data;

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate unique organization slug
    const slug = await generateUniqueSlug(organizationName);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create organization and owner user
    const result = await OrganizationRepository.createWithOwner(
      { name: organizationName, slug },
      { email, passwordHash, displayName }
    );

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      organizationId: result.organization.id,
      organizationSlug: result.organization.slug,
      role: result.user.role as 'owner' | 'member',
      email: result.user.email
    });

    return {
      message: 'Organization created successfully',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        plan: result.organization.plan
      }
    };
  }

  static async login(data: LoginDTO): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user with organization
    const user = await UserRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check if organization is active
    if (user.organization.billingStatus !== 'active') {
      throw new Error('Organization is not active');
    }

    // Update last login
    await UserRepository.updateLastLogin(user.id);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      organizationId: user.organization.id,
      organizationSlug: user.organization.slug,
      role: user.role as 'owner' | 'member',
      email: user.email
    });

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        plan: user.organization.plan
      }
    };
  }

  static async getCurrentUser(userId: string): Promise<{ user: UserInfo; organization: OrganizationInfo }> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        plan: user.organization.plan,
        maxUsers: user.organization.maxUsers,
        maxShipmentsPerMonth: user.organization.maxShipmentsPerMonth
      }
    };
  }

  static async validateToken(payload: JWTPayload): Promise<boolean> {
    const user = await UserRepository.findById(payload.userId);
    return !!(user && user.organization.billingStatus === 'active');
  }

  /**
   * Request password reset - generates token and sends email
   */
  static async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await UserRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    // If user doesn't exist, just return without sending email
    if (!user || !user.passwordHash) {
      console.log(`Password reset requested for non-existent/OAuth user: ${email}`);
      return { message: 'If that email exists, we sent a password reset link' };
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing (same concept as password hashing)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store hashed token and expiration in database
    await UserRepository.setPasswordResetToken(user.id, hashedToken, expiresAt);

    // Build reset link with the unhashed token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    // Send email
    await EmailService.sendPasswordResetEmail(
      user.email,
      user.displayName || 'User',
      resetLink
    );

    return { message: 'If that email exists, we sent a password reset link' };
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Hash the provided token to match against database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with this token that hasn't expired
    const user = await UserRepository.findByResetToken(hashedToken);

    if (!user || !user.resetPasswordExpires) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token is expired
    if (user.resetPasswordExpires < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await UserRepository.resetPassword(user.id, passwordHash);

    return { message: 'Password reset successfully' };
  }
}