# Disc Playground

A retro plastic launcher that turns target practice into colorful ricochet art. Aim, hold to charge, and release. Three fixed bumpers reward hits while every shot paints a fading ribbon. There are no rounds to win: the toy is about trying one more shot.

- Live: https://madcritter20789.github.io/disc-playground/
- Source: https://github.com/madcritter20789/disc-playground

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

GitHub Pages runs the test and production build before deploying through `.github/workflows/pages.yml`. Relative asset paths also support deployment at a subdirectory.

Vercel remains configured with build command `npm run build` and output directory `dist`. Deployment was attempted, but the signed-in team was blocked by Vercel for exceeding its fair-use limits (HTTP 402); GitHub Pages supplies the live submission instead.

## Choices

Vanilla JavaScript and Canvas 2D handle the launcher, trails, and physics. Paper Shaders 0.0.81 supplies the textured surface and reactive rim, using its existing vanilla API. Dependencies are pinned and the lockfile is committed.

Physics advances at 120 fixed steps per second, with swept wall/circle collisions, slightly lossy rebounds, and drag. Discs live for at most five seconds; the arena keeps at most eight. Discs pass through each other. A static logical world preserves trajectories during resizing.

The shaders use bounded resolutions, freeze on pause, and fall back to CSS on unavailable/lost WebGL. Reduced-motion preferences suppress decorative animation and shorten trails. The gameplay stays usable with keyboard controls and touch-sized buttons.

## Checks

`npm test` verifies charge bounds, aim, launch direction, wall reflection, maximum-speed bumper collision, separation, distinct hits, retirement, the eight-disc ceiling, and deterministic fixed steps. `npm run build` creates the static submission.

Verified in the Codex in-app Chromium browser: pointer launch, bumper hits, full-power charging, key-repeat guard, pause, reset, Escape/focus cancellation, and the Fire button preserving touch-selected aim. A temporary browser harness exercised normal, simulated reduced-motion, unavailable-WebGL, and actual WebGL-context-loss paths without warning/error logs. The 320px viewport had no horizontal overflow; Fire measured 48px tall and Reset/Pause measured 44px. Production preview passed launch/pause/reset checks.

Sampled during desktop play over 120 animation frames: median interval 8.3ms, p95 approximately 8.5–8.7ms (roughly 120Hz in this browser). This is a local measurement, not a guarantee on other hardware. Physical phones and Safari have not been tested.

## Submission note

I built a small retro disc launcher that makes ricochet art. Hold to charge, release to launch, and watch spinning discs draw temporary ribbons as they bounce off three bumpers. Canvas keeps the interaction direct; Paper Shaders adds a textured arena and a rim that responds to charging and impacts. I focused on the charge/release feel, coherent materials, and a bounded implementation rather than levels or customization. With more time, I would explore movable bumpers, different disc materials, and optional sound.

## Next explorations

Movable bumpers for designing paths, alternate disc materials for different rebounds, and optional synthesized sound. These are deliberately left out of the first version to protect the core interaction.

## Third-party notices

Paper Shaders is licensed under Apache 2.0. Its unmodified license and notice are included in `public/PAPER-SHADERS-LICENSE.txt` and `public/PAPER-SHADERS-NOTICE.txt`, and shipped in the built site. The package source was referenced from https://github.com/paper-design/shaders, local revision `43cd68d`.
