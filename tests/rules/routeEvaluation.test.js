const assert = require('assert');
const { evaluateConcretePath, evaluateRoutePattern } = require('../../lib/routeEvaluation');
const { buildDynamicMatcherIndex, patternToRegex, findMatchingPattern } = require('../../lib/routes');
const { createRouteCompareReporter } = require('../../lib/routeCompareReporter');
const { createNavigationReporter } = require('../../lib/navigationReporter');

function createContext() {
  let checks = 0;
  const dynamicMatchers = Array.from({ length: 100 }, (_, i) => {
    const pattern = `/r${i}/[id]`;
    const regex = patternToRegex(pattern);
    return { pattern, regex: { test(value) { checks += 1; return regex.test(value); } } };
  });
  return {
    routeSet: new Set(dynamicMatchers.map(({ pattern }) => pattern)),
    dynamicMatchers,
    dynamicMatcherIndex: buildDynamicMatcherIndex(dynamicMatchers),
    staticRoutes: new Set(['/about']),
    allRoutesList: [],
    staticRoutesList: [],
    normalizeAsPathValue: (value) => value,
    warnOnUnknownPaths: true,
    suggestClosestRoute: true,
    checks: () => checks,
  };
}

describe('indexed route evaluation', () => {
  it('does not test unrelated dynamic routes for concrete paths', () => {
    const context = createContext();
    assert.strictEqual(evaluateConcretePath('/missing/123', context).status, 'unknown');
    assert.strictEqual(context.checks(), 0);
    assert.strictEqual(evaluateConcretePath('/r99/123', context).status, 'ok');
    assert.strictEqual(context.checks(), 1);
  });

  it('uses the index for dynamic pattern suggestions', () => {
    const context = createContext();
    const result = evaluateRoutePattern('/r99/123', { ...context, allowDynamicSuggestion: true });
    assert.strictEqual(result.suggestion, '/r99/[id]');
    assert.strictEqual(context.checks(), 1);
  });

  for (const method of ['reportAsPathComparison', 'reportIncludesAsPathValue', 'reportSwitchAsPathCase']) {
    it(`uses the index through ${method}`, () => {
      const context = createContext();
      const reporter = createRouteCompareReporter({ report() { assert.fail('Valid route reported'); } }, context);
      reporter[method]({ rawValue: '/r99/123' });
      assert.strictEqual(context.checks(), 1);
    });
  }

  for (const method of ['reportRoutePatternComparison', 'reportIncludesRoutePatternValue', 'reportSwitchRouteCase']) {
    it(`uses the index through ${method}`, () => {
      const context = createContext();
      const reports = [];
      const reporter = createRouteCompareReporter({ report: (report) => reports.push(report) }, context);
      const member = { object: { type: 'Identifier', name: 'router' }, property: { name: 'route' } };
      const literal = { type: 'Literal', value: '/r99/123', raw: "'/r99/123'" };
      reporter[method]({
        rawValue: '/r99/123', memberNode: member, argNode: member, discriminantNode: member,
        literalNode: literal, elementNode: literal, testNode: literal,
      });
      assert.strictEqual(reports.length, 1);
      assert.match(reports[0].data.suggestion, /r99\/\[id\]/);
      assert.strictEqual(context.checks(), 1);
    });
  }

  it('uses the index through navigation reporting', () => {
    const context = createContext();
    const reporter = createNavigationReporter({ report() { assert.fail('Valid route reported'); } }, context);
    reporter.reportStringTarget({ node: {}, rawValue: '/r99/123', method: 'push', hasAs: false });
    assert.strictEqual(context.checks(), 1);
  });

  it('preserves array-order suggestions across exact, catch-all and fallback buckets', () => {
    for (const patterns of [
      ['/blog/[...slug]', '/blog/[id]', '/[section]/[id]', '/blog/[[...slug]]'],
      ['/[section]/[id]', '/blog/[id]', '/blog/[...slug]', '/blog/[[...slug]]'],
      ['/blog/[id]', '/blog/[[...slug]]', '/blog/[...slug]', '/[section]/[id]'],
    ]) {
      const matchers = patterns.map((pattern) => ({ pattern, regex: patternToRegex(pattern) }));
      const index = buildDynamicMatcherIndex(matchers);
      for (const value of ['/blog', '/blog/hello', '/blog/hello/world', '/news/hello', '/']) {
        assert.strictEqual(findMatchingPattern(value, index), findMatchingPattern(value, matchers));
      }
    }
  });
});
