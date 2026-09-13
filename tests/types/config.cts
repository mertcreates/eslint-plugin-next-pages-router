import plugin = require('@mertcreates/eslint-plugin-next-pages-router');
import type { ESLint, Linter, Rule } from 'eslint';

const compareOptions: plugin.CompareOptions = {
  pagesDir: 'pages',
  checkSwitch: false,
  locales: ['en', 'tr'],
};

const navigationOptions: plugin.NavigationOptions = {
  pagesDir: 'pages',
  preferUrlObject: true,
};

const ruleName: keyof typeof plugin.rules = 'no-invalid-route-compare';
const presetName: keyof typeof plugin.configs = 'flat/recommended';
const recommended = plugin.configs.recommended;
const flatRecommended = plugin.configs['flat/recommended'];
const compareRule: Rule.RuleModule =
  plugin.rules['no-invalid-route-compare'];
const ruleDescription: string | undefined = compareRule.meta?.docs?.description;
const ruleSchema: Rule.RuleMetaData['schema'] = compareRule.meta?.schema;
declare const ruleContext: Parameters<Rule.RuleModule['create']>[0];
const ruleVisitor: ReturnType<Rule.RuleModule['create']> =
  compareRule.create(ruleContext);
const flatConfig: Linter.FlatConfig = plugin.configs['flat/recommended'];
const legacyConfig: Linter.LegacyConfig = plugin.configs.recommended;
const eslintPlugin: ESLint.Plugin = plugin;

void compareOptions;
void navigationOptions;
void ruleName;
void presetName;
void recommended;
void flatRecommended;
void ruleDescription;
void ruleSchema;
void ruleVisitor;
void flatConfig;
void legacyConfig;
void eslintPlugin;

const invalidCompareOption: plugin.CompareOptions = {
  // @ts-expect-error unknown options must be rejected
  unknownOption: true,
};

const invalidCompareType: plugin.CompareOptions = {
  // @ts-expect-error option values must use their declared types
  checkSwitch: 'false',
};

const invalidNavigationFamily: plugin.NavigationOptions = {
  // @ts-expect-error compare-only options must not appear on navigation
  checkSwitch: false,
};

const invalidCompareFamily: plugin.CompareOptions = {
  // @ts-expect-error navigation-only options must not appear on compare
  preferUrlObject: true,
};

// @ts-expect-error rule names are limited to the plugin's declared rules
const invalidRuleName = plugin.rules['unknown-rule'];
// @ts-expect-error preset names are limited to the plugin's declared presets
const invalidPresetName = plugin.configs['unknown-preset'];
const invalidPresetRule =
  // @ts-expect-error preset rule names are limited to the plugin's declared rules
  plugin.configs['flat/recommended'].rules['unknown-rule'];

void invalidCompareOption;
void invalidCompareType;
void invalidNavigationFamily;
void invalidCompareFamily;
void invalidRuleName;
void invalidPresetName;
void invalidPresetRule;
