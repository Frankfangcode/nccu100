import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createDahElevator } from '../src/world/buildings/dah-hsian/elevator.js';
const makeStops = () => [
  { id: '2f', label: '2F', y: 0, landing: { x: 1, y: 0, z: 3, yaw: 0 } },
  { id: '3f', label: '3F', y: dahFloorY('3F'), landing: { x: 2, y: dahFloorY('3F'), z: 3, yaw: 1 } },
];
function rig(options = {}) {
  const queued = [], arrivals = [], busy = [], errors = [];
  const lift = createDahElevator({ stops: makeStops(), transition: (fn, text) => queued.push({ fn, text }),
    arrive: landing => arrivals.push(landing), onBusy: value => busy.push(value), onError: error => errors.push(error), ...options });
  return { lift, queued, arrivals, busy, errors };
}
test('travel waits for the transition callback, arrives once and becomes available again', () => {
  assert.equal(typeof createDahElevator, 'function');
  const { lift, queued, arrivals, busy } = rig();
  assert.equal(lift.phase, 'idle');
  assert.equal(lift.request('2f', '3f'), true);
  assert.equal(lift.phase, 'travelling');
  assert.deepEqual(busy, [true]);
  assert.equal(arrivals.length, 0);
  assert.match(queued[0].text, /3F/);
  queued[0].fn();
  assert.deepEqual(arrivals, [makeStops()[1].landing]);
  assert.equal(lift.phase, 'idle');
  assert.deepEqual(busy, [true, false]);
  queued[0].fn();
  assert.equal(arrivals.length, 1);
  assert.equal(lift.request('3f', '2f'), true);
});
test('invalid, same-floor and repeated busy requests cannot dispatch travel', () => {
  const { lift, queued } = rig();
  for (const [from, to] of [['2f', '2f'], ['missing', '3f'], ['2f', 'missing'], [null, '3f'], ['2f', {}]]) {
    assert.equal(lift.request(from, to), false);
  }
  assert.equal(queued.length, 0);
  assert.equal(lift.request('2f', '3f'), true);
  assert.equal(lift.request('2f', '3f'), false);
  assert.equal(lift.request('3f', '2f'), false);
  assert.equal(queued.length, 1);
});
test('cancelling a queued ride prevents stale arrival even after a replacement ride', () => {
  const { lift, queued, arrivals, busy } = rig();
  assert.equal(lift.cancel(), false);
  lift.request('2f', '3f');
  assert.equal(lift.cancel(), true);
  assert.equal(lift.phase, 'idle');
  assert.equal(lift.request('3f', '2f'), true);
  queued[0].fn();
  assert.deepEqual(arrivals, []);
  assert.equal(lift.phase, 'travelling');
  queued[1].fn();
  assert.deepEqual(arrivals, [makeStops()[0].landing]);
  assert.deepEqual(busy, [true, false, true, false]);
});
test('scene disposal invalidates pending callbacks permanently and is idempotent', () => {
  const { lift, queued, arrivals, busy } = rig();
  lift.request('2f', '3f');
  lift.dispose();
  lift.dispose();
  queued[0].fn();
  assert.equal(lift.phase, 'disposed');
  assert.equal(lift.request('2f', '3f'), false);
  assert.equal(lift.cancel(), false);
  assert.deepEqual(arrivals, []);
  assert.deepEqual(busy, [true, false]);
});
test('UI cancellation during busy notification prevents transition dispatch', () => {
  let lift;
  const queued = [];
  lift = rig({ transition: fn => queued.push(fn), onBusy: busy => { if (busy) lift.cancel(); } }).lift;
  assert.equal(lift.request('2f', '3f'), false);
  assert.equal(lift.phase, 'idle');
  assert.deepEqual(queued, []);
});
test('stop snapshots and arrival copies protect later travel from external mutation', () => {
  const stops = makeStops();
  const { lift, queued, arrivals } = rig({ stops });
  stops[1].landing.x = 999;
  stops[1].id = 'elsewhere';
  assert.equal(Object.isFrozen(lift.stops), true);
  assert.equal(Object.isFrozen(lift.stops[1]), true);
  assert.equal(Object.isFrozen(lift.stops[1].landing), true);
  assert.throws(() => { lift.stops[1].landing.x = 555; }, TypeError);
  lift.request('2f', '3f');
  queued[0].fn();
  assert.deepEqual(arrivals[0], makeStops()[1].landing);
  arrivals[0].x = 666;
  lift.request('2f', '3f');
  queued[1].fn();
  assert.deepEqual(arrivals[1], makeStops()[1].landing);
});
test('malformed and ambiguous stop configurations fail closed before travel can be enabled', () => {
  const valid = makeStops();
  const invalid = [null, [], [valid[0], valid[0]], [{ ...valid[0], id: '' }], [{ ...valid[0], label: '' }],
    [{ ...valid[0], y: NaN }], [{ ...valid[0], landing: { x: 1, y: 0 } }],
    [{ ...valid[0], landing: { x: 1, y: Infinity, z: 2 } }],
    [{ ...valid[0], landing: { x: 1, y: 0, z: 2, yaw: 'north' } }],
    [{ ...valid[0], landing: { x: 1, y: 1, z: 2 } }]];
  for (const stops of invalid) assert.throws(() => rig({ stops }), TypeError);
  assert.throws(() => rig({ transition: null }), TypeError);
  assert.throws(() => rig({ arrive: null }), TypeError);
  assert.throws(() => rig({ onBusy: true }), TypeError);
  assert.throws(() => rig({ onError: true }), TypeError);
});
test('queued arrival failure is reported without escaping into transition cleanup and allows retry', async () => {
  const failure = new Error('landing unavailable');
  let attempts = 0;
  const { lift, queued, busy, errors } = rig({ arrive: () => { if (++attempts === 1) throw failure; } });
  lift.request('2f', '3f');
  let transitionCleanedUp = false;
  await new Promise(resolve => setImmediate(() => { queued[0].fn(); transitionCleanedUp = true; resolve(); }));
  assert.equal(transitionCleanedUp, true);
  assert.equal(lift.phase, 'idle');
  assert.equal(lift.lastError, failure);
  assert.deepEqual(errors, [failure]);
  assert.deepEqual(busy, [true, false]);
  assert.equal(lift.request('2f', '3f'), true);
  queued[1].fn();
  assert.equal(lift.lastError, null);
});
test('transition dispatch failure clears pending work and reports the error', () => {
  const failure = new Error('iris unavailable');
  let stale;
  const { lift, arrivals, busy, errors } = rig({ transition: fn => { stale = fn; throw failure; } });
  assert.equal(lift.request('2f', '3f'), false);
  assert.equal(lift.phase, 'idle');
  assert.equal(lift.lastError, failure);
  assert.deepEqual(errors, [failure]);
  assert.deepEqual(busy, [true, false]);
  stale();
  assert.deepEqual(arrivals, []);
});
test('failing busy observers and error observers cannot lock the lift or break fade cleanup', () => {
  const failure = new Error('HUD unavailable');
  const { lift, queued, arrivals } = rig({ onBusy: () => { throw failure; }, onError: () => { throw new Error('reporter unavailable'); } });
  assert.equal(lift.request('2f', '3f'), false);
  assert.equal(lift.phase, 'idle');
  assert.equal(queued.length, 0);
  assert.equal(lift.lastError, failure);
  assert.deepEqual(arrivals, []);
  const endFailure = rig({ onBusy: busy => { if (!busy) throw failure; } });
  endFailure.lift.request('2f', '3f');
  assert.doesNotThrow(() => endFailure.queued[0].fn());
  assert.equal(endFailure.lift.phase, 'idle');
  assert.equal(endFailure.lift.lastError, failure);
  endFailure.lift.request('2f', '3f');
  assert.doesNotThrow(() => endFailure.lift.cancel());
  endFailure.lift.request('2f', '3f');
  assert.doesNotThrow(() => endFailure.lift.dispose());
  assert.equal(endFailure.lift.phase, 'disposed');
});
test('disposal from within arrival is permanent and cannot be reopened by callback cleanup', () => {
  let lift;
  const queue = [], busy = [];
  lift = rig({ transition: fn => queue.push(fn), arrive: () => lift.dispose(), onBusy: value => busy.push(value) }).lift;
  lift.request('2f', '3f');
  queue[0]();
  assert.equal(lift.phase, 'disposed');
  assert.equal(lift.request('2f', '3f'), false);
  assert.deepEqual(busy, [true, false]);
});
test('a failing callback cannot undo scene disposal', () => {
  let lift;
  const failure = new Error('disposed observer');
  lift = rig({ onBusy: busy => { if (busy) { lift.dispose(); throw failure; } } }).lift;
  assert.equal(lift.request('2f', '3f'), false);
  assert.equal(lift.phase, 'disposed');
  const second = rig({ transition: () => { second.lift.dispose(); throw failure; } });
  assert.equal(second.lift.request('2f', '3f'), false);
  assert.equal(second.lift.phase, 'disposed');
});
