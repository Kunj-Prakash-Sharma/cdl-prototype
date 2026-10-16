import type { LucideIcon } from "lucide-react";
import {
  Brain,
  ChartColumn,
  Code,
  Landmark,
  Leaf,
  Megaphone,
  MessageCircle,
  PenTool,
  Rocket,
} from "lucide-react";

export type Lesson = { id: string; title: string; minutes: number; preview: boolean };
export type Module = { id: string; title: string; lessons: Lesson[] };
export type ResourceType = "PDF" | "Template" | "Dataset" | "Worksheet" | "Code";
export type Resource = { id: string; title: string; type: ResourceType; size: string };

export type CourseCategory =
  | "Data"
  | "Design"
  | "Technology"
  | "Business"
  | "Marketing"
  | "Finance"
  | "Communication"
  | "Sustainability";

export type Course = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: CourseCategory;
  level: "Beginner" | "Intermediate";
  hours: number;
  price: number;
  listPrice: number;
  rating: number;
  reviews: number;
  learners: number;
  instructor: { name: string; role: string; initials: string; bio: string };
  theme: { from: string; to: string };
  icon: LucideIcon;
  outcomes: string[];
  skills: string[];
  careers: string[];
  modules: Module[];
  resources: Resource[];
};

export const CATEGORIES: CourseCategory[] = [
  "Data",
  "Design",
  "Technology",
  "Business",
  "Marketing",
  "Finance",
  "Communication",
  "Sustainability",
];

/** The first two lessons of every course are free previews. */
const FREE_PREVIEW_LESSONS = 2;

function curriculum(mods: [string, [string, number][]][]): Module[] {
  let n = 0;
  return mods.map(([title, lessons], mi) => ({
    id: `m${mi + 1}`,
    title,
    lessons: lessons.map(([lessonTitle, minutes], li) => ({
      id: `m${mi + 1}l${li + 1}`,
      title: lessonTitle,
      minutes,
      preview: n++ < FREE_PREVIEW_LESSONS,
    })),
  }));
}

function resources(items: [string, ResourceType, string][]): Resource[] {
  return items.map(([title, type, size], i) => ({ id: `r${i + 1}`, title, type, size }));
}

