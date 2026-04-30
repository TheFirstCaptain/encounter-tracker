# Project Notes

## Project Goals

- Build a simple desktop app for Game Masters and Dungeon Masters to prepare and run combat encounters.
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

## Current App Shape

- Manage players.
- Manage characters with owning players, game systems, max hit points, and current hit points.
- Manage adventuring parties as reusable groups of same-system characters.
- Set up encounters from an adventuring party, with optional allies and opponents.
- Edit encounter setup before running.
- Run encounters with editable current hit points, incapacitated tracking, initiative, and draggable participant order.

## Near-Term Notes

- Sessions are planned but not implemented yet.
- Encounter run mode should remain fast to use during play, with minimal friction around initiative and hit point changes.
- Future game systems should be able to add system-specific rules without rewriting the core entity model.
