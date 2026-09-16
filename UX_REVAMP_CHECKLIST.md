# eNai product experience revamp

## Product north star

Make eNai the quickest, clearest way to reserve time with a trusted local barber. Every customer screen should answer one question immediately: **what can I book, and when?** The barber workspace should make a busy day feel controlled at a glance.

## Design rules

- [x] Establish one warm, practical eNai visual language: ink, limestone, and copper rather than generic blue SaaS styling.
- [x] Reserve colour for meaning: copper for the next action; green for confirmed/open; red only for destructive actions.
- [x] Prefer real availability, prices, addresses, and service duration over unsupported “premium” claims or decorative ratings.
- [x] Keep mobile tap targets at least 44px, base text at least 14px, and visible keyboard focus states.
- [ ] Replace all remaining literal scissors logo instances with the eNai slot mark.
- [ ] Replace demo/stock imagery with consented, locally representative shop photography before release.

## Layer 1 — Entry and account access

- [x] Landing: clarify the customer-first promise and make the primary path “Find a barber.”
- [x] Landing: make the barber path secondary but easy to find.
- [x] Shared brand mark and core colour tokens.
- [ ] Customer sign-in: simplify the phone/OTP journey and align it with the new system.
- [ ] Barber sign-in and registration: use the same account shell and clear owner-focused language.
- [ ] Shop setup: make the multi-step setup legible and show progress and requirements.

## Layer 2 — Customer booking

- [ ] Discover: surface next availability before filters and improve card information hierarchy.
- [ ] Shop profile: put “next available,” service price, directions, and shop hours ahead of secondary detail.
- [ ] Booking steps: use a persistent `Service → Time → Review` progress state and a mobile booking summary.
- [ ] Payment and confirmation: make fees explicit; replace celebratory interruption with an appointment pass and practical next actions.
- [ ] My bookings: make the next appointment the clear primary item and add directions/rebook affordances.
- [ ] Customer navigation: replace the mobile side-menu pattern with familiar persistent bottom navigation.

## Layer 3 — Barber workspace

- [ ] Dashboard: make today’s queue, next customer, chair availability, and shop status the first layer.
- [ ] Bookings: make status and arrival OTP quick to scan, with destructive actions visually restrained.
- [ ] Services, profile, settings: use the shared form, section, and action patterns.
- [ ] Owner onboarding: carry the same progress language from registration through shop launch.

## Layer 4 — Quality pass

- [ ] Audit every status, empty state, loading state, and error state for clarity and contrast.
- [ ] Check 320px mobile, standard mobile, tablet, and desktop layouts.
- [ ] Validate no visual element implies data or functionality the product does not have.
- [ ] Run type-check and production build after the visual implementation is complete.
