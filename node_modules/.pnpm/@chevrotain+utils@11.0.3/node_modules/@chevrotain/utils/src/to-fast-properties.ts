// based on: https://github.com/petkaantonov/bluebird/blob/b97c0d2d487e8c5076e8bd897e0dcd4622d31846/src/util.js#L201-L216
export function toFastProperties(toBecomeFast: any) {
  function FakeConstructor() {}

  // If our object is used as a constructor, it would receive
  FakeConstructor.prototype = toBecomeFast;
  const fakeInstance = new (FakeConstructor as any)();

  function fakeAccess() {
    return typeof fakeInstance.bar;
  }

  // help V8 understand this is a "real" prototype by actually using
  // the fake instance.
  fakeAccess();
  fakeAccess();

  // Always true condition to suppress the Firefox warning of unreachable
  // code after a return statement.
  if (1) return toBecomeFast;

  // Eval prevents optimization of this method (even though this is dead code)
  // - https://esbuild.github.io/content-types/#direct-eval
  /* istanbul ignore next */
  // tslint:disable-next-line
  (0, eval)(toBecomeFast);
}
