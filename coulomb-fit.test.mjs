import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COULOMB_MEASUREMENTS, COULOMB_POWER_FIT, COULOMB_RELATIVE_SERIES, COULOMB_RELATIVE_FIT, COULOMB_FIT_DATA, COULOMB_FIT_TIMING, fitPowerLaw, fitRelativePowerLaw, coulombFitFrameAt, coulombReadoutVideoTime, coulombDisplayedTwistAt, coulombDisplayedSeparationAt, coulombMotionAt } from './coulomb-fit.js';
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
    assert.equal(coulombFitFrameAt(start + .19).phase, 'distance');
    assert.equal(coulombFitFrameAt(start + .21).phase, 'twist');
    assert.equal(coulombFitFrameAt(start + 9.59).phase, 'twist');
    assert.equal(coulombFitFrameAt(start + 9.61).phase, 'force');
    assert.equal(coulombFitFrameAt(start + 10.39).visibleCount, i);
    assert.equal(coulombFitFrameAt(start + 10.41).visibleCount, i + 1);
    assert.equal(coulombFitFrameAt(start + 10.41).curveProgress, 0);
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

const MOTION = JSON.parse(readFileSync(new URL('./media/lesson-dialogues/coulomb-motion-v37.json', import.meta.url), 'utf8'));

test('web numbers use the exact encoded video frame, even between its 24 fps timestamps', () => {
  assert.deepEqual(MOTION.timing, COULOMB_FIT_TIMING);
  assert.equal(coulombDisplayedTwistAt(0), null);
  assert.equal(coulombDisplayedSeparationAt(0), null);
  for (let encodedFrame = 0; encodedFrame < 936; encodedFrame++) {
    for (const fraction of [0, .49, .99]) {
      const seconds = (encodedFrame + fraction) / 24;
      const pose = coulombMotionAt(seconds), frameTime = encodedFrame / 24;
      const frame = coulombFitFrameAt(frameTime), track = MOTION.trials[frame.recordIndex];
      const local = frameTime - .4 - frame.recordIndex * 12;
      const u = frame.phase === 'fit' ? 1 : Math.max(0, Math.min(1, (local - .2) / 9.4));
      const index = Math.round(u * (track.samples.length - 1));
      const expected = track.samples[index];
      assert.equal(pose.sampleIndex, index);
      close(pose.videoFrameTime, frameTime);
      close(pose.simulationTime, expected[0]);
      close(pose.twistDegrees, expected[1]);
      close(pose.separationDegrees, expected[2]);
      close(pose.sourceDegrees, expected[3]);
      close(pose.twistDegrees - pose.sourceDegrees, pose.separationDegrees, 1e-8);
      if (seconds >= .4) {
        close(coulombDisplayedTwistAt(seconds), expected[1]);
        close(coulombDisplayedSeparationAt(seconds), expected[2]);
      }
    }
  }
  assert.throws(() => coulombMotionAt(NaN), RangeError);
});

test('sphere separation narrows on approach and then grows while the source pauses: the spheres do not travel as a rigid pair', () => {
  for (const track of MOTION.trials) {
    let narrowing = 0, passiveRecoil = 0;
    for (let i = 1; i < track.samples.length; i++) {
      const a = track.samples[i - 1], b = track.samples[i];
      assert.ok(b[3] >= a[3] - 1e-7, 'the source advances toward its target');
      if (b[2] < a[2] - .05) narrowing++;
      if (Math.abs(b[3] - a[3]) < 1e-6 && b[2] > a[2] + .05 && b[1] > a[1]) passiveRecoil++;
    }
    assert.ok(narrowing > 0, 'the source must first reduce the gap');
    assert.ok(passiveRecoil > 0, 'the needle must retreat while the source is held');
  }
});

test('points and relative force appear only after the simulated needle has settled to the historical endpoints', () => {
  for (let trial = 0; trial < 3; trial++) {
    const start = .4 + trial * 12;
    assert.equal(coulombFitFrameAt(start + 9.59).phase, 'twist');
    assert.equal(coulombFitFrameAt(start + 9.61).phase, 'force');
    assert.equal(coulombFitFrameAt(start + 10.39).visibleCount, trial);
    assert.equal(coulombFitFrameAt(start + 10.41).visibleCount, trial + 1);
    const settled = coulombMotionAt(start + 9.61);
    assert.ok(Math.abs(settled.twistDegrees - [36, 144, 575.5][trial]) < .01);
    assert.ok(Math.abs(settled.separationDegrees - [36, 18, 8.5][trial]) < .01);
    assert.ok(Math.abs(settled.speedDegreesPerSecond) < .01);
    assert.equal(settled.sampleIndex, MOTION.trials[trial].samples.length - 1);
    const beforePoint = coulombMotionAt(start + 10.39), afterPoint = coulombMotionAt(start + 10.41);
    assert.equal(beforePoint.sampleIndex, afterPoint.sampleIndex);
    assert.equal(Number(settled.twistDegrees.toFixed(1)), [36, 144, 575.5][trial]);
    assert.equal(Number(settled.separationDegrees.toFixed(1)), [36, 18, 8.5][trial]);
  }
  assert.equal(Number(coulombDisplayedTwistAt(39).toFixed(1)), 575.5);
  assert.equal(Number(coulombDisplayedSeparationAt(39).toFixed(1)), 8.5);
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
