const assert = require('assert');
const path = require('path');
const { Linter } = require('eslint');
const { version: eslintVersion } = require('eslint/package.json');
const routeCompareRule = require('../../rules/no-invalid-route-compare');
const navigationRule = require('../../rules/no-invalid-router-navigation');

const pagesDir = path.join(__dirname, '../fixtures/pages');
const eslintMajor = Number(String(eslintVersion).split('.')[0]);

function createLinter() {
  return eslintMajor >= 9 ? new Linter({ configType: 'eslintrc' }) : new Linter();
}

function verify({ ruleId, rule, code, options = {}, jsx = false }) {
  const linter = createLinter();
  linter.defineRule(ruleId, rule);

  return linter.verify(
    code,
    {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ...(jsx && {
          ecmaFeatures: {
            jsx: true,
          },
        }),
      },
      rules: {
        [ruleId]: ['error', { pagesDir, ...options }],
      },
    },
    { filename: jsx ? 'messages.jsx' : 'messages.js' }
  );
}

function applySuggestion(code, fix) {
  return `${code.slice(0, fix.range[0])}${fix.text}${code.slice(fix.range[1])}`;
}

function assertMessage(testCase) {
  const messages = verify(testCase);

  assert.strictEqual(
    messages.length,
    1,
    `${testCase.ruleId} should report exactly one diagnostic: ${JSON.stringify(messages)}`
  );

  const [message] = messages;
  assert.strictEqual(message.messageId, testCase.messageId);
  assert.strictEqual(message.message, testCase.expected);

  if (testCase.suggestions) {
    assert.deepStrictEqual(
      message.suggestions.map(({ desc, fix }) => ({
        desc,
        output: applySuggestion(testCase.code, fix),
      })),
      testCase.suggestions
    );
  } else {
    assert.strictEqual(message.suggestions, undefined);
  }
}

