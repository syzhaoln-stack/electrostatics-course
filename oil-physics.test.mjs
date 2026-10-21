import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OIL_CONSTANTS as C, createDrop, equilibriumVoltage, forces, advanceDrop,
  inferDropFromFallSpeed, inferCharge, insideCapture,
} from './oil-physics.js';

function close(actual, expected, relative = 1e-12, absolute = 1e-25) {
  assert.ok(Math.abs(actual - expected) <= Math.max(absolute, relative * Math.abs(expected)),
    `${actual} should be close to ${expected}`);
}

test('a micron oil drop has physically small mass, fast relaxation and slow falling speed', () => {
  const d = createDrop();
  close(d.volume, 4 * Math.PI * d.radius ** 3 / 3);
  close(d.mass, C.oilDensity * d.volume);
  close(d.drag, 6 * Math.PI * C.viscosity * d.radius);
  close(d.tau, 2 * C.oilDensity * d.radius ** 2 / (9 * C.viscosity));
  assert.ok(d.tau > 2e-5 && d.tau < 3e-5);
  const fall = forces(d, 0, 0);
  assert.ok(fall.terminalVelocity < -0.0002 && fall.terminalVelocity > -0.0003);
  assert.ok(equilibriumVoltage(d) > 200 && equilibriumVoltage(d) < 250);
  assert.ok(Object.isFrozen(C));
});

test('field and electric-force signs follow the top-minus-bottom voltage convention', () => {
  for (const charge of [-10 * C.elementaryCharge, 10 * C.elementaryCharge]) {
    const d = createDrop({ charge });
    const f = forces(d, 300, 0);
    assert.ok(f.field < 0);
    assert.equal(Math.sign(f.electric), -Math.sign(charge));
    close(f.field, -100000);
    close(f.electric, charge * f.field);
    close(forces(d, -300, 0).electric, -f.electric);
    close(f.gravity, -d.mass * C.g);
    assert.ok(f.buoyancy > 0);
    close(f.net, f.electric + f.gravity + f.buoyancy + f.drag);
  }
});

test('suspension balances gravity and buoyancy for either charge sign at every height', () => {
  for (const charge of [-10 * C.elementaryCharge, 10 * C.elementaryCharge]) {
    const d = createDrop({ charge });
    const u = equilibriumVoltage(d);
    assert.equal(Math.sign(u), -Math.sign(charge));
    const f = forces(d, u, 0);
    close(f.electric, d.effectiveWeight);
    close(f.net, 0, 1e-12, 1e-28);
    for (const y of [0.0002, 0.0015, 0.0028]) {
      const next = advanceDrop({ y, v: 0 }, d, u, 3);
      close(next.y, y);
      close(next.v, 0, 1e-12, 1e-18);
    }
  }
});

test('linear drag opposes velocity and terminal motion has zero acceleration, not zero speed', () => {
  const d = createDrop();
  assert.ok(forces(d, 0, -0.001).drag > 0);
  assert.ok(forces(d, 0, 0.001).drag < 0);
  for (const u of [-200, 0, 400]) {
    const vt = forces(d, u, 0).terminalVelocity;
    const steady = forces(d, u, vt);
    close(steady.net, 0, 1e-12, 1e-28);
    const next = advanceDrop({ y: 0.001, v: vt }, d, u, 0.6);
    close(next.y, 0.001 + 0.6 * vt);
    close(next.v, vt);
    close(next.a, 0);
  }
});

test('transient velocities agree with the analytic exponential at one and five relaxation times', () => {
  const d = createDrop();
  const vt = forces(d, 0, 0).terminalVelocity;
  for (const count of [1, 5]) {
    const t = count * d.tau;
    const s = advanceDrop({ y: 0, v: 0 }, d, 0, t);
    close(s.v, vt * (1 - Math.exp(-count)));
    close(s.y, vt * (t - d.tau * (1 - Math.exp(-count))));
    close(s.a, vt / d.tau * Math.exp(-count));
  }
  const frame = advanceDrop({ y: 0, v: 0 }, d, 0, 1 / 60);
  close(frame.v, vt);
  assert.ok(Math.abs(frame.y) < 0.000004);
});

test('zero and very short time steps preserve the local velocity and acceleration limit', () => {
  const d = createDrop();
  const s = { y: 0.001, v: 0.0001 };
  const f = forces(d, 80, s.v);
  const still = advanceDrop(s, d, 80, 0);
  assert.equal(still.y, s.y);
  assert.equal(still.v, s.v);
  close(still.a, f.acceleration);
  const dt = d.tau * 1e-8;
  const tiny = advanceDrop({ y: 0, v: 0 }, d, 80, dt);
  close(tiny.v / dt, forces(d, 80, 0).acceleration, 1e-8);
  close(tiny.y / (dt * dt / 2), forces(d, 80, 0).acceleration, 1e-8);
});

