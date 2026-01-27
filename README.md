<img width="1075" height="767" alt="Screenshot 2026-01-22 134454" src="https://github.com/user-attachments/assets/9cdc289f-cd3d-433f-af37-d508c45c7179" />

<br>

# WebAssembly

- **Rust** (latest stable version) - (https://rustup.rs/)
- **wasm-pack** - Install with:
  ```bash
  cargo install wasm-pack
  ```
  
### Build

1. **WebAssembly module:**
   ```bash
   wasm-pack build --target web
   ```

2. **Local web server:**
   ```bash
   python -m http.server 8000
   ```
   `http://localhost:8000` in your browser.

<br>

# Game Rules

### Setup
- **Board**: 4 quadrants, each divided into 6 lines.
- **Dice**: 2 dice with values 1-6.
- **Pieces**: 30 checkers total - 15 white and 15 black.
- **Top**: Lines 13 with 2 black, line 24 with 3 black. Lines 15 and 19 with 2 white each, and lines 18 and 20 with 3 white each. 
- **Bottom**: Lines 1 with 2 black, line 12 with 3 white. Lines 3 and 7 with 2 black each, and lines 6 and 8 with 3 black each.

### Movement

**Dice Rolling:**
- To determine which player goes first, each player throws 1 dice and whoever scores higher goes first.
- The value on each dice is the number of lines each checker can move.
- White pieces move from board top right (13-18) to top left (19-24) to bottom left (12-7) to bottom right (6-1).
- Black pieces move from board bottom right (1-6) to bottom left (7-12) to top left (24-19) to top right (18-13).

**Moves:**
- When a player rolled x on 1st dice and y on 2nd dice, they may move one checker x spaces, and another checker y spaces.
- Or move one checker x spaces onto an open line, and then move that same checker another y spaces onto an open line.
- If only one move is possible and the other is not then the player must make that one move.
- If neither moves are possible, then the player skips their turn.

**Occupancy:**
- 6 checkers of a player can be present on a single line.
- If a line is occupied by 2 or more checkers of a player, the opponent is not allowed to land on it.

### Hitting and Safety
- If a single checker is present on a line, then it can be hit by an opponent's checker and removed off the board onto the center bar.
- Checkers can be hit onto the bar even inside home quadrant.

### Re-entering from Bar
- Player with checkers on the bar must move them back into the game first.
- Checker on the bar lands onto the line equal to the number of one of the dice rolls, as long as that line is unoccupied or has exactly 1 opponent checker (which can be hit).
- The player may not move any other pieces, until all of the checkers on the bar have been reentered back into the game.

### Victory
- 1st player with 15 checkers arrived in home quadrant.

<br>

# Historical

### Achaemenid Empire (550-330 BCE)
- **"Nard" or "Nardshir"**: The name derives from Persian "nard" (wooden block/checker) and "shir" (lion), possibly referring to the board's design or pieces.

### Parthian and Sassanian Periods (247 BCE - 651 CE)
- **Literary**: Appears in Persian poetry and literature.
- **Religious**: Zoroastrian texts mention the game, sometimes with symbolic interpretations.

### Medieval Europe (11th-15th centuries)
- **Crusades**: European contact with the Middle East introduced the game to Europe.
- **"Tables" Games**: Became popular as "tables" or "tabula" in medieval Europe. Gradually evolved into modern backgammon with rule modifications.

### Modern Era
- **Continuity**: Nard remains popular in Iran, Afghanistan, and Central Asia. Maintains game rules distinct from Western backgammon.

### Symbol

The board design reflects Zoroastrian cosmological & theological symbolism:

- **4 Quadrants**: The board is divided into 4 quadrants, because there are 4 elements from which everything was created.

- **6 Lines per Quadrant**: Each quadrant is divided into 6 lines, because first Ahura Mazda created 6 spirits (manifestations), or goddesses.

- **2 Dice**: 2 separate dice are used, one to represent revolution of the firmament and one to represent the revolution of the constellations.

- **Opposite Movement**: The checkers move in opposite direction from each other, since the white ones represent Ahura Mazda, the good god, who is opposed by Ahriman, the evil god, in all of his doings, represented by the black checkers.

<br>

# Structure

```
.
├── Cargo.toml               # Rust project configuration       (Backend)  (Config)
├── Cargo.lock               # Rust dependency lock file        (Backend)  (Config)
├── package.json             # Node.js module type              (Frontend) (Config)
├── index.html               # HTML entry point                 (Frontend) (Static /  Markup)
├── index.js                 # Minimal JavaScript UI layer      (Frontend) (Source /  Script)
├── style.css                # Global styles                    (Frontend) (Static /  Styles)
├── src/
│   └── lib.rs               # Rust game engine (WebAssembly)   (Backend)  (Source /  Library)
│       ├── GameState        # Core game state management
│       ├── Move validation  # All game rules & logic
│       ├── Status messages  # Game status & UI text
│       └── Win conditions   # Victory detection
├── pkg/                     # wasm-pack generated              (Backend)
│   ├── nard.js              # WASM bindings                    (Backend)  (Source /  Module)
│   ├── nard_bg.wasm         # Compiled WebAssembly             (Backend)  (Source /  Library)
│   ├── nard.d.ts            # TypeScript definitions           (Backend)  (Source /  Module)
│   ├── nard_bg.wasm.d.ts    # WASM TypeScript definitions      (Backend)  (Source /  Module)
│   ├── package.json         # WASM package metadata            (Backend)  (Config)
│   └── README.md            # WASM package documentation       (Backend)  (Static /  Documentation)
└── README.md                # This file
```
