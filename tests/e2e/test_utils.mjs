import { performance } from 'perf_hooks';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m\x1b[37m',
  bgGreen: '\x1b[42m\x1b[30m',
};

class TestContext {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalChecks = 0;
    this.passedChecks = 0;
    this.failedChecks = 0;
    this.skippedChecks = 0;
    this.failures = [];
    this.startTime = 0;
    this.endTime = 0;
  }

  reset() {
    this.suites = [];
    this.currentSuite = null;
    this.totalChecks = 0;
    this.passedChecks = 0;
    this.failedChecks = 0;
    this.skippedChecks = 0;
    this.failures = [];
    this.startTime = performance.now();
    this.endTime = 0;
  }
}

export const testContext = new TestContext();

export function describe(suiteName, fn) {
  const suite = {
    name: suiteName,
    tests: [],
    passed: 0,
    failed: 0,
    durationMs: 0,
  };

  const prevSuite = testContext.currentSuite;
  testContext.currentSuite = suite;
  testContext.suites.push(suite);

  const start = performance.now();
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      throw new Error(`Async describe is not supported. Use async inside it() instead in suite: ${suiteName}`);
    }
  } finally {
    suite.durationMs = performance.now() - start;
    testContext.currentSuite = prevSuite;
  }
}

export async function it(testName, fn) {
  const currentSuite = testContext.currentSuite || {
    name: 'Default Suite',
    tests: [],
    passed: 0,
    failed: 0,
    durationMs: 0,
  };
  if (!testContext.currentSuite) {
    testContext.suites.push(currentSuite);
    testContext.currentSuite = currentSuite;
  }

  testContext.totalChecks++;
  const testEntry = {
    name: testName,
    passed: false,
    durationMs: 0,
    error: null,
  };

  const start = performance.now();
  try {
    if (fn) {
      const res = fn();
      if (res && typeof res.then === 'function') {
        await res;
      }
    }
    testEntry.passed = true;
    testEntry.durationMs = performance.now() - start;
    currentSuite.passed++;
    testContext.passedChecks++;
  } catch (err) {
    testEntry.passed = false;
    testEntry.durationMs = performance.now() - start;
    testEntry.error = err;
    currentSuite.failed++;
    testContext.failedChecks++;
    testContext.failures.push({
      suite: currentSuite.name,
      test: testName,
      error: err,
    });
  }

  currentSuite.tests.push(testEntry);
}

export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

