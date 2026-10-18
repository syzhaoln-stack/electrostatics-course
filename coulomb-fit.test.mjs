import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COULOMB_MEASUREMENTS, COULOMB_POWER_FIT, COULOMB_RELATIVE_SERIES, COULOMB_RELATIVE_FIT, COULOMB_FIT_DATA, COULOMB_FIT_TIMING, fitPowerLaw, fitRelativePowerLaw, coulombFitFrameAt, coulombReadoutVideoTime, coulombDisplayedTwistAt, coulombDisplayedSeparationAt } from './coulomb-fit.js';
const close = (actual, expected, relative = 1e-10) => assert.ok(Math.abs(actual - expected) <= relative * Math.max(Math.abs(expected), 1e-12), `${actual} != ${expected}`);

test('SI force follows the independent full-turn grain-weight calibration, not an inverse-square assumption', () => {
  for (const point of COULOMB_MEASUREMENTS) {
    const radians = point.alphaDegrees * Math.PI / 180;
    close(point.distanceCm, 2 * 10.8 * Math.sin(radians / 2));
    // R cancels: weight of 1/340 grain × fraction of a full turn ÷ cos(alpha/2).
    const independentMicroN = .000053 * 9.80665 / 340 * (point.twistDegrees / 360) / Math.cos(radians / 2) * 1e6;
    close(point.forceMicroN, independentMicroN);
    close(point.forceMicroN * 1e-6 * point.effectiveArmCm / 100, point.torqueNm);
  }
  close(COULOMB_MEASUREMENTS[0].constantArmForceMicroN, .000053 * 9.80665 / 3400 * 1e6);
});

test('the third observation retains 575.5 degrees while preserving the memoir rounded 576', () => {
  const point = COULOMB_MEASUREMENTS[2];
  assert.equal(point.twistDegrees, 575.5); assert.equal(point.reportedTwistDegrees, 576);
  for (const p of COULOMB_MEASUREMENTS) assert.equal(p.lowerSignedDegrees - p.upperSignedDegrees, p.twistDegrees);
  assert.ok(COULOMB_MEASUREMENTS.every(p => Object.isFrozen(p)));
});

test('geometry corrections have the right sign and become smaller at small separation', () => {
  const relativeDistance = COULOMB_MEASUREMENTS.map(p => (p.arcDistanceCm - p.distanceCm) / p.arcDistanceCm);
  const relativeForce = COULOMB_MEASUREMENTS.map(p => p.forceMicroN / p.constantArmForceMicroN - 1);
  assert.ok(relativeDistance.every(v => v > 0)); assert.ok(relativeForce.every(v => v > 0));
  assert.ok(relativeDistance[0] > relativeDistance[1] && relativeDistance[1] > relativeDistance[2]);
  assert.ok(relativeForce[0] > relativeForce[1] && relativeForce[1] > relativeForce[2]);
  close(COULOMB_MEASUREMENTS[2].distanceCm, 1.6007433882206237);
  close(COULOMB_MEASUREMENTS[2].forceMicroN, 2.4505091571743103);
});

test('regression recovers a known noninteger power and does not force the historical exponent to two', () => {
  const generated = [1, 2, 4, 7].map(distanceCm => ({ distanceCm, forceMicroN: 5.2 / distanceCm ** 1.7 }));
  const known = fitPowerLaw(generated); close(known.exponent, 1.7); close(known.coefficient, 5.2);
  close(COULOMB_POWER_FIT.exponent, 1.9068700288885376);
  close(COULOMB_POWER_FIT.coefficient, 6.105479553598873);
  assert.ok(COULOMB_POWER_FIT.relativeResiduals.every(v => Math.abs(v) > .01));
  assert.ok(COULOMB_POWER_FIT.relativeResiduals[0] < 0 && COULOMB_POWER_FIT.relativeResiduals[1] > 0 && COULOMB_POWER_FIT.relativeResiduals[2] < 0);
  assert.equal(COULOMB_FIT_DATA.fit.method, 'unweighted-log-least-squares');
});

test('regression rejects invalid and degenerate data instead of producing a misleading curve', () => {
  const p = { distanceCm: 1, forceMicroN: 2 };
  for (const points of [[], [p], [p, p], [p, { distanceCm: 0, forceMicroN: 2 }], [p, { distanceCm: 2, forceMicroN: -1 }], [p, { distanceCm: NaN, forceMicroN: 3 }]]) assert.throws(() => fitPowerLaw(points), RangeError);
});