export const COURSES: Course[] = [
  {
    slug: "data-analytics-foundations",
    title: "Data Analytics Foundations",
    tagline: "Turn raw numbers into decisions with Excel, SQL and storytelling.",
    description:
      "A practical, project-first introduction to data analytics. You'll clean real datasets, write SQL to answer business questions, build dashboards and present insights that get people to act.",
    category: "Data",
    level: "Beginner",
    hours: 18,
    price: 2499,
    listPrice: 4999,
    rating: 4.8,
    reviews: 2341,
    learners: 18400,
    instructor: {
      name: "Ananya Rao",
      role: "Lead Data Analyst",
      initials: "AR",
      bio: "Ananya has spent nine years helping retail and fintech teams make sense of their data, and has mentored 200+ junior analysts.",
    },
    theme: { from: "#5a45f2", to: "#22d3ee" },
    icon: ChartColumn,
    outcomes: [
      "Clean and structure messy, real-world datasets",
      "Write SQL queries that answer business questions",
      "Build interactive dashboards in Excel",
      "Present insights with clear, persuasive visuals",
    ],
    skills: ["Excel", "SQL", "Data cleaning", "Dashboards", "Data storytelling"],
    careers: ["data-analyst", "financial-analyst", "business-ops", "health-data-specialist"],
    modules: curriculum([
      ["Thinking like an analyst", [["What analysts actually do", 8], ["Asking the right business questions", 11], ["The analytics workflow, end to end", 14]]],
      ["Spreadsheets that work for you", [["Cleaning messy data in Excel", 16], ["Formulas, lookups and pivot tables", 22], ["Building your first dashboard", 19]]],
      ["SQL for analysis", [["SELECT, WHERE and ORDER BY", 18], ["Joins without the fear", 21], ["Aggregations and GROUP BY", 17]]],
      ["Storytelling with data", [["Choosing the right chart", 13], ["Designing a one-page insight report", 15], ["Capstone: retail sales analysis", 28]]],
    ]),
    resources: resources([
      ["SQL cheat sheet", "PDF", "1.2 MB"],
      ["Dashboard starter template", "Template", "640 KB"],
      ["Retail sales capstone dataset", "Dataset", "3.8 MB"],
      ["Insight report worksheet", "Worksheet", "420 KB"],
    ]),
  },
  {
    slug: "ux-design-essentials",
    title: "UX Design Essentials",
    tagline: "Research, wireframe and prototype products people love.",
    description:
      "Learn the full UX process the way product teams practise it: understand users, map their journeys, sketch solutions, prototype them and test with real people — ending with a portfolio-ready case study.",
    category: "Design",
    level: "Beginner",
    hours: 20,
    price: 2799,
    listPrice: 5499,
    rating: 4.9,
    reviews: 1876,
    learners: 14200,
    instructor: {
      name: "Kabir Mehta",
      role: "Senior Product Designer",
      initials: "KM",
      bio: "Kabir designs consumer apps used by millions and runs portfolio reviews for early-career designers every month.",
    },
    theme: { from: "#ec4899", to: "#8b5cf6" },
    icon: PenTool,
    outcomes: [
      "Plan and run user interviews with confidence",
      "Turn research into personas and journey maps",
      "Wireframe and prototype interactive flows",
      "Run usability tests and iterate on feedback",
    ],
    skills: ["User research", "Wireframing", "Prototyping", "Usability testing", "Figma"],
    careers: ["ux-designer", "product-manager", "learning-designer", "content-strategist"],
    modules: curriculum([
      ["Foundations of UX", [["What great UX feels like", 9], ["The design thinking process", 13], ["Mental models and usability heuristics", 16]]],
      ["Understanding users", [["Planning user interviews", 15], ["Personas and journey maps", 18], ["Synthesising research insights", 17]]],
      ["From sketch to prototype", [["Information architecture", 14], ["Wireframing fast", 19], ["Interactive prototypes in Figma", 24]]],
      ["Testing & portfolio", [["Running usability tests", 16], ["Iterating on feedback", 12], ["Capstone: redesign a mobile app", 30]]],
    ]),
    resources: resources([
      ["Interview script template", "Template", "380 KB"],
      ["Persona & journey map kit", "Template", "2.4 MB"],
      ["Usability test checklist", "PDF", "520 KB"],
      ["Portfolio case study guide", "PDF", "1.6 MB"],
    ]),
  },
  {
    slug: "python-for-beginners",
    title: "Python Programming for Beginners",
    tagline: "Write real programs from day one — no experience needed.",
    description:
      "Go from zero to confidently writing Python. Every concept is paired with hands-on exercises, and you'll finish by shipping two complete projects you can show off.",
    category: "Technology",
    level: "Beginner",
    hours: 22,
    price: 1999,
    listPrice: 3999,
    rating: 4.8,
    reviews: 3102,
    learners: 26800,
    instructor: {
      name: "Rohan Iyer",
      role: "Software Engineer",
      initials: "RI",
      bio: "Rohan builds backend systems at a fast-growing SaaS company and has taught programming to over 30,000 beginners.",
    },
    theme: { from: "#0ea5e9", to: "#10b981" },
    icon: Code,
    outcomes: [
      "Write clean Python programs from scratch",
      "Work confidently with lists, dictionaries and functions",
      "Read files, call APIs and handle errors",
      "Ship two portfolio projects",
    ],
    skills: ["Python", "Problem solving", "Data structures", "APIs", "Debugging"],
    careers: ["software-developer", "ai-ml-engineer", "data-analyst", "health-data-specialist"],
    modules: curriculum([
      ["Getting started", [["Why Python, and how to set it up", 10], ["Variables, types and your first script", 15], ["Making decisions with if/else", 14]]],
      ["Core building blocks", [["Loops that do the heavy lifting", 17], ["Lists, dictionaries and sets", 20], ["Writing reusable functions", 18]]],
      ["Working with real data", [["Reading and writing files", 16], ["Handling errors gracefully", 13], ["Using libraries and APIs", 21]]],
      ["Build projects", [["Project: expense tracker", 26], ["Project: weather dashboard", 28], ["Next steps in your coding journey", 9]]],
    ]),
    resources: resources([
      ["Python syntax cheat sheet", "PDF", "900 KB"],
      ["Project starter code", "Code", "1.1 MB"],
      ["Practice problem set", "Worksheet", "460 KB"],
      ["Debugging checklist", "PDF", "310 KB"],
    ]),
  },
  {
    slug: "product-management-101",
    title: "Product Management 101",
    tagline: "Learn how great products are discovered, built and launched.",
    description:
      "Understand what product managers really do and practise the core craft: finding problems worth solving, prioritising ruthlessly, aligning teams and measuring what matters.",
    category: "Business",
    level: "Beginner",
    hours: 16,
    price: 2999,
    listPrice: 5999,
    rating: 4.7,
    reviews: 1214,
    learners: 9600,
    instructor: {
      name: "Meera Krishnan",
      role: "Group Product Manager",
      initials: "MK",
      bio: "Meera has led product teams across e-commerce and edtech, launching products used by over 10 million people.",
    },
    theme: { from: "#f59e0b", to: "#ef4444" },
    icon: Rocket,
    outcomes: [
      "Run customer discovery interviews",
      "Prioritise features with proven frameworks",
      "Write crisp specs and build aligned roadmaps",
      "Define metrics and learn from launch data",
    ],
    skills: ["Product discovery", "Prioritization", "Roadmapping", "Product metrics", "Stakeholder communication"],
    careers: ["product-manager", "entrepreneur", "business-ops", "ux-designer"],
    modules: curriculum([
      ["The PM role", [["What product managers really do", 11], ["Working with design and engineering", 14], ["Product sense: spotting good problems", 16]]],
      ["Discovery", [["Customer discovery interviews", 15], ["Prioritisation frameworks", 18], ["Writing a crisp product spec", 17]]],
      ["Delivery", [["Roadmaps that align teams", 14], ["Agile rituals that actually help", 13], ["Metrics and north stars", 16]]],
      ["Launch & grow", [["Go-to-market basics", 15], ["Learning from launch data", 12], ["Capstone: pitch your product", 25]]],
    ]),
    resources: resources([
      ["Product spec (PRD) template", "Template", "450 KB"],
      ["Prioritisation scorecard", "Template", "380 KB"],
      ["Metrics tree worksheet", "Worksheet", "290 KB"],
      ["Launch checklist", "PDF", "340 KB"],
    ]),
  },
  {
    slug: "digital-marketing-masterclass",
    title: "Digital Marketing Masterclass",
    tagline: "Grow brands with content, social, search and performance marketing.",
    description:
      "A complete, modern marketing toolkit. Learn to position a brand, create content people share, rank in search, run paid campaigns and measure what's working.",
    category: "Marketing",
    level: "Beginner",
    hours: 19,
    price: 2299,
    listPrice: 4499,
    rating: 4.7,
    reviews: 2058,
    learners: 21300,
    instructor: {
      name: "Sana Qureshi",
      role: "Head of Growth",
      initials: "SQ",
      bio: "Sana has scaled three consumer brands from launch to millions of customers using content-led and performance marketing.",
    },
    theme: { from: "#f43f5e", to: "#fb923c" },
    icon: Megaphone,
    outcomes: [
      "Define positioning and messaging for any brand",
      "Plan content and social calendars that grow audiences",
      "Run SEO, paid ads and email campaigns",
      "Measure and optimise with analytics and A/B tests",
    ],
    skills: ["Content strategy", "SEO", "Paid ads", "Social media", "Marketing analytics"],
    careers: ["marketing-strategist", "content-strategist", "entrepreneur"],
    modules: curriculum([
      ["Marketing foundations", [["How modern marketing works", 10], ["Know your audience", 14], ["Positioning and messaging", 16]]],
      ["Content & social", [["Content that people share", 17], ["Building a social media calendar", 15], ["Short-form video basics", 18]]],
      ["Search & performance", [["SEO fundamentals", 19], ["Running your first ad campaign", 22], ["Email marketing that converts", 14]]],
      ["Measure & optimise", [["Analytics for marketers", 16], ["A/B testing", 13], ["Capstone: launch a campaign", 27]]],
    ]),
    resources: resources([
      ["Content calendar template", "Template", "520 KB"],
      ["SEO audit checklist", "PDF", "610 KB"],
      ["Ad copy swipe file", "PDF", "1.4 MB"],
      ["Campaign brief template", "Template", "330 KB"],
    ]),
  },
  {
    slug: "finance-fundamentals",
    title: "Financial Literacy & Modeling",
    tagline: "Read financial statements and build models with confidence.",
    description:
      "Demystify how businesses make and spend money. Learn to read statements, analyse performance, build a three-statement model and communicate financial insights clearly.",
    category: "Finance",
    level: "Beginner",
    hours: 17,
    price: 2499,
    listPrice: 4999,
    rating: 4.8,
    reviews: 1447,
    learners: 11900,
    instructor: {
      name: "Vikram Shah",
      role: "Investment Analyst, CFA",
      initials: "VS",
      bio: "Vikram has analysed hundreds of companies for an investment firm and loves making finance approachable for non-finance folks.",
    },
    theme: { from: "#059669", to: "#84cc16" },
    icon: Landmark,
    outcomes: [
      "Read and interpret P&L, balance sheet and cash flow",
      "Analyse companies with the ratios that matter",
      "Build a three-statement financial model",
      "Forecast revenue and run scenario analysis",
    ],
    skills: ["Financial statements", "Excel modeling", "Valuation", "Forecasting", "Unit economics"],
    careers: ["financial-analyst", "business-ops", "entrepreneur"],
    modules: curriculum([
      ["Money basics", [["How businesses make money", 12], ["Reading a P&L statement", 18], ["Balance sheets and cash flow", 19]]],
      ["Analysis toolkit", [["Financial ratios that matter", 17], ["Unit economics", 15], ["Benchmarking competitors", 14]]],
      ["Modeling", [["Building a three-statement model", 26], ["Forecasting revenue", 20], ["Scenario and sensitivity analysis", 18]]],
      ["Applying it", [["Valuation basics", 21], ["Communicating financial insights", 13], ["Capstone: model a startup", 29]]],
    ]),
    resources: resources([
      ["Three-statement model template", "Template", "1.8 MB"],
      ["Financial ratios cheat sheet", "PDF", "480 KB"],
      ["Startup financials dataset", "Dataset", "2.2 MB"],
      ["Valuation worksheet", "Worksheet", "360 KB"],
    ]),
  },
  {
    slug: "communication-storytelling",
    title: "Communication & Storytelling at Work",
    tagline: "Speak, write and present so people listen — and act.",
    description:
      "The career skill that multiplies every other skill. Learn to structure messages, write with clarity, present with confidence and handle feedback and tough conversations.",
    category: "Communication",
    level: "Beginner",
    hours: 10,
    price: 1499,
    listPrice: 2999,
    rating: 4.9,
    reviews: 2690,
    learners: 31500,
    instructor: {
      name: "Nisha Fernandes",
      role: "Leadership & Communication Coach",
      initials: "NF",
      bio: "Nisha coaches leaders and graduates on communication, and has trained teams across 40+ organisations.",
    },
    theme: { from: "#6366f1", to: "#ec4899" },
    icon: MessageCircle,
    outcomes: [
      "Structure any message so it lands",
      "Write emails and documents people actually read",
      "Present with confidence and handle tough questions",
      "Give and receive feedback constructively",
    ],
    skills: ["Public speaking", "Business writing", "Storytelling", "Feedback", "Facilitation"],
    careers: ["hr-people-partner", "learning-designer", "content-strategist", "marketing-strategist", "product-manager"],
    modules: curriculum([
      ["Foundations", [["Why communication multiplies your career", 8], ["Knowing your audience", 11], ["Structuring any message", 13]]],
      ["Writing", [["Emails people actually read", 12], ["Writing for clarity", 14], ["Documents that drive decisions", 15]]],
      ["Speaking", [["Presenting with confidence", 16], ["Storytelling frameworks", 14], ["Handling tough questions", 12]]],
      ["Influence", [["Giving and receiving feedback", 13], ["Facilitating great meetings", 11], ["Capstone: your 3-minute pitch", 20]]],
    ]),
    resources: resources([
      ["Message structure canvas", "Template", "280 KB"],
      ["Presentation outline template", "Template", "410 KB"],
      ["Feedback conversation guide", "PDF", "520 KB"],
      ["Pitch practice worksheet", "Worksheet", "240 KB"],
    ]),
  },
  {
    slug: "ai-ml-foundations",
    title: "Intro to AI & Machine Learning",
    tagline: "Understand and build the models shaping every industry.",
    description:
      "Build real intuition for how machine learning and generative AI work. Train and evaluate models, explore how large language models think, and learn to build responsibly.",
    category: "Technology",
    level: "Intermediate",
    hours: 24,
    price: 3199,
    listPrice: 6499,
    rating: 4.8,
    reviews: 1689,
    learners: 13700,
    instructor: {
      name: "Dr. Arjun Menon",
      role: "ML Research Scientist",
      initials: "AM",
      bio: "Arjun researches applied machine learning and has published work on model fairness. He makes complex ideas feel simple.",
    },
    theme: { from: "#7c3aed", to: "#06b6d4" },
    icon: Brain,
    outcomes: [
      "Explain how machine learning models learn",
      "Train, evaluate and compare classic ML models",
      "Understand neural networks and large language models",
      "Build and deploy a simple predictive model",
    ],
    skills: ["Machine learning", "Python", "Model evaluation", "Generative AI", "Responsible AI"],
    careers: ["ai-ml-engineer", "software-developer", "data-analyst", "health-data-specialist"],
    modules: curriculum([
      ["The AI landscape", [["What AI can and can't do", 12], ["How machines learn from data", 16], ["The ML project lifecycle", 14]]],
      ["Core techniques", [["Regression and classification", 22], ["Decision trees and ensembles", 20], ["Evaluating model performance", 18]]],
      ["Deep learning & GenAI", [["Neural networks, intuitively", 21], ["How large language models work", 19], ["Building with AI APIs", 23]]],
      ["Responsible AI", [["Bias, fairness and ethics", 14], ["Deploying a model", 17], ["Capstone: build a predictor", 30]]],
    ]),
    resources: resources([
      ["ML algorithms cheat sheet", "PDF", "1.3 MB"],
      ["Notebook starter pack", "Code", "2.7 MB"],
      ["Housing prices dataset", "Dataset", "4.1 MB"],
      ["Model evaluation worksheet", "Worksheet", "390 KB"],
    ]),
  },
  {
    slug: "sustainability-esg",
    title: "Sustainability & ESG Fundamentals",
    tagline: "Build a career that's good for business and the planet.",
    description:
      "Understand the science, frameworks and business case for sustainability. Learn to measure impact, report on ESG and design strategies that create lasting change.",
    category: "Sustainability",
    level: "Beginner",
    hours: 12,
    price: 1799,
    listPrice: 3499,
    rating: 4.7,
    reviews: 842,
    learners: 6300,
    instructor: {
      name: "Priya Nair",
      role: "Sustainability Consultant",
      initials: "PN",
      bio: "Priya advises manufacturers and startups on decarbonisation and ESG reporting, and teaches climate literacy workshops.",
    },
    theme: { from: "#16a34a", to: "#0ea5e9" },
    icon: Leaf,
    outcomes: [
      "Explain the business case for sustainability",
      "Calculate a basic carbon footprint",
      "Navigate ESG frameworks and reporting",
      "Design a sustainability strategy for an organisation",
    ],
    skills: ["ESG reporting", "Carbon accounting", "Sustainability strategy", "Stakeholder engagement", "Impact measurement"],
    careers: ["sustainability-consultant", "business-ops", "entrepreneur"],
    modules: curriculum([
      ["Why sustainability", [["The business case for sustainability", 11], ["Climate science essentials", 15], ["Key frameworks and standards", 14]]],
      ["Measuring impact", [["Carbon footprinting basics", 18], ["ESG metrics and reporting", 17], ["Life-cycle thinking", 13]]],
      ["Driving change", [["Designing a sustainable strategy", 16], ["Engaging stakeholders", 12], ["Green innovation case studies", 15]]],
      ["Your green career", [["Roles in the sustainability space", 10], ["Building your impact portfolio", 12], ["Capstone: ESG audit", 24]]],
    ]),
    resources: resources([
      ["ESG reporting template", "Template", "720 KB"],
      ["Carbon calculator worksheet", "Worksheet", "540 KB"],
      ["Frameworks comparison guide", "PDF", "1.1 MB"],
      ["Case study pack", "PDF", "2.9 MB"],
    ]),
  },
];

export function getCourse(slug: string) {
  return COURSES.find((c) => c.slug === slug);
}

export function allLessons(course: Course) {
  return course.modules.flatMap((m) => m.lessons);
}

export function lessonCount(course: Course) {
  return allLessons(course).length;
}

export function previewCount(course: Course) {
  return allLessons(course).filter((l) => l.preview).length;
}

/** Bundle pricing for a recommended learning path. */
export const BUNDLE_DISCOUNT = 0.3;

export function bundlePrice(courses: Course[]) {
  const total = courses.reduce((sum, c) => sum + c.price, 0);
  const discounted = Math.round((total * (1 - BUNDLE_DISCOUNT)) / 100) * 100 - 1;
  return { total, price: Math.max(discounted, 0) };
}
