# Disc Playground

A retro plastic launcher that turns target practice into colorful ricochet art. Aim, hold to charge, and release. Three fixed bumpers reward hits while every shot paints a fading ribbon. There are no rounds to win: the toy is about trying one more shot.

## Play

- Mouse/pen: aim inside the arena, hold the primary button, release to fire.
- Touch: tap or drag to aim, then hold and release the coral Fire button.
- Keyboard: focus the arena; arrows aim, hold Space to charge, release to fire. Escape cancels.
- Reset clears the canvas and counter. Pause freezes the toy. Sound is intentionally absent.

## Run

Requires Node 20.19+ or 22.12+. Developed using Node 24.14.1.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Vercel: build command `npm run build`, output directory `dist`. `vercel.json` contains this configuration.

## Choices

Vanilla JavaScript and Canvas 2D handle the launcher, trails, and physics. Paper Shaders 0.0.81 supplies the textured surface and reactive rim, using its existing vanilla API. Dependencies are pinned and the lockfile is committed.

Physics advances at 120 fixed steps per second, with swept wall/circle collisions, slightly lossy rebounds, and drag. Discs live for at most five seconds; the arena keeps at most eight. Discs pass through each other. A static logical world preserves trajectories during resizing.

The shaders use bounded resolutions, freeze on pause, and fall back to CSS on unavailable/lost WebGL. Reduced-motion preferences suppress decorative animation and shorten trails. The gameplay stays usable with keyboard controls and touch-sized buttons.

## Checks

`npm test` verifies charge bounds, aim, launch direction, wall reflection, maximum-speed bumper collision, separation, distinct hits, retirement, the eight-disc ceiling, and deterministic fixed steps. `npm run build` creates the static submission.

Browser verification and final links are recorded below after deployment. Mobile viewport checks are not a substitute for testing on a physical phone.

## Next explorations

Movable bumpers for designing paths, alternate disc materials for different rebounds, and optional synthesized sound. These are deliberately left out of the first version to protect the core interaction.

## Third-party notices

Paper Shaders is licensed under Apache 2.0. Its unmodified license and notice are included in `public/PAPER-SHADERS-LICENSE.txt` and `public/PAPER-SHADERS-NOTICE.txt`, and shipped in the built site. The package source was referenced from https://github.com/paper-design/shaders, local revision `43cd68d`.
