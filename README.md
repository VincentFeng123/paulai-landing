# Paul · A little more intention

A minimal, responsive landing page for Paul, the local-first desktop companion for intentional screen time. The visual system follows the Electron app: its original glyph, native typography, monochrome palette, thin borders, and 12px controls.

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
- A GSAP ScrollTrigger story that moves through noticing, pausing, and choosing. Desktop scenes are pinned and scrub with native scrolling. Mobile and reduced-motion layouts present all three scenes in normal document flow.
- Responsive navigation, native FAQ disclosures, keyboard-accessible tabs, and a native modal demo with focus restoration.
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
- `tests/landing.spec.ts` — browser checks.

Animation API reference: [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).
