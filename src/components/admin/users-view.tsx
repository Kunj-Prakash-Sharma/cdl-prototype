import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/format";
import type { AdminUsersView, UserFilters } from "@/modules/auth/service";

const card = "rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80";
const control = "h-11 rounded-full px-5 text-sm font-semibold transition-colors";

/** Keeps the URL short: defaults are left out. */
function usersHref({ q, role, page }: UserFilters): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role !== "all") params.set("role", role);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn(card, "px-6 py-5")}>
      <p className="text-[13px] font-medium text-slate-600">{label}</p>
      <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
    </div>
  );
}

export function UsersView({ view, filters }: { view: AdminUsersView; filters: UserFilters }) {
  const roles = [
    { value: "all", label: "All" },
    { value: "learner", label: "Learners" },
    { value: "admin", label: "Admins" },
  ] as const;
  const filtered = filters.q !== "" || filters.role !== "all";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Users</h1>
        <p className="mt-2 text-slate-600">Everyone who has logged in, newest first.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total users" value={view.stats.total} />
        <Stat label="New this week" value={view.stats.newThisWeek} />
        <Stat label="Admins" value={view.stats.admins} />
        <Stat label="Gave their name" value={view.stats.named} />
      </div>

      <section className={cn(card, "overflow-hidden")} aria-label="User list">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <form action="/admin/users" method="get" role="search" className="flex flex-1 gap-2">
            {filters.role !== "all" && <input type="hidden" name="role" value={filters.role} />}
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-paper px-4 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
              <Search className="size-[18px] shrink-0 text-slate-500" aria-hidden />
              <label htmlFor="q" className="sr-only">
                Search users by name or number
              </label>
              <input
                id="q"
                name="q"
                type="search"
                maxLength={30}
                defaultValue={filters.q}
                placeholder="Search by name or number"
                className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-slate-500"
              />
            </div>
            <button type="submit" className={cn(control, "bg-ink text-white hover:bg-slate-800")}>
              Search
            </button>
          </form>
          <div className="flex gap-2" role="group" aria-label="Filter by role">
            {roles.map((r) => (
              <Link
                key={r.value}
                href={usersHref({ q: filters.q, role: r.value, page: 1 })}
                aria-current={filters.role === r.value ? "true" : undefined}
                className={cn(
                  control,
                  "inline-flex items-center",
                  filters.role === r.value
                    ? "bg-brand-700 text-white"
                    : "bg-white text-ink ring-1 ring-slate-300 hover:ring-slate-400",
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <caption className="sr-only">Users, newest first</caption>
            <thead>
              <tr className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                <th scope="col" className="px-5 py-3.5">
                  Phone
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Name
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Role
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-5 py-3.5 font-semibold tabular-nums">{user.phoneMasked}</td>
                  <td className={cn("px-5 py-3.5", user.name ? "font-medium" : "text-slate-500")}>
                    {user.name || "Not given yet"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-1 text-xs font-bold",
                        user.role === "admin" ? "bg-sun-100 text-sun-700" : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {user.role === "admin" ? "Admin" : "Learner"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(user.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {view.rows.length === 0 && (
            <div className="border-t border-slate-100 px-5 py-14 text-center">
              <p className="font-semibold text-ink">{filtered ? "No users match these filters" : "No users yet"}</p>
              <p className="mt-1 text-sm text-slate-600">
                {filtered ? (
                  <Link href="/admin/users" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
                    Clear filters
                  </Link>
                ) : (
                  "People appear here after their first login."
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-sm text-slate-600">
          <span>
            {view.total} {view.total === 1 ? "user" : "users"}
            {filtered ? " match" : ""}. The name stays empty until the learner gives it in the chat.
          </span>
          {view.pageCount > 1 && (
            <nav aria-label="Pages" className="flex items-center gap-2">
              {view.page > 1 ? (
                <Link
                  href={usersHref({ ...filters, page: view.page - 1 })}
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
                  href={usersHref({ ...filters, page: view.page + 1 })}
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
