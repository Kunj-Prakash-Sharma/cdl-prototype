# Design system

**Source of truth (D91, Nov 17, 2026):** the **Version 5** screens of the "SELF Website Redesign" design canvas. The prototype (`prototype-v0`, cdl-prototype.vercel.app) is now only a reference for behaviour that V5 does not show. Tokens live in `src/app/globals.css` (`@theme`). Use tokens, never raw hex values.

**Migration state:** the tokens already carry the V5 values (same token names as before, so every screen changed colour at once). Screens are ported to the V5 layout one at a time with `/ui-port`; until a screen is ported it keeps its prototype layout and may still use the old serif accent or `text-gradient`. Track progress in [../prototype/reuse-map.md](../prototype/reuse-map.md#v5-screens-d81).

## Tokens
| Token | Value | Use |
|---|---|---|
| `font-sans` | Manrope | Body, UI, buttons |
| `font-display` | Outfit | Headings, big numbers, logo word (weights 300–600; headings are usually 400) |
| `font-serif` | Instrument Serif | **Legacy.** Prototype accent words only; removed screen by screen, then dropped |
| `paper` | `#FBF8F5` | Page background (warm cream) |
| `ink` | `#111D2E` | Main text, dark footer (navy black) |
| `body` | `#3E4656` | Paragraph text, lead copy |
| `muted` | `#5A6170` | Secondary text, captions (passes 4.5:1 on white and paper) |
| `line` | `#E7E9EE` | Card borders, dividers, section edges |
| `line-strong` | `#D3D9E3` | Outline buttons, tabs, inputs at rest |
| `mist` | `#F0F2F6` | Quiet fills (segmented control, FAQ chevron) |
| `brand-50…950` | `#F2F6FB` … `#0A1A2E` | **Logo navy** scale (D94). The logo navy is `brand-700` `#103C6D`. **Primary `brand-600` `#164A80`**, hover `brand-800` `#0C3159`, text accent `brand-700`, pills `brand-100` `#E3EBF5`, light borders `brand-200` `#C4D3E7`, navy bands `brand-900` `#0A2645` |
| `sun-100…700` | `#FBF4E8` … `#7A5A22` | **Logo gold** accent (D94). The logo gold is `sun-500` `#D5AA65`. Coupon chip `sun-400` `#E2C38A` (hover `sun-300`), dots and badges `sun-500`, small accent text `sun-700` `#7A5A22` (`sun-600` `#9A7330` for larger text only) |
| `success`, `success-50` | `#167A4C`, `#EAF7F0` | Done ticks, "you are logged in" |
| `danger` | `#B42318` | Error text (`role="alert"` messages). Was `sun-600` before the gold retune |
| `teal` | `#3E9C8F` | "Area to grow" in the report |
| `shadow-soft` | flat, light | Resting cards (V5 cards rely on the `line` border) |
| `shadow-lift` | `0 18px 40px -24px` navy | Card hover |
| `shadow-glow` | `0 40px 90px -50px` navy | Floating panels (login card, modals) |
| `shadow-focus` | `0 0 0 4px` navy 12% | Input focus ring |

Radii: pills and buttons `rounded-full`; cards `rounded-[20px]` (22 for large); inputs `rounded-[14px]`; floating panels `rounded-[28px]`; small tags `rounded-lg`.

## Patterns (standardise as components)
- **Buttons:** pill, min height 48px (44px small). Primary = `brand-600` fill, hover `brand-800`. Outline = white with `line-strong` border, hover border `brand-600`. Text link = `brand-600`, 44px tall hit area.
- **Cards:** `paper` or white, 1px `line` border, `rounded-[20px]`; on hover the border goes `brand-200`, `shadow-lift` and a 2px rise.
- **Headings:** eyebrow (13px, bold, uppercase, 1.4px tracking, `brand-600`) plus an Outfit heading, weight 400, tight tracking (-1px). The accent is **one brand-coloured word** (no serif italic).
- **Pill badge:** `brand-100` fill, `brand-700` text, a small `brand-600` dot.
- **Hero background:** `.hero-glow`: two soft radial glows (navy tint top right, gold tint left) on `paper`.
- **Header (`site/navbar.tsx`):** white, bottom `line` border, sticky; the TEMPLE logo image (`Logo`, D93); links Career Discovery, Courses, My Learning, then Log in or the account menu; ink, current and hover `brand-600`. Below `md` the links move into the phone menu.
- **Offer bar (`site/offer-bar.tsx`):** `ink` (same near-black as the footer), white text, `brand-200` highlight, a dashed white code chip that copies on tap (`site/copy-code.tsx`). Its offer is sample content (`sampleOffer` in `src/content/samples.ts`, D92); set it to `null` to hide the bar. No real coupon: checkout prices come from the server.
- **Footer (`site/footer.tsx`):** the dark single-row form: `ink` background, product name, links, "© year name · India". Privacy, Terms and Refunds links are added with those pages.
- **Chat (ported, row 4):** guide bubbles left in soft `brand-50` with a square bottom-left corner; a navy `GuideAvatar` heads the card; the composer is a pill with a 44px send button; quick replies are `brand-200`-bordered pills. Quiz buttons are round 1-to-n buttons, selected = `brand-600` fill with a soft ring.
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
The product is **TEMPLE** (D93; "SELF" was the working name). The name and tagline are in `src/config/brand.ts`; the logo is `src/assets/temple-logo.png` (gold on navy, used as a flat image through the `Logo` component in `src/components/ui/misc.tsx`); the favicon and app icon are `src/app/icon.png` and `src/app/apple-icon.png` (the gold "T"). Never hardcode the product name or the guide name in components or copy.

## Not built even though V5 shows it
Settled in D92 (table in [../open-questions.md](../open-questions.md)). **Not built:** certificates, an on-page payment form (hosted checkout only). **Sample content** (all in `src/content/samples.ts`, replaced before launch): offer bar coupon and 25% off prices, named student stories, the report persona title and strength scores (never shown in production), the "Choose two" question (UI only). **Ask when built:** course search, "How we score". Also still out of Phase 1: ratings, review counts, learner counts ("120,000+ learners"), instructor names, share buttons, "Top X%" benchmarks, "demo" copy.

## New screens
OTP login, learner dashboard, quiz, admin and legal pages are built in the same kit. Admin uses the same tokens in a denser, table-based layout (not in V5).