test('partitioning a constant-voltage step does not change the trajectory', () => {
  const d = createDrop();
  for (const duration of [d.tau * 0.2, d.tau * 3, 1 / 60, 2]) {
    const initial = { y: 0.001, v: -0.00008 };
    const whole = advanceDrop(initial, d, 350, duration);
    let split = initial;
    for (let i = 0; i < 100; i++) split = advanceDrop(split, d, 350, duration / 100);
    close(split.y, whole.y, 2e-12);
    close(split.v, whole.v, 2e-12);
  }
});

test('a voltage reversal immediately reverses acceleration before velocity changes sign', () => {
  const d = createDrop();
  const falling = forces(d, 0, 0).terminalVelocity;
  const newVoltage = 2 * equilibriumVoltage(d);
  assert.ok(forces(d, newVoltage, falling).acceleration > 0);
  const early = advanceDrop({ y: 0, v: falling }, d, newVoltage, d.tau / 10);
  assert.ok(early.v < 0 && early.a > 0);
  const later = advanceDrop({ y: 0, v: falling }, d, newVoltage, d.tau * 2);
  assert.ok(later.v > 0);
});

test('fall speed and suspension voltage reconstruct radius, mass and signed charge', () => {
  for (const radius of [0.8e-6, 1.5e-6, 2e-6]) {
    for (const count of [-18, -6, 9]) {
      const d = createDrop({ radius, charge: count * C.elementaryCharge });
      const speed = -forces(d, 0, 0).terminalVelocity;
      const measured = inferDropFromFallSpeed(speed);
      close(measured.radius, radius);
      close(measured.mass, d.mass);
      close(measured.effectiveWeight, d.effectiveWeight);
      close(inferCharge(speed, equilibriumVoltage(d)), d.charge);
    }
  }
  const custom = inferDropFromFallSpeed(0.0003, { airDensity: 0, viscosity: 2e-5 });
  close(custom.effectiveWeight, custom.mass * C.g);
  close(custom.effectiveWeight / custom.drag, 0.0003);
});

test('larger same-sign charge reduces the suspension voltage without changing gravitational fall speed', () => {
  const a = createDrop({ charge: -6 * C.elementaryCharge });
  const b = createDrop({ charge: -12 * C.elementaryCharge });
  close(equilibriumVoltage(a), 2 * equilibriumVoltage(b));
  close(forces(a, 0, 0).terminalVelocity, forces(b, 0, 0).terminalVelocity);
});

test('capture requires position and speed together, so passing through or balancing elsewhere fails', () => {
  const target = 0.0015, tolerance = 0.0001, limit = 0.00001;
  assert.equal(insideCapture({ y: target, v: 0 }, target, tolerance, limit), true);
  assert.equal(insideCapture({ y: target + tolerance / 2, v: limit }, target, tolerance, limit), true);
  assert.equal(insideCapture({ y: target, v: limit * 2 }, target, tolerance, limit), false);
  assert.equal(insideCapture({ y: target, v: -limit * 2 }, target, tolerance, limit), false);
  assert.equal(insideCapture({ y: target + tolerance * 2, v: 0 }, target, tolerance, limit), false);
  assert.equal(insideCapture({ y: target, v: 0 }, target, 0, 0), true);
});

test('invalid physical inputs fail explicitly instead of producing a misleading game state', () => {
  const d = createDrop();
  for (const radius of [0, -1, Infinity, NaN, '1']) assert.throws(() => createDrop({ radius }));
  for (const charge of [Infinity, NaN, '2']) assert.throws(() => createDrop({ charge }));
  const neutral = createDrop({ charge: 0 });
  close(forces(neutral, 300, 0).electric, 0);
  assert.throws(() => equilibriumVoltage(neutral));
  assert.throws(() => forces({}, 100, 0));
  assert.throws(() => forces(d, NaN, 0));
  assert.throws(() => forces(d, 100, Infinity));
  assert.throws(() => advanceDrop({ y: 0, v: 0 }, d, 100, -1));
  assert.throws(() => advanceDrop({ y: 0, v: 0 }, d, 100, Infinity));
  assert.throws(() => advanceDrop({ y: NaN, v: 0 }, d, 100, 1));
  for (const speed of [0, -1, NaN, Infinity]) assert.throws(() => inferDropFromFallSpeed(speed));
  assert.throws(() => inferDropFromFallSpeed(0.001, { viscosity: 0 }));
  assert.throws(() => inferDropFromFallSpeed(0.001, { airDensity: C.oilDensity }));
  assert.throws(() => inferCharge(0.001, 0));
  assert.throws(() => inferCharge(0.001, NaN));
  assert.throws(() => insideCapture({ y: 0, v: 0 }, 0, -1, 1));
  assert.throws(() => insideCapture({ y: 0, v: 0 }, 0, 1, -1));
  assert.throws(() => insideCapture({ y: 0, v: 0 }, NaN, 1, 1));
});
