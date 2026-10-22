# Design system

**Source of truth:** the prototype look. The live prototype (cdl-prototype.vercel.app) and git tag `prototype-v0` show the reference. Tokens live in `src/app/globals.css` (`@theme`). Use tokens, never raw hex values.

## Tokens
| Token | Value |
|---|---|
| Fonts | Plus Jakarta Sans (UI, `--font-sans`), Instrument Serif italic (accent words, `--font-serif`) |
| Base | `paper #f8f8fb` background, `ink #0f1020` text |
| Brand (violet) | `brand-50…950`; primary `brand-600 #5a45f2` |
| Accent (orange) | `sun-100…700`; primary `sun-500 #ff8a2e` |
| Shadows | `shadow-soft`, `shadow-lift`, `shadow-glow` (violet glow on primary CTA) |
| Effects | `bg-grid`, `bg-grid-dark`, `text-gradient` (violet → purple → orange), shimmer, float, pulse-ring, reduced-motion guard |

## Patterns (standardise as components)
- **Buttons:** pill, 6 variants (`ui/button.tsx`): primary, secondary, ghost, dark, light, sun.
- **Cards:** white, `rounded-3xl`, `shadow-soft`, light ring.
- **Feature bands:** dark navy gradient with a grid overlay (hero CTA, guide section).
- **Headings:** uppercase tracked eyebrow label (brand-600) plus a bold heading with one serif-italic word.
- **Guide avatar:** gradient orb. Name it `GuideAvatar`, not tied to a person's name.
- **Course thumbnails:** category gradient with an icon (`course-thumb.tsx`).
- **Chat:** left grey bubbles, right brand-violet bubbles, typing dots, quick-tap pill chips.
- **Stepper and progress bars:** as in `discover/stepper.tsx` and `ui/misc.tsx`.

## Mobile-first rules
Most users are on phones. Build the base (unprefixed) classes for phone, then scale up with `sm:` / `md:` / `lg:`.
- Check every screen at **375 × 667** and at desktop.
- Discovery side panel ("what the guide has learned") becomes a collapsible bottom sheet on phones.
- Navbar has a mobile menu.
- Stepper has a compact mobile form.
- Course page purchase card becomes a sticky bottom CTA on phones.
- Touch targets at least 44px; no hover-only affordances.
- Respect `prefers-reduced-motion` (already in `globals.css`).

## Brand configuration
"SELF" is a working name. Name, logo and colours go in `src/config/brand.ts` plus the theme tokens, so a rebrand touches config only. Never hardcode the product name in components or copy.

## Out of prototype scope (remove when porting)
Ratings, review counts, learner counts ("120,000+ learners"), instructor names, certificate and share buttons, "Top X%" benchmarks, and any "demo" copy. None of these are in Phase 1.

## New screens
OTP login, learner dashboard, quiz, admin and legal pages are built in the same kit. Admin uses the same tokens in a denser, table-based layout.
