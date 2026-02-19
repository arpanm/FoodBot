import { Injectable } from '@nestjs/common';
import { AccountLockoutPolicy } from '../types';

/**
 * Account Lockout Service
 * OWASP A07: Identification and Authentication Failures Protection
 *
 * Prevents brute force attacks by locking accounts after failed login attempts
 */
@Injectable()
export class AccountLockoutService {
  private readonly defaultPolicy: AccountLockoutPolicy = {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    resetAfterMinutes: 60,
  };

  // In-memory storage (use Redis in production)
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }>();

  /**
   * Record failed login attempt
   * @returns True if account should be locked
   */
  recordFailedAttempt(userId: string, policy: Partial<AccountLockoutPolicy> = {}): boolean {
    const activePolicy = { ...this.defaultPolicy, ...policy };
    const now = new Date();

    const record = this.failedAttempts.get(userId) || {
      count: 0,
      lastAttempt: now,
    };

    // Reset count if last attempt was too long ago
    const minutesSinceLastAttempt = (now.getTime() - record.lastAttempt.getTime()) / (1000 * 60);
    if (minutesSinceLastAttempt > activePolicy.resetAfterMinutes) {
      record.count = 0;
    }

    // Increment failed attempts
    record.count++;
    record.lastAttempt = now;

    // Lock account if threshold exceeded
    if (record.count >= activePolicy.maxFailedAttempts) {
      record.lockedUntil = new Date(now.getTime() + activePolicy.lockoutDurationMinutes * 60 * 1000);
      this.failedAttempts.set(userId, record);
      return true;
    }

    this.failedAttempts.set(userId, record);
    return false;
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(userId: string): boolean {
    const record = this.failedAttempts.get(userId);
    if (!record || !record.lockedUntil) return false;

    const now = new Date();
    if (now < record.lockedUntil) {
      return true;
    }

    // Lockout period expired, reset
    this.resetFailedAttempts(userId);
    return false;
  }

  /**
   * Get remaining lockout time in minutes
   */
  getRemainingLockoutTime(userId: string): number {
    const record = this.failedAttempts.get(userId);
    if (!record || !record.lockedUntil) return 0;

    const now = new Date();
    const remaining = Math.max(0, record.lockedUntil.getTime() - now.getTime());
    return Math.ceil(remaining / (1000 * 60));
  }

  /**
   * Reset failed attempts after successful login
   */
  resetFailedAttempts(userId: string): void {
    this.failedAttempts.delete(userId);
  }

  /**
   * Get failed attempt count
   */
  getFailedAttemptCount(userId: string): number {
    return this.failedAttempts.get(userId)?.count || 0;
  }

  /**
   * Manually unlock account (admin action)
   */
  unlockAccount(userId: string): void {
    this.resetFailedAttempts(userId);
  }
}