test('timeline shows each conversion before its point, then fits only after all three observations', () => {
  assert.equal(coulombFitFrameAt(0).phase, 'ready');
  for (let i = 0; i < 3; i++) {
    const start = .4 + i * 12;
    assert.equal(coulombFitFrameAt(start + .01).phase, 'distance');
    assert.equal(coulombFitFrameAt(start + 1.79).phase, 'distance');
    assert.equal(coulombFitFrameAt(start + 1.81).phase, 'twist');
    assert.equal(coulombFitFrameAt(start + 8.19).phase, 'twist');
    assert.equal(coulombFitFrameAt(start + 8.21).phase, 'force');
    assert.equal(coulombFitFrameAt(start + 9.79).visibleCount, i);
    assert.equal(coulombFitFrameAt(start + 9.81).visibleCount, i + 1);
    assert.equal(coulombFitFrameAt(start + 9.81).curveProgress, 0);
  }
  assert.equal(coulombFitFrameAt(36.4).visibleCount, 3);
  assert.equal(coulombFitFrameAt(36.4).phase, 'fit');
  assert.equal(coulombFitFrameAt(39).curveProgress, 1);
  assert.equal(coulombFitFrameAt(100).time, COULOMB_FIT_TIMING.duration);
  assert.equal(coulombFitFrameAt(-10).time, 0);
  assert.throws(() => coulombFitFrameAt(NaN), RangeError);
});

test('video JSON and web component use exactly the same measurements, fit and timing', () => {
  const saved = JSON.parse(readFileSync(new URL('./coulomb-fit-data.json', import.meta.url), 'utf8'));
  assert.deepEqual(saved, { ...COULOMB_FIT_DATA, timelineSeconds: COULOMB_FIT_TIMING });
});

test('video seeking uses the same seconds and clamps to an actual final frame without wrapping or auto-restarting', () => {
  for (const seconds of [0, .4, 8.6, 12.399, 20.6, 24.399, 32.6, 36.399]) nearTime(seconds);
  function nearTime(seconds) { close(coulombReadoutVideoTime(seconds, 39), seconds); }
  close(coulombReadoutVideoTime(39), 38.999);
  close(coulombReadoutVideoTime(39, 39), 38.999);
  close(coulombReadoutVideoTime(39, 38.95), 38.949);
  close(coulombReadoutVideoTime(4, NaN), 4);
  assert.equal(coulombReadoutVideoTime(-1, 39), 0);
  assert.throws(() => coulombReadoutVideoTime(NaN, 39), RangeError);
});

test('displayed torsion holds during source approach, then accumulates from the previous observation as both balls turn', () => {
  assert.equal(coulombDisplayedTwistAt(0), null);
  for (let index = 0; index < 3; index++) {
    const start = .4 + index * 12, total = COULOMB_MEASUREMENTS[index].twistDegrees;
    const prior = index === 0 ? 0 : COULOMB_MEASUREMENTS[index - 1].twistDegrees;
    const increment = total - prior;
    assert.equal(coulombDisplayedTwistAt(start + 1.79), null);
    for (const local of [1.800001, 2, 2.5, 2.999999]) assert.equal(coulombDisplayedTwistAt(start + local), prior);
    close(coulombDisplayedTwistAt(start + 4.3), prior + increment * .15625);
    close(coulombDisplayedTwistAt(start + 5.6), prior + increment / 2);
    close(coulombDisplayedTwistAt(start + 6.9), prior + increment * .84375);
    close(coulombDisplayedTwistAt(start + 8.201), total);
    close(coulombDisplayedTwistAt(start + 11.9), total);
    let previous = prior;
    for (let time = start + 1.800001; time < start + 8.2; time += .03) {
      const value = coulombDisplayedTwistAt(time);
      assert.ok(value >= previous && value <= total); previous = value;
    }
  }
  assert.equal(coulombDisplayedTwistAt(39), 575.5);
});

test('passive equivalent has distinct cumulative twist and inter-ball gap at each endpoint', () => {
  for (let index = 0; index < 3; index++) {
    const point = COULOMB_MEASUREMENTS[index];
    const cumulativeTwist = coulombDisplayedTwistAt(.4 + index * 12 + 8.201);
    // In the top-fixed equivalent the source follows to beta, while the moving
    // sphere reaches alpha + beta; their difference remains the observed gap.
    close(cumulativeTwist - point.betaMagnitudeDegrees, point.alphaDegrees);
    if (index > 0) assert.notEqual(cumulativeTwist, point.alphaDegrees);
  }
});

