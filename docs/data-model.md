# Data Model

## Player

A player is a real person who plays the game.

- `id`: stable unique identifier
- `name`: player display name

## Character

A character is a player-controlled character.

- `id`: stable unique identifier
- `playerId`: required reference to the owning player
- `name`: character display name
- `systemId`: reference to the game system
- `maxHp`: maximum hit points
- `currentHp`: current hit points

Every character belongs to exactly one player.
When a character is first added, `currentHp` starts at the same value as `maxHp`.

## Game System

A game system is a supported ruleset.

- `id`: stable unique identifier such as `dnd5e`
- `name`: display name such as `D&D 5e`

The first supported system is Dungeons & Dragons 5e. Systems should eventually be able to drive rules behavior, such as action points or other system-specific mechanics.

## Adventuring Party

An adventuring party is a reusable group of characters.

- `id`: stable unique identifier
- `name`: party display name
- `systemId`: reference to the game system
- `characterIds`: characters in the party

Every character in an adventuring party must use the same system as the party.

## Session

A session is a dated play session for an adventuring party.

- `id`: stable unique identifier
- `partyId`: required reference to the adventuring party
- `date`: calendar date for the session

Sessions are planned but not implemented yet.

## Encounter

An encounter belongs to an adventuring party and includes one or more party characters.

- `id`: stable unique identifier
- `partyId`: required reference to the adventuring party
- `name`: encounter display name
- `characterIds`: included adventuring party characters

Characters can be excluded from a specific encounter by leaving them out of `characterIds`.

## Deferred

- Temporary hit points
- Death saves
- Wounds or alternate hit point systems
- Non-player combatants, monsters, and NPCs
- Sessions
