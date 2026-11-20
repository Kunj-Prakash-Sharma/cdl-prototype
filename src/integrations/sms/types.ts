export interface SmsProvider {
  /** Deliver a one-time code. Throws if the provider rejects it. */
  sendOtp(phone: string, code: string): Promise<void>;
}
