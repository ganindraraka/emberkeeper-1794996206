// Held controls and queued screen actions have separate lifetimes.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
const MOUSE_FOLLOW = 0.16;

export function createInput(target) {
  const held = { left: false, right: false, dash: false };
  let pending = 0;
  let aim = null;
  const direction = (code) => {
    switch (code) {
      case 'ArrowLeft': case 'KeyA': return 'left';
      case 'ArrowRight': case 'KeyD': return 'right';
      case 'Space': return 'dash';
      default: return null;
    }
  };
  window.addEventListener('keydown', (event) => {
    const control = direction(event.code);
    if (control) held[control] = true;
    else if (!['Enter', 'KeyP', 'Escape'].includes(event.code)) return;
    if (!event.repeat) {
      if (event.code === 'Space' || event.code === 'Enter') pending |= ACTION_CONFIRM;
      if (event.code === 'KeyP' || event.code === 'Escape') pending |= ACTION_PAUSE;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const control = direction(event.code);
    if (control) held[control] = false;
  });
  window.addEventListener('blur', () => {
    held.left = held.right = held.dash = false;
  });
  target.addEventListener('pointerdown', () => { pending |= ACTION_CONFIRM; });
  window.addEventListener('pointermove', (event) => {
    const view = target.__view ?? { x: 0, y: 0, scale: 1, centerX: 640, centerY: 400 };
    const ratio = window.devicePixelRatio || 1;
    const x = (event.clientX * ratio - view.x) / view.scale;
    const y = (event.clientY * ratio - view.y) / view.scale;
    aim = Math.atan2(y - view.centerY, x - view.centerX);
  });
  return {
    steer(angle) {
      if (aim === null) return Number(held.right) - Number(held.left);
      let delta = (aim - angle) % (Math.PI * 2);
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      return Math.max(-1, Math.min(1, delta / MOUSE_FOLLOW));
    },
    dashing: () => held.dash,
    takeActions() {
      const result = pending;
      pending = 0;
      return result;
    },
  };
}
