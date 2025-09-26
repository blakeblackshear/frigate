# Reproducing a build

## Clone version

```
git clone https://github.com/planttheidea/fast-equals.git
cd fast-equals
git checkout {version}
```

Replace `{version}` above with the appropriate package version. If you want to compare a version older than `1.6.2`, you'll need to use a commit hash directly.

## Install

```
yarn install
```

We use `yarn` for our package management, so to ensure that exact dependencies you should also use it.

## Build artifacts

```
yarn run build
```

**NOTE**: To get an exact checksum match with the versions released on npm, it may be necessary to change line endings. For example, on Linux you might run:

```
unix2dos dist/fast-equals.min.js
```

## Get checksum

```
sha256sum dist/fast-equals.min.js
```
