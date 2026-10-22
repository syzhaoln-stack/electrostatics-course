import test from 'node:test';
import assert from 'node:assert/strict';
import {
  polarizationReading, TEACHING_POLARIZABILITY,
  dielectricEnergyDensity, dielectricFieldForEnergy, grapheneGateReading,
} from './frontier-physics.js';

// Relative comparisons stay meaningful for tiny dipole moments and charges.
const near = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Number.isFinite(actual));
  const scale = Math.max(Math.abs(expected), Number.MIN_VALUE);
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${actual} != ${expected}`);
};

test('neutral polarization reverses its dipole but not its attraction when the source changes sign', () => {
  const a = polarizationReading({chargeC: 1e-9, distanceM: .02});
  const b = polarizationReading({chargeC: -1e-9, distanceM: .02});
  assert.equal(b.E, -a.E);
  assert.equal(b.p, -a.p);
  assert.equal(b.forceRadial, a.forceRadial);
  assert.ok(a.forceRadial < 0);
  near(a.forceRatio, 1);
});

test('polarization force obeys independent source, distance and material scaling', () => {
  const base = polarizationReading();
  near(polarizationReading({chargeC: 2e-9}).forceMagnitude, 4 * base.forceMagnitude);
  near(polarizationReading({distanceM: .04}).forceMagnitude, base.forceMagnitude / 32);
  near(polarizationReading({alpha: 3 * TEACHING_POLARIZABILITY}).forceMagnitude, 3 * base.forceMagnitude);
  near(polarizationReading({distanceM: .04}).forceRatio, 1 / 32);
});

test('point-field force agrees with a numerical gradient of induced-dipole energy', () => {
  // Independent electrostatic energy U=-alpha E²/2; use a finite difference.
  const r = .031, step = 1e-7, q = -2e-9, alpha = 2e-19;
  const k = 1 / (4 * Math.PI * 8.8541878128e-12);
  const energy = d => -.5 * alpha * (k * q / d ** 2) ** 2;
  const gradientForce = -(energy(r + step) - energy(r - step)) / (2 * step);
  near(polarizationReading({chargeC: q, distanceM: r, alpha}).forceRadial, gradientForce, 2e-9);
});

test('zero charge and zero polarizability give zero force, while uniform field may retain a dipole', () => {
  assert.deepEqual(polarizationReading({chargeC: 0}), {E: 0, p: 0, forceRadial: 0, forceMagnitude: 0, forceRatio: 0});
  const inert = polarizationReading({alpha: 0});
  assert.ok(inert.E > 0);
  assert.equal(inert.p, 0);
  assert.equal(inert.forceRadial, 0);
  const uniform = polarizationReading({mode: 'uniform', uniformFieldVPerM: -1500});
  assert.equal(uniform.E, -1500);
  near(uniform.p, -1500 * TEACHING_POLARIZABILITY);
  assert.equal(uniform.forceRadial, 0);
  assert.equal(uniform.forceRatio, 0);
});

test('normalization explicitly follows the selected reference, not the current source', () => {
  near(polarizationReading({referenceChargeC: -2e-9}).forceRatio, .25);
  near(polarizationReading({referenceDistanceM: .04}).forceRatio, 32);
  near(polarizationReading({referenceAlpha: 2 * TEACHING_POLARIZABILITY}).forceRatio, .5);
});

test('fixed energy and fixed field dielectric comparisons obey different scaling', () => {
  const w = 1e6, E = dielectricFieldForEnergy(w, 4);
  near(dielectricFieldForEnergy(w, 16), E / 2);
  near(dielectricFieldForEnergy(4 * w, 4), 2 * E);
  near(dielectricEnergyDensity(E, 16), 4 * w);
  near(dielectricEnergyDensity(-E, 4), w);
  assert.equal(dielectricFieldForEnergy(0, 4), 0);
  assert.equal(dielectricEnergyDensity(0, 4), 0);
});

test('dielectric SI values convert correctly between MV/m, J/cm³ and J/m³', () => {
  // 100 MV/m and K=10 give 442709.39064 J/m³ = .44270939064 J/cm³.
  const energy = dielectricEnergyDensity(100 * 1e6, 10);
  near(energy / 1e6, .44270939064);
  near(dielectricFieldForEnergy(.44270939064 * 1e6, 10) / 1e6, 100);
});

const gate = {relativePermittivity: 3.9, thicknessM: 300e-9, deltaVoltageV: 10, areaM2: 1e-8};
test('geometric graphene gate matches a 300 nm oxide capacitance and carrier benchmark', () => {
  const result = grapheneGateReading(gate);
  near(result.capacitancePerArea, 1.151044415664e-4);
  near(result.capacitance, 1.151044415664e-12);
  near(result.carrierDensityCm2, 7.184254165474242e11, 1e-10);
  near(result.carrierDensity, result.carrierDensityCm2 * 1e4);
  near(result.field, 10 / 300e-9);
  assert.equal(result.grapheneChargeDensity, -result.gateChargeDensity);
});

test('gate voltage reversal changes signed electron excess and sheet charge, not capacitance', () => {
  const positive = grapheneGateReading(gate);
  const negative = grapheneGateReading({...gate, deltaVoltageV: -10});
  assert.equal(negative.capacitance, positive.capacitance);
  assert.equal(negative.carrierDensity, -positive.carrierDensity);
  assert.equal(negative.grapheneChargeDensity, -positive.grapheneChargeDensity);
  assert.ok(positive.grapheneChargeDensity < 0);
  const neutral = grapheneGateReading({...gate, deltaVoltageV: 0});
  assert.equal(neutral.carrierDensity, 0);
  assert.equal(neutral.grapheneChargeDensity, 0);
});

test('gate geometry separates total capacitance from carrier density per unit area', () => {
  const base = grapheneGateReading(gate);
  const area = grapheneGateReading({...gate, areaM2: 4 * gate.areaM2});
  near(area.capacitance, 4 * base.capacitance);
  assert.equal(area.carrierDensity, base.carrierDensity);
  near(grapheneGateReading({...gate, thicknessM: 2 * gate.thicknessM}).carrierDensity, base.carrierDensity / 2);
  near(grapheneGateReading({...gate, relativePermittivity: 2 * gate.relativePermittivity}).carrierDensity, 2 * base.carrierDensity);
});

test('invalid physical inputs and non-finite values are rejected instead of silently coerced', () => {
  for (const args of [
    {chargeC: NaN}, {chargeC: '1e-9'}, {distanceM: 0}, {distanceM: -1},
    {distanceM: Infinity}, {alpha: -1}, {alpha: NaN}, {mode: 'other'},
    {uniformFieldVPerM: Infinity}, {referenceChargeC: 0}, {referenceAlpha: 0}, {referenceDistanceM: 0},
  ]) assert.throws(() => polarizationReading(args));
  assert.throws(() => dielectricFieldForEnergy(-1, 2), RangeError);
  assert.throws(() => dielectricFieldForEnergy(1, 0), RangeError);
  assert.throws(() => dielectricEnergyDensity(Infinity, 2), TypeError);
  assert.throws(() => dielectricEnergyDensity(1, -2), RangeError);
  for (const patch of [{thicknessM: 0}, {relativePermittivity: 0}, {areaM2: -1}, {deltaVoltageV: NaN}, {deltaVoltageV: '10'}]) {
    assert.throws(() => grapheneGateReading({...gate, ...patch}));
  }
});
