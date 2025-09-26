<p align="center">
  <img align="center" width="50%" src="https://user-images.githubusercontent.com/25597854/93541153-d8c8fe80-f912-11ea-9e65-a0089ca6d2b6.png">
</p>

<h1 align="center" style="text-align: center; width: fit-content; margin-left: auto; margin-right: auto;">eta (η)</h1>

<p align="center">
  <a href="https://eta.js.org">Documentation</a> -
  <a href="https://gitter.im/eta-dev/community">Chat</a> -
  <a href="https://runkit.com/nebrelbug/eta-simple-demo">RunKit Demo</a> -
  <a href="https://eta.js.org/playground">Playground</a>
</p>

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[logo]: https://img.shields.io/badge/all_contributors-10-orange.svg "Number of contributors on All-Contributors"

<!-- ALL-CONTRIBUTORS-BADGE:END -->

<span align="center">

[![GitHub package.json version (master)](https://img.shields.io/github/package-json/v/eta-dev/eta/master?label=current%20version)](https://www.npmjs.com/package/eta)
[![deno module](https://img.shields.io/badge/deno-module-informational?logo=deno)](https://deno.land/x/eta)
[![Travis](https://img.shields.io/travis/com/eta-dev/eta/master.svg)](https://travis-ci.com/eta-dev/eta)
[![All Contributors][logo]](#contributors-)
[![Coveralls](https://img.shields.io/coveralls/eta-dev/eta.svg)](https://coveralls.io/github/eta-dev/eta)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/bengubler)

</span>

**Summary**

Eta is a lightweight and blazing fast embedded JS templating engine that works inside Node, Deno, and the browser. Created by the developers of [Squirrelly](https://squirrelly.js.org), it's written in TypeScript and emphasizes phenomenal performance, configurability, and low bundle size.

### 🌟 Features

- 📦 0 dependencies
- 💡 2.3KB minzipped; size restricted to <3KB forever with [size-limit](https://github.com/ai/size-limit)
- ⚡️ Written in TypeScript
- ✨ Deno support (+ Node and browser)
- 🚀 Super Fast
  - Check out [these benchmarks](https://raw.githack.com/eta-dev/eta/master/browser-tests/benchmark.html)
- 🔧 Configurable
  - Plugins, custom delimiters, caching
- 🔨 Powerful
  - Precompilation, partials, async
  - **Layout support**!
  - ExpressJS support out-of-the-box
- 🔥 Reliable
  - Better quotes/comments support
    - _ex._ `<%= someval + "string %>" %>` compiles correctly, while it fails with doT or EJS
  - Great error reporting
- ⚡️ Exports ES Modules as well as UMD
- 📝 Easy template syntax

## Eta vs other template engines

<details open>
  <summary>
  <b>Eta vs EJS</b>
  </summary>
  
Eta's syntax is very similar to EJS' (most templates should work with either engine), Eta has a similar API, and Eta and EJS share the same file-handling logic. Here are the differences between Eta and EJS:

- Eta is more lightweight. Eta weighs less than **2.5KB gzipped**, while EJS is **4.4KB gzipped**
- Eta compiles and renders templates **_much_ faster than EJS**. Check out these benchmarks: https://rawgit.com/eta-dev/eta/master/browser-tests/benchmark.html
- Eta allows left whitespace control (with `-`), something that doesn't work in EJS because EJS uses `-` on the left side to indicate that the value shouldn't be escaped. Instead, Eta uses `~` to output a raw value
- Eta gives you more flexibility with delimeters -- you could set them to `{{` and `}}`, for example, while with EJS this isn't possible
- Eta adds plugin support
- Comments in Eta use `/* ... */` which allows commenting around template tags
- Eta parses strings correctly. _Example: `<%= "%>" %>` works in Eta, while it breaks in EJS_
- Eta exposes Typescript types and distributes a UMD build
- Eta supports custom tag-type indicators. _Example: you could change `<%=` to `<%*`_

</details>

<details>
  <summary>
  <b>Eta vs doT.js</b>
  </summary>

Eta and doT.js both allow embedded JavaScript, and [both have best-in-class performance](https://ghcdn.rawgit.org/eta-dev/eta/master/browser-tests/benchmark.html) when compared to other template engines (though Eta is slightly faster with HTML-escaped templates). Here are some of the differences between Eta and doT.js:

- Eta allows you to control how you strip preceding and trailing whitespace after tags.
- It's much simpler to set custom delimiters with Eta than doT -- you don't have to rewrite every configuration Regular Expression
- Eta supports plugins
- Eta supports async
- Eta parses strings and multi-line comments correctly. _Example: `<%= "%>" %>` works in Eta, while the equivalent breaks in doT_
- Eta exposes Typescript types and distributes a UMD build
- Eta supports runtime partials and file-handling.

</details>

<details>
  <summary>
  <b>Eta vs Handlebars</b>
  </summary>
  
Eta and Handlebars are very different in some ways -- Eta is an embedded template engine, while Handlebars is a logic-less template engine. Here some additional differences between Eta and Handlebars:

- Eta is more lightweight. Eta weighs less than **2.5KB gzipped**, while Handlebars is **~22KB gzipped**
- Eta compiles and renders templates **_much_ faster than Handlebars** -- around **7x faster**. Check out these benchmarks: https://ghcdn.rawgit.org/eta-dev/eta/master/browser-tests/benchmark.html
- Eta allows you to set custom delimiters
- Eta supports plugins
- Eta exposes Typescript types and distributes a UMD build
- Custom tag-type indicators. _Example: you could change `<%=` to `<%*`_
- With Eta, you don't need to register tons of helpers to do simple tasks like check if one value equals another value
- Note that Eta templates run as **trusted code** -- just like any other JavaScript you write.<br><br>If you are running user-defined/created templates on your machine, server, site, etc., you probably should go with a tool built for that purpose, like Handlebars.

</details>

<details>
  <summary>
  <b>Eta vs ES6 Template Literals</b>
  </summary>

Template literals are a super useful tool, especially for shortening simple string concatenation. But writing complete templates using template literals can quickly get out of hand. Here's a comparison of Eta and template literals:

- Eta compiles templates into JavaScript functions that use string concatenation and have comparable performance with template literals
- Eta lets you control preceding and trailing whitespace around tags
- Eta gives you more flexibility with delimeters -- you could set them to `{{` and `}}`, for example, or set them to `${` and `}` to mimic template literals
- Eta supports plugins
- Eta supports comments with `/* ... */` syntax, just like in regular JavaScript. Template literals require you to stick a blank string after the comment: `/* ... */""`, which is much less readable
- To write conditionals inside template literals, you have to use the ternary operator. Add more conditions or nested conditionals, and it quickly becomes a nightmarish mess of `? ... : ... ? ... : ...`. Writing conditionals in Eta is much simpler and more readable
- Eta supports partials

</details>

## Why Eta?

Simply put, Eta is super: super lightweight, super fast, super powerful, and super simple. Like with EJS, you don't have to worry about learning an entire new templating syntax. Just write JavaScript inside your templates.

### Where did Eta's name come from?

"Eta" means tiny in Esperanto. Plus, it can be used as an acronym for all sorts of cool phrases: "ECMAScript Template Awesomeness", "Embedded Templating Alternative", etc....

Additionally, Eta is a letter of the Greek alphabet (it stands for all sorts of cool things in various mathematical fields, including efficiency) and is three letters long (perfect for a file extension).

## Integrations

<details>
  <summary>
    <b>Visual Studio Code</b>
  </summary>

[@shadowtime2000](https://github.com/shadowtime2000) created [eta-vscode](https://marketplace.visualstudio.com/items?itemName=shadowtime2000.eta-vscode).

</details>

<details>
  <summary>
    <b>ESLint</b>
  </summary>

[eslint-plugin-eta](https://github.com/eta-dev/eslint-plugin-eta) was created to provide an ESLint processor so you can lint your Eta templates.

</details>

<details>
  <summary>
    <b>CLI</b>
  </summary>

An official Eta CLI exists called [etajs-cli](https://github.com/eta-dev/etajs-cli).

</details>

<details>
  <summary>
    <b>Webpack</b>
  </summary>

Currently there is no official Webpack integration but [@clshortfuse](https://github.com/clshortfuse) shared the loader he uses:

```javascript
{
  loader: 'html-loader',
  options: {
    preprocessor(content, loaderContext) {
      return eta.render(content, {}, { filename: loaderContext.resourcePath });
    },
  },
}
```

</details>
  
<details>
  <summary>
    <b>Node-RED</b>
  </summary>

To operate with Eta templates in Node-RED: [@ralphwetzel/node-red-contrib-eta](https://flows.nodered.org/node/@ralphwetzel/node-red-contrib-eta)

  <img width="150" alt="image" src="https://user-images.githubusercontent.com/16342003/160198427-2a69ff10-e8bf-4873-9d99-2929a584ccc8.png">

</details>

## 📜 Docs

We know nobody reads through the long and boring documentation in the ReadMe anyway, so head over to the documentation website:

📝 [https://eta.js.org](https://eta.js.org)

## 📓 Examples

### Simple Template

```javascript
import * as Eta from "eta";
var myTemplate = "<p>My favorite kind of cake is: <%= it.favoriteCake %></p>";

Eta.render(myTemplate, { favoriteCake: "Chocolate!" });
// Returns: '<p>My favorite kind of cake is: Chocolate!</p>'
```

### Conditionals

```ejs
<% if(it.somevalue === 1) { %>
Display this
<% } else { %>
Display this instead
<% } %>
```

### Loops

```ejs
<ul>
<% it.users.forEach(function(user){ %>
<li><%= user.name %></li>
<% }) %>
</ul>
```

### Partials

```ejs
<%~ include('mypartial') %>
```

```ejs
<%~ includeFile('./footer') %>
```

```ejs
<%~ include('users', {users: it.users}) %>
```

## ✔️ Tests

Tests can be run with `npm test`. Multiple tests check that parsing, rendering, and compiling return expected results, formatting follows guidelines, and code coverage is at the expected level.

## Resources

To be added

## Projects using `eta`

- [Docusaurus v2](https://v2.docusaurus.io): open-source documentation framework that uses Eta to generate a SSR build
- [swagger-typescript-api](https://github.com/acacode/swagger-typescript-api): Open source typescript api codegenerator from Swagger. Uses Eta as codegenerator by templates
- [html-bundler-webpack-plugin](https://github.com/webdiscus/html-bundler-webpack-plugin): Webpack plugin make easily to bundle HTML pages from templates, source styles and scripts
- [SmartDeno](https://github.com/guildenstern70/SmartDeno): SmartDeno is an easy to setup web template using Deno & Oak  
- [Add yours!](https://github.com/eta-dev/eta/edit/master/README.md)

## Contributors

Made with ❤ by [@nebrelbug](https://github.com/eta-dev) and all these wonderful contributors ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://www.bengubler.com"><img src="https://avatars3.githubusercontent.com/u/25597854?v=4?s=100" width="100px;" alt="Ben Gubler"/><br /><sub><b>Ben Gubler</b></sub></a><br /><a href="https://github.com/eta-dev/eta/commits?author=nebrelbug" title="Code">💻</a> <a href="#question-nebrelbug" title="Answering Questions">💬</a> <a href="https://github.com/eta-dev/eta/commits?author=nebrelbug" title="Documentation">📖</a> <a href="https://github.com/eta-dev/eta/commits?author=nebrelbug" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/clitetailor"><img src="https://avatars1.githubusercontent.com/u/16368559?v=4?s=100" width="100px;" alt="Clite Tailor"/><br /><sub><b>Clite Tailor</b></sub></a><br /><a href="#ideas-clitetailor" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/eta-dev/eta/commits?author=clitetailor" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/ioan_chiriac"><img src="https://avatars2.githubusercontent.com/u/173203?v=4?s=100" width="100px;" alt="Ioan CHIRIAC"/><br /><sub><b>Ioan CHIRIAC</b></sub></a><br /><a href="https://github.com/eta-dev/eta/commits?author=ichiriac" title="Code">💻</a> <a href="#ideas-ichiriac" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/craig-morten/"><img src="https://avatars1.githubusercontent.com/u/46491566?v=4?s=100" width="100px;" alt="Craig Morten"/><br /><sub><b>Craig Morten</b></sub></a><br /><a href="https://github.com/eta-dev/eta/commits?author=asos-craigmorten" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/trojanh"><img src="https://avatars0.githubusercontent.com/u/22974490?v=4?s=100" width="100px;" alt="Rajan Tiwari"/><br /><sub><b>Rajan Tiwari</b></sub></a><br /><a href="#example-trojanh" title="Examples">💡</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://shadowtime2000.github.io"><img src="https://avatars1.githubusercontent.com/u/66655515?v=4?s=100" width="100px;" alt="shadowtime2000"/><br /><sub><b>shadowtime2000</b></sub></a><br /><a href="https://github.com/eta-dev/eta/commits?author=shadowtime2000" title="Code">💻</a> <a href="#ideas-shadowtime2000" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/eta-dev/eta/commits?author=shadowtime2000" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://hamidihamza.com"><img src="https://avatars0.githubusercontent.com/u/22576950?v=4?s=100" width="100px;" alt="Hamza Hamidi"/><br /><sub><b>Hamza Hamidi</b></sub></a><br /><a href="https://github.com/eta-dev/eta/commits?author=hamzahamidi" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://calumk.com"><img src="https://avatars1.githubusercontent.com/u/1183991?v=4?s=100" width="100px;" alt="Calum Knott"/><br /><sub><b>Calum Knott</b></sub></a><br /><a href="#ideas-calumk" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nhaef"><img src="https://avatars.githubusercontent.com/u/16443053?v=4?s=100" width="100px;" alt="nhaef"/><br /><sub><b>nhaef</b></sub></a><br /><a href="https://github.com/eta-dev/eta/commits?author=nhaef" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://heyhey.to/Gün"><img src="https://avatars.githubusercontent.com/u/74139498?v=4?s=100" width="100px;" alt="Gün"/><br /><sub><b>Gün</b></sub></a><br /><a href="https://github.com/eta-dev/eta/commits?author=gurgunday" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind are welcome!

## Credits

- Async support and file handling were added based on code from [EJS](https://github.com/mde/ejs), which is licensed under the Apache-2.0 license. Code was modified and refactored to some extent.
- Syntax and some parts of compilation are heavily based off EJS, Nunjucks, and doT.
