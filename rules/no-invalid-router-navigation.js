const {
  getObjectPropertyValue,
  getJsxAttributeValue,
  isStringLiteral,
  getStringLiteralValue,
  getStaticStringValue,
} = require('../lib/ast');
const { createNavigationReporter } = require('../lib/navigationReporter');
const {
  collectNextLinkLocalNames,
  isNextLinkOpeningElement,
} = require('../lib/nextLink');
const { createRuleContext } = require('../lib/ruleContext');
const { getAllowedRouterMethodCall } = require('../lib/routerCalls');
const { createStaticIdentifierResolver } = require('../lib/staticStrings');

function getRouterMethodCallInfo(
  node,
  allowedObjects,
  allowedObjectPaths,
  bindingOptions
) {
  return getAllowedRouterMethodCall(
    node,
    allowedObjects,
    allowedObjectPaths,
    ['push', 'replace'],
    bindingOptions
  );
}

const LINK_MESSAGES = {
  patternWithoutAs: 'linkHrefPatternWithoutAs',
  patternUnknown: 'linkHrefPatternUnknown',
  unknown: 'linkHrefUnknown',
  pathnameUnknown: 'linkHrefPathnameUnknown',
  queryhash: 'linkHrefPathnameWithQueryOrHash',
  asWithPattern: 'linkAsWithPattern',
  asUnknown: 'linkAsUnknown',
  preferUrlObject: 'linkPreferUrlObject',
};

const ROUTER_MESSAGES = {
  patternWithoutAs: 'navigationPatternWithoutAs',
  patternUnknown: 'navigationPatternUnknown',
  unknown: 'navigationUnknown',
  pathnameUnknown: 'pathnameUnknown',
  queryhash: 'pathnameWithQueryOrHash',
  asWithPattern: 'asWithPattern',
  asUnknown: 'asUnknown',
  preferUrlObject: 'preferUrlObject',
};

