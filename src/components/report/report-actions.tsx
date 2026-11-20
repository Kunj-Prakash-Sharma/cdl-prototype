"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { trackReportAction } from "@/modules/chat/actions";

type Action = "save" | "pdf" | "callback" | "courses";

/** Funnel event for a click on the report (fixed code only). Never blocks or fails the click. */
function track(action: Action) {
  void trackReportAction({ action }).catch(() => {});
}

/** "Save as PDF": the browser's print dialog, with a file name that carries the report date. */
export function PrintButton({ fileTitle }: { fileTitle: string }) {
  const onClick = () => {
    track("pdf");
    const previous = document.title;
    document.title = fileTitle;
    window.addEventListener("afterprint", () => (document.title = previous), { once: true });
    window.print();
  };
  return (
    <Button variant="secondary" size="sm" onClick={onClick} data-testid="report-print">
      <Printer className="size-4" aria-hidden />
      Save as PDF
    </Button>
  );
}

/** A link that also records which report button was used. */
export function ReportLink({
  href,
  action,
  children,
  variant = "secondary",
  testId,
}: {
  href: string;
  action: Action;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "light";
  testId?: string;
}) {
  return (
    <ButtonLink href={href} variant={variant} size="sm" onClick={() => track(action)} data-testid={testId}>
      {children}
    </ButtonLink>
  );
}

/** A plain text link to a course, which also records the click. */
export function CourseLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} onClick={() => track("courses")} className={className}>
      {children}
    </Link>
  );
}
