// PRIVATE to modules/auth. Admin allow-list (D64 #9): numbers in ADMIN_PHONES are admins, everyone else is a learner.
import { env } from "@/lib/env";
import { parsePhoneList } from "./phone";
import type { Role } from "./types";

const adminPhones = parsePhoneList(env.ADMIN_PHONES);

export function roleForPhone(phone: string | null | undefined): Role {
  return phone && adminPhones.has(phone) ? "admin" : "learner";
}
