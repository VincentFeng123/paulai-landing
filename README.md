# Paul · You had better plans.

A responsive landing page for Paul, the local-first desktop companion for intentional screen time. The design uses an original asymmetrical composition, self-hosted Instrument Sans, a full-screen hero with the supplied smoky artwork, and borderless floating product moments. Paul’s original glyph and interactive desktop preview retain the app’s identity.

## Run

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

```sh
npm run build     # TypeScript validation + optimized static output in dist/
npm run preview   # Serve the production build locally
npm test          # Playwright interaction and responsive checks
```

For a fresh test environment, install the test browser with `npx playwright install chromium`.

## Experience

- Interactive Today, Boundaries, and Patterns dashboard views with explicitly illustrative sample data.
- Working preview controls for intervention levels, watched items, planned use, and pause/resume.
- A GSAP ScrollTrigger story that moves through noticing, pausing, and choosing. Large desktop scenes (at least 1100px wide and 900px tall) are pinned for a short scroll and scrub with native scrolling. Notice, Pause, and Choose lead immediately after the hero. Individual words, prompts, and timers float with the scroll; the dashboard lifts into view and the central message reveals as you scroll. Smaller screens and reduced-motion layouts present all three scenes in normal document flow.
- A sparse header with a direct preview link, native FAQ disclosures, keyboard-accessible tabs, and a native modal demo with focus restoration.
- All preview state lives in memory. The site makes no analytics, form, AI, or activity-recording requests.

The primary call to action is the interactive preview. There are no public installer links or waitlist forms. The FAQ states this explicitly. Replace the preview CTA only after a real distribution destination is available.

## Publish

`npm run build` produces a static `dist/` folder. The relative Vite asset base supports hosting at either a domain root or a subdirectory. There are no client-side routes or server/API requirements.

The `docs/ci-workflow.yml` template runs the production build and browser tests on pushes and pull requests. To enable it, copy it to `.github/workflows/ci.yml` using GitHub access with workflow permissions. The login used for the initial push did not have that permission. Hosting is configured separately; pushing this repository does not automatically publish a website.

## Structure

- `src/App.tsx` — page sections, scroll choreography, FAQ, mindful-moment dialog.
- `src/AppPreview.tsx` — interactive, illustrative desktop app preview.
- `src/styles.css` and `src/preview.css` — page and preview styles.
- `public/paul-mark.svg` and `public/paul-icon.png` — original Paul branding.
- `public/hero-smoke.jpg` — optimized web copy of the supplied hero background.
- `tests/landing.spec.ts` — browser checks.

Animation API reference: [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).
