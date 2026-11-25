import { getSession } from "@/modules/auth/service";
import { getConsentWording } from "@/modules/leads/service";
import { CoachCallback } from "./coach-callback";

// Reading the session is request-time work, so Home wraps this in <Suspense> (Cache Components) with a button that
// does nothing yet as the fallback, so an early tap never sends a logged-in learner to login. A logged-in learner gets the form; anyone else is sent to login and back to Home (D90).
export async function CoachCallbackSession() {
  const session = await getSession();
  const wording = session ? await getConsentWording(session.userId, "home") : null;
  return <CoachCallback wording={wording} phone={session?.phoneMasked || null} />;
}
