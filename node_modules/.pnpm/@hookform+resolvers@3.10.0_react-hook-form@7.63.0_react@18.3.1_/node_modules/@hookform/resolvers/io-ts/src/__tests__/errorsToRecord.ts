import { isLeft } from 'fp-ts/Either';
import * as t from 'io-ts';
import errorsToRecord from '../errorsToRecord';

const assertLeft = <T>(result: t.Validation<T>) => {
  expect(isLeft(result)).toBe(true);
  if (!isLeft(result)) {
    throw new Error(
      'panic! error is not of the "left" type, should be unreachable',
    );
  }
  return result.left;
};

const FIRST_NAME_FIELD_PATH = 'firstName' as const;
const FIRST_NAME_ERROR_SHAPE = {
  message: 'expected string but got undefined',
  type: 'string',
};
describe('errorsToRecord', () => {
  it('should return a correct error for an exact intersection type error object', () => {
    // a recommended pattern from https://github.com/gcanti/io-ts/blob/master/index.md#mixing-required-and-optional-props
    const schema = t.exact(
      t.intersection([
        t.type({
          [FIRST_NAME_FIELD_PATH]: t.string,
        }),
        t.partial({
          lastName: t.string,
        }),
      ]),
    );
    const error = assertLeft(schema.decode({}));
    const record = errorsToRecord(false)(error);
    expect(record[FIRST_NAME_FIELD_PATH]).toMatchObject(FIRST_NAME_ERROR_SHAPE);
  });
  it('should return a correct error for a branded intersection', () => {
    interface Brand {
      readonly Brand: unique symbol;
    }
    const schema = t.brand(
      t.intersection([
        t.type({
          [FIRST_NAME_FIELD_PATH]: t.string,
        }),
        t.type({
          lastName: t.string,
        }),
      ]),
      (_x): _x is t.Branded<typeof _x, Brand> => true,
      'Brand',
    );
    const error = assertLeft(schema.decode({}));
    const record = errorsToRecord(false)(error);
    expect(record[FIRST_NAME_FIELD_PATH]).toMatchObject(FIRST_NAME_ERROR_SHAPE);
  });
});
