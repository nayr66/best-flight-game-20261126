// DAWNLINE — keyboard and mouse: throttle, pitch, bank, brake, camera,
// and a mouse-drag look-around that eases back when released.

export function makeInput(canvas) {
  const keys = new Set();
  const orbit = { yaw: 0, pitch: 0 };
  let dragging = false, lastX = 0, lastY = 0;
  const pressed = { camera: false, reset: false, any: false };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    pressed.any = true;
    if (e.code === 'KeyC') pressed.camera = true;
    if (e.code === 'KeyR') pressed.reset = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    orbit.yaw = Math.max(-2.4, Math.min(2.4, orbit.yaw + (e.clientX - lastX) * 0.005));
    orbit.pitch = Math.max(-0.6, Math.min(1.2, orbit.pitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY;
  });

  return {
    orbit,
    pressed,
    read(dt) {
      if (!dragging) {
        orbit.yaw *= Math.pow(0.4, dt);
        orbit.pitch *= Math.pow(0.4, dt);
      }
      const out = {
        throttle: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
        pitch: (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0),
        roll: (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0),
        brake: keys.has('Space'),
      };
      const events = { camera: pressed.camera, reset: pressed.reset, any: pressed.any };
      pressed.camera = false; pressed.reset = false; pressed.any = false;
      return { ...out, events };
    },
  };
}
