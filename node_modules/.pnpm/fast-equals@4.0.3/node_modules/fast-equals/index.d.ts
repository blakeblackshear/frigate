export interface BaseCircularMeta
  extends Pick<WeakMap<any, any>, 'delete' | 'get'> {
  set(key: object, value: any): any;
}

export interface CreateComparatorCreatorOptions<Meta> {
  areArraysEqual: TypeEqualityComparator<any, Meta>;
  areDatesEqual: TypeEqualityComparator<any, Meta>;
  areMapsEqual: TypeEqualityComparator<any, Meta>;
  areObjectsEqual: TypeEqualityComparator<any, Meta>;
  areRegExpsEqual: TypeEqualityComparator<any, Meta>;
  areSetsEqual: TypeEqualityComparator<any, Meta>;
  createIsNestedEqual: EqualityComparatorCreator<Meta>;
}

export type GetComparatorOptions<Meta> = (
  defaultOptions: CreateComparatorCreatorOptions<Meta>,
) => Partial<CreateComparatorCreatorOptions<Meta>>;

export type InternalEqualityComparator<Meta> = (
  a: any,
  b: any,
  indexOrKeyA: any,
  indexOrKeyB: any,
  parentA: any,
  parentB: any,
  meta: Meta,
) => boolean;

export type EqualityComparator<Meta> = Meta extends undefined
  ? <A, B>(a: A, b: B, meta?: Meta) => boolean
  : <A, B>(a: A, b: B, meta: Meta) => boolean;

export type EqualityComparatorCreator<Meta> = (
  fn: EqualityComparator<Meta>,
) => InternalEqualityComparator<Meta>;

export type NativeEqualityComparator = <A, B>(a: A, b: B) => boolean;

export type TypeEqualityComparator<Type, Meta> = (
  a: Type,
  b: Type,
  isEqual: InternalEqualityComparator<Meta>,
  meta: Meta,
) => boolean;

export function circularDeepEqual<A, B>(a: A, b: B): boolean;
export function circularShallowEqual<A, B>(a: A, b: B): boolean;
export function deepEqual<A, B>(a: A, b: B): boolean;
export function shallowEqual<A, B>(a: A, b: B): boolean;
export function sameValueZeroEqual<A, B>(a: A, b: B): boolean;

export function createCustomEqual<Meta = undefined>(
  getComparatorOptions: GetComparatorOptions<Meta>,
): EqualityComparator<Meta>;
export function createCustomCircularEqual<Meta = WeakMap<any, any>>(
  getComparatorOptions: GetComparatorOptions<Meta>,
): EqualityComparator<Meta>;
