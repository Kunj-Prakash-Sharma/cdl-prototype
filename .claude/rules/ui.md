---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---

# UI rules

- Tokens only: colours, shadows, fonts come from `src/app/globals.css` (`brand-*`, `sun-*`, `paper`, `ink`, `shadow-soft|lift|glow`). No raw hex.
- Mobile-first: write unprefixed classes for phone, then scale with `sm:` / `md:` / `lg:`. Verify at 375×667 and desktop.
- Touch targets ≥ 44px; no hover-only affordances; respect `prefers-reduced-motion`.
- Server component by default. Add `"use client"` only for interactive islands (player, chat, checkout button, filters).
- Reuse the kit: `ui/button` (pill variants), cards `rounded-3xl shadow-soft`, eyebrow + heading with one serif-italic word.
- Never hardcode the product name or guide name; read from `src/config/brand.ts`.
- Phone layouts: side panels become bottom sheets, purchase card becomes a sticky bottom CTA, nav has a mobile menu.
- See `docs/design/design-system.md` for patterns.
