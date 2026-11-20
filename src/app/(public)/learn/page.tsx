import type { Metadata } from "next";
import { CourseCatalog } from "@/components/learn/course-catalog";

export const metadata: Metadata = {
  title: "Level 1 · Self-paced learning",
  description: "Career-focused, self-paced video courses with free previews.",
};

export default function LearnPage() {
  return <CourseCatalog />;
}
