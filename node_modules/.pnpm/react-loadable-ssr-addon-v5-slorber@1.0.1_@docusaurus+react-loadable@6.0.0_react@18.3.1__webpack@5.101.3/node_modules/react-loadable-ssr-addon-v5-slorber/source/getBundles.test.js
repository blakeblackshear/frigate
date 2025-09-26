import test from 'ava';
import path from 'path';
import getBundles from './getBundles';
import config from '../webpack.config';
import manifest from '../example/dist/react-loadable-ssr-addon'; // eslint-disable-line import/no-unresolved, import/extensions

const modules = ['./Header', './multilevel/Multilevel', './SharedMultilevel', '../../SharedMultilevel'];
const fileType = ['js'];
let bundles;

test.beforeEach(() => {
  bundles = getBundles(manifest, [...manifest.entrypoints, ...modules]);
});

test('returns the correct bundle size and content', (t) => {
  t.true(Object.keys(bundles).length === fileType.length);
  fileType.forEach((type) => !!bundles[type]);
});

test('returns the correct bundle infos', (t) => {
  fileType.forEach((type) => {
    bundles[type].forEach((bundle) => {
      const expectedPublichPath = path.resolve(config.output.publicPath, bundle.file);

      t.true(bundle.file !== '');
      t.true(bundle.hash !== '');
      t.true(bundle.publicPath === expectedPublichPath);
    });
  });
});


test('returns nothing when there is no match', (t) => {
  bundles = getBundles(manifest, ['foo-bar', 'foo', null, undefined]);

  t.true(Object.keys(bundles).length === 0);
});


test('should work even with null/undefined manifest or modules', (t) => {
  bundles = getBundles(manifest, null);
  t.true(Object.keys(bundles).length === 0);

  bundles = getBundles(null, []);
  t.true(Object.keys(bundles).length === 0);

  bundles = getBundles([], null);
  t.true(Object.keys(bundles).length === 0);
});
