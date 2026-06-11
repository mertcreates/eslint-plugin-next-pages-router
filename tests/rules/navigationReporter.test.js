const assert = require('assert');

const { createNavigationReporter } = require('../../lib/navigationReporter');

function createRuleContext() {
  return {
    routeSet: new Set(['/about', '/posts/[id]']),
    dynamicMatchers: [
      {
        pattern: '/posts/[id]',
        regex: /^\/posts\/[^/]+$/,
      },
    ],
    allRoutesList: ['/about', '/posts/[id]'],
    staticRoutes: new Set(['/about']),
    staticRoutesList: ['/about'],
    normalizeAsPathValue: (value) => value,
    suggestClosestRoute: false,
    warnOnUnknownPaths: true,
  };
}

function createLinkReporter() {
  const reports = [];
  const context = {
    report(report) {
      reports.push(report);
    },
  };

  const reporter = createNavigationReporter(context, createRuleContext(), {
    preferUrlObject: true,
    messages: {
      patternWithoutAs: 'linkHrefPatternWithoutAs',
      patternUnknown: 'linkHrefPatternUnknown',
      unknown: 'linkHrefUnknown',
      pathnameUnknown: 'linkHrefPathnameUnknown',
      queryhash: 'linkHrefPathnameWithQueryOrHash',
      asWithPattern: 'linkAsWithPattern',
      asUnknown: 'linkAsUnknown',
      preferUrlObject: 'linkPreferUrlObject',
    },
  });

  return { reports, reporter };
}

describe('navigationReporter', () => {
  it('reports unknown Link href values with the shared reporter', () => {
    const { reports, reporter } = createLinkReporter();

    reporter.reportStringTarget({
      node: {},
      rawValue: '/abot',
      method: 'href',
      hasAs: false,
    });

    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0].messageId, 'linkHrefUnknown');
  });

  it('suggests a UrlObject for Link href + as', () => {
    const { reports, reporter } = createLinkReporter();

    reporter.reportPreferUrlObject({
      urlNode: { range: [0, 12] },
      urlValue: '/posts/[id]',
      asNode: { range: [13, 24] },
      asValue: '/posts/123',
      method: 'href',
    });

    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0].messageId, 'linkPreferUrlObject');
    assert.ok(Array.isArray(reports[0].suggest));
    assert.strictEqual(typeof reports[0].suggest[0].fix, 'function');

    const fix = reports[0].suggest[0].fix({
      replaceTextRange(range, text) {
        return { range, text };
      },
    });

    assert.deepStrictEqual(fix, {
      range: [0, 24],
      text: "{ pathname: '/posts/[id]', query: { id: '123' } }",
    });
  });
});
