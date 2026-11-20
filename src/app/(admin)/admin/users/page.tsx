import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersView } from "@/components/admin/users-view";
import { listUsersForAdmin, parseUserFilters } from "@/modules/auth/service";

export const metadata: Metadata = { title: "Users" };

// searchParams and the database are request-time work, so they sit inside Suspense (Cache Components).
async function Users({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseUserFilters(await searchParams);
  const view = await listUsersForAdmin(filters);
  return <UsersView view={view} filters={filters} />;
}

export default function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl rounded-3xl bg-white shadow-soft" aria-busy="true" />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}
