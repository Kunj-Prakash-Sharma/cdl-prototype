import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ClipboardList, Compass, MessageCircle, Route } from "lucide-react";
import { StoryRail } from "@/components/home/story-rail";
import { CourseCard } from "@/components/learn/course-card";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, LogoMark } from "@/components/ui/misc";
import { brand } from "@/config/brand";
import { sampleChatPreview, sampleCoach, sampleLaunchOffer, sampleOffer, sampleStories } from "@/content/samples";
import { COURSES } from "@/modules/catalog/courses";

// V5 home (D81). Sections: hero + guide preview, courses, student stories, career coach, FAQ, closing CTA.
// Gaps against the artboard (see docs/prototype/reuse-map.md row 7):
//  - The artboard's chat runs inside this page. It starts on /discover instead (client feedback 4973), so the card
//    here is a static preview and its quick replies are links.
//  - Course prices, "with NEWYEAR26" prices and Buy now / cart wait for `commerce` and `catalog` (D82).
//  - "Book a free call" needs an anonymous callback request; callbacks need a finished report today (D71).

const SHOP_COURSE_COUNT = 8;

const FAQ = [
  {
    q: `What is ${brand.guideName}?`,
    a: `${brand.guideName} is our career guide. You answer a short set of questions, and ${brand.guideName} turns your answers into a career report. The questions are fixed and reviewed by people, so nothing is made up on the way.`,
  },
  {
    q: "Is career discovery really free?",
    a: "Yes. The conversation and your report are free during launch. You only pay if you choose to buy a course.",
  },
  {
    q: "How long does it take?",
    a: "About 12 minutes. You can stop and come back later, and your answers are saved.",
  },
  {
    q: "Can I try a course before I buy?",
    a: "Yes. The first lesson of every course is free to watch, so you can see if the teaching style suits you.",
  },
  {
    q: "Is my information private?",
    a: "We keep only what we need: your answers and your phone number. We do not sell your data and we do not use advertising trackers.",
  },
];

const FACTS = [
  "Career discovery is free during launch",
  "First lesson of every course is free",
  ...(sampleOffer ? [`${sampleOffer.highlight} with ${sampleOffer.code}`] : []),
];

const COACH_POINTS = [
  {
    icon: ClipboardList,
    title: "Make sense of your report",
    body: "Go through your strengths and interests together.",
  },
  { icon: Compass, title: "Pick the right course", body: "Get an honest view on which course fits you best." },
  { icon: Route, title: "Plan your next step", body: "Leave with a simple plan for the months ahead." },
];

