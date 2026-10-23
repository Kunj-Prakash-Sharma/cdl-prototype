import type { Metadata } from "next";
import { MyLearning } from "@/components/learn/my-learning";

export const metadata: Metadata = {
  title: "My Learning",
};

export default function MyLearningPage() {
  return <MyLearning />;
}
