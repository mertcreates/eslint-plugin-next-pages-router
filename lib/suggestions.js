const { unwrapChain } = require('./ast');

function formatSuggestion(suggestion) {
  return suggestion ? ` Did you mean '${suggestion}'?` : '';
}

function buildReplacementDesc(suggestion) {
  return `Replace with '${suggestion}'`;
}

function buildUrlObjectDesc() {
  return 'Use pathname and query instead of separate URLs';
}

function buildSuggestionFix(node, suggestion) {
  if (!suggestion) {
    return null;
  }

  const target = unwrapChain(node);

  if (!target) {
    return null;
  }

  let replacement = null;

  if (target.type === 'Literal' && typeof target.value === 'string') {
    const raw = typeof target.raw === 'string' ? target.raw : '';
    const quote =
      raw && (raw[0] === '"' || raw[0] === "'") ? raw[0] : null;

    if (quote) {
      const escaped = suggestion
        .replace(/\\/g, '\\\\')
        .replace(new RegExp(quote, 'g'), '\\' + quote);
      replacement = quote + escaped + quote;
    } else {
      replacement = JSON.stringify(suggestion);
    }
  } else if (
    target.type === 'TemplateLiteral' &&
    target.expressions.length === 0
  ) {
    const escaped = suggestion.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    replacement = '`' + escaped + '`';
  }

  if (!replacement) {
    return null;
  }

  return {
    desc: buildReplacementDesc(suggestion),
    fix(fixer) {
      return fixer.replaceText(target, replacement);
    },
  };
}

function reportWithSuggestion(context, node, messageId, data, suggestion) {
  const fixSuggestion = buildSuggestionFix(node, suggestion);

  context.report({
    node,
    messageId,
    data: {
      ...data,
      suggestion: formatSuggestion(suggestion),
    },
    suggest: fixSuggestion ? [fixSuggestion] : undefined,
  });
}

module.exports = {
  formatSuggestion,
  buildReplacementDesc,
  buildUrlObjectDesc,
  buildSuggestionFix,
  reportWithSuggestion,
};