const noInvalidRouterNavigation = {
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description:
        'Validate Next.js router.push/replace and next/link href targets against the pages directory',
      examples: {
        valid: [
          "router.push('/about')",
          "router.replace('/posts/123')",
          "router.push({ pathname: '/posts/[id]', query: { id } })",
          "router.push('/posts/[id]', '/posts/123')",
          "router.replace({ pathname: '/posts/[id]' }, '/posts/123')",
          "import Link from 'next/link'; const element = <Link href='/about' />;",
        ],
        invalid: [
          "router.push('/posts/[id]')",
          "router.replace('/post/[id]')",
          "router.push({ pathname: '/post/[id]' })",
          "router.push('/posts/[id]', '/post/[id]')",
          "import Link from 'next/link'; const element = <Link href='/posts/[id]' />;",
        ],
      },
    },
    schema: [
      {
        type: 'object',
        properties: {
          pagesDir: { type: 'string' },
          basePath: { type: 'string' },
          locales: { type: 'array', items: { type: 'string' } },
          readNextConfig: { type: 'boolean' },
          nextConfigPath: { type: 'string' },
          routerObjects: { type: 'array', items: { type: 'string' } },
          warnOnUnknownPaths: { type: 'boolean' },
          suggestClosestRoute: { type: 'boolean' },
          skipIfPagesDirMissing: { type: 'boolean' },
          preferUrlObject: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      navigationPatternWithoutAs:
        "router.{{method}} uses page path '{{value}}' but no `as` URL was provided. Use a URL object with `pathname`/`query` or pass a URL with parameter values as the `as` value.",
      navigationPatternUnknown:
        "router.{{method}} uses page path '{{value}}', which is not in your pages directory. Use a page path such as '/posts/[id]'.{{suggestion}}",
      navigationUnknown:
        "No page matches '{{value}}'.{{suggestion}}",
      asWithPattern:
        "Use a URL with parameter values, such as '/posts/123', instead of '{{value}}'.",
      asUnknown:
        "router.{{method}} `as` value '{{value}}' does not match any page in your pages directory. Check the path against your pages directory.{{suggestion}}",
      pathnameUnknown:
        "router.{{method}} pathname '{{value}}' does not match a page in your pages directory. Check the path against your pages directory.{{suggestion}}",
      pathnameWithQueryOrHash:
        "router.{{method}} pathname must not contain query (?...) or hash (#...). Use query or `as` instead.",
      preferUrlObject:
        "router.{{method}} passes a page path and a separate URL. Use `pathname` and `query` to keep the parameter values together.",
      linkHrefPatternWithoutAs:
        "Link href uses page path '{{value}}' but no `as` value was provided. Use a URL object with `pathname`/`query` or pass a URL with parameter values as the `as` value.",
      linkHrefPatternUnknown:
        "Link href uses page path '{{value}}', which is not in your pages directory. Use a page path such as '/posts/[id]'.{{suggestion}}",
      linkHrefUnknown:
        "No page matches '{{value}}'.{{suggestion}}",
      linkHrefPathnameUnknown:
        "Link href uses pathname '{{value}}', which does not match a page in your pages directory. Check the path against your pages directory.{{suggestion}}",
      linkHrefPathnameWithQueryOrHash:
        "Link href pathname must not contain query (?...) or hash (#...). Use query or `as` instead.",
      linkAsWithPattern:
        "Use a URL with parameter values, such as '/posts/123', instead of '{{value}}'.",
      linkAsUnknown:
        "Link `as` value '{{value}}' does not match any page in your pages directory. Check the path against your pages directory.{{suggestion}}",
      linkPreferUrlObject:
        "Link passes a page path and a separate URL. Use `pathname` and `query` to keep the parameter values together.",
    },
  },

  create(context) {
    const options = context.options?.[0] || {};
    const ruleContext = createRuleContext(context, options);
    const preferUrlObject = options.preferUrlObject !== false;
    const sourceCode = context.sourceCode || context.getSourceCode();
    const getJsxScope =
      sourceCode && typeof sourceCode.getScope === 'function'
        ? (node) => sourceCode.getScope(node)
        : typeof context.getScope === 'function'
          ? () => context.getScope()
          : null;
    const getRouterScope =
      sourceCode && typeof sourceCode.getScope === 'function'
        ? (node) => sourceCode.getScope(node)
        : typeof context.getScope === 'function'
          ? () => context.getScope()
          : null;
    let resolveStaticIdentifierValue = null;

    function ensureStaticIdentifierResolver() {
      if (!resolveStaticIdentifierValue && sourceCode && sourceCode.scopeManager) {
        resolveStaticIdentifierValue = createStaticIdentifierResolver(sourceCode);
      }

      return resolveStaticIdentifierValue;
    }

    if (!ruleContext) {
      return {};
    }

    const {
      routerObjectNames,
      routerObjectPaths,
      hasExplicitRouterObjects,
    } = ruleContext;
    const routerBindingOptions = {
      autoDetect: !hasExplicitRouterObjects,
      getScope: getRouterScope,
    };
    const routerReporter = createNavigationReporter(context, ruleContext, {
      preferUrlObject,
      messages: ROUTER_MESSAGES,
    });
    const linkReporter = createNavigationReporter(context, ruleContext, {
      preferUrlObject,
      messages: LINK_MESSAGES,
    });
    const linkNames = new Set();

    function handleRouterCall(node) {
      const info = getRouterMethodCallInfo(
        node,
        routerObjectNames,
        routerObjectPaths,
        routerBindingOptions
      );

      if (!info) {
        return;
      }

      const { callNode, method } = info;
      const args = callNode.arguments || [];

      if (args.length === 0) {
        return;
      }

      const urlArg = args[0];
      const asArg = args[1];
      let urlValue = null;
      let asValue = null;
      const resolveIdentifier = ensureStaticIdentifierResolver();
      const resolvedUrlValue = getStaticStringValue(urlArg, resolveIdentifier);

      if (typeof resolvedUrlValue === 'string') {
        const rawValue = resolvedUrlValue;
        urlValue = rawValue;
        routerReporter.reportStringTarget({
          node: urlArg,
          rawValue,
          method,
          hasAs: Boolean(asArg),
        });
      } else if (urlArg && urlArg.type === 'ObjectExpression') {
        const pathnameNode = getObjectPropertyValue(urlArg, 'pathname');
        const resolvedPathnameValue = getStaticStringValue(
          pathnameNode,
          resolveIdentifier
        );

        if (typeof resolvedPathnameValue === 'string') {
          const rawValue = resolvedPathnameValue;
          routerReporter.reportPathname({
            node: pathnameNode,
            rawValue,
            method,
          });
        }
      }

      const resolvedAsValue = getStaticStringValue(asArg, resolveIdentifier);

      if (typeof resolvedAsValue === 'string') {
        const rawValue = resolvedAsValue;
        asValue = rawValue;
        routerReporter.reportAsTarget({
          node: asArg,
          rawValue,
          method,
        });
      } else if (asArg && asArg.type === 'ObjectExpression') {
        const pathnameNode = getObjectPropertyValue(asArg, 'pathname');
        const resolvedPathnameValue = getStaticStringValue(
          pathnameNode,
          resolveIdentifier
        );

        if (typeof resolvedPathnameValue === 'string') {
          const rawValue = resolvedPathnameValue;
          routerReporter.reportAsTarget({
            node: pathnameNode,
            rawValue,
            method,
          });
        }
      }

      if (urlValue && asValue) {
        routerReporter.reportPreferUrlObject({
          urlNode: urlArg,
          urlValue,
          asNode: asArg,
          asValue,
          method,
        });
      }
    }

    function handleNextLinkOpeningElement(node) {
      if (linkNames.size === 0) {
        return;
      }

      if (!isNextLinkOpeningElement(node, linkNames, getJsxScope)) {
        return;
      }

      const hrefNode = getJsxAttributeValue(node, 'href');
      const asNode = getJsxAttributeValue(node, 'as');
      let hrefValue = null;
      let asValue = null;

      const resolvedHrefValue = getStaticStringValue(
        hrefNode,
        ensureStaticIdentifierResolver()
      );

      if (typeof resolvedHrefValue === 'string') {
        const rawValue = resolvedHrefValue;
        hrefValue = rawValue;
        linkReporter.reportStringTarget({
          node: hrefNode,
          rawValue,
          method: 'href',
          hasAs: Boolean(asNode),
        });
      } else if (hrefNode && hrefNode.type === 'ObjectExpression') {
        const pathnameNode = getObjectPropertyValue(hrefNode, 'pathname');

        if (pathnameNode && isStringLiteral(pathnameNode)) {
          const rawValue = getStringLiteralValue(pathnameNode);
          linkReporter.reportPathname({
            node: pathnameNode,
            rawValue,
            method: 'href',
          });
        }
      }

      const resolvedAsValue = getStaticStringValue(
        asNode,
        ensureStaticIdentifierResolver()
      );

      if (typeof resolvedAsValue === 'string') {
        const rawValue = resolvedAsValue;
        asValue = rawValue;
        linkReporter.reportAsTarget({
          node: asNode,
          rawValue,
          method: 'href',
        });
      } else if (asNode && asNode.type === 'ObjectExpression') {
        const pathnameNode = getObjectPropertyValue(asNode, 'pathname');

        if (pathnameNode && isStringLiteral(pathnameNode)) {
          const rawValue = getStringLiteralValue(pathnameNode);
          asValue = rawValue;
          linkReporter.reportAsTarget({
            node: pathnameNode,
            rawValue,
            method: 'href',
          });
        }
      }

      if (hrefValue && asValue) {
        linkReporter.reportPreferUrlObject({
          urlNode: hrefNode,
          urlValue: hrefValue,
          asNode,
          asValue,
          method: 'href',
        });
      }
    }

    return {
      ImportDeclaration(node) {
        collectNextLinkLocalNames(node, linkNames);

        if (linkNames.size > 0) {
          ensureStaticIdentifierResolver();
        }
      },

      CallExpression: handleRouterCall,

      JSXOpeningElement: handleNextLinkOpeningElement,
    };
  },
};

module.exports = noInvalidRouterNavigation;
