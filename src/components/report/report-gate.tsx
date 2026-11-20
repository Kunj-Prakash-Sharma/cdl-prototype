import { LoginForm, type LoginCopy } from "@/components/auth/login-form";
import type { LatestReport } from "@/modules/chat/service";
import { ReportView } from "./report-view";

// The phone gate in front of the report (D78). Behind it is the FIXED sample report (made-up numbers, same for every
// visitor), blurred: the blur is only a look, because the real report is never sent to a guest at all. After the OTP the
// page reloads and the server sends the real report. TEMPORARY layout until the new design lands.
const GATE_COPY: LoginCopy = {
  title: "Your report is ready",
  lead: "Verify your mobile number to view it. We will text you a 6-digit code.",
  footnote: "Your report will be linked to this number, so you can find it again.",
};

export function ReportGate({ sample, siteKey }: { sample: LatestReport; siteKey: string }) {
  return (
    <div className="relative overflow-hidden" data-testid="report-gate">
      <div aria-hidden="true" inert className="pointer-events-none max-h-[80vh] overflow-hidden blur-md select-none">
        <ReportView report={sample} />
      </div>
      <div className="absolute inset-0 flex items-start justify-center bg-white/40 px-4 pt-10 sm:items-center sm:pt-0">
        <LoginForm next="/discover/report" siteKey={siteKey} copy={GATE_COPY} />
      </div>
    </div>
  );
}
