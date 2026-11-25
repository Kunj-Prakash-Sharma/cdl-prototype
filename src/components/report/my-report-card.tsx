import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/modules/auth/service";
import { getLatestResult } from "@/modules/chat/service";

/** TEMPORARY plain card at the top of My TEMPLE (E5-S4): the saved report is one tap away, or the quiz if there is none. */
export async function MyReportCard() {
  const session = await requireUser("/my-self");
  const latest = await getLatestResult(session.userId);
  return (
    <section
      className="flex max-w-215 flex-col gap-4 rounded-[20px] border border-line bg-white px-5.5 py-4.5 sm:flex-row sm:items-center sm:justify-between"
      data-testid="my-report-card"
    >
      <div>
        <p className="text-xs font-bold tracking-[1.4px] text-brand-600 uppercase">Career discovery</p>
        <h2 className="mt-1 mb-0.5 font-display text-2xl font-normal text-ink">Your career report</h2>
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
