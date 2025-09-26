import * as Either from 'fp-ts/Either';
import * as Option from 'fp-ts/Option';
import * as ReadonlyArray from 'fp-ts/ReadonlyArray';
import * as ReadonlyRecord from 'fp-ts/ReadonlyRecord';
import * as SemiGroup from 'fp-ts/Semigroup';
import { absurd, flow, identity, not, pipe } from 'fp-ts/function';
import * as t from 'io-ts';
import {
  ExactType,
  IntersectionType,
  RefinementType,
  TaggedUnionType,
  UnionType,
  ValidationError,
} from 'io-ts';
import arrayToPath from './arrayToPath';
import { ErrorObject, FieldErrorWithPath } from './types';

const INSTANCE_TYPES_TO_FILTER = [
  TaggedUnionType,
  UnionType,
  IntersectionType,
  ExactType,
  RefinementType,
];
const formatErrorPath = (context: t.Context): string =>
  pipe(
    context,
    ReadonlyArray.filterMapWithIndex((index, contextEntry) => {
      const previousIndex = index - 1;
      const previousContextEntry =
        previousIndex === -1 ? undefined : context[previousIndex];
      const shouldBeFiltered =
        previousContextEntry === undefined ||
        INSTANCE_TYPES_TO_FILTER.some(
          (type) => previousContextEntry.type instanceof type,
        );

      return shouldBeFiltered ? Option.none : Option.some(contextEntry);
    }),
    ReadonlyArray.map(({ key }) => key),
    ReadonlyArray.map((key) =>
      pipe(
        key,
        (k) => parseInt(k, 10),
        Either.fromPredicate(not<number>(Number.isNaN), () => key),
      ),
    ),
    ReadonlyArray.toArray,
    arrayToPath,
  );

const formatError = (e: t.ValidationError): FieldErrorWithPath => {
  const path = formatErrorPath(e.context);

  const message = pipe(
    e.message,
    Either.fromNullable(e.context),
    Either.mapLeft(
      flow(
        ReadonlyArray.last,
        Option.map(
          (contextEntry) =>
            `expected ${contextEntry.type.name} but got ${JSON.stringify(
              contextEntry.actual,
            )}`,
        ),
        Option.getOrElseW(() =>
          absurd<string>('Error context is missing name' as never),
        ),
      ),
    ),
    Either.getOrElseW(identity),
  );

  const type = pipe(
    e.context,
    ReadonlyArray.last,
    Option.map((contextEntry) => contextEntry.type.name),
    Option.getOrElse(() => 'unknown'),
  );

  return { message, type, path };
};

// this is almost the same function like Semigroup.getObjectSemigroup but reversed
// in order to get the first error
const getObjectSemigroup = <
  A extends Record<string, unknown> = never,
>(): SemiGroup.Semigroup<A> => ({
  concat: (first, second) => Object.assign({}, second, first),
});

const concatToSingleError = (
  errors: ReadonlyArray<FieldErrorWithPath>,
): ErrorObject =>
  pipe(
    errors,
    ReadonlyArray.map((error) => ({
      [error.path]: {
        type: error.type,
        message: error.message,
      },
    })),
    (errors) => SemiGroup.fold(getObjectSemigroup<ErrorObject>())({}, errors),
  );

const appendSeveralErrors: SemiGroup.Semigroup<FieldErrorWithPath> = {
  concat: (a, b) => ({
    ...b,
    types: { ...a.types, [a.type]: a.message, [b.type]: b.message },
  }),
};

const concatToMultipleErrors = (
  errors: ReadonlyArray<FieldErrorWithPath>,
): ErrorObject =>
  pipe(
    ReadonlyRecord.fromFoldableMap(appendSeveralErrors, ReadonlyArray.Foldable)(
      errors,
      (error) => [error.path, error],
    ),
    ReadonlyRecord.map((errorWithPath) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { path, ...error } = errorWithPath;

      return error;
    }),
  );

const errorsToRecord =
  (validateAllFieldCriteria: boolean) =>
  (validationErrors: ReadonlyArray<ValidationError>): ErrorObject => {
    const concat = validateAllFieldCriteria
      ? concatToMultipleErrors
      : concatToSingleError;

    return pipe(validationErrors, ReadonlyArray.map(formatError), concat);
  };

export default errorsToRecord;
