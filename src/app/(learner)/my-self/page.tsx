import { Suspense } from "react";
import type { Metadata } from "next";
import { MyLearning } from "@/components/learn/my-learning";
import { MyReportCard } from "@/components/report/my-report-card";

export const metadata: Metadata = {
  title: "My Learning",
};

export default function MyLearningPage() {
  return (
    <>
      {/* Session and database reads are request-time work: own Suspense boundary (Cache Components). */}
      <Suspense fallback={null}>
        <div className="px-4 pt-6 sm:px-6">
          <MyReportCard />
        </div>
      </Suspense>
      <MyLearning />
    </>
  );
}
