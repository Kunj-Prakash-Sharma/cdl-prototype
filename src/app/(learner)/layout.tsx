import { requireUser } from "@/modules/auth/service";

// Every learner page needs a logged-in user. proxy.ts redirects when there is no cookie at all;
// this checks that the session is real.
export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
