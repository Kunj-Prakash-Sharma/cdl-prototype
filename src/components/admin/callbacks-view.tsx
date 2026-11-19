import Link from "next/link";
import { cn } from "@/lib/format";
import type { AdminLeadsView, LeadFilters, StatusFilter } from "@/modules/leads/service";
import { DownloadCsvButton, StatusSelect } from "./callbacks-actions";

// The admin callbacks list (E6-S4). TEMPORARY layout in the admin shell's style. Shows the raw phone and the profile
// name on purpose: the team has to call these people, and the page is behind the admin check.

const card = "rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80";
const control = "h-11 rounded-full px-5 text-sm font-semibold transition-colors";

function callbacksHref({ status, page }: LeadFilters): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/callbacks?${query}` : "/admin/callbacks";
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

const th = "px-4 py-3.5";
const td = "px-4 py-3.5 align-top";

export function CallbacksView({ view, filters }: { view: AdminLeadsView; filters: LeadFilters }) {
  const countFor = (value: StatusFilter) =>
    value === "all" ? view.counts.new + view.counts.contacted + view.counts.closed : view.counts[value];
  const filtered = filters.status !== "all";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Callbacks</h1>
          <p className="mt-2 text-slate-600">People who asked us to call them, newest first.</p>
        </div>
        <DownloadCsvButton status={filters.status} />
      </div>

      <section className={cn(card, "overflow-hidden")} aria-label="Callback requests">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4" role="group" aria-label="Filter by status">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={callbacksHref({ status: tab.value, page: 1 })}
              aria-current={filters.status === tab.value ? "true" : undefined}
              data-testid={`callbacks-tab-${tab.value}`}
              className={cn(
                control,
                "inline-flex items-center gap-2",
                filters.status === tab.value
                  ? "bg-brand-700 text-white"
                  : "bg-white text-ink ring-1 ring-slate-300 hover:ring-slate-400",
              )}
            >
              {tab.label}
              <span className="text-xs opacity-80">{countFor(tab.value)}</span>
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm" data-testid="callbacks-table">
            <caption className="sr-only">Callback requests, newest first</caption>
            <thead>
              <tr className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                <th scope="col" className={th}>
                  Requested
                </th>
                <th scope="col" className={th}>
                  Name
                </th>
                <th scope="col" className={th}>
                  Phone
                </th>
                <th scope="col" className={th}>
                  About them
                </th>
                <th scope="col" className={th}>
                  Interests
                </th>
                <th scope="col" className={th}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100" data-testid="callbacks-row">
                  <td className={cn(td, "text-slate-600")}>
                    {formatWhen(row.requestedAt)}
                    {row.preferredTime && (
                      <span className="mt-1 block text-xs text-slate-500">Best time: {cap(row.preferredTime)}</span>
                    )}
                  </td>
                  <td className={cn(td, row.name ? "font-medium" : "text-slate-500")}>{row.name || "Not given"}</td>
                  <td className={cn(td, "font-semibold tabular-nums")}>
                    <a href={`tel:${row.phone.replaceAll(" ", "")}`} className="text-brand-700 hover:underline">
                      {row.phone}
                    </a>
                  </td>
                  <td className={cn(td, "text-slate-600")}>
                    {[row.age, row.studying, row.goal, row.activity].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className={cn(td, "text-slate-600")}>{row.topInterests.join(", ") || "No clear lead"}</td>
                  <td className={td}>
                    <StatusSelect leadId={row.id} status={row.status} label={row.name || row.phone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {view.rows.length === 0 && (
            <div className="border-t border-slate-100 px-5 py-14 text-center" data-testid="callbacks-empty">
              <p className="font-semibold text-ink">{filtered ? "No requests with this status" : "No requests yet"}</p>
              <p className="mt-1 text-sm text-slate-600">
                {filtered ? (
                  <Link
                    href="/admin/callbacks"
                    className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                  >
                    Show all
                  </Link>
                ) : (
                  "Requests appear here when a learner asks for a callback from their report."
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-sm text-slate-600">
          <span>
            {view.total} {view.total === 1 ? "request" : "requests"}
            {filtered ? " with this status" : ""}.
          </span>
          {view.pageCount > 1 && (
            <nav aria-label="Pages" className="flex items-center gap-2">
              {view.page > 1 ? (
                <Link
                  href={callbacksHref({ ...filters, page: view.page - 1 })}
                  className={cn(control, "inline-flex items-center bg-white text-ink ring-1 ring-slate-300")}
                >
                  Previous
                </Link>
              ) : null}
              <span aria-live="polite">
                Page {view.page} of {view.pageCount}
              </span>
              {view.page < view.pageCount ? (
                <Link
                  href={callbacksHref({ ...filters, page: view.page + 1 })}
                  className={cn(control, "inline-flex items-center bg-white text-ink ring-1 ring-slate-300")}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
