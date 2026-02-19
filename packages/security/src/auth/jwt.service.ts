import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtPayload, RefreshTokenPayload, AuthTokens } from '../types';
import * as crypto from 'crypto';

/**
 * JWT Service
 * OWASP A01: Broken Access Control Protection
 * OWASP A07: Identification and Authentication Failures Protection
 *
 * Provides JWT token generation, validation, and refresh
 */
@Injectable()
export class JwtAuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly issuer: string;
  private readonly audience: string;

  // In-memory token blacklist (use Redis in production)
  private revokedTokens = new Set<string>();

  constructor(private readonly jwtService: NestJwtService) {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || '';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || '';
    this.accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.issuer = process.env.JWT_ISSUER || 'foodbot';
    this.audience = process.env.JWT_AUDIENCE || 'foodbot-api';

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>): Promise<AuthTokens> {
    const jti = this.generateJti();

    const accessToken = await this.jwtService.signAsync(
      {
        ...payload,
        jti,
      },
      {
        secret: this.accessTokenSecret,
        expiresIn: this.accessTokenExpiresIn,
        issuer: this.issuer,
        audience: this.audience,
      }
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        tokenVersion: 0, // Increment on password change
      } as RefreshTokenPayload,
      {
        secret: this.refreshTokenSecret,
        expiresIn: this.refreshTokenExpiresIn,
        issuer: this.issuer,
        audience: this.audience,
      }
    );

    // Parse expiry time to seconds
    const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.accessTokenSecret,
        issuer: this.issuer,
        audience: this.audience,
      });

      // Check if token is revoked
      if (payload.jti && this.revokedTokens.has(payload.jti)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshTokenSecret,
        issuer: this.issuer,
        audience: this.audience,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    userPayload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>
  ): Promise<AuthTokens> {
    // Verify refresh token
    const refreshPayload = await this.verifyRefreshToken(refreshToken);

    // Ensure user ID matches
    if (refreshPayload.sub !== userPayload.sub) {
      throw new UnauthorizedException('Token mismatch');
    }

    // Generate new tokens
    return this.generateTokens(userPayload);
  }

  /**
   * Revoke token by JTI
   */
  revokeToken(jti: string): void {
    this.revokedTokens.add(jti);
  }

  /**
   * Decode token without verification (for logging/debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Generate unique JWT ID
   */
  private generateJti(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Parse expiry time string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
