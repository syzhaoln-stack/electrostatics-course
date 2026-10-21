// Millikan-inspired instructional model, in SI units. y and velocity are positive
// upward. U = Vtop - Vbottom, so Ey = -U / gap. This is the continuum Stokes
// approximation for a spherical oil drop: no Cunningham/slip correction,
// evaporation, Brownian motion or measurement noise. It is not historical data.
export const OIL_CONSTANTS = Object.freeze({
  g: 9.81,
  oilDensity: 860,
  airDensity: 1.2,
  viscosity: 1.81e-5,
  gap: 0.003,
  elementaryCharge: 1.602176634e-19,
});

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
  return value;
}

function positive(value, name) {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive.`);
  return value;
}

function nonnegative(value, name) {
  finite(value, name);
  if (value < 0) throw new RangeError(`${name} must not be negative.`);
  return value;
}

function dropGeometry(radius, constants = OIL_CONSTANTS) {
  positive(radius, 'radius');
  const volume = 4 * Math.PI * radius ** 3 / 3;
  const mass = constants.oilDensity * volume;
  const drag = 6 * Math.PI * constants.viscosity * radius;
  const effectiveWeight = (constants.oilDensity - constants.airDensity) * volume * constants.g;
  const tau = mass / drag;
  for (const [name, value] of Object.entries({ volume, mass, drag, effectiveWeight, tau })) positive(value, name);
  return { radius, mass, volume, drag, effectiveWeight, tau };
}

function validateDrop(drop) {
  if (!drop || typeof drop !== 'object') throw new TypeError('A drop is required.');
  for (const name of ['radius', 'mass', 'volume', 'drag', 'effectiveWeight', 'tau']) positive(drop[name], `drop.${name}`);
  finite(drop.charge, 'drop.charge');
}

export function createDrop({ radius = 1.5e-6, charge = -10 * OIL_CONSTANTS.elementaryCharge } = {}) {
  finite(charge, 'charge');
  return { ...dropGeometry(radius), charge };
}

// A negative drop needs positive U to balance its effective weight.
export function equilibriumVoltage(drop) {
  validateDrop(drop);
  if (drop.charge === 0) throw new RangeError('An uncharged drop cannot be suspended by this electric field.');
  return -drop.effectiveWeight * OIL_CONSTANTS.gap / drop.charge;
}

export function forces(drop, voltage, velocity) {
  validateDrop(drop);
  finite(voltage, 'voltage');
  finite(velocity, 'velocity');
  const field = -voltage / OIL_CONSTANTS.gap;
  const electric = drop.charge * field;
  const gravity = -drop.mass * OIL_CONSTANTS.g;
  const buoyancy = OIL_CONSTANTS.airDensity * drop.volume * OIL_CONSTANTS.g;
  const drag = -drop.drag * velocity;
  const constantForce = electric - drop.effectiveWeight;
  const net = constantForce + drag;
  return {
    electric, gravity, buoyancy, drag, net,
    acceleration: net / drop.mass,
    field,
    terminalVelocity: constantForce / drop.drag,
  };
}

// Exact integration with voltage held constant over dt. Real micron-sized drops
// relax in tens of microseconds: explicit Euler at animation frame rates is
// unstable and would invent macroscopic inertia. expm1 and a short-time series
// also preserve displacement when dt is much shorter than the relaxation time.
export function advanceDrop({ y, v }, drop, voltage, dt) {
  finite(y, 'y');
  finite(v, 'v');
  nonnegative(dt, 'dt');
  const { terminalVelocity } = forces(drop, voltage, v);
  const x = dt / drop.tau;
  const response = -Math.expm1(-x);
  const displacementResponse = x < 1e-3
    ? x * x * (0.5 + x * (-1 / 6 + x * (1 / 24 + x * (-1 / 120 + x / 720))))
    : x + Math.expm1(-x);
  const nextV = x > 36 ? terminalVelocity : v + (terminalVelocity - v) * response;
  const nextY = x > 36
    ? y + terminalVelocity * dt + (v - terminalVelocity) * drop.tau * response
    : y + v * dt + (terminalVelocity - v) * drop.tau * displacementResponse;
  return { y: nextY, v: nextV, a: (terminalVelocity - nextV) / drop.tau };
}

// speed is the positive magnitude of the no-field, downward terminal velocity.
// Partial constants overrides are useful for comparing air/oil assumptions.
export function inferDropFromFallSpeed(speed, constants = OIL_CONSTANTS) {
  positive(speed, 'fall speed');
  if (!constants || typeof constants !== 'object') throw new TypeError('constants must be an object.');
  const c = { ...OIL_CONSTANTS, ...constants };
  positive(c.g, 'g');
  positive(c.viscosity, 'viscosity');
  positive(c.oilDensity, 'oilDensity');
  nonnegative(c.airDensity, 'airDensity');
  if (c.oilDensity <= c.airDensity) throw new RangeError('Oil density must exceed air density for a falling drop.');
  const radius = Math.sqrt(9 * c.viscosity * speed / (2 * (c.oilDensity - c.airDensity) * c.g));
  return dropGeometry(radius, c);
}

export function inferCharge(fallSpeed, suspensionVoltage) {
  finite(suspensionVoltage, 'suspension voltage');
  if (suspensionVoltage === 0) throw new RangeError('Suspension voltage must be nonzero.');
  const drop = inferDropFromFallSpeed(fallSpeed);
  return -drop.effectiveWeight * OIL_CONSTANTS.gap / suspensionVoltage;
}

// Capturing requires both position and near-zero speed. The caller accumulates
// the continuous hold duration, resetting it immediately on leaving this state.
export function insideCapture({ y, v }, target, tolerance, speedLimit) {
  finite(y, 'y');
  finite(v, 'v');
  finite(target, 'target');
  nonnegative(tolerance, 'tolerance');
  nonnegative(speedLimit, 'speed limit');
  return Math.abs(y - target) <= tolerance && Math.abs(v) <= speedLimit;
}
