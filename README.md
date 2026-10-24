# NUMO

NUMO is a local-first Hebrew arithmetic practice app for children. It provides configurable worksheets, answer checking and correction, session recovery, and worksheet export without accounts, backend services, analytics, or personal data collection.

**Live app:** https://nadiabrandes.github.io/Numo/ · **Source:** https://github.com/nadiabrandes/Numo

## Features

- Hebrew RTL interface based on the supplied four-screen design references.
- Israeli primary school classes א׳–ו׳, class-aware operation and number scopes, three difficulty levels ordered קל → בינוני → קשה, and worksheets of 10, 15, 20, 25, or 50 exercises.
- Local arithmetic generation, answer validation, correction, and completion summary.
- Versioned localStorage session recovery and confirmation before replacing saved work.
- Local PNG worksheet export and Web Share when supported; browser printing is the fallback.
- Installable PWA with static asset caching and offline shell.
- GitHub Pages deployment workflow, Vitest/Testing Library checks, and Playwright journey.

## Technology

React, TypeScript, Vite, Tailwind CSS v4, Lucide React, vite-plugin-pwa, Vitest, React Testing Library, and Playwright.

## Project structure

```text
public/        app icon and NUMO logo assets
src/features/  configurable math engine
src/tests/     unit and component tests
e2e/           Playwright journey
.github/       Pages deployment workflow
dist/          production output (generated)
```

## Prerequisites and local development

Use Node.js 22 LTS or a compatible current LTS release and npm.

```powershell
cd C:\Development\NumoApp\Code
npm install
npm run dev
```

Vite prints the local URL. The app uses local assets and needs no service credentials.

## Commands

```powershell
npm run dev
npm run build
npm run preview
npm run test
npm run lint
npm run typecheck
npm run e2e
```

Playwright browser binaries may need a one-time install: `npx playwright install chromium`.

## Mathematics rules

Class-specific practice profiles live in `src/features/math/engine.ts`. Difficulty is defined within the selected class scope. Grade 1 uses addition/subtraction caps of 10 (easy), 15 (medium), and 20 (hard), with no extra range selector. Grade 2 introduces multiplication and exact division with small facts. Later grades increase number size and multiplication/division complexity; Grades 4–6 also receive multi-step expressions, and fraction notation is introduced in Grades 5–6. These app-generated practice profiles are informed by Ministry materials and should be reviewed by educators. Generation respects configured result caps, avoids duplicate expressions where possible, and accepts decimal or fraction answers.

## Session storage and privacy

The active configuration, generated problems, answers, statuses, and screen are stored in `localStorage` under `numo.session.v1`. Malformed values are ignored. Clearing browser site data removes recovery. No identity, analytics, cookies, or network submission is used.

## Export and sharing

After completing every exercise, “שתף להורה” creates a locally rendered PNG and uses Web Share for file sharing when supported. Otherwise it downloads the PNG. The print fallback can save a PDF through the browser print dialog. Exported content includes only the worksheet, configuration, date, and answers; it is not transmitted automatically.

## GitHub Pages deployment

This repository is configured to deploy to **https://nadiabrandes.github.io/Numo/**.

- The workflow in `.github/workflows/deploy.yml` builds and deploys on pushes to `main`, and supports manual runs.
- In repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
- Ensure Actions and Pages permissions are enabled for the repository or organization.
- The Vite `base` path uses the repository name supplied by GitHub Actions, so repository subpaths work in production while local development remains at `/`.
- The deployment workflow runs lint, typecheck, unit tests, and the production build before publishing `dist/`.

Pages availability and free usage depend on repository visibility, account plan, and GitHub policies or quotas.

## Known limitations

- The mascot and logo are lightweight SVG interpretations of the supplied references.
- Curriculum boundaries are initial configurable guidelines and should be reviewed by Israeli educators.
- PDF output uses the browser print path, so pagination varies by browser. PNG sharing is the direct export path.
- Browser Web Share may not support files; a download fallback is provided.
