import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateScientific, formatScientific, scientificInput } from './oil-calculator.js';

function close(actual, expected, relative = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * relative,
    `${actual} should be close to ${expected}`);
}

test('oil-drop suspension calculation uses SI values without a charge-unit conversion', () => {
  const q = evaluateScientific('8.683e-14 × 0.003 ÷ 225.50');
  close(q, 1.1551662971175166e-18);
  assert.ok(q > 0);
  assert.equal(formatScientific(q), '1.1552 × 10⁻¹⁸');
  assert.equal(scientificInput(q), '1.15517e-18');
  close(evaluateScientific(scientificInput(q)), q, 5e-6);
  close(evaluateScientific('0.8683 × 10^−13 × 0.003 / 225.50'), q);
});

test('multiplication, grouping, division and unary signs have mathematical precedence', () => {
  for (const [expression, expected] of [
    ['2 + 3 * 4', 14], ['(2 + 3) * 4', 20], ['12 / 3 * 2', 8],
    ['12 / (3 * 2)', 2], ['-2^2', -4], ['(-2)^2', 4], ['2^-3', 0.125],
    ['2^3^2', 512], ['2^-3^2', 1 / 512], ['9^.5', 3], ['--2 + +3', 5],
    ['3 - -2', 5], ['2 × (3 − 1) ÷ .5', 8], ['.5 + 1. + 2E+1', 21.5],
  ]) assert.equal(evaluateScientific(expression), expected, expression);
});

test('charge-scale results and scientific exponents remain nonzero and finite', () => {
  close(evaluateScientific('1.602176634e-19 * 7'), 1.1215236438e-18);
  close(evaluateScientific(' 8.683E−14\n * 3e-3 / 2.255e2 '), 1.1551662971175166e-18);
  assert.equal(evaluateScientific('1e-150 * 1e-150'), 1e-300);
  assert.equal(evaluateScientific('0'), 0);
  assert.equal(evaluateScientific('3e2 / 3e2 - 1'), 0);
});

test('malformed notation, unsupported syntax and executable input are rejected', () => {
  for (const expression of [
    '', '   ', '1e', '1e-', '1..2', '.', '2 3', '2(3)', '()', '(2+3', '2+3)',
    '2+', '*2', '2**3', '1,000', '2e− 3', '1e-3 C', 'NaN', 'Infinity',
    'Math.random()', 'globalThis.secret', 'process.exit()', 'alert(1)',
    '1; throw 1', '1/*comment*/+2', 'constructor.constructor("return 1")()',
    '0x10', '2n', '[1]', '{a:1}', '=2+3',
  ]) assert.throws(() => evaluateScientific(expression), SyntaxError, expression);
  assert.throws(() => evaluateScientific(null), SyntaxError);
  assert.throws(() => evaluateScientific(2), SyntaxError);
});

test('zero divisors, overflow and non-real results produce useful errors', () => {
  for (const expression of ['1/0', '1/-0', '0/0', '1/(2-2)']) {
    assert.throws(() => evaluateScientific(expression), /除数不能为 0/, expression);
  }
  for (const expression of ['1e309', '1e308*10', '10^1000', '(-1)^.5', '0^-1']) {
    assert.throws(() => evaluateScientific(expression), RangeError, expression);
  }
});

test('bounded expressions reject excessive size and depth before recursion', () => {
  assert.throws(() => evaluateScientific('1'.repeat(513)), /算式太长/);
  assert.throws(() => evaluateScientific('('.repeat(128) + '1' + ')'.repeat(128)), /算式太长/);
  assert.equal(evaluateScientific('('.repeat(40) + '2' + ')'.repeat(40)), 2);
});

test('scientific formatting covers positive powers, negatives, zero and precision', () => {
  assert.equal(formatScientific(0.003), '3.0000 × 10⁻³');
  assert.equal(formatScientific(225.5, 3), '2.255 × 10²');
  assert.equal(formatScientific(-1.6e-19, 1), '-1.6 × 10⁻¹⁹');
  assert.equal(formatScientific(0), '0.0000 × 10⁰');
  assert.equal(formatScientific(9999.99, 2), '1.00 × 10⁴');
  assert.equal(scientificInput(225.5, 3), '2.255e+2');
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.throws(() => formatScientific(invalid), RangeError);
    assert.throws(() => scientificInput(invalid), RangeError);
  }
  assert.throws(() => formatScientific('1e-19'), TypeError);
  assert.throws(() => formatScientific(1, -1), RangeError);
  assert.throws(() => scientificInput(1, 1.5), RangeError);
});
