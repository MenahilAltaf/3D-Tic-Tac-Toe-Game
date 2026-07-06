# TRIAD — A 3D Strategy Puzzle Game

TRIAD is a modern, fully three-dimensional take on tic-tac-toe, built as a
five-page commercial website: a marketing homepage, a how-to-play guide, a
playable 3D game, a searchable leaderboard, and a store page for a physical
edition. The whole project is written in pure HTML, CSS, and vanilla
JavaScript, with **Three.js** powering the real-time 3D board.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Folder Structure](#folder-structure)
- [Installation](#installation)
- [How to Run](#how-to-run)
- [Three.js Explanation](#threejs-explanation)
- [JavaScript Logic](#javascript-logic)
- [AI Usage](#ai-usage)
- [Screenshots](#screenshots)
- [Deployment Instructions](#deployment-instructions)
- [Future Improvements](#future-improvements)

---

## Project Overview

TRIAD reimagines the classic three-in-a-row puzzle as a real WebGL scene you
can rotate, zoom, and interact with using raycasting instead of flat DOM
clicks. The site is built to feel like a genuine commercial product — dark,
glassmorphic UI, animated hero background, and a full store page — rather
than a plain student demo.

The playable puzzle chosen for this project is **3D Tic-Tac-Toe**, played
against either a two-player pass-and-play mode or an unbeatable minimax AI.

## Features

**Site-wide**
- Fully responsive layout (desktop, tablet, mobile)
- Glassmorphism cards, gradient backgrounds, hover and scroll animations
- Accessible mobile navigation with animated hamburger toggle
- Scroll-reveal animations via `IntersectionObserver`
- Accordion-style FAQ sections

**Game (Play Game page)**
- Real 3D board rendered with Three.js — perspective camera, scene, lighting,
  and materials
- Custom mouse-drag "orbit" camera controls and scroll-to-zoom, written from
  scratch (no external controls library)
- Raycasting for hover-highlight and click-to-place interaction
- Two opponents: an unbeatable **minimax AI** (Hard) and a casual **random AI**
  (Easy), plus a local 2-player mode
- Timer, move counter, running score, win/draw detection
- Glowing win-line render across the completed three-in-a-row
- Canvas-based confetti celebration on a win
- Synthesized Web Audio "click" and "win" tones (no audio files required)
- Match history and running score saved to `localStorage`

**Leaderboard page**
- Sortable columns (name, score, moves, time, date)
- Live search-as-you-type filtering
- "Top 3" quick filter
- Sample seed data merged with the player's own saved runs (badged "YOU")

**Buy Game page**
- Three pricing tiers with a features comparison table
- Testimonials and store-specific FAQ
- Contact CTA for completing an order

## Technologies Used

| Technology         | Purpose                                   |
|---------------------|--------------------------------------------|
| HTML5               | Page structure and semantics               |
| CSS3                | Styling, layout, glassmorphism, animation  |
| Vanilla JavaScript  | All interactivity and game logic           |
| Three.js (r128)     | 3D rendering, scene graph, raycasting      |
| Web Audio API       | Synthesized sound effects                  |
| localStorage        | Score, leaderboard, and settings persistence |

No frameworks, no CSS libraries, no jQuery — everything is hand-written.

## Folder Structure

```
3D-Board-Game/
│
├── index.html
├── play.html
├── leaderboard.html
├── how-to-play.html
├── buy.html
│
├── css/
│   ├── style.css        # shared design tokens, nav, footer, cards, page sections
│   ├── play.css         # 3D stage, HUD, win overlay, confetti canvas
│   └── leaderboard.css  # table, search, sort, filter styling
│
├── js/
│   ├── app.js            # mobile nav, scroll reveal, FAQ accordion (shared)
│   ├── hero-bg.js         # ambient Three.js background for the homepage hero
│   ├── game.js            # the full 3D Tic-Tac-Toe game engine
│   └── leaderboard.js     # leaderboard rendering, search, sort, filter
│
├── assets/
│   ├── images/            # placeholder folder for future imagery
│   ├── icons/              # placeholder folder for future custom icons
│   └── audio/              # placeholder folder (game uses synthesized audio)
│
└── README.md
```

## Installation

No build tools, package managers, or dependencies are required.

```bash
git clone <your-repo-url>
cd 3D-Board-Game
```

That's it — the project is ready to open as-is. Three.js is loaded from a
CDN (`cdnjs.cloudflare.com`) inside `index.html` and `play.html`, so an
internet connection is needed the first time those pages load.

## How to Run

Because the game uses `fetch`-like module behavior in some browsers'
security models for local files, the simplest reliable way to run the site
is through a lightweight local server rather than double-clicking the HTML
file directly:

**Option A — VS Code Live Server**
1. Open the project folder in VS Code.
2. Install the "Live Server" extension.
3. Right-click `index.html` → "Open with Live Server".

**Option B — Python's built-in server**
```bash
cd 3D-Board-Game
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

**Option C — Node's `http-server`**
```bash
npx http-server .
```

Opening `index.html` directly by double-clicking usually also works fine in
modern browsers, since this project doesn't use ES module imports.

## Three.js Explanation

The 3D board in `js/game.js` is built from these core Three.js pieces:

- **`THREE.Scene`** — the container for every 3D object (board tiles, pieces,
  lights, the base platform, and the win-line).
- **`THREE.PerspectiveCamera`** — gives the board realistic depth. Its
  position is recalculated every frame from spherical coordinates
  (`radius`, `theta`, `phi`) so dragging the mouse smoothly orbits it around
  the board's center.
- **`THREE.WebGLRenderer`** — draws the scene to the `<canvas id="game-canvas">`
  element every animation frame.
- **Lights** — an `AmbientLight` for soft fill, a `DirectionalLight` acting as
  the key light, and two colored `PointLight`s that give the cyan/violet rim
  glow seen around the board.
- **Meshes & Materials** — each of the 9 board tiles is a `BoxGeometry` with a
  `MeshStandardMaterial`; X pieces are two crossed boxes, O pieces are a
  `TorusGeometry`, all using emissive materials for the glow effect.
- **`THREE.Raycaster`** — converts the mouse position into a 3D ray to detect
  which tile is being hovered or clicked, which is how "click to place a
  piece" works without any DOM-based hit-testing.
- **Animation loop** — a `requestAnimationFrame` loop eases the camera toward
  its target angles, updates hover highlighting, and re-renders the scene
  roughly 60 times per second.

Camera "controls" are written by hand (see the `orbit` object and its mouse/
touch event listeners) rather than importing `OrbitControls`, keeping the
project dependency-free and fully vanilla-JS as required.

## JavaScript Logic

- **`js/app.js`** — shared, page-agnostic behavior: the mobile nav toggle,
  the `IntersectionObserver`-driven scroll-reveal animations, and the FAQ
  accordion used on the homepage and store page.
- **`js/hero-bg.js`** — a small, self-contained Three.js scene just for the
  homepage hero's animated wireframe background. It fails silently if WebGL
  isn't available, so it never breaks the rest of the page.
- **`js/game.js`** — the game engine. It's organized into clearly commented
  sections: scene setup, board construction, controls/raycasting, game rules
  (including a full minimax search for the unbeatable AI), the HUD/timer/
  score system, confetti + sound effects, and the render loop.
- **`js/leaderboard.js`** — reads saved runs from `localStorage`, merges them
  with sample seed data, and re-renders the table whenever the user searches,
  sorts a column, or switches the Top-3 filter.

All game state lives in a single `state` object per script (module pattern
via an IIFE), so there are no global variable collisions between files.

## AI Usage

This project's opponent AI (in `js/game.js`) is a classic **minimax
algorithm** — not a machine-learning model. On "Hard" difficulty, it
recursively simulates every possible remaining sequence of moves and always
picks the move that leads to the best guaranteed outcome, which makes it
mathematically unbeatable at tic-tac-toe (the best a human can achieve
against it is a draw). "Easy" difficulty instead picks a uniformly random
open tile, which is deliberately beatable for a more relaxed game.

## Screenshots

> Add screenshots of each page here before publishing:
>
> - `assets/images/screenshot-home.png`
> - `assets/images/screenshot-play.png`
> - `assets/images/screenshot-leaderboard.png`
> - `assets/images/screenshot-buy.png`

## Deployment Instructions

Since this is a fully static site, it can be deployed on any static host:

**GitHub Pages**
1. Push the project to a GitHub repository.
2. Go to Settings → Pages → Deploy from branch → select `main` and `/root`.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

**Netlify**
1. Drag and drop the `3D-Board-Game` folder onto Netlify's dashboard, or
   connect the GitHub repo.
2. No build command is required — it's a static site.

**Vercel**
1. Import the repository at vercel.com.
2. Leave the framework preset as "Other" and deploy — no build step needed.

## Future Improvements

- Add a real multiplayer mode over WebSockets instead of local pass-and-play
- Add optional pre-recorded sound effect files as an alternative to the
  synthesized Web Audio tones
- Add a dedicated 3D Maze puzzle as a second game mode alongside Tic-Tac-Toe
- Persist the leaderboard to a real backend/database so scores are shared
  across devices instead of being local to the browser
- Add light/dark theme toggle and additional accent color themes
- Add keyboard-only play support for full accessibility

---

Built as an internship project by **Menahil Altaf**.
