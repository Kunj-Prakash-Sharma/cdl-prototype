import {
  ArrowRight,
  BrainCircuit,
  ChartColumn,
  ChevronDown,
  CirclePlay,
  Clock,
  GraduationCap,
  Lock,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { HeroVisual } from "@/components/home/hero-visual";
import { RadarChart } from "@/components/charts/radar-chart";
import { CourseCard } from "@/components/learn/course-card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Eyebrow, ProgressBar, SageAvatar } from "@/components/ui/misc";
import { Reveal } from "@/components/ui/reveal";

const STATS = [
  { value: "12 min", label: "to your personalised career report" },
  { value: "14+", label: "career paths mapped to your profile" },
  { value: "3-in-1", label: "psychometric, aptitude & values assessment" },
  { value: "₹0", label: "to discover — pay only for learning" },
];

const STEPS = [
  {
    icon: MessageCircle,
    title: "Chat with Sage",
    body: "A friendly, conversational onboarding that learns your education, interests, strengths and goals.",
    tag: "CDL · AI Career Discovery",
  },
  {
    icon: BrainCircuit,
    title: "Take smart assessments",
    body: "Short psychometric, aptitude and work-values quizzes — interactive, untimed and genuinely fun.",
    tag: "~8 minutes",
  },
  {
    icon: ChartColumn,
    title: "Get your career report",
    body: "Your profile, strengths, development areas and top career matches — with the reasons why.",
    tag: "Instant & free",
  },
  {
    icon: GraduationCap,
    title: "Learn with Level 1",
    body: "Self-paced courses picked for your path. Preview free, unlock the full course when you're ready.",
    tag: "Self-paced",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I was stuck between engineering and design. The report showed me why UX sits right in the middle — I enrolled in the course the same day.",
    name: "Ishita P.",
    role: "Final-year B.Tech student",
  },
  {
    quote:
      "It felt like talking to a mentor, not filling out a form. The strengths section put words to things I'd never been able to explain in interviews.",
    name: "Rahul M.",
    role: "Career switcher, ops → analytics",
  },
  {
    quote:
      "The learning path was spot on. Previewing lessons before paying made the decision easy, and the resources are genuinely useful.",
    name: "Fatima S.",
    role: "Commerce graduate",
  },
];

const FAQ = [
  {
    q: "Is the AI career discovery really free?",
    a: "Yes. The conversation, all three assessments and your full career report are free. You only pay if you choose to enrol in Level 1 courses.",
  },
  {
    q: "How are my career matches calculated?",
    a: "We combine your interest profile (based on the Holland RIASEC model), aptitude results, work values and what you share with Sage, then compare them against detailed career profiles.",
  },
  {
    q: "What do I get with Level 1 learning?",
    a: "Full access to self-paced video lessons, downloadable templates and datasets, hands-on projects and a certificate of completion. Every course has free preview lessons.",
  },
  {
    q: "What about live cohorts and mentoring?",
    a: "Level 2 (live cohort learning) and Level 3 (one-to-one mentoring) are coming in a future phase. Level 1 gives you a strong foundation in the meantime.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-linear-to-r from-brand-200/60 via-fuchsia-200/40 to-sun-200/50 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="max-w-2xl">
            <Badge tone="white" className="shadow-soft">
              <Sparkles className="size-3.5 text-brand-600" aria-hidden />
              New · CDL AI Career Discovery
            </Badge>
            <h1 className="mt-6 text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[72px]">
              Discover who you&apos;re{" "}
              <span className="font-serif font-normal italic tracking-normal text-gradient">meant to become.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              SELF is the complete career development and learning platform. Start with a 12-minute AI-guided
              conversation, get a career report that actually explains you — then learn the skills to get there.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/discover" size="lg">
                Start free career discovery <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/learn" size="lg" variant="secondary">
                <CirclePlay className="size-4" aria-hidden /> Explore courses
              </ButtonLink>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {["IP", "RM", "FS", "AK", "NJ"].map((i, idx) => (
                  <span
                    key={i}
                    className="grid size-9 place-items-center rounded-full text-[11px] font-bold text-white ring-2 ring-paper"
                    style={{ background: ["#5a45f2", "#ec4899", "#0ea5e9", "#f59e0b", "#10b981"][idx] }}
                  >
                    {i}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-ink">120,000+ learners</span> have mapped their path with SELF
              </p>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200/70 px-0 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white px-6 py-8 sm:px-8">
              <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{s.value}</p>
              <p className="mt-1.5 text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>How SELF works</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              From <span className="font-serif font-normal italic">“what should I do?”</span> to a clear plan
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              One seamless journey — no forms, no guesswork. Each step builds on the last.
            </p>
          </Reveal>

          <div className="relative mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12%] right-[12%] top-[38px] hidden h-px bg-linear-to-r from-brand-200 via-brand-400 to-sun-300 lg:block" />
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="relative h-full rounded-3xl bg-white p-6 ring-1 ring-slate-200/80 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="relative grid size-[52px] place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-800 text-white shadow-glow">
                      <step.icon className="size-6" aria-hidden />
                    </span>
                    <span className="font-serif text-4xl italic text-slate-200">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
                  <p className="mt-5 text-xs font-semibold text-brand-700">{step.tag}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CDL spotlight ---------------- */}
      <section className="relative overflow-hidden bg-ink py-24 text-white">
        <div className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="absolute -left-40 top-10 size-[480px] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -right-40 bottom-0 size-[420px] rounded-full bg-sun-500/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">CDL · AI Career Discovery</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              A career guide that <span className="font-serif font-normal italic text-sun-300">listens first.</span>
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/70">
              Sage gets to know you through conversation, then guides you through assessments designed by career
              psychologists — all on one calm, focused page.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { icon: MessageCircle, t: "Conversational onboarding", d: "Education, interests, strengths & goals" },
                { icon: Target, t: "3 assessments in one flow", d: "Psychometric, aptitude and work values" },
                { icon: ChartColumn, t: "Explainable results", d: "Every match comes with the “why”" },
                { icon: ShieldCheck, t: "Private by design", d: "Your answers are yours alone" },
              ].map((f) => (
                <li key={f.t} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
                    <f.icon className="size-5 text-brand-200" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{f.t}</p>
                    <p className="text-sm text-white/55">{f.d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <ButtonLink href="/discover" variant="light" size="lg" className="mt-10">
              Meet Sage <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-[28px] bg-white/[0.06] p-2 ring-1 ring-white/10 backdrop-blur">
              <div className="rounded-3xl bg-white p-5 text-ink sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <SageAvatar />
                    <div>
                      <p className="font-bold">Sage</p>
                      <p className="text-xs text-slate-500">Step 1 of 4 · About you</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-brand-700">35%</span>
                </div>
                <div className="space-y-3 py-5 text-sm">
                  <p className="max-w-[85%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-slate-700">
                    Lovely to meet you, Aarav! Where are you in your journey right now?
                  </p>
                  <p className="ml-auto max-w-[70%] rounded-2xl rounded-tr-md bg-brand-600 px-4 py-3 text-white">
                    Undergraduate student
                  </p>
                  <p className="max-w-[85%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-slate-700">
                    Great stage to explore. What&apos;s your field of study or background?
                  </p>
                  <div className="flex items-center gap-1.5 px-1 pt-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-2 animate-bounce rounded-full bg-slate-300"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {["Science", "Commerce", "Engineering & Technology", "Design & Media"].map((o, i) => (
                    <span
                      key={o}
                      className={
                        i === 2
                          ? "rounded-full bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 ring-1 ring-brand-300"
                          : "rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                      }
                    >
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Report preview ---------------- */}
      <section className="py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-8">
          <Reveal className="order-2 lg:order-1">
            <div className="rounded-[28px] bg-white p-6 shadow-lift ring-1 ring-slate-200/70 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Eyebrow>Career profile</Eyebrow>
                  <p className="mt-1 font-serif text-3xl italic text-ink">The Creative Analyst</p>
                </div>
                <div className="flex gap-1.5">
                  {["I", "A", "S"].map((d) => (
                    <span key={d} className="grid size-8 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid items-center gap-6 sm:grid-cols-[1fr_1fr]">
                <RadarChart scores={{ R: 34, I: 88, A: 76, S: 62, E: 48, C: 55 }} size={260} interactive={false} />
                <div className="space-y-4">
                  {[
                    { t: "UX / Product Designer", v: 94 },
                    { t: "Data Analyst", v: 91 },
                    { t: "Product Manager", v: 86 },
                  ].map((m) => (
                    <div key={m.t}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-semibold text-ink">{m.t}</span>
                        <span className="text-slate-500">{m.v}%</span>
                      </div>
                      <ProgressBar value={m.v / 100} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2" delay={0.1}>
            <Eyebrow>Personalised results</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              A report that explains <span className="font-serif font-normal italic">you</span> — not just a label.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              See your interest profile, aptitude scores and what drives you. Understand your strengths and the
              areas worth developing, then explore careers matched to you with clear reasons why.
            </p>
            <ul className="mt-6 space-y-3 text-slate-700">
              {[
                "Career archetype & Holland code",
                "Strengths and development areas",
                "Top career matches with salary & outlook",
                "A Level 1 learning path built for you",
              ].map((x) => (
                <li key={x} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Sparkles className="size-3.5" aria-hidden />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Levels ---------------- */}
      <section id="levels" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Learning levels</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Grow at your own pace</h2>
            <p className="mt-4 text-lg text-slate-600">
              Your report leads straight into learning. Start self-paced today — live cohorts and mentoring are on
              the way.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            <Reveal>
              <div className="relative h-full overflow-hidden rounded-3xl bg-linear-to-br from-brand-600 to-brand-900 p-8 text-white shadow-glow">
                <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />
                <Badge tone="white">Available now</Badge>
                <p className="mt-6 text-sm font-semibold text-brand-200">Level 1</p>
                <h3 className="mt-1 text-2xl font-bold">Self-paced learning</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Expert-led video courses, downloadable resources and hands-on projects matched to your career
                  path.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-white/85">
                  {["Free preview lessons on every course", "Templates, datasets & worksheets", "Certificate of completion"].map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <CirclePlay className="size-4 text-sun-300" aria-hidden /> {x}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/learn" variant="light" className="mt-8">
                  Browse Level 1 courses <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            </Reveal>
            {[
              { level: "Level 2", title: "Live cohort learning", icon: Users, body: "Learn alongside peers in instructor-led live cohorts with projects and feedback." },
              { level: "Level 3", title: "One-to-one mentoring", icon: Target, body: "Personal guidance from industry mentors to accelerate your next career move." },
            ].map((l, i) => (
              <Reveal key={l.level} delay={(i + 1) * 0.08}>
                <div className="relative h-full rounded-3xl border border-dashed border-slate-300 bg-paper p-8">
                  <Badge tone="slate">
                    <Lock className="size-3" aria-hidden /> Coming in Phase 2
                  </Badge>
                  <p className="mt-6 text-sm font-semibold text-slate-400">{l.level}</p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-700">{l.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">{l.body}</p>
                  <l.icon className="mt-8 size-10 text-slate-300" strokeWidth={1.5} aria-hidden />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Featured courses ---------------- */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <Reveal>
              <Eyebrow>Popular in Level 1</Eyebrow>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">Start learning today</h2>
              <p className="mt-3 flex items-center gap-2 text-slate-600">
                <Clock className="size-4" aria-hidden /> Self-paced · preview any course for free
              </p>
            </Reveal>
            <ButtonLink href="/learn" variant="secondary">
              View all courses <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {["data-analytics-foundations", "ux-design-essentials", "python-for-beginners"].map((slug, i) => (
              <Reveal key={slug} delay={i * 0.08}>
                <CourseCard slug={slug} className="h-full" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <Eyebrow>Learner stories</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">Clarity, then momentum</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <figure className="flex h-full flex-col rounded-3xl bg-paper p-7 ring-1 ring-slate-200/70">
                  <Quote className="size-8 text-brand-300" aria-hidden />
                  <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">“{t.quote}”</blockquote>
                  <figcaption className="mt-6 border-t border-slate-200 pt-4">
                    <p className="font-semibold text-ink">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.role}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="scroll-mt-20 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">Questions, answered</h2>
            <p className="mt-4 text-slate-600">Everything you need to know before you begin.</p>
          </div>
          <div className="divide-y divide-slate-200 rounded-3xl bg-white px-6 ring-1 ring-slate-200/70 shadow-soft">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                  {f.q}
                  <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-3 pr-8 text-[15px] leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-ink px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div className="absolute inset-0 bg-linear-to-br from-brand-700/60 via-transparent to-sun-500/25" />
          <div className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative mx-auto max-w-2xl">
            <SageAvatar size="lg" className="mx-auto" />
            <h2 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Your career story starts with a <span className="font-serif font-normal italic text-sun-300">12-minute</span> conversation.
            </h2>
            <p className="mt-4 text-lg text-white/70">Free, private and surprisingly fun. No sign-up needed for this prototype.</p>
            <ButtonLink href="/discover" variant="light" size="lg" className="mt-8">
              Start career discovery <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