export function expect(actual) {
  const matchers = (isNot = false) => ({
    toBe(expected) {
      const pass = actual === expected;
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`,
        );
      }
    },
    toEqual(expected) {
      const pass = deepEqual(actual, expected);
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to equal' : 'to equal'} ${JSON.stringify(expected)}`,
        );
      }
    },
    toBeTruthy() {
      const pass = Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be truthy' : 'to be truthy'}`);
      }
    },
    toBeFalsy() {
      const pass = !actual;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be falsy' : 'to be falsy'}`);
      }
    },
    toBeNull() {
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be null' : 'to be null'}`);
      }
    },
    toBeUndefined() {
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be undefined' : 'to be undefined'}`);
      }
    },
    toBeDefined() {
      const pass = actual !== undefined;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be defined' : 'to be defined'}`);
      }
    },
    toBeGreaterThan(expected) {
      const pass = actual > expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT to be >' : 'to be >'} ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      const pass = actual >= expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT to be >=' : 'to be >='} ${expected}`);
      }
    },
    toBeLessThan(expected) {
      const pass = actual < expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT to be <' : 'to be <'} ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      const pass = actual <= expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT to be <=' : 'to be <='} ${expected}`);
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      const pass = diff < tolerance;
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${actual} ${isNot ? 'NOT to be close to' : 'to be close to'} ${expected} (precision ${precision}, diff ${diff})`,
        );
      }
    },
    toContain(item) {
      let pass = false;
      if (typeof actual === 'string') {
        pass = actual.includes(item);
      } else if (Array.isArray(actual)) {
        pass = actual.some((x) => deepEqual(x, item));
      } else if (actual instanceof Set || actual instanceof Map) {
        pass = actual.has(item);
      }
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to contain' : 'to contain'} ${JSON.stringify(item)}`,
        );
      }
    },
    toMatch(regex) {
      const r = typeof regex === 'string' ? new RegExp(regex) : regex;
      const pass = r.test(String(actual));
      if (isNot ? pass : !pass) {
        throw new Error(`Expected "${actual}" ${isNot ? 'NOT to match' : 'to match'} ${r}`);
      }
    },
    toHaveLength(length) {
      const pass = actual && actual.length === length;
      if (isNot ? pass : !pass) {
        const actualLength = actual ? actual.length : undefined;
        throw new Error(
          `Expected length ${isNot ? 'NOT to be' : 'to be'} ${length}, got ${actualLength}`,
        );
      }
    },
    toThrow(expected) {
      if (typeof actual !== 'function') {
        throw new Error('Expected target to be a function in toThrow assertion');
      }
      let threw = false;
      let errorThrown = null;
      try {
        actual();
      } catch (e) {
        threw = true;
        errorThrown = e;
      }
      let pass = threw;
      if (pass && expected) {
        if (expected instanceof RegExp) {
          pass = expected.test(errorThrown.message);
        } else if (typeof expected === 'string') {
          pass = errorThrown.message.includes(expected);
        }
      }
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected function ${isNot ? 'NOT to throw' : 'to throw'} ${expected || 'error'}, but ${threw ? `it threw: ${errorThrown.message}` : 'it did not throw'}`,
        );
      }
    },
  });

  const obj = matchers(false);
  obj.not = matchers(true);
  return obj;
}

export function printSuiteResults(suite) {
  const icon = suite.failed === 0 ? `${c.green}✔${c.reset}` : `${c.red}✖${c.reset}`;
  console.log(`\n  ${icon} ${c.bold}${suite.name}${c.reset} ${c.dim}(${suite.passed}/${suite.tests.length} passed, ${suite.durationMs.toFixed(1)}ms)${c.reset}`);

  for (const t of suite.tests) {
    if (t.passed) {
      console.log(`    ${c.green}•${c.reset} ${c.gray}${t.name}${c.reset} ${c.dim}(${t.durationMs.toFixed(1)}ms)${c.reset}`);
    } else {
      console.log(`    ${c.red}✖ ${t.name}${c.reset}`);
      console.log(`      ${c.red}${t.error?.message || t.error}${c.reset}`);
      if (t.error?.stack) {
        const stackLines = t.error.stack.split('\n').slice(1, 3).join('\n');
        console.log(`      ${c.dim}${stackLines}${c.reset}`);
      }
    }
  }
}

export function printTierHeader(tierNumber, tierName, description) {
  console.log(`\n${c.cyan}${c.bold}======================================================================${c.reset}`);
  console.log(`${c.cyan}${c.bold} TIER ${tierNumber}: ${tierName.toUpperCase()}${c.reset}`);
  console.log(`${c.dim} ${description}${c.reset}`);
  console.log(`${c.cyan}${c.bold}======================================================================${c.reset}`);
}

export function printMasterSummary(tierSummaries) {
  const totalDuration = tierSummaries.reduce((sum, t) => sum + t.durationMs, 0);
  const totalChecks = tierSummaries.reduce((sum, t) => sum + t.totalChecks, 0);
  const totalPassed = tierSummaries.reduce((sum, t) => sum + t.passedChecks, 0);
  const totalFailed = tierSummaries.reduce((sum, t) => sum + t.failedChecks, 0);

  console.log(`\n${c.bold}======================================================================${c.reset}`);
  console.log(`${c.bold}                      E2E TEST EXECUTION SUMMARY                      ${c.reset}`);
  console.log(`${c.bold}======================================================================${c.reset}`);
  console.log(` ${'Tier'.padEnd(10)} | ${'Description'.padEnd(32)} | ${'Passed / Total'.padEnd(16)} | ${'Time'.padEnd(10)} | ${'Status'}`);
  console.log(` ${'-'.repeat(10)}-|-|-${'-'.repeat(30)}-|-|-${'-'.repeat(14)}-|-|-${'-'.repeat(8)}-|-|-${'-'.repeat(8)}`);

  for (const tier of tierSummaries) {
    const status = tier.failedChecks === 0 ? `${c.green}PASS${c.reset}` : `${c.red}FAIL (${tier.failedChecks})${c.reset}`;
    const counts = `${tier.passedChecks} / ${tier.totalChecks}`;
    const time = `${tier.durationMs.toFixed(1)}ms`;
    console.log(
      ` ${tier.id.padEnd(10)} | ${tier.name.padEnd(32)} | ${counts.padEnd(16)} | ${time.padEnd(10)} | ${status}`,
    );
  }

  console.log(`${c.bold}======================================================================${c.reset}`);
  const overallStatus = totalFailed === 0
    ? `${c.bgGreen} ALL TESTS PASSED ${c.reset} ${c.green}${c.bold}(${totalPassed}/${totalChecks} checks in ${totalDuration.toFixed(1)}ms)${c.reset}`
    : `${c.bgRed} TESTS FAILED ${c.reset} ${c.red}${c.bold}(${totalFailed} failure(s) out of ${totalChecks} checks in ${totalDuration.toFixed(1)}ms)${c.reset}`;
  console.log(`\n  ${overallStatus}\n`);
}