test('displayed separation matches the source approach and stays fixed while the spheres turn together', () => {
  assert.equal(coulombDisplayedSeparationAt(0), null);
  assert.equal(coulombDisplayedSeparationAt(.399999), null);
  for (let index = 0; index < 3; index++) {
    const start = .4 + index * 12, prior = [72, 36, 18][index];
    const target = COULOMB_MEASUREMENTS[index].alphaDegrees, change = target - prior;
    for (const local of [.000001, 1, 1.799999]) assert.equal(coulombDisplayedSeparationAt(start + local), prior);
    close(coulombDisplayedSeparationAt(start + 2.1), prior + change * .15625);
    close(coulombDisplayedSeparationAt(start + 2.4), prior + change / 2);
    close(coulombDisplayedSeparationAt(start + 2.7), prior + change * .84375);
    for (const local of [3.000001, 5.6, 8.2, 9.8, 11.999]) close(coulombDisplayedSeparationAt(start + local), target);
    let previous = prior;
    for (let local = 1.8; local <= 3; local += .01) {
      const value = coulombDisplayedSeparationAt(start + local);
      assert.ok(value <= previous + 1e-12 && value >= target); previous = value;
    }
    close(coulombDisplayedSeparationAt(start + 11.999) / 36, COULOMB_RELATIVE_SERIES[index].distanceRatio);
  }
  for (const boundary of [12.4, 24.4, 36.4]) close(coulombDisplayedSeparationAt(boundary - .000001), coulombDisplayedSeparationAt(boundary + .000001));
  assert.equal(coulombDisplayedSeparationAt(39), 8.5);
  assert.throws(() => coulombDisplayedSeparationAt(NaN), RangeError);
});

test('memoir comparison normalizes angle and constant-arm force, keeping 8.5 degrees and 575.5 degrees unaltered', () => {
  assert.deepEqual(COULOMB_RELATIVE_SERIES.map(p => p.forceLabel), ['1倍', '4倍', '约16倍']);
  assert.equal(COULOMB_RELATIVE_SERIES[0].distanceRatio, 1);
  assert.equal(COULOMB_RELATIVE_SERIES[0].forceRatio, 1);
  assert.equal(COULOMB_RELATIVE_SERIES[1].distanceRatio, .5);
  assert.equal(COULOMB_RELATIVE_SERIES[1].forceRatio, 4);
  assert.equal(COULOMB_RELATIVE_SERIES[2].alphaDegrees, 8.5);
  close(COULOMB_RELATIVE_SERIES[2].distanceRatio, 8.5 / 36);
  close(COULOMB_RELATIVE_SERIES[2].forceRatio, 575.5 / 36);
  assert.notEqual(COULOMB_RELATIVE_SERIES[2].distanceRatio, .25);
  assert.notEqual(COULOMB_RELATIVE_SERIES[2].forceRatio, 16);
  for (let i = 0; i < 3; i++) {
    close(COULOMB_RELATIVE_SERIES[i].distanceRatio, COULOMB_MEASUREMENTS[i].arcDistanceCm / COULOMB_MEASUREMENTS[0].arcDistanceCm);
    close(COULOMB_RELATIVE_SERIES[i].forceRatio, COULOMB_MEASUREMENTS[i].constantArmForceMicroN / COULOMB_MEASUREMENTS[0].constantArmForceMicroN);
    assert.ok(Object.isFrozen(COULOMB_RELATIVE_SERIES[i]));
  }
  assert.notEqual(COULOMB_RELATIVE_SERIES[1].forceRatio, COULOMB_MEASUREMENTS[1].forceMicroN / COULOMB_MEASUREMENTS[0].forceMicroN);
});

test('relative fit uses the relative observations, while the independent SI geometry fit remains available', () => {
  close(COULOMB_RELATIVE_FIT.exponent, 1.9191905142294352);
  close(COULOMB_RELATIVE_FIT.coefficient, 1.0193421088025427);
  assert.notEqual(COULOMB_RELATIVE_FIT.exponent, COULOMB_POWER_FIT.exponent);
  const reference = fitRelativePowerLaw([{ distanceRatio: 1, forceRatio: 1 }, { distanceRatio: .5, forceRatio: 4 }, { distanceRatio: .25, forceRatio: 16 }]);
  close(reference.exponent, 2); close(reference.coefficient, 1);
  assert.ok(COULOMB_RELATIVE_FIT.relativeResiduals.every(value => Math.abs(value) > .01));
  assert.equal(COULOMB_FIT_DATA.relativeComparison.points, COULOMB_RELATIVE_SERIES);
  assert.equal(COULOMB_FIT_DATA.points, COULOMB_MEASUREMENTS);
  assert.throws(() => fitRelativePowerLaw([{ distanceRatio: 0, forceRatio: 1 }, { distanceRatio: 1, forceRatio: 2 }]), RangeError);
});
