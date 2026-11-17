# Emberkeeper

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ganindraraka/emberkeeper/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ganindraraka/emberkeeper/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An arcade defence game for the [make.fun best-game-01](https://make.fun/bounty/best-game-01) bounty.

A dark forest, one fire, ten waves of night. You are the Emberkeeper: swing an arc shield
around the hearth to catch embers (each one feeds the flame) and deflect frost shards (each
one strikes sparks and scores). Void shades slip past the shield — only a dash turns them.
Survive all ten waves to reach dawn, or the fire burns out.

## Play

The game is a single self-contained page with no network request.

Open `game/index.html` in a desktop browser. No build step, no network request.

- **A / D** or **← / →** or the mouse — swing the shield
- **Space** — dash (turns a void shade), **P** — pause, **M** — mute

## Run it locally

```
node serve.ts           # serves game/ on http://localhost:8080
```

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` for the judge.

## Structure

- `game/index.html` — the page
- `game/src/config.js` — every tuning number and colour
- `game/src/random.js` — seeded RNG (repeatable screenshots)
- `game/src/world.js` — the rules: shield, spawning, collisions, flame, score, waves
- `game/src/input.js` — keyboard and mouse
- `game/src/sound.js` — synthesised WebAudio effects, no asset files
- `game/src/render.js` — the canvas renderer and HUD
- `game/src/shots.js` — the staged scenes behind `?shot=start|play|end|win`
- `game/src/main.js` — boot and the fixed-step loop
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `main.ts` — the entry program
