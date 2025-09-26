<div align="center">

# [<img alt="Marko" src="https://raw.githubusercontent.com/marko-js/branding/master/marko-logo-medium-cropped.png" width="250">](https://markojs.com/)

**A declarative, HTML-based language that makes building web apps fun 🔥**

[![NPM](https://img.shields.io/npm/v/marko.svg)](https://www.npmjs.com/package/marko)
[![Discord Chat](https://img.shields.io/badge/discord-chat-7188da.svg)](https://discord.gg/RFGxYGs)
[![Continuous Integration status](https://github.com/marko-js/marko/actions/workflows/ci.yml/badge.svg)](https://github.com/marko-js/marko/actions/workflows/ci.yml)
[![Code coverage %](https://codecov.io/gh/marko-js/marko/branch/master/graph/badge.svg)](https://codecov.io/gh/marko-js/marko)
[![# of monthly downloads](https://img.shields.io/npm/dm/marko.svg)](https://npm-stat.com/charts.html?package=marko)
[![OpenSSF Best Practices](https://bestpractices.coreinfrastructure.org/projects/7029/badge)](https://bestpractices.coreinfrastructure.org/projects/7029)

[Docs](https://markojs.com/docs/getting-started/) ∙ [Try Online](https://markojs.com/try-online/) ∙ [Contribute](#contributors) ∙ [Get Support](#community--support)

</div>

## Intro

Marko is HTML _reimagined_ as a language for building dynamic and reactive user interfaces. Almost any valid HTML is valid Marko, and Marko extends HTML for building modern applications more declaratively. Among these extensions are [conditionals and lists](https://markojs.com/docs/conditionals-and-lists/), [state](https://markojs.com/docs/state/), and [components](https://markojs.com/docs/class-components/).

Marko supports both single-file components and components across separate files.

### Single-file component

The following renders a button and a counter of how many times the button has been pressed:

**click-count.marko**

```marko
class {
  onCreate() {
    this.state = { count: 0 };
  }
  increment() {
    this.state.count++;
  }
}

style {
  .count {
    color: #09c;
    font-size: 3em;
  }
  .press-me {
    padding: 0.5em;
  }
}

<output.count>
  ${state.count}
</output>
<button.press-me on-click('increment')>
  Press me!
</button>
```

### Multi-file component

The same component as above, but split into:

- `index.marko` template file
- `component.js` component JS logic file
- `style.css` component styles file

**index.marko**

```marko
<output.count>
  ${state.count}
</output>
<button.press-me on-click('increment')>
  Press me!
</button>
```

**component.js**

```js
export default {
  onCreate() {
    this.state = { count: 0 };
  },
  increment() {
    this.state.count++;
  },
};
```

**style.css**

```css
.count {
  color: #09c;
  font-size: 3em;
}
.press-me {
  padding: 0.5em;
}
```

## Concise Syntax

Marko also supports [a beautifully concise syntax as an alternative](https://markojs.com/docs/concise/) to its HTML syntax:

<table><thead><tr><th>Concise syntax<th>HTML syntax
<tbody><tr>
<td>

```marko
ul.example-list
  for|color| of=[a, b, c]
    li -- ${color}
```

<td>

```marko
<ul class="example-list">
  <for|color| of=[a, b, c]>
    <li>${color}</li>
  </for>
</ul>
```

</table>

## Getting Started

1. `npm install marko`
2. Read the [docs](https://markojs.com/docs/getting-started/)

## Community & Support

<table>
<thead><tr>
  <th><img alt="Stack Overflow" src="https://user-images.githubusercontent.com/1958812/56055468-619b3e00-5d0e-11e9-92ae-200c212cafb8.png" width="205"> 
  <th><img alt="Discord" src="https://user-images.githubusercontent.com/4985201/89313514-6edbea80-d62d-11ea-8447-ca2fd8983661.png" width="162">
  <th><img alt="Twitter" src="https://user-images.githubusercontent.com/1958812/56055707-07e74380-5d0f-11e9-8a59-d529fbb5a81e.png" width="53">
<tbody><tr><td>
  
  Ask and answer [StackOverflow questions with the `#marko` tag](https://stackoverflow.com/questions/tagged/marko)<td>

Come [hang out in our Discord chat](https://discord.gg/RFGxYGs), ask questions, and discuss project direction<td>

[Tweet to `@MarkoDevTeam`](https://twitter.com/MarkoDevTeam), or with the [`#markojs` hashtag](https://twitter.com/search?q=%23markojs&f=live)

</table>

### Contributors

Marko would not be what it is without all those who have contributed ✨

[![All marko-js/marko GitHub contributors](https://opencollective.com/marko-js/contributors.svg?width=890&button=false)](https://github.com/marko-js/marko/graphs/contributors)

### Get Involved!

- Pull requests are welcome!
- Submit [GitHub issues](https://github.com/marko-js/marko/issues) for any feature enhancements, bugs, or documentation problems
- [Read the Contribution Tips and Guidelines](.github/CONTRIBUTING.md)
- Participants in this project agree to abide by [its Code of Conduct](https://github.com/eBay/.github/blob/main/CODE_OF_CONDUCT.md)
