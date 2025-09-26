import test from 'ava';
import hasEntry from './hasEntry';

const assets = [
  {

    file: 'content.chunk.js',
    hash: 'd41d8cd98f00b204e9800998ecf8427e',
    publicPath: './',
    integrity: null,
  },
  {

    file: 'header.chunk.js',
    hash: '699f4bd49870f2b90e1d1596d362efcb',
    publicPath: './',
    integrity: null,
  },
  {

    file: 'shared-multilevel.chunk.js',
    hash: 'ab7b8b1c1d5083c17a39ccd2962202e1',
    publicPath: './',
    integrity: null,
  },
];

test('should flag as has entry', (t) => {
  const fileName = 'header.chunk.js';

  t.true(hasEntry(assets, 'file', fileName));
});

test('should flag as has no entry', (t) => {
  const fileName = 'footer.chunk.js';

  t.false(hasEntry(assets, 'file', fileName));
});

test('should work even with null/undefined target', (t) => {
  const targets = [[], null, undefined];

  targets.forEach((target) => {
    t.false(hasEntry(target, 'file', 'foo.js'));
  });
});
