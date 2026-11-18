# Design system

**Source of truth (D81, Nov 17, 2026):** the **Version 5** screens of the "SELF Website Redesign" design canvas. The prototype (`prototype-v0`, cdl-prototype.vercel.app) is now only a reference for behaviour that V5 does not show. Tokens live in `src/app/globals.css` (`@theme`). Use tokens, never raw hex values.

**Migration state:** the tokens already carry the V5 values (same token names as before, so every screen changed colour at once). Screens are ported to the V5 layout one at a time with `/ui-port`; until a screen is ported it keeps its prototype layout and may still use the old serif accent or `text-gradient`. Track progress in [../prototype/reuse-map.md](../prototype/reuse-map.md#v5-screens-d81).

## Tokens
| Token | Value | Use |
|---|---|---|
| `font-sans` | Manrope | Body, UI, buttons |
| `font-display` | Outfit | Headings, big numbers, logo word (weights 300–600; headings are usually 400) |
| `font-serif` | Instrument Serif | **Legacy.** Prototype accent words only; removed screen by screen, then dropped |
| `paper` | `#FBF8F5` | Page background (warm cream) |
| `ink` | `#1C1B29` | Main text, dark footer |
| `body` | `#45434D` | Paragraph text, lead copy |
| `muted` | `#5C5A63` | Secondary text, captions (passes 4.5:1 on white and paper) |
| `line` | `#ECE6EE` | Card borders, dividers, section edges |
| `line-strong` | `#D9D2E4` | Outline buttons, tabs, inputs at rest |
| `mist` | `#F3EEF3` | Quiet fills (segmented control, FAQ chevron) |
| `brand-50…950` | `#F6F4FF` … `#1F1D2B` | Violet scale. **Primary `brand-600` `#5146E6`**, hover `brand-800` `#3B31C4`, text accent `brand-700` `#4338CA`, pills `brand-100` `#ECE9FF`, light borders `brand-200` `#C9C2FF`, navy bands `brand-900` `#2B2566` |
| `sun-100…700` | `#FFF1EA` … `#A3412A` | Peach and clay accent. Coupon chip `sun-400` `#FFC2AC` (hover `sun-300`), dots and badges `sun-500` `#E07B5A`, error text `sun-600` `#C2543A`, small accent text `sun-700` `#A3412A` |
| `success`, `success-50` | `#167A4C`, `#EAF7F0` | Done ticks, "you are logged in" |
| `teal` | `#3E9C8F` | "Area to grow" in the report |
| `shadow-soft` | flat, light | Resting cards (V5 cards rely on the `line` border) |
| `shadow-lift` | `0 18px 40px -24px` violet | Card hover |
| `shadow-glow` | `0 40px 90px -50px` violet | Floating panels (login card, modals) |
| `shadow-focus` | `0 0 0 4px` violet 12% | Input focus ring |

Radii: pills and buttons `rounded-full`; cards `rounded-[20px]` (22 for large); inputs `rounded-[14px]`; floating panels `rounded-[28px]`; small tags `rounded-lg`.

## Patterns (standardise as components)
- **Buttons:** pill, min height 48px (44px small). Primary = `brand-600` fill, hover `brand-800`. Outline = white with `line-strong` border, hover border `brand-600`. Text link = `brand-600`, 44px tall hit area.
- **Cards:** `paper` or white, 1px `line` border, `rounded-[20px]`; on hover the border goes `brand-200`, `shadow-lift` and a 2px rise.
- **Headings:** eyebrow (13px, bold, uppercase, 1.4px tracking, `brand-600`) plus an Outfit heading, weight 400, tight tracking (-1px). The accent is **one brand-coloured word** (no serif italic).
- **Pill badge:** `brand-100` fill, `brand-700` text, a small `brand-600` dot.
- **Hero background:** `.hero-glow`: two soft radial glows (violet top right, peach left) on `paper`.
- **Header:** white, bottom `line` border; star logo plus "SELF" in Outfit with wide tracking; nav links ink, current and hover `brand-600`.
- **Offer bar:** `brand-900` navy, white text, `sun-400` coupon chip. (Coupon content is an open question, D81.)
- **Footer:** two forms in V5: dark (`ink` background) single row, and light (white, three columns: brand line, Platform, Explore). Pick one when porting the shell.
- **Chat:** guide bubbles left, learner bubbles right in `brand-600`; quick replies are `brand-200`-bordered pills, solid when chosen.
- **Course card:** coloured top band per category with image, play button, "Free preview" and lesson-count tags; body with title, description, meta, price row and Buy button.
- **Tabs / filter chips:** pills, white with `line-strong` border; selected = `brand-600` fill.
- **FAQ:** white cards, round chevron that turns `brand-600` and rotates when open.
- **Progress bar:** 8px, `brand-100` track, `brand-600` fill.

## Mobile-first rules
Most users are on phones. Build the base (unprefixed) classes for phone, then scale up with `sm:` / `md:` / `lg:`.
- Check every screen at **375 × 667** and at desktop.
- Side gutters 18px on phones (24px from `sm`).
- Navbar has a mobile menu.
- Course page purchase card becomes a sticky bottom CTA on phones.
- Touch targets at least 44px; no hover-only affordances.
- Respect `prefers-reduced-motion` (already in `globals.css`).

## Brand configuration
"SELF" is a working name. Name, logo and colours go in `src/config/brand.ts` plus the theme tokens, so a rebrand touches config only. Never hardcode the product name or the guide name in components or copy.

## Not built even though V5 shows it
See the D81 table in [../open-questions.md](../open-questions.md). Until decided: no certificates, no on-page payment form (hosted checkout only), no invented student stories or stats, no coupon prices, no "Choose two" question, no persona title or strength scores. Also still out of Phase 1: ratings, review counts, learner counts ("120,000+ learners"), instructor names, share buttons, "Top X%" benchmarks, "demo" copy.

## New screens
OTP login, learner dashboard, quiz, admin and legal pages are built in the same kit. Admin uses the same tokens in a denser, table-based layout (not in V5).
