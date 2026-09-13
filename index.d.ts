import type { ESLint, Linter, Rule } from 'eslint';

declare const plugin: plugin.Plugin;

declare namespace plugin {
  type PluginName = '@mertcreates/next-pages-router';

  /** Options shared by both rules. */
  interface SharedOptions {
    /** Path to the Next.js pages directory. */
    pagesDir?: string;
    /** Base path to remove from URLs before route matching. */
    basePath?: string;
    /** Locales to remove from URLs before route matching. */
    locales?: readonly string[];
    /** Read basePath and locales from the Next.js config file. */
    readNextConfig?: boolean;
    /** Optional path to the Next.js config file. */
    nextConfigPath?: string;
    /**
     * Optional router identifiers or member paths to allow. When omitted,
     * scoped next/router default imports and const useRouter() results are
     * detected, with unresolved router and Router fallback names. When
     * provided, this list is used as the explicit allowlist.
     */
    routerObjects?: readonly string[];
    /** Report URLs that do not match a known pages route. */
    warnOnUnknownPaths?: boolean;
    /** Offer a suggestion for the closest known route. */
    suggestClosestRoute?: boolean;
    /** Skip checks when the pages directory does not exist. */
    skipIfPagesDirMissing?: boolean;
  }

  /** Options for the no-invalid-route-compare rule. */
  interface CompareOptions extends SharedOptions {
    /** Router fields treated as route patterns. */
    routeProperties?: readonly string[];
    /** Enable strict and loose equality checks. */
    checkEquality?: boolean;
    /** Enable includes checks. */
    checkIncludes?: boolean;
    /** Enable switch statement checks. */
    checkSwitch?: boolean;
  }

  /** Options for the no-invalid-router-navigation rule. */
  interface NavigationOptions extends SharedOptions {
    /** Prefer URL objects with pathname and query over legacy arguments. */
    preferUrlObject?: boolean;
  }

  /** An ESLint rule definition with its metadata and visitor callbacks. */
  type RuleModule = Rule.RuleModule;

  type Rules = {
    'no-invalid-route-compare': RuleModule;
    'no-invalid-router-navigation': RuleModule;
  };

  type FlatPlugin = ESLint.Plugin;

  type RecommendedRules = {
    '@mertcreates/next-pages-router/no-invalid-route-compare': 'warn';
    '@mertcreates/next-pages-router/no-invalid-router-navigation': 'warn';
  };

  interface LegacyRecommendedConfig {
    plugins: PluginName[];
    rules: RecommendedRules;
  }

  interface FlatRecommendedConfig {
    plugins: Record<PluginName, FlatPlugin>;
    rules: RecommendedRules;
  }

  type Configs = {
    recommended: LegacyRecommendedConfig;
    'flat/recommended': FlatRecommendedConfig;
  };

  type Plugin = {
    rules: Rules;
    configs: Configs;
  };
}

export = plugin;
