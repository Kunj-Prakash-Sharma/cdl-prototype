"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/format";
import { changeLeadStatus, exportCallbacks } from "@/modules/leads/actions";

// The two interactive bits of the admin callbacks page (E6-S4, E6-S5). The page itself is a server component.

const STATUS_LABELS = { new: "New", contacted: "Contacted", closed: "Closed" } as const;
type Status = keyof typeof STATUS_LABELS;

/** Changes one request's status. The list reloads from the server afterwards, so it always shows the saved value. */
export function StatusSelect({ leadId, status, label }: { leadId: string; status: Status; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    setPending(true);
    setError(null);
    try {
      const result = await changeLeadStatus({ leadId, status: next });
      if (result.ok) router.refresh();
      else
        setError(
          result.code === "conflict"
            ? "This learner already has a new request."
            : "Could not change the status. Try again.",
        );
    } catch {
      setError("Could not change the status. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <select
        aria-label={`Status for ${label}`}
        data-testid="lead-status"
        value={status}
        disabled={pending}
        onChange={(e) => void change(e.target.value)}
        className={cn(
          "h-9 rounded-full border-0 px-3 text-xs font-bold ring-1 focus-visible:outline-2 focus-visible:outline-brand-500",
          status === "new" && "bg-sun-100 text-sun-700 ring-sun-200",
          status === "contacted" && "bg-brand-50 text-brand-700 ring-brand-200",
          status === "closed" && "bg-slate-100 text-slate-700 ring-slate-200",
        )}
      >
        {(Object.keys(STATUS_LABELS) as Status[]).map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600" data-testid="lead-status-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Builds the CSV on the server and saves it as a file. Excel opens it directly (see leads/csv.ts). */
export function DownloadCsvButton({ status }: { status: "all" | Status }) {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setNote(null);
    try {
      const result = await exportCallbacks({ status });
      if (!result.ok) {
        setNote("Could not make the file. Try again.");
        return;
      }
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNote(
        result.truncated
          ? `Downloaded the newest ${result.count} requests. Use a status filter to get the rest.`
          : `Downloaded ${result.count} ${result.count === 1 ? "request" : "requests"}.`,
      );
    } catch {
      setNote("Could not make the file. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={() => void download()}
        disabled={pending}
        data-testid="callbacks-download"
        className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-45"
      >
        <Download className="size-4" aria-hidden />
        {pending ? "Preparing…" : "Download CSV"}
      </button>
      {note && (
        <p role="status" className="text-xs text-slate-600" data-testid="callbacks-download-note">
          {note}
        </p>
      )}
    </div>
  );
}
