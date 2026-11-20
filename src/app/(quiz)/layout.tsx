import { SiteShell } from "@/components/site/site-shell";

// The quiz and its report are open to guests (D78): there is no login guard here. Each page asks auth who is visiting
// (a guest or a verified learner) and decides what to show; anything that needs a real login still calls requireUser().
export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
