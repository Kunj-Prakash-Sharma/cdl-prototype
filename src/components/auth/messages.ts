import type { AuthErrorCode } from "@/modules/auth/types";

// The UI owns all wording; the backend only sends codes (docs/specs/auth.md, "UI contract").
// Draft copy: the client may change it without touching the backend.

function waitText(sec?: number): string {
  if (!sec) return "a little while";
  if (sec < 60) return `${sec} seconds`;
  const min = Math.ceil(sec / 60);
  return min < 60 ? `${min} minute${min > 1 ? "s" : ""}` : `${Math.ceil(min / 60)} hour(s)`;
}

export function authMessage(code: AuthErrorCode, retryAfterSec?: number): string {
  switch (code) {
    case "invalid_input":
      return "Please check what you typed and try again.";
    case "invalid_phone":
      return "Enter a valid 10-digit Indian mobile number.";
    case "captcha_failed":
      return "We could not verify you are human. Please try again.";
    case "cooldown":
      return `Please wait ${waitText(retryAfterSec)} before asking for a new code.`;
    case "daily_limit":
      return "You have asked for too many codes today. Please try again tomorrow.";
    case "ip_limit":
      return `Too many attempts from this network. Try again in ${waitText(retryAfterSec)}.`;
    case "device_limit":
      return "You have asked for too many codes on this device today. Please try again tomorrow.";
    case "sms_cutoff":
      return "We cannot send codes right now. Please try again a little later.";
    case "send_failed":
      return "We could not send the SMS. Please try again.";
    case "bad_code":
      return "That code is not right. Check the SMS and try again.";
    case "bad_credentials":
      return "That email or password is not right.";
    case "expired":
      return "That code has expired. Ask for a new one.";
    case "locked":
      return `Too many wrong codes. Try again in ${waitText(retryAfterSec)}.`;
    case "unauthorized":
    case "forbidden":
    case "unknown":
      return "Something went wrong. Please try again.";
  }
}

/** The admin login page: same messages, except the lock, which is about passwords there. */
export function adminAuthMessage(code: AuthErrorCode, retryAfterSec?: number): string {
  if (code === "locked") return `Too many wrong passwords. Try again in ${waitText(retryAfterSec)}.`;
  return authMessage(code, retryAfterSec);
}
