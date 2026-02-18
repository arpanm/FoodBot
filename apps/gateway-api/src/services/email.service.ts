import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.logger.log(`Sending verification email to ${email}`);
    // In-memory mock - no real email sent
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    this.logger.log(`Sending password reset email to ${email}`);
    // In-memory mock - no real email sent
  }

  async sendNotification(email: string, subject: string, message: string): Promise<void> {
    this.logger.log(`Sending notification to ${email}: ${subject}`);
    // In-memory mock - no real email sent
  }
}
