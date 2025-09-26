# cookie

This is a mirror of [cookie](https://www.npmjs.com/package/cookie), bundled and exposed as ES module.

## Install

```
npm install @bundled-es-modules/cookie
```

## Use

```html
<script type="module">
  import cookie from '@bundled-es-modules/cookie';
  cookie.parse('foo=bar;'); // { foo: 'bar' }
</script>
```