export default function HomePage() {
  const shopCourses = COURSES.slice(0, SHOP_COURSE_COUNT);

  return (
    <>
      {/* ---------------- Hero + guide preview ---------------- */}
      <div id="top" className="hero-glow">
        <section className="mx-auto flex max-w-[1120px] flex-col items-center gap-3 px-4.5 pt-8 pb-4 text-center sm:px-6">
          <p className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-full border-[1.5px] border-brand-200 bg-white py-1.5 pr-4.5 pl-1.5 text-[15px] font-medium text-ink">
            <span className="rounded-full bg-brand-600 px-3.5 py-2 text-[13px] font-bold tracking-[0.4px] text-white uppercase">
              {sampleLaunchOffer.label}
            </span>
            <span>
              Career discovery <span className="text-muted line-through">{sampleLaunchOffer.before}</span>{" "}
              <span className="font-bold text-brand-600">{sampleLaunchOffer.free}</span> {sampleLaunchOffer.after}
            </span>
          </p>
          <h1 className="font-display text-[clamp(28px,4vw,56px)] leading-[1.08] font-normal tracking-[-1.5px] text-ink">
            <span className="whitespace-nowrap">Chat with {brand.guideName}.</span>{" "}
            <span className="whitespace-nowrap">Get your report.</span>
            <br />
            <span className="text-brand-600">Start the right course.</span>
          </h1>
          <div className="mt-1 flex flex-wrap justify-center gap-2.5">
            <ButtonLink href="/discover" size="lg">
              Start with {brand.guideName} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#shop" size="lg" variant="secondary" className="whitespace-normal">
              I know what I want — browse courses
            </ButtonLink>
          </div>
        </section>

        <section
          id="chat"
          aria-label={`${brand.guideName} preview`}
          className="mx-auto max-w-[860px] px-4.5 pt-2 pb-14 sm:px-6"
        >
          <div className="overflow-hidden rounded-[26px] border border-line bg-white shadow-glow">
            <div className="flex items-center gap-3 border-b border-mist px-5 py-4">
              <span aria-hidden className="grid size-[42px] place-items-center rounded-full bg-brand-100">
                <LogoMark className="size-6" />
              </span>
              <div className="text-left">
                <p className="text-base font-bold text-ink">{brand.guideName}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                  <span aria-hidden className="size-[7px] rounded-full bg-success" />
                  Career guide · online
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 bg-paper/50 px-5 py-5.5 text-left">
              <p className="max-w-[80%] self-start rounded-[18px] rounded-bl-sm bg-brand-50 px-4 py-3 text-base leading-[1.55] text-ink max-sm:max-w-[92%]">
                Hi, I&apos;m {brand.guideName}, your career guide. {sampleChatPreview.greeting}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {sampleChatPreview.replies.map((r) => (
                  <Link
                    key={r}
                    href="/discover"
                    className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-line-strong bg-white px-4.5 text-sm font-semibold text-ink transition-colors hover:border-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    {r}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-mist px-4 py-3">
              <p className="flex items-center gap-2 pl-2 text-sm text-muted">
                <MessageCircle className="size-4 shrink-0" aria-hidden /> Tap an answer to begin
              </p>
              <ButtonLink href="/discover" size="sm">
                Start <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>

      {/* ---------------- Courses ---------------- */}
      <section id="shop" aria-labelledby="shop-h" className="scroll-mt-20 border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-4.5 py-16 sm:px-6">
          <div className="mb-7">
            <h2
              id="shop-h"
              className="font-display text-[clamp(30px,3.8vw,46px)] leading-[1.1] font-normal tracking-[-1px] text-ink"
            >
              Skills to Take You Further
            </h2>
            <p className="mt-2.5 max-w-[640px] text-base leading-relaxed text-body">
              Your knowledge gets you started. Your skills help you stand out.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4.5">
            {shopCourses.map((c) => (
              <CourseCard key={c.slug} slug={c.slug} className="h-full" />
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/learn" variant="secondary">
              View all courses <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ---------------- Student stories ---------------- */}
      <section className="pt-18 pb-14">
        <div className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,48px)]">
          <StoryRail stories={sampleStories}>
            <div>
              <Eyebrow className="mb-3.5">From confused to clear</Eyebrow>
              <h2 className="font-display text-[clamp(30px,3.8vw,46px)] leading-[1.1] font-normal tracking-[-1px] text-ink">
                Students like you.
              </h2>
            </div>
          </StoryRail>
        </div>
      </section>

      {/* ---------------- Career coach ---------------- */}
      <section aria-labelledby="h-coach" className="pb-18">
        <div className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,48px)]">
          <div className="grid overflow-hidden rounded-[28px] border border-line bg-white shadow-glow md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
            <div className="relative isolate flex flex-col items-start overflow-hidden bg-linear-to-br from-brand-900 to-brand-600 p-[clamp(26px,3.4vw,40px)] text-white">
              <span
                aria-hidden
                className="absolute -top-17 -right-15 -z-10 size-55 rounded-full bg-[radial-gradient(circle,var(--color-sun-500)_0%,transparent_70%)] opacity-55"
              />
              <span
                aria-hidden
                className="absolute -bottom-22 -left-17 -z-10 size-60 rounded-full bg-[radial-gradient(circle,var(--color-brand-300)_0%,transparent_70%)] opacity-55"
              />
              <div aria-hidden className="relative grid size-23 place-items-center rounded-full bg-white shadow-lift">
                <b className="font-display text-[32px] font-medium tracking-wide text-brand-600">
                  {sampleCoach.initials}
                </b>
              </div>
              <p className="mt-5.5 text-xs font-bold tracking-[1.3px] text-sun-400 uppercase">Your career coach</p>
              <h3
                id="h-coach"
                className="mt-1.5 font-display text-[clamp(26px,2.6vw,32px)] leading-[1.1] font-normal tracking-[-0.6px]"
              >
                {sampleCoach.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-brand-100">
                {sampleCoach.role} at {brand.name}
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {sampleCoach.chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1.5 text-xs font-bold"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center p-[clamp(24px,3.4vw,40px)]">
              <p className="font-display text-[clamp(22px,2.3vw,28px)] leading-[1.2] font-normal tracking-[-0.5px] text-ink">
                Not sure what&apos;s next?{" "}
                <span className="text-brand-600">Talk it through with {sampleCoach.name.split(" ")[0]}.</span>
              </p>
              <ul className="mt-5 flex flex-col gap-3.5">
                {COACH_POINTS.map((p) => (
                  <li key={p.title} className="flex items-start gap-3.5">
                    <span aria-hidden className="grid size-10 flex-none place-items-center rounded-xl bg-brand-100">
                      <p.icon className="size-5 text-brand-600" />
                    </span>
                    <div>
                      <b className="block text-[15px] font-bold text-ink">{p.title}</b>
                      <span className="block text-sm leading-normal text-body">{p.body}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {/* Gap: the artboard opens a phone form here. Callbacks need a finished report (D71), so the button
                  starts the discovery, and the callback form on the report does the booking. */}
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5">
                <ButtonLink href="/discover" size="lg" className="max-md:w-full">
                  Book a free call <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
                <span className="text-[13px] text-muted">Available after your career report</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="scroll-mt-20 border-y border-line bg-white py-18">
        <div className="mx-auto flex max-w-[1200px] flex-wrap gap-[clamp(32px,5vw,72px)] px-[clamp(18px,4vw,48px)]">
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6 self-start max-[860px]:gap-5.5 min-[861px]:sticky min-[861px]:top-24">
            <div>
              <Eyebrow className="mb-3.5">FAQ</Eyebrow>
              <h2 className="font-display text-[clamp(30px,3.8vw,46px)] leading-[1.1] font-normal tracking-[-1px] text-ink">
                Questions, answered.
              </h2>
              <p className="mt-4 max-w-[380px] text-[clamp(16px,1.5vw,18px)] leading-relaxed text-body">
                What students and parents ask us most before they start.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {FACTS.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[15px] font-semibold text-ink">
                  <i
                    aria-hidden
                    className="grid size-7 flex-none place-items-center rounded-full bg-brand-100 not-italic"
                  >
                    <Check className="size-4 text-brand-600" strokeWidth={2.5} />
                  </i>
                  {f}
                </li>
              ))}
            </ul>
            <div className="relative isolate flex flex-col gap-4.5 overflow-hidden rounded-3xl bg-brand-950 p-6 text-white">
              <span
                aria-hidden
                className="absolute -top-20 -right-20 -z-10 size-60 rounded-full bg-[radial-gradient(circle,var(--color-brand-400)_0%,transparent_70%)] opacity-45"
              />
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden
                  className="relative grid size-[46px] flex-none place-items-center rounded-full bg-white ring-4 ring-brand-300/35"
                >
                  <LogoMark className="size-6" />
                  <i className="absolute right-0 bottom-px size-[11px] rounded-full border-2 border-brand-950 bg-success" />
                </span>
                <span>
                  <b className="block text-[17px]">Still curious?</b>
                  <span className="text-sm text-white/75">
                    {brand.guideName}, our career guide, answers in seconds.
                  </span>
                </span>
              </div>
              <ButtonLink href="/discover" variant="light" className="self-start">
                Ask {brand.guideName} — free <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>

          <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-3">
            {FAQ.map((f, i) => (
              <details
                key={f.q}
                name="home-faq"
                className="group rounded-[20px] border border-line bg-white transition-[border-color,box-shadow] duration-300 open:border-brand-200 open:shadow-lift hover:border-brand-200 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-4 px-5.5 py-5 text-left text-[17px] font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                  <span
                    aria-hidden
                    className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-mist text-[13px] font-bold text-muted transition-colors group-open:bg-brand-100 group-open:text-brand-800"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{f.q}</span>
                  <span
                    aria-hidden
                    className="grid size-9 flex-none place-items-center rounded-full bg-mist text-ink transition-[transform,background-color,color] duration-300 group-open:rotate-180 group-open:bg-brand-500 group-open:text-white motion-reduce:transition-none"
                  >
                    <ChevronDown className="size-5" />
                  </span>
                </summary>
                <p className="px-5.5 pb-5.5 text-base leading-relaxed text-body min-[641px]:pl-18">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Closing CTA ---------------- */}
      <section className="bg-brand-950 py-18 text-white">
        <div className="mx-auto max-w-[820px] px-[clamp(18px,4vw,48px)] text-center">
          <p className="mb-5.5 inline-block rounded-full bg-brand-500 px-3 py-1.5 text-[13px] font-bold tracking-[0.06em]">
            FREE DURING LAUNCH · <span className="line-through decoration-2">{sampleLaunchOffer.before}</span> LATER
          </p>
          <h2 className="font-display text-[clamp(32px,4.2vw,52px)] leading-[1.1] font-normal tracking-[-1px]">
            Twelve minutes from now, you&apos;ll know yourself a little better.
          </h2>
          <div className="mt-8">
            <ButtonLink href="/discover" className="min-h-[58px] bg-brand-500 px-8 text-[17px] hover:bg-brand-600">
              Start free discovery
            </ButtonLink>
          </div>
          <p className="mt-4.5 text-sm text-white/75">
            No sign-up to start · Private{sampleOffer && ` · ${sampleOffer.highlight} with ${sampleOffer.code}`}
          </p>
        </div>
      </section>
    </>
  );
}
