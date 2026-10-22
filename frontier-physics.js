import {EPS0, K, ELEMENTARY_CHARGE} from './foundation-physics.js';

export {EPS0, ELEMENTARY_CHARGE};

// SI polarizability (C m²/V). This is an illustrative teaching parameter,
// not a fit to a paper's water droplet or a model of its flow/conductivity.
export const TEACHING_POLARIZABILITY = 1e-19;

function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number in SI units.`);
  }
  return value;
}

function positive(value, name) {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive.`);
  return value;
}

function nonnegative(value, name) {
  finite(value, name);
  if (value < 0) throw new RangeError(`${name} must be nonnegative.`);
  return value;
}

function finiteResult(result) {
  for (const value of Object.values(result)) {
    if (!Number.isFinite(value)) throw new RangeError('Parameters exceed the numerical range of this model.');
  }
  return result;
}

/**
 * A small, neutral, linearly polarizable body in an imposed field.
 * All inputs/outputs are SI: q in C, r in m, E in V/m, p in C m, F in N.
 * E, p and forceRadial use the outward source-to-probe direction as positive.
 * F = (alpha/2) grad(E²); source charge reversal leaves the inward force unchanged.
 * Uniform mode has an imposed signed field and zero translational force.
 * No droplet deformation, drag, charge transport or trajectory is simulated.
 * forceRatio is |F| relative to the stated nonzero point-field reference.
 */
export function polarizationReading({
  chargeC = 1e-9,
  distanceM = .02,
  alpha = TEACHING_POLARIZABILITY,
  mode = 'point',
  uniformFieldVPerM = 0,
  referenceChargeC = 1e-9,
  referenceDistanceM = .02,
  referenceAlpha = TEACHING_POLARIZABILITY,
} = {}) {
  finite(chargeC, 'chargeC');
  positive(distanceM, 'distanceM');
  nonnegative(alpha, 'alpha');
  finite(uniformFieldVPerM, 'uniformFieldVPerM');
  finite(referenceChargeC, 'referenceChargeC');
  if (referenceChargeC === 0) throw new RangeError('referenceChargeC must be nonzero.');
  positive(referenceDistanceM, 'referenceDistanceM');
  positive(referenceAlpha, 'referenceAlpha');
  if (mode !== 'point' && mode !== 'uniform') throw new RangeError('Unknown field mode.');

  const E = mode === 'uniform' ? uniformFieldVPerM : K * chargeC / distanceM ** 2;
  const p = alpha * E;
  const forceMagnitude = mode === 'uniform' ? 0 : 2 * alpha * E ** 2 / distanceM;
  const forceRadial = forceMagnitude === 0 ? 0 : -forceMagnitude;
  const referenceField = K * referenceChargeC / referenceDistanceM ** 2;
  const referenceForce = 2 * referenceAlpha * referenceField ** 2 / referenceDistanceM;
  if (!(referenceForce > 0) || !Number.isFinite(referenceForce)) {
    throw new RangeError('Reference force must be nonzero and finite.');
  }
  return finiteResult({E, p, forceRadial, forceMagnitude, forceRatio: forceMagnitude / referenceForce});
}

// Linear, lossless dielectric: w = epsilon0 K E²/2, in J/m³.
// This is stored energy; it is not recoverable energy or a breakdown prediction.
export function dielectricEnergyDensity(fieldVPerM, relativePermittivity) {
  finite(fieldVPerM, 'fieldVPerM');
  positive(relativePermittivity, 'relativePermittivity');
  const w = .5 * EPS0 * relativePermittivity * fieldVPerM ** 2;
  finiteResult({w});
  return w;
}

// Returns the nonnegative field magnitude in V/m for the requested J/m³.
export function dielectricFieldForEnergy(energyDensityJPerM3, relativePermittivity) {
  nonnegative(energyDensityJPerM3, 'energyDensityJPerM3');
  positive(relativePermittivity, 'relativePermittivity');
  const E = Math.sqrt(2 * energyDensityJPerM3 / (EPS0 * relativePermittivity));
  finiteResult({E});
  return E;
}

/**
 * Geometric gate-capacitor teaching model only (no graphene quantum capacitance,
 * band structure, transport, leakage or dielectric breakdown).
 * deltaVoltageV = V_gate - V_neutrality: positive delta V adds electrons.
 * carrierDensity is signed electron excess in m^-2 (negative = hole excess),
 * not signed electric charge. Graphene charge density therefore has opposite sign.
 * capacitancePerArea: F/m²; capacitance: F; field: signed field CHANGE in V/m
 * relative to the neutral reference (not an unknown built-in absolute field);
 * gateChargeDensity, grapheneChargeDensity: C/m²; carrierDensityCm2: cm^-2.
 */
export function grapheneGateReading({relativePermittivity, thicknessM, deltaVoltageV, areaM2 = 1}) {
  positive(relativePermittivity, 'relativePermittivity');
  positive(thicknessM, 'thicknessM');
  finite(deltaVoltageV, 'deltaVoltageV');
  positive(areaM2, 'areaM2');
  const capacitancePerArea = EPS0 * relativePermittivity / thicknessM;
  const capacitance = capacitancePerArea * areaM2;
  const field = deltaVoltageV / thicknessM;
  const gateChargeDensity = capacitancePerArea * deltaVoltageV;
  const grapheneChargeDensity = gateChargeDensity === 0 ? 0 : -gateChargeDensity;
  const carrierDensity = gateChargeDensity / ELEMENTARY_CHARGE;
  return finiteResult({
    capacitancePerArea, capacitance, field, gateChargeDensity,
    grapheneChargeDensity, carrierDensity, carrierDensityCm2: carrierDensity / 1e4,
  });
}
