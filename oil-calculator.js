const MAX_EXPRESSION_LENGTH = 512;
const MAX_TOKENS = 256;
const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const SUPERSCRIPTS = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

function finite(value) {
  if (!Number.isFinite(value)) throw new RangeError('数值超出可计算范围，请检查指数和运算。');
  return value;
}

function tokenize(expression) {
  if (typeof expression !== 'string' || !expression.trim()) {
    throw new SyntaxError('请先输入算式，例如 8.683e-14 × 0.003 ÷ 225.50。');
  }
  if (expression.length > MAX_EXPRESSION_LENGTH) throw new SyntaxError('算式太长，请分步计算。');
  const source = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index++;
      continue;
    }
    const match = source.slice(index).match(NUMBER);
    if (match) {
      tokens.push({ type: 'number', value: finite(Number(match[0])) });
      index += match[0].length;
    } else if ('+-*/^()'.includes(character)) {
      tokens.push({ type: character });
      index++;
    } else {
      throw new SyntaxError('仅支持数字、e 指数、加减乘除、乘方和括号；单位请留在算式外。');
    }
    if (tokens.length > MAX_TOKENS) throw new SyntaxError('算式太长，请分步计算。');
  }
  return tokens;
}

/** Parse arithmetic only: no identifiers, property access, or executable code. */
export function evaluateScientific(expression) {
  const tokens = tokenize(expression);
  let position = 0;
  const is = type => tokens[position]?.type === type;
  const consume = type => {
    if (!is(type)) return false;
    position++;
    return true;
  };

  function primary() {
    if (is('number')) return tokens[position++].value;
    if (consume('(')) {
      const value = sum();
      if (!consume(')')) throw new SyntaxError('括号没有配对，请补上右括号。');
      return value;
    }
    throw new SyntaxError('算式不完整，请检查数字、括号和运算符。');
  }

  function power() {
    const base = primary();
    // Parsing a unary exponent makes powers right-associative and allows 2^-3.
    return consume('^') ? finite(base ** unary()) : base;
  }

  function unary() {
    if (consume('+')) return unary();
    if (consume('-')) return -unary();
    return power();
  }

  function product() {
    let value = unary();
    while (is('*') || is('/')) {
      const operator = tokens[position++].type;
      const right = unary();
      if (operator === '/' && right === 0) throw new RangeError('除数不能为 0。');
      value = finite(operator === '*' ? value * right : value / right);
    }
    return value;
  }

  function sum() {
    let value = product();
    while (is('+') || is('-')) {
      const operator = tokens[position++].type;
      const right = product();
      value = finite(operator === '+' ? value + right : value - right);
    }
    return value;
  }

  const result = sum();
  if (position !== tokens.length) throw new SyntaxError('算式格式不正确；数字与括号之间也需要乘号。');
  return finite(result);
}

function exponential(value, digits) {
  if (typeof value !== 'number') throw new TypeError('请输入数值。');
  finite(value);
  if (!Number.isInteger(digits) || digits < 0 || digits > 15) {
    throw new RangeError('小数位数应为 0 至 15 的整数。');
  }
  return value.toExponential(digits);
}

/** Human-readable SI value; digits is the number of mantissa decimal places. */
export function formatScientific(value, digits = 4) {
  const [mantissa, exponent] = exponential(value, digits).split('e');
  const superscript = String(Number(exponent)).split('').map(character => SUPERSCRIPTS[character]).join('');
  return `${mantissa} × 10${superscript}`;
}

/** A scientific-notation string that the expression parser can read directly. */
export function scientificInput(value, digits = 5) {
  return exponential(value, digits);
}
