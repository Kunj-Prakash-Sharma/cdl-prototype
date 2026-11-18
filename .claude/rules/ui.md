---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---

# UI rules

- Tokens only: colours, shadows, fonts come from `src/app/globals.css` (`brand-*`, `sun-*`, `paper`, `ink`, `body`, `muted`, `line`, `line-strong`, `mist`, `success`, `teal`, `shadow-soft|lift|glow|focus`, `font-sans|display`). No raw hex.
- The look follows the V5 design (D81): Outfit headings (`font-display`, weight 400), one brand-coloured accent word, no serif italic in new or ported code.
- Mobile-first: write unprefixed classes for phone, then scale with `sm:` / `md:` / `lg:`. Verify at 375×667 and desktop.
- Touch targets ≥ 44px; no hover-only affordances; respect `prefers-reduced-motion`.
- Server component by default. Add `"use client"` only for interactive islands (player, chat, checkout button, filters).
- Reuse the kit: `ui/button` (pill variants), cards `rounded-[20px] border border-line`, eyebrow + Outfit heading with one `text-brand-600` word.
- Never hardcode the product name or guide name; read from `src/config/brand.ts`.
- Phone layouts: side panels become bottom sheets, purchase card becomes a sticky bottom CTA, nav has a mobile menu.
- See `docs/design/design-system.md` for patterns.
