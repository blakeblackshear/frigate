import test from 'ava';
import unique from './unique';

test('it filters duplicated entries', (t) => {
  const duplicated = ['two', 'four'];
  const raw = ['one', 'two', 'three', 'four'];
  const filtered = unique([...raw, ...duplicated]);

  duplicated.forEach((dup) => {
    t.true(filtered.filter((item) => item === dup).length === 1);
  });
});

test('should work with null/undefined values', (t) => {
  const falsy = [null, undefined];
  const raw = ['one', 'two', 'three', 'four'];
  const filtered = unique([...raw, ...falsy]);

  falsy.forEach((value) => {
    t.true(filtered.includes(value));
  });
});
