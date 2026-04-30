# Encounter Tracker

A local-first desktop app for tracking tabletop RPG parties, encounters, initiative order, and hit points.

## Current Features

- Manage players and characters.
- Group characters into adventuring parties.
- Set up encounters with party characters, allies, and opponents.
- Run encounters with editable current hit points, incapacitated status, initiative, and draggable participant order.
- Persist data locally across app sessions.

## Run Locally

From the project directory:

```bash
cd /Users/kirk/Code/encounter-tracker
npm install
npm run dev
```

The app runs as an Electron desktop window. Local data is stored on the machine through the app's SQLite-backed persistence layer.

## Useful Commands

```bash
npm test
npm run build
```

- `npm test` runs the automated test suite.
- `npm run build` type-checks and builds the Electron app.
