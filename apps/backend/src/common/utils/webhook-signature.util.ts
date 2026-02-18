import * as crypto from 'crypto';

export class WebhookSignatureUtil {
  /**
   * Verify webhook signature using HMAC SHA256
   * @param payload - The webhook payload
   * @param signature - The signature from the webhook header
   * @param secret - The webhook secret
   * @returns true if signature is valid
   */
  static verify(
    payload: string | Record<string, any>,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const payloadString =
        typeof payload === 'string' ? payload : JSON.stringify(payload);

      const computed = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      // Use timingSafeEqual to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computed),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate webhook signature for testing
   * @param payload - The webhook payload
   * @param secret - The webhook secret
   * @returns The HMAC signature
   */
  static generate(payload: string | Record<string, any>, secret: string): string {
    const payloadString =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify Stripe webhook signature
   * @param payload - The raw request body
   * @param signature - The Stripe signature header
   * @param secret - The Stripe webhook secret
   * @returns true if signature is valid
   */
  static verifyStripe(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const elements = signature.split(',');
      const timestamps: string[] = [];
      const signatures: string[] = [];

      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't') {
          timestamps.push(value);
        } else if (key === 'v1') {
          signatures.push(value);
        }
      }

      if (timestamps.length === 0 || signatures.length === 0) {
        return false;
      }

      const timestamp = timestamps[0];
      const signedPayload = `${timestamp}.${payload}`;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      // Check if any signature matches
      return signatures.some((sig) => {
        try {
          return crypto.timingSafeEqual(
            Buffer.from(sig),
            Buffer.from(expectedSignature),
          );
        } catch {
          return false;
        }
      });
    } catch (error) {
      return false;
    }
  }
}
