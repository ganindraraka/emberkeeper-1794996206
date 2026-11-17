// Keyboard, pointer and mouse input. Held keys give a steering direction and a dash;
// one-shot presses (start or restart, pause) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const ANTI = new Set(['ArrowLeft', 'KeyA']);
const CLOCK = new Set(['ArrowRight', 'KeyD']);
const DASH = new Set(['Space']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

/** Mouse steering: the shield points at the pointer, so a player can aim instead of key-hold. */
const MOUSE_FOLLOW = 0.16;

export function createInput(target) {
  let anti = false;
  let clock = false;
  let dashing = false;
  let actions = 0;
  let pointerAngle = null;

  window.addEventListener('keydown', (event) => {
    if (ANTI.has(event.code)) anti = true;
    else if (CLOCK.has(event.code)) clock = true;
    else if (DASH.has(event.code)) {
      dashing = true;
      if (!event.repeat && CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (ANTI.has(event.code)) anti = false;
    else if (CLOCK.has(event.code)) clock = false;
    else if (DASH.has(event.code)) dashing = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    anti = false;
    clock = false;
    dashing = false;
  });

  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  /** Where the pointer is, in the clearing's own 1280x720 coordinates, or null if unmoved. */
  function updatePointer(clientX, clientY, view) {
    const x = (clientX * (window.devicePixelRatio || 1) - view.x) / view.scale;
    const y = (clientY * (window.devicePixelRatio || 1) - view.y) / view.scale;
    pointerAngle = Math.atan2(y - view.centerY, x - view.centerX);
  }

  window.addEventListener('pointermove', (event) => updatePointer(event.clientX, event.clientY, target.__view ?? { x: 0, y: 0, scale: 1, centerX: 640, centerY: 400 }));

  return {
    /** -1 anticlockwise, 1 clockwise, 0 for neither, both, or a mouse aim that is already there. */
    steer(currentAngle) {
      if (pointerAngle !== null) {
        let turn = (pointerAngle - currentAngle) % (Math.PI * 2);
        if (turn > Math.PI) turn -= Math.PI * 2;
        if (turn < -Math.PI) turn += Math.PI * 2;
        return Math.max(-1, Math.min(1, turn / MOUSE_FOLLOW));
      }
      return (clock ? 1 : 0) - (anti ? 1 : 0);
    },
    /** Whether the dash key is held this frame. */
    dashing() {
      return dashing;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
