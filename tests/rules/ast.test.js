const assert = require('assert');

const {
  getJsxAttributeValue,
  getStaticStringValue,
  getScopeVariable,
  isImportedBindingFromSource,
} = require('../../lib/ast');

describe('ast helpers', () => {
  it('reads JSX string attribute values', () => {
    const node = {
      type: 'JSXOpeningElement',
      attributes: [
        {
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'href' },
          value: {
            type: 'Literal',
            value: '/about',
          },
        },
      ],
    };

    assert.deepStrictEqual(getJsxAttributeValue(node, 'href'), {
      type: 'Literal',
      value: '/about',
    });
  });

  it('reads JSX expression container attribute values', () => {
    const expression = { type: 'Identifier', name: 'slug' };
    const node = {
      type: 'JSXOpeningElement',
      attributes: [
        {
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'href' },
          value: {
            type: 'JSXExpressionContainer',
            expression,
          },
        },
      ],
    };

    assert.strictEqual(getJsxAttributeValue(node, 'href'), expression);
  });

  it('resolves static string identifiers and template literals', () => {
    assert.strictEqual(
      getStaticStringValue(
        {
          type: 'Identifier',
          name: 'href',
        },
        (identifier) => (identifier.name === 'href' ? '/about' : null)
      ),
      '/about'
    );

    assert.strictEqual(
      getStaticStringValue(
        {
          type: 'TemplateLiteral',
          quasis: [
            {
              type: 'TemplateElement',
              value: { cooked: '/posts/', raw: '/posts/' },
              tail: false,
            },
            {
              type: 'TemplateElement',
              value: { cooked: '', raw: '' },
              tail: true,
            },
          ],
          expressions: [{ type: 'Identifier', name: 'slug' }],
        },
        (identifier) => (identifier.name === 'slug' ? '123' : null)
      ),
      '/posts/123'
    );
  });

  it('finds variables through the scope chain and checks import bindings', () => {
    const importedVariable = {
      defs: [
        {
          type: 'ImportBinding',
          parent: {
            type: 'ImportDeclaration',
            source: { value: 'next/link' },
          },
        },
      ],
    };
    const localVariable = { defs: [] };
    const parentScope = {
      upper: null,
      set: new Map([['Link', importedVariable]]),
      variables: [importedVariable],
    };
    const childScope = {
      upper: parentScope,
      set: new Map([['LinkAlias', localVariable]]),
      variables: [localVariable],
    };

    assert.strictEqual(getScopeVariable(childScope, 'Link'), importedVariable);
    assert.strictEqual(
      isImportedBindingFromSource(importedVariable, 'next/link'),
      true
    );
    assert.strictEqual(
      isImportedBindingFromSource(localVariable, 'next/link'),
      false
    );
  });
});
