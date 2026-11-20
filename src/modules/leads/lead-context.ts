// What the team knows about the learner behind a lead (D85). A request made from a report points at that attempt. A request
// made from Home has no attempt, so we look up the learner's newest finished report when it is read: if they finished the
// quiz after asking, the team sees it. `null` means "no report yet".
import { getCallbackContext, getCallbackContextForAdmin, type CallbackContext } from "@/modules/chat/service";

export function contextForLead(lead: { userId: string; attemptId: string | null }): Promise<CallbackContext | null> {
  return lead.attemptId ? getCallbackContextForAdmin(lead.attemptId) : getCallbackContext(lead.userId);
}
