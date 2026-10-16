import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseExperience } from "@/components/learn/course-experience";
import { COURSES, getCourse } from "@/lib/data/courses";

export function generateStaticParams() {
  return COURSES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  return { title: course?.title ?? "Course", description: course?.tagline };
}

export default async function CoursePage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  if (!getCourse(slug)) notFound();
  return <CourseExperience slug={slug} />;
}
