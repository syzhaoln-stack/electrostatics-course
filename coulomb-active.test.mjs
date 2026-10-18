import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_MODEL, activeTorques, activeEquilibrium, advanceActiveBalance, activeTargetReached, equivalentTorsion } from './coulomb-active.js';
const near = (value, expected, tolerance = 1e-10) => assert.ok(Math.abs(value - expected) < tolerance, `${value} differs from ${expected}`);
const evolve = (state, seconds) => { for (let i = 0; i < seconds * 100; i++) state = advanceActiveBalance(state, .01); return state; };

test('at 8.5 degrees without upper twist, release initially drives the ball OUTWARD', () => {
  const torques = activeTorques(8.5, 0);
  assert.ok(torques.electric > 60 * torques.restoring);
  const next = advanceActiveBalance({ alphaDegrees: 8.5, betaDegrees: 0, velocityDegreesPerSecond: 0 }, .1);
  assert.ok(next.alphaDegrees > 8.5 && next.velocityDegreesPerSecond > 0);
});

test('at the calibrated third reading, torque balance needs no continuing knob velocity', () => {
  const torques = activeTorques(8.5, 567);
  near(torques.net, 0, 1e-20); near(activeEquilibrium(567), 8.5, 1e-10);
  const state = { alphaDegrees: 8.5, betaDegrees: 567, velocityDegreesPerSecond: 0 };
  const later = evolve(state, 10);
  near(later.alphaDegrees, 8.5); near(later.velocityDegreesPerSecond, 0);
  assert.equal(activeTargetReached(later), true);
});

test('increasing upper twist moves the stable equilibrium closer without artificially amplifying source force', () => {
  assert.ok(activeEquilibrium(0) > activeEquilibrium(126));
  assert.ok(activeEquilibrium(126) > activeEquilibrium(567));
  assert.ok(activeEquilibrium(720) < 8.5);
  near(activeTorques(18, 0).force, activeTorques(18, 567).force, 1e-20);
  assert.ok(activeTorques(8.5, 600).net < 0);
});

test('damped dynamic state approaches the stationary target after a real knob adjustment', () => {
  const released = evolve({ alphaDegrees: 8.5, betaDegrees: 0, velocityDegreesPerSecond: 0 }, 8);
  assert.ok(released.alphaDegrees > 25);
  const tightened = evolve({ ...released, betaDegrees: 567 }, 15);
  near(tightened.alphaDegrees, 8.5, .002);
  assert.equal(activeTargetReached(tightened), true);
});

test('target success is not just angle matching while the ball is still moving', () => {
  assert.equal(activeTargetReached({ alphaDegrees: 8.5, betaDegrees: 0, velocityDegreesPerSecond: 0 }), false);
  assert.equal(activeTargetReached({ alphaDegrees: 8.5, betaDegrees: 567, velocityDegreesPerSecond: 3 }), false);
  assert.equal(activeTargetReached({ alphaDegrees: 18, betaDegrees: 126, velocityDegreesPerSecond: 0 }), false);
});

test('integration remains finite and outside contact under fast full-range knob changes', () => {
  let state = { alphaDegrees: 8.5, betaDegrees: 0, velocityDegreesPerSecond: 0 };
  for (let i = 0; i < 2000; i++) {
    state.betaDegrees = Math.floor(i / 200) % 2 ? 720 : 0;
    state = advanceActiveBalance(state, .02);
    assert.ok(Number.isFinite(state.alphaDegrees) && Number.isFinite(state.velocityDegreesPerSecond));
    assert.ok(state.alphaDegrees >= ACTIVE_MODEL.minAlphaDegrees && state.alphaDegrees <= 174);
  }
  assert.throws(() => activeEquilibrium(NaN), RangeError);
  assert.throws(() => activeTorques(0, 0), RangeError);
  assert.throws(() => advanceActiveBalance(state, -1), RangeError);
});

test('fixing the upper orientation is a rigid rotation of all sections, preserving relative twist and restoring torque', () => {
  const e = equivalentTorsion(18, 126);
  assert.equal(e.passive.bottom - e.passive.top, 144);
  assert.equal(e.active.bottom - e.active.top, 144);
  for (const fraction of [0, .25, .5, .75, 1]) {
    const activeAngle = e.active.top + fraction * (e.active.bottom - e.active.top);
    const passiveAngle = e.passive.top + fraction * (e.passive.bottom - e.passive.top);
    near(passiveAngle - activeAngle, 126);
  }
  near(e.restoringTorque, activeTorques(18, 126).restoring, 1e-20);
  // A different lever would change F=torque/lever even with the same twist.
  assert.notEqual(e.restoringTorque / .1, e.restoringTorque / .2);
});
