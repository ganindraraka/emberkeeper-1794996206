[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ganindraraka/emberkeeper-1794996206/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ganindraraka/emberkeeper-1794996206/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Emberkeeper

Emberkeeper is a browser arcade game made for the make.fun best-game-01 submission, where you protect a forest hearth through ten increasingly busy waves. Rotate a shield around the fire to repel frost, use a dash to turn away void shades, and let incoming embers replenish the flame. Successful defence builds score chains; keeping the hearth alive through the final wave earns the dawn ending, while a depleted flame ends the run.

## Controls

- **A / D** or **Left / Right arrows**: rotate the shield; moving the mouse makes it follow the pointer instead.
- **Space**: dash during play to repel shades.
- **Space**, **Enter**, or **click**: start a run or restart after either ending.
- **P** or **Escape**: pause or resume. Space, Enter, or a click also resumes a paused game.
- **M**: toggle sound.

## How it is built

The game uses JavaScript modules, a 2D canvas, and sound synthesized in the browser, with no build step or downloaded art and audio assets. The files in `game/src/` divide the work as follows:

- `config.js` defines the playfield, gameplay balance, colours, and storage key.
- `input.js` tracks held keys, pointer aiming, and queued start and pause actions.
- `main.js` connects the modules, advances the simulation at a fixed timestep, switches screens, plays audio events, and saves the best score locally.
- `random.js` supplies a seeded random generator for reproducible sequences.
- `render.js` draws the forest, hearth, shield, projectiles, particles, score displays, and screen overlays, scaling the canvas to the window.
- `shots.js` arranges repeatable title, action, victory, and defeat scenes for screenshot capture.
- `sound.js` creates the musical cues and effects with Web Audio and handles muting.
- `world.js` maintains the simulation: spawning, movement, collisions, flame strength, score chains, particles, and wave progression.

## Run

From the repository root, start the local server with Node.js 22 or newer:

```sh
node serve.ts
```

Then open [http://localhost:8080](http://localhost:8080) in a desktop browser to play.

Screenshots: `screenshots/1-start.jpg` shows the title, `screenshots/2-play.jpg` shows active play, `screenshots/3-dawn.jpg` shows victory at dawn, and `screenshots/4-out.jpg` shows the fire-out ending.
