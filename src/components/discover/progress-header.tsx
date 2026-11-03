import { ProgressBar } from "@/components/ui/misc";
import type { Progress } from "@/modules/chat/types";

/** Progress only: a bar and "answered of total". The numbers come from the server, never from this file. */
export function ProgressHeader({ progress }: { progress: Progress }) {
  const value = progress.total > 0 ? progress.answered / progress.total : 0;
  return (
    <div className="mb-4 flex items-center gap-3" data-testid="progress">
      <ProgressBar value={value} className="flex-1" />
      <p className="shrink-0 text-xs font-semibold text-slate-500">
        {progress.answered} of {progress.total}
      </p>
    </div>
  );
}
