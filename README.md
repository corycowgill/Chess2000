# ♟️ CHICAGO CHESS ♟️

_A 3D chess game where every piece is a Chicago landmark, the board floats in a hallucinated lakefront, and a CTA Red Line train loops endlessly around the whole thing for no reason whatsoever._

Built almost entirely by an AI that was told "make it awesome" and took that personally. This is artisanal, free-range, grass-fed **AI slop** — and we are leaning all the way in. 🌭

---

## What is this

It's chess. In your browser. In 3D. Themed around Chicago so aggressively that the pieces are buildings and the knight is a movie theater.

| Piece | What it actually is | Why |
|---|---|---|
| ♙ Pawn | The six-pointed star off the Chicago flag, on a little obelisk | Pawns are the foot soldiers, the flag stars are the people, it's *poetic*, okay |
| ♞ Knight | The **Chicago Theatre** marquee (yes, it lights up, yes it says CHICAGO vertically) | We tried a bull. The user said no bull. Respect. |
| ♝ Bishop | **Cloud Gate** a.k.a. The Bean, with an actual carved-out reflective underside | It is legally required that all Chicago software contains The Bean |
| ♜ Rook | **Marina City** — the twin corncob towers | A rook should be a fortress; a corncob is basically a vertical fortress |
| ♛ Queen | **John Hancock Center** with the full X-braced exoskeleton + twin antennae | Tall, elegant, structurally honest. The queen of the skyline. |
| ♚ King | **Willis Tower** (we still call it Sears, fight us) with the stepped bundled tubes | Tallest piece, tallest building, checks out |

There's a **Pieces gallery** on the title screen so you can admire the little buildings before you sacrifice them.

## The "lakefront" (read: fever dream)

The board sits on a limestone plaza staged in front of a Chicago that exists only in the GPU's imagination:

- 🏟️ **Wrigley Field** — ivy walls, the manual scoreboard with the clock, stepped bleachers, and a marquee that proudly declares **CUBS WIN!** (a historically rare event, rendered here in perpetuity)
- 🏘️ **Wrigleyville rooftops** — complete with rooftop bleachers and those wooden water tanks
- 🏛️ **Field Museum** — Beaux-Arts columns, pediment, the works
- 🪐 **Adler Planetarium** — green dome and all
- 🏰 **Chicago Water Tower** — the one that survived the fire, now survives our polygon budget, with its little buddy the Pumping Station and a plaza full of gaslamps and trees
- 🏈 **Soldier Field** — historic Doric colonnade with the 2003 spaceship saucer that everyone hated, lovingly recreated
- ⛲ **Buckingham Fountain** — three tiers, bronze sea horses, and a 5-unit water jet that defies several laws of physics
- 🌆 The **Willis & Hancock** skyline anchors looming in the haze
- 🚆 A **CTA Red Line "L" train** doing laps around the entire metropolitan area like it's late for something
- 🌊 **Lake Michigan**, shimmering, vast, suspiciously calm

It's giving "Chicago, but if you described it to an AI over the phone." And that's the point.

## Features that actually work

- ♟️ **Full legal chess** — castling, en passant, promotion, check, checkmate, stalemate, insufficient material, the 50-move rule. The engine is validated against standard `perft` positions (Kiwipete and friends) and passes a 62-test suite. The buildings are slop; the rules are not.
- 🤖 **Play vs CPU** — a negamax + alpha-beta AI with piece-square tables that gets deeper as the board empties out. Beatable, but it'll punish a hanging queen (er, Hancock).
- 👯 **2-player hot-seat** — pass the device, the camera politely spins to the other side.
- 📱 **Works on iPhone and desktop** — tap or click to move, pinch/scroll to zoom, drag to orbit the city.
- ✨ Animated piece moves, blinking aviation beacons, golden-hour lighting, and a sunset that never ends.

## How to play

1. Open it. Tap **Play**.
2. Tap a piece → its legal moves glow green (captures glow red).
3. Tap a glowing square. The piece flies there with a little arc, because gravity is a suggestion.
4. Win. Or lose to a 1969 skyscraper. Both are valid Chicago experiences.

Bottom bar: **New Game** · **Mode (vs CPU / 2 Player)** · **Take Back** · **Flip View** · **Pass Device** (2-player only).

## Running it locally

It's static files + Three.js loaded from a CDN. No build step, no `npm install`, no suffering.

```bash
# pick your fighter
python3 -m http.server 8000
# or
node server.js
```

Then open `http://localhost:8000`. The included `server.js` exists purely because one deploy host kept serving `.js` files as `text/plain` and we refuse to live like that.

## Tech stack

- **Three.js** (r160, via importmap — no bundler)
- Vanilla JS, vanilla HTML, vanilla CSS. No framework. The buildings are made of `BoxGeometry` and vibes.
- `js/chess.js` — the rules engine (the part that's actually rigorous)
- `js/ai.js` — the opponent
- `js/pieces.js` — the landmark-pieces
- `js/skyline.js` — the entire hallucinated city
- `js/main.js` — wires it all together

## Honest disclaimer

Distances between landmarks are not to scale. The L doesn't actually loop like that. The Bean is the wrong size. Soldier Field is nowhere near Wrigley. The Cubs do not win that often. This is a love letter to Chicago written by a language model that has never felt the wind off the lake in January — and somehow that feels appropriately Chicago.

Fly the W. 🚩

---

_Made with Three.js, an unreasonable number of `nonShadow()` calls, and the kind of confidence only an AI can summon._
