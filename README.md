# TTemplate

TTemplate is a web application for preparing ESO raid group templates. It provides a raid setup flow, player and encounter editors, and JSON import and export.

## Live site

The site is deployed via GitHub Pages: [https://thelinor-eso.github.io/TTemplate/](https://thelinor-eso.github.io/TTemplate/).

## Google Drive setup

Google Drive import and saving use Google Identity Services and Google Picker in the browser. Enable the Google Drive API and Google Picker API in Google Cloud. Create an OAuth 2.0 Web application client ID and add `http://localhost:3000` and `https://thelinor-eso.github.io` to the authorized JavaScript origins. Create an API key restricted to the Google Picker API and those same website origins. The app only requests the `drive.file` scope: Drive grants access to files the user explicitly selects or creates with the app, rather than requesting access to all Drive files.

Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_API_KEY`, and `NEXT_PUBLIC_GOOGLE_APP_ID` before building locally. `GOOGLE_APP_ID` is the Google Cloud project number (not the project name or OAuth client ID), for example:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
NEXT_PUBLIC_GOOGLE_API_KEY=your-browser-api-key \
NEXT_PUBLIC_GOOGLE_APP_ID=123456789012 \
npm run dev
```

For GitHub Pages, add repository Actions variables named `GOOGLE_CLIENT_ID`, `GOOGLE_API_KEY`, and `GOOGLE_APP_ID`; the deployment workflow passes them to the static build. These are public browser configuration values; restrict the API key to the app origins and Google Picker API. Never put an OAuth client secret in the frontend.

## Requirements

- Node.js and npm

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Workflows

- Choose a raid and start building a template, or import a JSON file from your device or Google Drive.
- Edit the group roster, including player names, roles, skill lines, class masteries, and Mundus choices.
- Add and configure encounters, including player equipment, skills, Champion Points, food, and potions.
- Export the current template by downloading its JSON locally or creating a JSON copy in Google Drive. After importing a file, use the matching **Save changes** action to update that same file; direct local-file saving requires browser support for the File System Access API.

### Navigating the three pages

- **Home** is where you start a raid from a bundled template, choose the Neutral template (four players and one encounter), or import a JSON file from your device or Google Drive.
- **Characters** is where you manage the player roster. Use **Go to Encounter** to continue to the encounter planner.
- **Encounters** is where you configure each fight. Use **Back to Characters** to return to the roster.
- The current template is shared between Characters and Encounters, so moving between those pages keeps your changes.
- The current template is automatically saved in this browser and restored after a page reload.
- The Home links ask for confirmation before leaving the current template. Starting another raid or importing a JSON file replaces the current template and its data; save or export it first if you want to keep a copy.

## Project layout

- `src/app/` contains the Next.js App Router pages, layouts, and styles.
- `src/features/` contains template state and document handling, player management, and encounter editing.
- `src/components/` contains components shared by routes and features.
- `src/data/` contains static TypeScript catalogs and display mappings.
- `src/lib/` contains shared catalog, icon, and display helpers.
- `data/` contains the LibSets source files and the ESO set and skill catalogs.
- `public/` contains default templates and static images.
- `scripts/` contains local catalog generation tools.
- `tests/` groups data, feature, and script tests.

## Catalog data

The set catalog is stored in `data/eso-set-catalog` and copied to `public/eso-set-catalog` before the build, so it can be loaded as static JSON files. Skill data is loaded from `data/eso-skill-catalog`. All game icons used by the application are static files in `public/game-assets`; the application and build do not request images from external game sites.

The local generation commands are:

```bash
node scripts/generate-eso-set-catalog.mjs
node scripts/generate-eso-skill-catalog.mjs
```

The catalog generation commands may retrieve data from UESP and write their generated files to the project.

## Checks

```bash
npm test
npm run test:skill-catalog
npm run lint
npm run build
```
