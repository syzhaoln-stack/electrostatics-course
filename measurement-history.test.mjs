import test from 'node:test';
import assert from 'node:assert/strict';
import { opticalLever, MEASUREMENT_SOURCES } from './measurement-history.js';

test('moving the screen doubles the reading without changing mirror or reflected-ray angle', () => {
  const near = opticalLever(.1, 2), far = opticalLever(.1, 4);
  assert.equal(far.thetaRadians, near.thetaRadians);
  assert.equal(far.reflectedDegrees, near.reflectedDegrees);
  assert.equal(far.shiftMetres, near.shiftMetres * 2);
  assert.ok(Math.abs(near.shiftMetres * 1000 - 6.981345363) < 1e-8);
});

test('zero, sign reversal, and nonlinear reflection geometry are preserved', () => {
  assert.equal(opticalLever(0, 3).shiftMetres, 0);
  assert.equal(opticalLever(-.4, 4).shiftMetres, -opticalLever(.4, 4).shiftMetres);
  const finiteAngle = opticalLever(10, 2);
  assert.ok(finiteAngle.shiftMetres > finiteAngle.smallAngleShiftMetres);
  assert.ok(Math.abs(finiteAngle.shiftMetres - 2 * Math.tan(Math.PI / 9)) < 1e-12);
});

test('invalid geometry is rejected, and historical attribution has an explicit research source', () => {
  for (const args of [[NaN,2],[0,-1],[45,2],[-45,2],[.1,Infinity]]) assert.throws(() => opticalLever(...args), RangeError);
  assert.match(MEASUREMENT_SOURCES.quote, /Luchs-2009\.pdf$/);
  assert.match(MEASUREMENT_SOURCES.manuscript, /density-of-the-earth/);
});