describe('user-facing rule messages', () => {
  it('renders every route-comparison message with its value and next step', () => {
    [
      {
        ruleId: 'route-compare',
        rule: routeCompareRule,
        code: "router.route === '/post/[id]'",
        options: { suggestClosestRoute: false },
        messageId: 'invalidRouteCompare',
        expected:
          "router.route is compared to '/post/[id]', which does not match a page path in your pages directory. Check the path against your pages directory.",
      },
      {
        ruleId: 'route-compare',
        rule: routeCompareRule,
        code: "router.route === '/posts/[id]?foo=bar'",
        messageId: 'routeWithQueryOrHash',
        expected:
          'router.route must not contain query (?...) or hash (#...). Use asPath for those instead.',
      },
      {
        ruleId: 'route-compare',
        rule: routeCompareRule,
        code: "['/unknown'].includes(router.route)",
        options: { suggestClosestRoute: false },
        messageId: 'includesRouteUnknown',
        expected:
          "includes(router.route) contains '/unknown', which does not match a page path in your pages directory. Check the path against your pages directory.",
      },
      {
        ruleId: 'route-compare',
        rule: routeCompareRule,
        code: "router.asPath === '/posts/[id]'",
        messageId: 'asPathWithPattern',
        expected:
          "asPath must be compared to a URL with parameter values, such as '/posts/123', instead of '/posts/[id]'.",
      },
      {
        ruleId: 'route-compare',
        rule: routeCompareRule,
        code: "router.asPath === '/unknown'",
        options: { suggestClosestRoute: false },
        messageId: 'asPathUnknown',
        expected:
          "asPath '/unknown' does not match any page in your pages directory. Check the path against your pages directory.",
      },
      {
        ruleId: 'route-compare',
        rule: routeCompareRule,
        code: "['/posts/[id]'].includes(router.asPath)",
        messageId: 'includesWithPattern',
        expected:
          "includes(asPath) must only contain URLs with parameter values, such as '/posts/123', not page paths such as '/posts/[id]'.",
      },
      {
        ruleId: 'route-compare',
        rule: routeCompareRule,
        code: "['/unknown'].includes(router.asPath)",
        options: { suggestClosestRoute: false },
        messageId: 'includesUnknown',
        expected:
          "includes(asPath) contains '/unknown' which does not match any page in your project. Check the path against your pages directory.",
      },
    ].forEach(assertMessage);
  });

  it('renders every navigation message for router calls', () => {
    [
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push('/posts/[id]')",
        messageId: 'navigationPatternWithoutAs',
        expected:
          "router.push uses page path '/posts/[id]' but no `as` URL was provided. Use a URL object with `pathname`/`query` or pass a URL with parameter values as the `as` value.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push('/post/[id]')",
        options: { suggestClosestRoute: false },
        messageId: 'navigationPatternUnknown',
        expected:
          "router.push uses page path '/post/[id]', which is not in your pages directory. Use a page path such as '/posts/[id]'.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push('/unknown')",
        options: { suggestClosestRoute: false },
        messageId: 'navigationUnknown',
        expected: "No page matches '/unknown'.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push('/posts/[id]', '/posts/[id]')",
        messageId: 'asWithPattern',
        expected:
          "Use a URL with parameter values, such as '/posts/123', instead of '/posts/[id]'.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push('/posts/[id]', '/unknown')",
        options: { suggestClosestRoute: false, preferUrlObject: false },
        messageId: 'asUnknown',
        expected:
          "router.push `as` value '/unknown' does not match any page in your pages directory. Check the path against your pages directory.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push({ pathname: '/unknown' })",
        options: { suggestClosestRoute: false },
        messageId: 'pathnameUnknown',
        expected:
          "router.push pathname '/unknown' does not match a page in your pages directory. Check the path against your pages directory.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push({ pathname: '/posts/[id]?foo=bar' })",
        messageId: 'pathnameWithQueryOrHash',
        expected:
          'router.push pathname must not contain query (?...) or hash (#...). Use query or `as` instead.',
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push('/posts/[id]', '/posts/123')",
        expected:
          'router.push passes a page path and a separate URL. Use `pathname` and `query` to keep the parameter values together.',
        messageId: 'preferUrlObject',
        suggestions: [
          {
            desc: 'Use pathname and query instead of separate URLs',
            output:
              "router.push({ pathname: '/posts/[id]', query: { id: '123' } })",
          },
        ],
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push({ pathname: '/posts/[id]', query: {} })",
        messageId: 'navigationMissingQueryParam',
        expected:
          "router.push pathname '/posts/[id]' is missing the required query parameter 'id'. Add it to `query` or pass an `as` URL that matches this page path.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        code: "router.push({ pathname: '/blog/[category]/[slug]', query: {} })",
        messageId: 'navigationMissingQueryParams',
        expected:
          "router.push pathname '/blog/[category]/[slug]' is missing the required query parameters 'category' and 'slug'. Add them to `query` or pass an `as` URL that matches this page path.",
      },
    ].forEach(assertMessage);
  });

  it('renders every navigation message for next/link props', () => {
    [
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href='/posts/[id]' />;",
        messageId: 'linkHrefPatternWithoutAs',
        expected:
          "Link href uses page path '/posts/[id]' but no `as` value was provided. Use a URL object with `pathname`/`query` or pass a URL with parameter values as the `as` value.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href='/post/[id]' />;",
        options: { suggestClosestRoute: false },
        messageId: 'linkHrefPatternUnknown',
        expected:
          "Link href uses page path '/post/[id]', which is not in your pages directory. Use a page path such as '/posts/[id]'.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href='/unknown' />;",
        options: { suggestClosestRoute: false },
        messageId: 'linkHrefUnknown',
        expected: "No page matches '/unknown'.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href={{ pathname: '/unknown' }} />;",
        options: { suggestClosestRoute: false },
        messageId: 'linkHrefPathnameUnknown',
        expected:
          "Link href uses pathname '/unknown', which does not match a page in your pages directory. Check the path against your pages directory.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href={{ pathname: '/posts/[id]?foo=bar' }} />;",
        messageId: 'linkHrefPathnameWithQueryOrHash',
        expected:
          'Link href pathname must not contain query (?...) or hash (#...). Use query or `as` instead.',
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href='/posts/[id]' as='/posts/[id]' />;",
        messageId: 'linkAsWithPattern',
        expected:
          "Use a URL with parameter values, such as '/posts/123', instead of '/posts/[id]'.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href='/posts/[id]' as='/unknown' />;",
        options: { suggestClosestRoute: false },
        messageId: 'linkAsUnknown',
        expected:
          "Link `as` value '/unknown' does not match any page in your pages directory. Check the path against your pages directory.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href='/posts/[id]' as='/posts/123' />;",
        messageId: 'linkPreferUrlObject',
        expected:
          'Link passes a page path and a separate URL. Use `pathname` and `query` to keep the parameter values together.',
        suggestions: [
          {
            desc: 'Use pathname and query instead of separate URLs',
            output:
              "import Link from 'next/link'; const element = <Link href={{ pathname: '/posts/[id]', query: { id: '123' } }} />;",
          },
        ],
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href={{ pathname: '/posts/[id]', query: {} }} />;",
        messageId: 'linkHrefMissingQueryParam',
        expected:
          "Link href pathname '/posts/[id]' is missing the required query parameter 'id'. Add it to `query` or pass an `as` URL that matches this page path.",
      },
      {
        ruleId: 'router-navigation',
        rule: navigationRule,
        jsx: true,
        code: "import Link from 'next/link'; const element = <Link href={{ pathname: '/blog/[category]/[slug]', query: {} }} />;",
        messageId: 'linkHrefMissingQueryParams',
        expected:
          "Link href pathname '/blog/[category]/[slug]' is missing the required query parameters 'category' and 'slug'. Add them to `query` or pass an `as` URL that matches this page path.",
      },
    ].forEach(assertMessage);
  });

  it('keeps suggestions optional and preserves literal replacement output', () => {
    assertMessage({
      ruleId: 'router-navigation',
      rule: navigationRule,
      code: "router.push('/abot')",
      options: { suggestClosestRoute: false },
      messageId: 'navigationUnknown',
      expected: "No page matches '/abot'.",
    });

    assertMessage({
      ruleId: 'router-navigation',
      rule: navigationRule,
      code: "router.push('/abot')",
      options: { suggestClosestRoute: true },
      messageId: 'navigationUnknown',
      expected: "No page matches '/abot'. Did you mean '/about'?",
      suggestions: [
        {
          desc: "Replace with '/about'",
          output: "router.push('/about')",
        },
      ],
    });

    assertMessage({
      ruleId: 'router-navigation',
      rule: navigationRule,
      jsx: true,
      code: "import Link from 'next/link'; const element = <Link href='/abot' />;",
      options: { suggestClosestRoute: true },
      messageId: 'linkHrefUnknown',
      expected: "No page matches '/abot'. Did you mean '/about'?",
      suggestions: [
        {
          desc: "Replace with '/about'",
          output:
            "import Link from 'next/link'; const element = <Link href='/about' />;",
        },
      ],
    });
  });
});
