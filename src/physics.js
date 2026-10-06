export const WORLD = { width: 900, height: 640, left: 28, right: 872, top: 28, bottom: 530 };
export const BUMPERS = [{ x: 225, y: 180, radius: 34 }, { x: 675, y: 180, radius: 34 }, { x: 450, y: 330, radius: 34 }];
export const COLORS = ['#df634c', '#367b70', '#c99b34'];
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const chargeAt = elapsed => clamp(elapsed, 0, 1);
export const aimAt = (x, y) => clamp(Math.atan2(Math.min(y, 529) - 530, x - 450), -160 * Math.PI / 180, -20 * Math.PI / 180);
export function makeDisc(angle, charge, color = COLORS[0], id = 0) {
  angle = clamp(angle, -160 * Math.PI / 180, -20 * Math.PI / 180);
  const speed = 320 + 530 * chargeAt(charge);
  return { id, x: 450 + Math.cos(angle) * 98, y: 530 + Math.sin(angle) * 98, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 11, rotation: 0, age: 0, color, trail: [], hits: 0 };
}

// ponytail: discs pass through each other; add pair collisions only if shared-disc play becomes a goal.
export function stepDisc(disc, dt, bumpers = BUMPERS, impact = () => {}) {
  let remaining = dt;
  for (let iteration = 0; iteration < 4 && remaining > 1e-8; iteration++) {
    let earliest = remaining + 1;
    let contact;
    const accept = (time, nx, ny, bumper = -1) => {
      if (time >= -1e-9 && time <= remaining && time < earliest && disc.vx * nx + disc.vy * ny < 0) {
        earliest = Math.max(0, time); contact = { nx, ny, bumper };
      }
    };
    if (disc.vx < 0) accept((WORLD.left + disc.radius - disc.x) / disc.vx, 1, 0);
    if (disc.vx > 0) accept((WORLD.right - disc.radius - disc.x) / disc.vx, -1, 0);
    if (disc.vy < 0) accept((WORLD.top + disc.radius - disc.y) / disc.vy, 0, 1);
    if (disc.vy > 0) accept((WORLD.bottom - disc.radius - disc.y) / disc.vy, 0, -1);
    bumpers.forEach((bumper, index) => {
      const dx = disc.x - bumper.x, dy = disc.y - bumper.y, radius = disc.radius + bumper.radius;
      const a = disc.vx ** 2 + disc.vy ** 2;
      if (!a) return;
      const b = 2 * (dx * disc.vx + dy * disc.vy), c = dx ** 2 + dy ** 2 - radius ** 2;
      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) return;
      const time = (-b - Math.sqrt(discriminant)) / (2 * a);
      const nx = (dx + disc.vx * time) / radius, ny = (dy + disc.vy * time) / radius;
      accept(time, nx, ny, index);
    });
    const travel = contact ? earliest : remaining;
    disc.x += disc.vx * travel; disc.y += disc.vy * travel;
    remaining -= travel;
    if (!contact) break;
    const { nx, ny, bumper } = contact;
    const dot = disc.vx * nx + disc.vy * ny;
    disc.vx = (disc.vx - 2 * dot * nx) * .93;
    disc.vy = (disc.vy - 2 * dot * ny) * .93;
    disc.x += nx * .01; disc.y += ny * .01;
    if (bumper >= 0) disc.hits++;
    impact({ x: disc.x, y: disc.y, bumper, color: disc.color, id: disc.id });
  }
  disc.vx *= Math.exp(-.22 * dt); disc.vy *= Math.exp(-.22 * dt);
  disc.age += dt; disc.rotation += dt * (8 + Math.hypot(disc.vx, disc.vy) / 24);
  return disc.age < 5 && Math.hypot(disc.vx, disc.vy) > 35;
}
export function addDisc(discs, disc) {
  if (discs.length >= 8) discs.shift();
  discs.push(disc);
}
