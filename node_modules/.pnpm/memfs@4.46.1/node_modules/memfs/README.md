# memfs

[![][npm-badge]][npm-url]

[npm-url]: https://www.npmjs.com/package/memfs
[npm-badge]: https://img.shields.io/npm/v/memfs.svg

JavaScript file system utilities for Node.js and browser.

## Install

```shell
npm i memfs
```

## Resources

- [In-memory Node.js `fs` API](./docs/node/index.md)
- [In-memory browser File System (Access) API](./docs/fsa/fsa.md)
- [`fs` to File System (Access) API adapter](./docs/fsa/fs-to-fsa.md)
- [File System (Access) API to `fs` adapter](./docs/fsa/fsa-to-fs.md)
- [Directory `snapshot` utility](./docs/snapshot/index.md)
- [`print` directory tree to terminal](./docs/print/index.md)
- [Code reference](https://streamich.github.io/memfs/)
- [Test coverage](https://streamich.github.io/memfs/coverage/lcov-report/)

## Demos

- [Git in browser, which writes to a real folder](demo/git-fsa/README.md)
- [Git in browser, which writes to OPFS file system](demo/git-opfs/README.md)
- [Git on in-memory file system](demo/git/README.md)
- [`fs` in browser, creates a `.tar` file in real folder](demo/fsa-to-node-zipfile/README.md)
- [`fs` in browser, synchronous API, writes to real folder](demo/fsa-to-node-sync-tests/README.md)

## See also

- [`unionfs`][unionfs] - creates a union of multiple filesystem volumes
- [`fs-monkey`][fs-monkey] - monkey-patches Node's `fs` module and `require` function
- [`linkfs`][linkfs] - redirects filesystem paths
- [`spyfs`][spyfs] - spies on filesystem actions

[unionfs]: https://github.com/streamich/unionfs
[fs-monkey]: https://github.com/streamich/fs-monkey
[linkfs]: https://github.com/streamich/linkfs
[spyfs]: https://github.com/streamich/spyfs

## License

Apache 2.0
