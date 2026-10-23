# The Unofficial Hollow Knight RPG - Foundry VTT System

A complete system implementation of **The Unofficial Hollow Knight RPG** for Foundry VTT v14.

## Features

- **Complete Character Sheets**: Bug (PC), NPC, and Creature sheets with thematic Hollow Knight design
- **Automated Mechanics**: Attribute checks, attack rolls, soak calculations, and spell casting
- **Pool Management**: Hearts, Stamina, Soul, Belly, and Glory pools with automatic tracking
- **Charm System**: Notch management with overcharm detection
- **Weapon Arts & Arcana**: Full support for martial and mystic abilities
- **Thematic UI**: Dark, melancholic aesthetic inspired by Hollow Knight's visual style

## Installation

1. Copy the `hollow-knight-rpg` folder to your Foundry VTT `Data/systems/` directory
2. Restart Foundry VTT
3. Create a new world using the "Hollow Knight RPG" system

## System Structure

```
hollow-knight-rpg/
├── system.json          # System manifest
├── template.json        # Data model definitions
├── css/
│   └── hollow-knight.css  # Thematic styles
├── lang/
│   └── en.json          # Localization
├── module/
│   ├── hollow-knight.mjs  # Main entry point
│   ├── settings.mjs       # System settings
│   ├── documents/
│   │   ├── actor.mjs      # Actor document class
│   │   └── item.mjs       # Item document class
│   ├── sheets/            # Sheet classes
│   ├── rolls/             # Rolling mechanics
│   └── helpers/           # Handlebars helpers
├── templates/
│   ├── actors/            # Actor sheet templates
│   ├── items/             # Item sheet templates
│   └── chat/              # Chat card templates
└── packs/                 # Compendium data (to be populated)
```

## Core Mechanics

### Attributes
- **Might**: Physical power, melee attacks
- **Insight**: Mental acuity, magic, perception
- **Shell**: Resilience, soak, defense
- **Grace**: Agility, ranged attacks, initiative

### Pools
- **Hearts**: Health/life points
- **Stamina**: Action resource for attacks and arts
- **Soul**: Magic resource for spells
- **Belly**: Hunger/sustenance tracker

### Dice System
The system uses d6 dice pools where 5+ counts as a success. Half-die attributes grant rerolls.

## Credits

Based on **The Unofficial Hollow Knight RPG** fan project.
Hollow Knight © Team Cherry. This is an unofficial fan project not affiliated with Team Cherry.

## License

This system is provided as-is for personal use. Respect the original creators' rights.