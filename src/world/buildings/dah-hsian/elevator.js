/**
 * Pure lift control; the caller supplies source-reviewed, walkable stops.
 * transition(fn, label, journey) must be the lift-specific visual adapter.
 * Return value is ignored; only its later fn call commits arrival.
 * Passing gameplay.transition here would treat the label as a bus ride.
 * arrive/onBusy/onError are synchronous.
 * cancel/dispose invalidate arrival; the runtime also disposes its visual adapter.
 * phase tracks this controller, not the game's longer fade/busy lifecycle.
 */
export function createDahElevator({ stops, transition, arrive, onBusy, onError }) {
  if (typeof transition !== 'function' || typeof arrive !== 'function' ||
      (onBusy !== undefined && typeof onBusy !== 'function') ||
      (onError !== undefined && typeof onError !== 'function')) throw new TypeError('Invalid elevator callbacks');
  if (!Array.isArray(stops) || stops.length === 0) throw new TypeError('Elevator requires validated stops');
  const ids = new Set();
  stops = Object.freeze(stops.map(stop => {
    const p = stop?.landing;
    if (!stop || typeof stop.id !== 'string' || !stop.id.trim() || ids.has(stop.id) ||
        typeof stop.label !== 'string' || !stop.label.trim() || !Number.isFinite(stop.y) ||
        !p || ![p.x, p.y, p.z].every(Number.isFinite) || p.y !== stop.y ||
        (p.yaw !== undefined && !Number.isFinite(p.yaw))) throw new TypeError('Invalid or duplicate elevator stop');
    ids.add(stop.id);
    return Object.freeze({ id: stop.id, label: stop.label, y: stop.y,
      landing: Object.freeze({ x: p.x, y: p.y, z: p.z, ...(p.yaw === undefined ? {} : { yaw: p.yaw }) }) });
  }));
  let phase = 'idle', pending = null, lastError = null;
  function report(error) {
    lastError = error;
    try { onError?.(error); } catch { /* Preserve the originating failure and the transition cleanup. */ }
  }
  function notify(busy) {
    try { onBusy?.(busy); return true; }
    catch (error) { report(error); return false; }
  }
  return {
    get stops() { return stops; },
    get lastError() { return lastError; },
    get phase() { return phase; },
    dispose() {
      if (phase === 'disposed') return;
      const wasBusy = phase === 'travelling';
      pending = null;
      phase = 'disposed';
      if (wasBusy) notify(false);
    },
    cancel() {
      if (!pending) return false;
      pending = null;
      phase = 'idle';
      notify(false);
      return true;
    },
    request(fromId, toId) {
      if (phase !== 'idle' || fromId === toId ||
          !stops.some(stop => stop.id === fromId) || !stops.some(stop => stop.id === toId)) return false;
      const target = stops.find(stop => stop.id === toId);
      lastError = null;
      const trip = {};
      pending = trip;
      phase = 'travelling';
      if (!notify(true)) {
        if (pending === trip) {
          pending = null;
          phase = 'idle';
          notify(false);
        }
        return false;
      }
      if (pending !== trip) return false;
      try {
        transition(() => {
          if (pending !== trip) return;
          pending = null;
          try { arrive({ ...target.landing }); }
          catch (error) { report(error); }
          finally {
            if (phase !== 'disposed') {
              phase = 'idle';
              notify(false);
            }
          }
        }, `電梯前往 ${target.label}`, {from:stops.find(stop=>stop.id===fromId),to:target});
      }
      catch (error) {
        if (pending === trip) {
          pending = null;
          phase = 'idle';
          notify(false);
        }
        report(error);
        return false;
      }
      return true;
    },
  };
}
