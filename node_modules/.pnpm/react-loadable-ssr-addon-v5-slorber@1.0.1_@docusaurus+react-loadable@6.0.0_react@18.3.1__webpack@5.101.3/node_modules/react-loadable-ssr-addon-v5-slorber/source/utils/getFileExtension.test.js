import test from 'ava';
import getFileExtension from './getFileExtension';

test('returns the correct file extension', (t) => {
  const extensions = ['.jpeg', '.js', '.css', '.json', '.xml'];
  const filePath = 'source/static/images/hello-world';

  extensions.forEach((ext) => {
    t.true(getFileExtension(`${filePath}${ext}`) === ext);
  });
});


test('sanitize file hash', (t) => {
  const hashes = ['?', '#'];
  const filePath = 'source/static/images/hello-world.jpeg';

  hashes.forEach((hash) => {
    t.true(getFileExtension(`${filePath}${hash}d587bbd6e38337f5accd`) === '.jpeg');
  });
});

test('returns empty string when there is no file extension', (t) => {
  const filePath = 'source/static/resource';

  t.true(getFileExtension(filePath) === '');
});


test('should work even with null/undefined arg', (t) => {
  const filePaths = ['', null, undefined];

  filePaths.forEach((path) => {
    t.true(getFileExtension(path) === '');
  });
});
