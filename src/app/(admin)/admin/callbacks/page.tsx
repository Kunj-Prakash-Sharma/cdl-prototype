import type { Metadata } from "next";
import { Suspense } from "react";
import { CallbacksView } from "@/components/admin/callbacks-view";
import { getUserNames, requireAdmin } from "@/modules/auth/service";
import { listLeadsForAdmin, parseLeadFilters } from "@/modules/leads/service";

export const metadata: Metadata = { title: "Callbacks" };

// searchParams and the database are request-time work, so they sit inside Suspense (Cache Components).
async function Callbacks({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseLeadFilters(await searchParams);
  const session = await requireAdmin("/admin/callbacks");
  const result = await listLeadsForAdmin(session, filters, getUserNames);
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">We could not open the callbacks</h1>
        <p className="mt-2 text-slate-600">Please refresh the page in a moment.</p>
      </div>
    );
  }
  return <CallbacksView view={result.view} filters={filters} />;
}

export default function CallbacksPage({ searchParams }: PageProps<"/admin/callbacks">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl rounded-3xl bg-white shadow-soft" aria-busy="true" />}>
      <Callbacks searchParams={searchParams} />
    </Suspense>
  );
}
