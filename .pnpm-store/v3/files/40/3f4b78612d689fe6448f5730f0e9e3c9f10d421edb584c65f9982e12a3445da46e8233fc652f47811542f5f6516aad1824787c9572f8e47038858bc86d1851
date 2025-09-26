import { Linter } from 'eslint';

// prettier-ignore
type IfEqual<A, B, X = A, Y = B> =
  (<G>() => G extends A & G | G ? 1 : 2) extends
  (<G>() => G extends B & G | G ? 1 : 2)
    ? X
    : Y;

declare const recommendedConfig: IfEqual<Linter.Config, Linter.FlatConfig>;

export = recommendedConfig;
