import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/modules/auth/service";
import { getLatestResult } from "@/modules/chat/service";

/** TEMPORARY plain card at the top of My SELF (E5-S4): the saved report is one tap away, or the quiz if there is none. */
export async function MyReportCard() {
  const session = await requireUser("/my-self");
  const latest = await getLatestResult(session.userId);
  return (
    <section
      className="mx-auto mb-6 flex max-w-6xl flex-col gap-3 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line sm:flex-row sm:items-center sm:justify-between"
      data-testid="my-report-card"
    >
      <div>
        <h2 className="text-lg font-bold text-ink">Your career report</h2>
        <p className="text-sm text-muted">
          {latest
            ? "Your report is saved in your account. Open it any time."
            : "Answer the quick questions and your report will be saved here."}
        </p>
      </div>
      <ButtonLink href={latest ? "/discover/report" : "/discover"} data-testid="my-report-link">
        {latest ? "Open my report" : "Start the questions"}
      </ButtonLink>
    </section>
  );
}
