import type { Linter, Rule } from 'eslint';

declare const plugin: {
  meta: {
    name: string;
    version: string;
  };
  environments: {
    globals: {
      globals: {
        [key: string]: boolean;
      };
    };
  };
  configs: {
    all: Linter.LegacyConfig;
    recommended: Linter.LegacyConfig;
    style: Linter.LegacyConfig;
    'flat/all': Linter.FlatConfig;
    'flat/recommended': Linter.FlatConfig;
    'flat/style': Linter.FlatConfig;
  };
  rules: {
    [key: string]: Rule.RuleModule;
  };
};

export = plugin;
