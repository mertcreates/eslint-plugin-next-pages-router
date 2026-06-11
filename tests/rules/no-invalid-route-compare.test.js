const path = require('path');
const rule = require('../../rules/no-invalid-route-compare');
const { buildReplacementDesc } = require('../../lib/suggestions');
const { createRuleTester } = require('./ruleTesterCompat');

delete process.env.VSCODE_PID;
delete process.env.VSCODE_CWD;
process.env.TERM_PROGRAM = 'node';

const ruleTester = createRuleTester();

const pagesDir = path.join(__dirname, '../fixtures/pages');
const missingPagesDir = path.join(__dirname, '../fixtures/missing-pages');

describe('no-invalid-route-compare', () => {
  ruleTester.run('route comparisons', rule, {
    valid: [
      {
        code: "router.pathname === '/posts/[id]'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === '/posts/[id]/comments/[commentId]'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === '/posts'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === '/about'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === '/blog/[...slug]'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === '/blog/[category]/[slug]'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === '/blog/[[...slug]]'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === '/'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === '/posts/[id]/'",
        options: [{ pagesDir }],
      },
      {
        code: "['/'].includes(router.route)",
        options: [{ pagesDir }],
      },
      {
        code: "switch (router.route) { case '/blog/[[...slug]]': break; }",
        options: [{ pagesDir }],
      },
      {
        code: "switch (router.route) { case '/posts/[id]/comments/[commentId]': break; }",
        options: [{ pagesDir }],
      },
      {
        code: "['/posts/[id]/comments/[commentId]'].includes(router.route)",
        options: [{ pagesDir }],
      },
      {
        code: "['/posts/[id]', 123].includes(router.route)",
        options: [{ pagesDir }],
      },
    ],
    invalid: [
      {
        code: "router.route === '/posts/123'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/posts/123/comments/999'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/blog'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/post/[id]'",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'invalidRouteCompare',
            suggestions: [
              {
                desc: buildReplacementDesc('/posts/[id]'),
                output: "router.route === '/posts/[id]'",
              },
            ],
          },
        ],
      },
      {
        code: "router.route !== '/post/[id]'",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'invalidRouteCompare',
            suggestions: [
              {
                desc: buildReplacementDesc('/posts/[id]'),
                output: "router.route !== '/posts/[id]'",
              },
            ],
          },
        ],
      },
      {
        code: "['/post/[id]'].includes(router.route)",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'includesRouteUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/posts/[id]'),
                output: "['/posts/[id]'].includes(router.route)",
              },
            ],
          },
        ],
      },
      {
        code: "router.route === '/posts/[id]?foo=bar'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'routeWithQueryOrHash' }],
      },
      {
        code: "router.pathname === '/posts/[id]?foo=bar'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'routeWithQueryOrHash' }],
      },
      {
        code: "router.route === '/posts/[id]#hash'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'routeWithQueryOrHash' }],
      },
      {
        code: "['/posts/[id]?foo=bar'].includes(router.route)",
        options: [{ pagesDir }],
        errors: [{ messageId: 'routeWithQueryOrHash' }],
      },
      {
        code: "switch (router.route) { case '/posts/[id]?foo=bar': break; }",
        options: [{ pagesDir }],
        errors: [{ messageId: 'routeWithQueryOrHash' }],
      },
      {
        code: "router.route === '/api/hello'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/_app'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/_document'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/_error'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/404'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/500'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "['/unknown'].includes(router.route)",
        options: [{ pagesDir }],
        errors: [{ messageId: 'includesRouteUnknown' }],
      },
      {
        code: "['/posts/[id]/comments/[commentId]', '/posts/[id]/comment/[commentId]'].includes(router.route)",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            message:
              "includes(router.route) contains '/posts/[id]/comment/[commentId]', which is not a known route pattern. Use a dynamic pattern (e.g. '/posts/[id]') or compare asPath.",
          },
        ],
      },
    ],
  });

  ruleTester.run('asPath comparisons', rule, {
    valid: [
      {
        code: "router.asPath === '/posts/123'",
        options: [{ pagesDir }],
      },
      {
        code: "router.asPath === '/posts/123/comments/999?foo=bar#section'",
        options: [{ pagesDir }],
      },
      {
        code: "router.asPath === '/blog'",
        options: [{ pagesDir }],
      },
      {
        code: "router.asPath === '/blog/a/b?x=1'",
        options: [{ pagesDir }],
      },
      {
        code: "router.asPath === '/blog/tech/hello-world'",
        options: [{ pagesDir }],
      },
      {
        code: "router.asPath === '/'",
        options: [{ pagesDir }],
      },
      {
        code: "router.asPath === '/posts/123/'",
        options: [{ pagesDir }],
      },
      {
        code: "['/posts/123?foo=bar'].includes(router.asPath)",
        options: [{ pagesDir }],
      },
      {
        code: "switch (router.asPath) { case '/posts/123?foo=bar': break; }",
        options: [{ pagesDir }],
      },
      {
        code: "['/posts/123'].includes(router?.asPath)",
        options: [{ pagesDir }],
      },
      {
        code: "['/posts/123', 123].includes(router.asPath)",
        options: [{ pagesDir }],
      },
    ],
    invalid: [
      {
        code: "router.asPath === '/posts/[id]'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asPathWithPattern' }],
      },
      {
        code: "router.asPath === '/posts/[id]?foo=bar'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asPathWithPattern' }],
      },
      {
        code: "['/posts/[id]?foo=bar'].includes(router.asPath)",
        options: [{ pagesDir }],
        errors: [{ messageId: 'includesWithPattern' }],
      },
      {
        code: "['/posts/[id]'].includes(router.asPath)",
        options: [{ pagesDir }],
        errors: [{ messageId: 'includesWithPattern' }],
      },
      {
        code: "switch (router.asPath) { case '/posts/[id]': break; }",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asPathWithPattern' }],
      },
      {
        code: "router.asPath === '/unknown?foo=bar'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asPathUnknown' }],
      },
      {
        code: "router.asPath === '/abot'",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'asPathUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/about'),
                output: "router.asPath === '/about'",
              },
            ],
          },
        ],
      },
      {
        code: "router.asPath === '/unknown'",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asPathUnknown' }],
      },
      {
        code: "['/unknown'].includes(router.asPath)",
        options: [{ pagesDir }],
        errors: [{ messageId: 'includesUnknown' }],
      },
      {
        code: "['/abot'].includes(router.asPath)",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'includesUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/about'),
                output: "['/about'].includes(router.asPath)",
              },
            ],
          },
        ],
      },
      {
        code: "switch (router.asPath) { case '/unknown': break; }",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asPathUnknown' }],
      },
    ],
  });

  ruleTester.run('options and config', rule, {
    valid: [
      {
        code: "router.asPath === '/docs/posts/123'",
        options: [{ pagesDir, basePath: '/docs' }],
      },
      {
        code: "router.asPath === '/docs/en/posts/123'",
        options: [{ pagesDir, basePath: '/docs', locales: ['en', 'tr'] }],
      },
      {
        code: "router.asPath === '/docs/en'",
        options: [
          {
            pagesDir: path.join(__dirname, '../fixtures/with-next-config/pages'),
            readNextConfig: true,
          },
        ],
      },
      {
        code: "router.asPath === '/en/posts/123'",
        options: [{ pagesDir, locales: ['en', 'tr'] }],
      },
      {
        code: "router.route === '/unknown'",
        options: [
          { pagesDir: path.join(__dirname, '../fixtures/missing-pages') },
        ],
      },
      {
        code: "router.route === '/posts/123'",
        options: [{ pagesDir, checkEquality: false }],
      },
      {
        code: "['/unknown'].includes(router.asPath)",
        options: [{ pagesDir, warnOnUnknownPaths: false }],
      },
      {
        code: "router.asPath === '/unknown'",
        options: [{ pagesDir, warnOnUnknownPaths: false }],
      },
      {
        code: "['/unknown'].includes(router.asPath)",
        options: [{ pagesDir, checkIncludes: false }],
      },
      {
        code: "switch (router.asPath) { case '/unknown': break; }",
        options: [{ pagesDir, checkSwitch: false }],
      },
      {
        code: "router.route === '/posts/123'",
        options: [{ pagesDir, routeProperties: ['pathname'] }],
      },
    ],
    invalid: [
      {
        code: "router.asPath === '/docs/fr/posts/123'",
        options: [{ pagesDir, basePath: '/docs', locales: ['en', 'tr'] }],
        errors: [{ messageId: 'asPathUnknown' }],
      },
      {
        code: "router.asPath === '/fr/posts/123'",
        options: [{ pagesDir, locales: ['en', 'tr'] }],
        errors: [{ messageId: 'asPathUnknown' }],
      },
      {
        code: "router.pathname === '/posts/123'",
        options: [{ pagesDir, routeProperties: ['pathname'] }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "router.route === '/posts/[id]'",
        options: [{ pagesDir: missingPagesDir, skipIfPagesDirMissing: false }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
    ],
  });

  ruleTester.run('skips and allowlists', rule, {
    valid: [
      {
        code: "router?.asPath === '/posts/123'",
        options: [{ pagesDir }],
      },
      {
        code: "router?.route === '/posts/[id]'",
        options: [{ pagesDir }],
      },
      {
        code: "router['route'] === '/posts/[id]'",
        options: [{ pagesDir }],
      },
      {
        code: "other.route === '/posts/[id]'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === 'posts/[id]'",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === ''",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === `/posts/[id]`",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === `/posts/${id}`",
        options: [{ pagesDir }],
      },
      {
        code: "router.route === someVar",
        options: [{ pagesDir }],
      },
      {
        code: "router.asPath === someVar",
        options: [{ pagesDir }],
      },
      {
        code: "switch (router.asPath) { case foo: break; }",
        options: [{ pagesDir }],
      },
    ],
    invalid: [
      {
        code: "r.route === '/posts/123'",
        options: [{ pagesDir, routerObjects: ['r'] }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "props.router.route === '/posts/123'",
        options: [{ pagesDir, routerObjects: ['props.router'] }],
        errors: [{ messageId: 'invalidRouteCompare' }],
      },
      {
        code: "['/posts/123'].includes(r.route)",
        options: [{ pagesDir, routerObjects: ['r'] }],
        errors: [{ messageId: 'includesRouteUnknown' }],
      },
    ],
  });
});
