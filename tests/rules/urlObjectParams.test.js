const assert = require('assert');
const { Linter } = require('eslint');
const { version: eslintVersion } = require('eslint/package.json');
const {
  evaluateUrlObjectQueryParams,
} = require('../../lib/urlObjectParams');

const eslintMajor = Number(String(eslintVersion).split('.')[0]);

function parseObjectExpression(source) {
  const linter =
    eslintMajor >= 9 ? new Linter({ configType: 'eslintrc' }) : new Linter();
  let expression = null;

  linter.defineRule('capture-expression', {
    create() {
      return {
        ExpressionStatement(node) {
          expression = node.expression;
        },
      };
    },
  });

  const messages = linter.verify(
    `(${source});`,
    {
      parserOptions: { ecmaVersion: 2020 },
      rules: { 'capture-expression': 'error' },
    },
    { filename: 'url-object.js' }
  );

  assert.deepStrictEqual(messages, []);
  assert.ok(expression);
  return expression;
}

function evaluate(source) {
  return evaluateUrlObjectQueryParams({
    urlObjectNode: parseObjectExpression(source),
    resolveIdentifierValue: null,
  });
}

function summarize(result) {
  return {
    pathnameValue: result.pathnameValue,
    status: result.status,
    missingParams: result.missingParams,
  };
}

describe('URL object dynamic query parameters', () => {
  it('reports required parameters in page order', () => {
    assert.deepStrictEqual(
      summarize(evaluate("{ pathname: '/posts/[id]' }")),
      {
        pathnameValue: '/posts/[id]',
        status: 'missing',
        missingParams: ['id'],
      }
    );
    assert.deepStrictEqual(
      summarize(
        evaluate(
          "{ pathname: '/blog/[category]/[slug]', query: { category } }"
        )
      ),
      {
        pathnameValue: '/blog/[category]/[slug]',
        status: 'missing',
        missingParams: ['slug'],
      }
    );
    assert.deepStrictEqual(
      summarize(
        evaluate("{ pathname: '/blog/[category]/[slug]', query: {} }")
      ),
      {
        pathnameValue: '/blog/[category]/[slug]',
        status: 'missing',
        missingParams: ['category', 'slug'],
      }
    );
  });

  it('distinguishes complete and not-required URL objects', () => {
    assert.deepStrictEqual(
      summarize(evaluate("{ pathname: '/posts/[id]', query: { id } }")),
      {
        pathnameValue: '/posts/[id]',
        status: 'complete',
        missingParams: [],
      }
    );
    assert.deepStrictEqual(
      summarize(evaluate("{ pathname: '/blog/[[...slug]]' }")),
      {
        pathnameValue: '/blog/[[...slug]]',
        status: 'not-required',
        missingParams: [],
      }
    );
    assert.deepStrictEqual(
      summarize(evaluate("{ pathname: '/about' }")),
      {
        pathnameValue: '/about',
        status: 'not-required',
        missingParams: [],
      }
    );
  });

  it('accepts static computed keys and extra query values', () => {
    assert.deepStrictEqual(
      summarize(
        evaluate(
          "{ pathname: '/posts/[id]', query: { other: true, ['id']: value } }"
        )
      ),
      {
        pathnameValue: '/posts/[id]',
        status: 'complete',
        missingParams: [],
      }
    );
    assert.deepStrictEqual(
      summarize(
        evaluate(
          "{ pathname: '/posts/[id]', query: {}, query: { id: undefined } }"
        )
      ),
      {
        pathnameValue: '/posts/[id]',
        status: 'complete',
        missingParams: [],
      }
    );
  });

  it('keeps runtime query shapes unknown', () => {
    for (const source of [
      "{ pathname: '/posts/[id]', query: params }",
      "{ pathname: '/posts/[id]', query: { ...params } }",
      "{ pathname: '/posts/[id]', query: { [key]: value } }",
      "{ pathname: '/posts/[id]', query: {}, ...target }",
    ]) {
      assert.strictEqual(evaluate(source).status, 'unknown');
    }
  });

  it('uses explicit properties that follow a spread', () => {
    assert.deepStrictEqual(
      summarize(
        evaluate("{ ...target, pathname: '/posts/[id]', query: {} }")
      ),
      {
        pathnameValue: '/posts/[id]',
        status: 'missing',
        missingParams: ['id'],
      }
    );
  });
});
