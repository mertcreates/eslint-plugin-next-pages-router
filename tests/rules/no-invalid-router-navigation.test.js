const path = require('path');
const rule = require('../../rules/no-invalid-router-navigation');
const {
  buildUrlObjectDesc,
  buildReplacementDesc,
} = require('../../lib/suggestions');
const { createRuleTester } = require('./ruleTesterCompat');

delete process.env.VSCODE_PID;
delete process.env.VSCODE_CWD;
process.env.TERM_PROGRAM = 'node';

const ruleTester = createRuleTester({ jsx: true });

const pagesDir = path.join(__dirname, '../fixtures/pages');
const pagesDirWithConfig = path.join(
  __dirname,
  '../fixtures/with-next-config/pages'
);
const missingPagesDir = path.join(__dirname, '../fixtures/missing-pages');

describe('no-invalid-router-navigation', () => {
  ruleTester.run('router.push/replace', rule, {
    valid: [
      {
        code: "router.push('/about')",
        options: [{ pagesDir }],
      },
      {
        code: "router.replace('/posts/123')",
        options: [{ pagesDir }],
      },
      {
        code: "router.push('/posts/123?utm=1#hash')",
        options: [{ pagesDir }],
      },
      {
        code: "const href = '/about'; router.push(href)",
        options: [{ pagesDir }],
      },
      {
        code: "const slug = '123'; const href = `/posts/${slug}`; router.replace(href)",
        options: [{ pagesDir }],
      },
      {
        code: "Router.push('/about')",
        options: [{ pagesDir }],
      },
      {
        code: "router.push({ pathname: '/posts/[id]', query: { id: postId } })",
        options: [{ pagesDir }],
      },
      {
        code: "const pathname = '/posts/[id]'; router.push({ pathname, query: { id: postId } })",
        options: [{ pagesDir }],
      },
      {
        code: "router.push({ pathname: '/posts/[id]' }, '/posts/123')",
        options: [{ pagesDir }],
      },
      {
        code: "router.push('/posts/[id]', { pathname: '/posts/123' })",
        options: [{ pagesDir }],
      },
      {
        code: "router.push({ pathname: '/posts/123' })",
        options: [{ pagesDir }],
      },
      {
        code: "router.push('/posts/[id]', '/posts/123')",
        options: [{ pagesDir, preferUrlObject: false }],
      },
      {
        code: "router.replace({ pathname: '/about' })",
        options: [{ pagesDir }],
      },
      {
        code: "router.replace({ pathname: '/posts/123' })",
        options: [{ pagesDir }],
      },
      {
        code: "Router.replace('/about')",
        options: [{ pagesDir }],
      },
      {
        code: "import Link from 'next/link'; function Demo() { const Link = () => null; return <Link href='/abot' />; }",
        options: [{ pagesDir }],
      },
      {
        code: "router.push('/blog/a/b')",
        options: [{ pagesDir }],
      },
      {
        code: "router.push('/404')",
        options: [{ pagesDir }],
      },
      {
        code: "router.replace('/404')",
        options: [{ pagesDir }],
      },
    ],
    invalid: [
      {
        code: "router.push('/posts/[id]')",
        options: [{ pagesDir }],
        errors: [{ messageId: 'navigationPatternWithoutAs' }],
      },
      {
        code: "router.push('/post/[id]', '/posts/123')",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'navigationPatternUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/posts/[id]'),
                output: "router.push('/posts/[id]', '/posts/123')",
              },
            ],
          },
        ],
      },
      {
        code: "router.replace('/abot')",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'navigationUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/about'),
                output: "router.replace('/about')",
              },
            ],
          },
        ],
      },
      {
        code: "const href = '/abot'; router.replace(href)",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [{ messageId: 'navigationUnknown' }],
      },
      {
        code: "const pathname = '/post/[id]'; router.push({ pathname })",
        options: [{ pagesDir }],
        errors: [{ messageId: 'pathnameUnknown' }],
      },
      {
        code: "router.push({ pathname: '/post/[id]' })",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'pathnameUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/posts/[id]'),
                output: "router.push({ pathname: '/posts/[id]' })",
              },
            ],
          },
        ],
      },
      {
        code: "router.push({ pathname: '/posts/[id]?foo=1' })",
        options: [{ pagesDir }],
        errors: [{ messageId: 'pathnameWithQueryOrHash' }],
      },
      {
        code: "router.push('/posts/[id]', '/posts/[id]')",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asWithPattern' }],
      },
      {
        code: "router.push('/posts/[id]', '/posts/123')",
        options: [{ pagesDir }],
        errors: [
          {
            messageId: 'preferUrlObject',
            suggestions: [
              {
                desc: buildUrlObjectDesc(),
                output:
                  "router.push({ pathname: '/posts/[id]', query: { id: '123' } })",
              },
            ],
          },
        ],
      },
      {
        code: "router.push('/blog/[category]/[slug]', '/blog/tech/hello')",
        options: [{ pagesDir }],
        errors: [
          {
            messageId: 'preferUrlObject',
            suggestions: [
              {
                desc: buildUrlObjectDesc(),
                output:
                  "router.push({ pathname: '/blog/[category]/[slug]', query: { category: 'tech', slug: 'hello' } })",
              },
            ],
          },
        ],
      },
      {
        code: "router.push('/posts/[id]', '/docs/en/posts/123')",
        options: [{ pagesDir, basePath: '/docs', locales: ['en'] }],
        errors: [
          {
            messageId: 'preferUrlObject',
            suggestions: [
              {
                desc: buildUrlObjectDesc(),
                output:
                  "router.push({ pathname: '/posts/[id]', query: { id: '123' } })",
              },
            ],
          },
        ],
      },
      {
        code: "router.push('/blog/[...slug]', '/blog/a/b')",
        options: [{ pagesDir }],
        errors: [{ messageId: 'preferUrlObject' }],
      },
      {
        code: "router.push('/posts/[id]', '/abot')",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'asUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/about'),
                output: "router.push('/posts/[id]', '/about')",
              },
            ],
          },
        ],
      },
      {
        code: "router.push('/posts/[id]', { pathname: '/posts/[id]' })",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asWithPattern' }],
      },
      {
        code: "router.push('/posts/[id]', { pathname: '/abot' })",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'asUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/about'),
                output: "router.push('/posts/[id]', { pathname: '/about' })",
              },
            ],
          },
        ],
      },
      {
        code: "Router.push('/abot')",
        options: [{ pagesDir, suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'navigationUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/about'),
                output: "Router.push('/about')",
              },
            ],
          },
        ],
      },
    ],
  });

  ruleTester.run('Link href', rule, {
    valid: [
      {
        code: "import Link from 'next/link'; const element = <Link href='/about' />;",
        options: [{ pagesDir }],
      },
      {
        code:
          "const href = '/about'; import Link from 'next/link'; const element = <Link href={href} />;",
        options: [{ pagesDir }],
      },
      {
        code:
          "const slug = '123'; const href = `/posts/${slug}`; import Link from 'next/link'; const element = <Link href={href} />;",
        options: [{ pagesDir }],
      },
      {
        code:
          "import Link from 'next/link'; const element = <Link href={{ pathname: '/posts/[id]', query: { id: postId } }} />;",
        options: [{ pagesDir }],
      },
    ],
    invalid: [
      {
        code: "import Link from 'next/link'; const element = <Link href='/abot' />;",
        options: [{ pagesDir }],
        errors: [{ messageId: 'linkHrefUnknown' }],
      },
      {
        code: "import Link from 'next/link'; const element = <Link href='/posts/[id]' />;",
        options: [{ pagesDir }],
        errors: [{ messageId: 'linkHrefPatternWithoutAs' }],
      },
      {
        code:
          "const href = '/abot'; import Link from 'next/link'; const element = <Link href={href} />;",
        options: [{ pagesDir }],
        errors: [{ messageId: 'linkHrefUnknown' }],
      },
      {
        code:
          "const href = '/posts/[id]'; import Link from 'next/link'; const element = <Link href={href} />;",
        options: [{ pagesDir }],
        errors: [{ messageId: 'linkHrefPatternWithoutAs' }],
      },
      {
        code:
          "const asPath = '/abot'; import Link from 'next/link'; const element = <Link href='/posts/[id]' as={asPath} />;",
        options: [{ pagesDir }],
        errors: [{ messageId: 'linkAsUnknown' }],
      },
      {
        code:
          "const asPath = '/posts/123'; import Link from 'next/link'; const element = <Link href='/posts/[id]' as={asPath} />;",
        options: [{ pagesDir }],
        errors: [
          {
            messageId: 'linkPreferUrlObject',
            suggestions: [
              {
                desc: buildUrlObjectDesc(),
                output:
                  "const asPath = '/posts/123'; import Link from 'next/link'; const element = <Link href={{ pathname: '/posts/[id]', query: { id: '123' } }} />;",
              },
            ],
          },
        ],
      },
      {
        code:
          "import Link from 'next/link'; const element = <Link href={{ pathname: '/abot' }} />;",
        options: [{ pagesDir }],
        errors: [{ messageId: 'linkHrefPathnameUnknown' }],
      },
    ],
  });

  ruleTester.run('navigation options and edge cases', rule, {
    valid: [
      {
        code: "router.push('/docs/en')",
        options: [{ pagesDir: pagesDirWithConfig, readNextConfig: true }],
      },
      {
        code: "router.push('/unknown')",
        options: [{ pagesDir: missingPagesDir, skipIfPagesDirMissing: true }],
      },
      {
        code: "router.push('/posts/[id]', '/unknown')",
        options: [
          { pagesDir, warnOnUnknownPaths: false, preferUrlObject: false },
        ],
      },
      {
        code: "router.push('/posts/[id]', '/posts/123?x=1#hash')",
        options: [{ pagesDir, preferUrlObject: false }],
      },
      {
        code: "other.push('/about')",
        options: [{ pagesDir }],
      },
    ],
    invalid: [
      {
        code: "router.push('/post/[id]')",
        options: [{ pagesDir }],
        errors: [{ messageId: 'navigationPatternUnknown' }],
      },
      {
        code: "router.push({ pathname: '/unknown' })",
        options: [{ pagesDir }],
        errors: [{ messageId: 'pathnameUnknown' }],
      },
      {
        code: "router.push('/posts/[id]', '/posts/[id]?x=1')",
        options: [{ pagesDir }],
        errors: [{ messageId: 'asWithPattern' }],
      },
      {
        code: "router.push('/posts/[id]', '/posts/[id]')",
        options: [
          { pagesDir, warnOnUnknownPaths: false, preferUrlObject: false },
        ],
        errors: [{ messageId: 'asWithPattern' }],
      },
      {
        code: "router.push('/about')",
        options: [{ pagesDir: missingPagesDir, skipIfPagesDirMissing: false }],
        errors: [{ messageId: 'navigationUnknown' }],
      },
      {
        code: "r.push('/abot')",
        options: [{ pagesDir, routerObjects: ['r'], suggestClosestRoute: true }],
        errors: [
          {
            messageId: 'navigationUnknown',
            suggestions: [
              {
                desc: buildReplacementDesc('/about'),
                output: "r.push('/about')",
              },
            ],
          },
        ],
      },
    ],
  });
});
