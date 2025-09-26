type UnwrapPromise<P extends unknown> = P extends PromiseLike<infer V> ? V : P;

type Input = Record<string | number | symbol, unknown>;

type Result<Obj extends Input> = {
  [P in keyof Obj]: UnwrapPromise<Obj[P]>;
};

export default function combinePromises<Obj extends Input>(
  obj: Obj
): Promise<Result<Obj>> {
  if (obj === null) {
    return Promise.reject(
      new Error('combinePromises does not handle null argument')
    );
  }
  if (typeof obj !== 'object') {
    return Promise.reject(
      new Error(
        `combinePromises does not handle argument of type ${typeof obj}`
      )
    );
  }

  const keys = Object.keys(obj);

  // not using async/await on purpose, otherwise lib outputs large _asyncToGenerator code in dist
  return Promise.all(Object.values(obj)).then(values => {
    const result: any = {};
    values.forEach((v, i) => {
      result[keys[i]] = v;
    });
    return result;
  });
}
