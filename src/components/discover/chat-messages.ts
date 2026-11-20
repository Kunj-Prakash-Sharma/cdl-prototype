import type { ChatErrorCode } from "@/modules/chat/types";

// The UI owns all wording; the backend only sends codes (docs/specs/chat.md). Draft copy: the client may change it
// without touching the backend. Codes handled elsewhere: name_blocked (stop screen), stage_invalid (try-again screen),
// not_found and attempt_closed (the page reloads).

function waitText(sec?: number): string {
  if (!sec) return "a little while";
  return sec < 60 ? `${sec} seconds` : `${Math.ceil(sec / 60)} minute${Math.ceil(sec / 60) > 1 ? "s" : ""}`;
}

export function chatMessage(code: ChatErrorCode, retryAfterSec?: number): string {
  switch (code) {
    case "name_format":
      return "Please enter just your first name, using letters only.";
    case "rate_limited":
      return `You are going a little fast. Please wait ${waitText(retryAfterSec)} and try again.`;
    case "invalid_input":
    case "out_of_order":
      return "That did not go through. Please try that one again.";
    case "incomplete":
      return "A few answers are still missing. Please answer the rest to finish.";
    case "stage_invalid":
    case "name_blocked":
    case "not_found":
    case "attempt_closed":
    case "not_allowed":
    case "unknown":
      return "Something went wrong. Please try again.";
  }
}
