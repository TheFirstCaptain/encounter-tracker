# Project Notes

## Project Goals

- Build a simple desktop app for Game Masters and Dungeon Masters to track combat encounters.
- Replace paper-based tracking for initiative, hit points, and related encounter state.
- Start with support for Dungeons & Dragons 5e workflows, while keeping the design flexible enough to expand to other systems later.
- Persist data locally across app sessions.
- Focus on personal use rather than broad public distribution.

## Technologies To Use

- Use Electron or a similar desktop application framework.
- Favor TypeScript for application code.
- Use a local persistence layer stored on the user's machine.
- Prefer SQLite for structured local data if the app model benefits from relational storage and migrations.
- Consider a simpler local file format only if the data model remains very small.
- Package the app for macOS and Linux/ChromeOS first.
- Treat Windows support as optional.
- Add automated tests around core encounter behavior, especially initiative order, hit point changes, turn advancement, and persistence logic.

## First Slice

- Build a player management UI.
- Show existing players.
- Allow adding a new player by name.
- Persist players locally so they remain across app sessions.
- Keep theming out of scope until the player management slice is working.
