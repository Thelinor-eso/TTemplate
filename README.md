# TTemplate

TTemplate is a browser-based planner for *The Elder Scrolls Online* (ESO) raid groups. The application is available at [thelinor-eso.github.io/TTemplate](https://thelinor-eso.github.io/TTemplate/).

## Part 1 — Using the application

### Start or load a template

On the home page, set the group name and choose a raid. Starting a raid loads its bundled template, which can include a preconfigured roster and encounter setups. Choose **Neutral** to start with four blank players and one blank encounter. You can also import a JSON template from your device or choose one from Google Drive.

Importing a template or starting another raid replaces the current template. The app asks before leaving the current template through its home navigation. Export your work first if you want to keep a separate copy.

### Work with the player roster

On **Players** (`/players`), manage the group roster:

- Add or remove players, edit player names, and choose a race and a role (Tank, Heal, or DPS).
- Assign up to three class skill lines. Reorder assigned lines by dragging them; the first filled line is the primary class line.
- For a complete class setup, choose up to two class masteries. Mastery choices are cleared if the assigned lines no longer form a complete class setup.
- Select a Mundus Stone for each player.
- Copy a player's role, skill lines, masteries, and Mundus Stone, then paste that setup onto another player.
- Use **Go to Encounter** to continue to the encounter planner.

### Configure encounters

On **Encounters** (`/encounters`), each encounter contains an independent setup for every player in the roster. Use the encounter controls to add, rename, duplicate, delete, and reorder encounters. Duplicating an encounter copies its player setups. You can also copy an encounter's player setups and paste them into another encounter with Ctrl+V.

For each player in an encounter, configure:

- **Gear:** choose equipment for head, chest, waist, boots, shoulders, gloves, legs, necklace, two rings, and front- and back-bar weapon slots. Browse and search the set catalog, choose the available item and trait, and configure enchantments or weapon poisons where applicable. The table can show set-piece summaries or individual slot details.
- **Skills and consumables:** assign five skills and an ultimate on each of the front and back bars, then choose food and a potion. Skill choices come from the bundled ESO skill catalog and are grouped by skill line; skill details are available in the editor.
- **Champion Points:** select slottable CP options in the blue, red, and green disciplines, with up to four selected in each discipline.
- **Description:** add player-specific notes for the encounter.

Copy and paste controls let you reuse a player's gear, skills and consumables, or Champion Points. The encounter view also provides an overview/table switch, a player filter, gear set summaries, and a calculated critical-damage total with a breakdown. Encounter-level required-set checks can be added to track which sets and how many players are expected to use them.

Use **Back to Players** to return to the roster. The **Edit Mode** control enables editing on the player and encounter pages; when edit mode is off, those pages present the current setup for viewing. The header also lets you edit raid markers in edit mode or copy the markers for sharing.

### Save and export templates

The current template is automatically persisted in the browser's local storage and restored when you reload the app in the same browser profile. This browser save is not a downloadable backup and does not synchronize across browsers or devices.

Export a JSON file to keep a portable copy. You can also create a new copy in Google Drive. When a template was imported from a local file or Google Drive, the app tracks that source and shows whether the imported file has unsaved changes; use the matching save action to update it. Saving directly to an imported local file requires browser support for the File System Access API. You can always export a separate JSON copy instead.

Google Drive features are optional and require the app's Google configuration. Google authorization uses the `drive.file` scope; see the developer setup below.

## Part 2 — Local development and checks

### Run locally

Requirements: Node.js 20.9 or later and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The `predev` script prepares the static set catalog before Next.js starts.

### Test and build

```bash
npm test
npm run test:skill-catalog
npm run lint
npm run build
```

The build creates a static site in `out/`. The `prebuild` script prepares the static set catalog automatically. `npm start` runs the Next.js production server and is not needed for local development.

### Code architecture

- `src/app/`: Next.js routes, shared layout, global styles, and privacy/terms pages.
- `src/features/template/`: template data model and shared state, browser persistence, JSON file handling, and Google Drive integration.
- `src/features/players/` and `src/features/encounters/`: the roster and encounter planning interfaces.
- `src/components/layout/`: shared application header, navigation, and edit-mode controls.
- `src/data/`: TypeScript game data and mappings used by the UI.
- `src/lib/`: shared catalog access, asset paths, display helpers, and ESO calculations.
- `data/eso-set-catalog/` and `data/eso-skill-catalog/`: source JSON catalogs; `data/libsets/` contains source data for set catalog generation.
- `public/default-templates/` and `public/game-assets/`: bundled raid templates and static images. The set catalog is copied to `public/eso-set-catalog/` by the `predev` and `prebuild` asset preparation step.
- `scripts/`: asset preparation and catalog generation scripts; `tests/`: automated tests for data, features, libraries, and scripts.

Google Drive is optional and is not required to run tests or build locally. To test Drive features, configure the Google OAuth client and Picker API key for the exact origin you use. Google blocks sign-in from origins that are not registered; for the default local setup, authorize `http://localhost:3000`. The app remains usable without this configuration, but Drive import and save will be unavailable.
