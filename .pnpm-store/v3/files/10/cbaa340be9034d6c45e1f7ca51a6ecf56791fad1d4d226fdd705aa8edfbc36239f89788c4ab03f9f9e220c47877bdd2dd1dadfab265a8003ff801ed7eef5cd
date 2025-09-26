# Langium

Langium is a language engineering tool with built-in support for the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/). It has a simple and direct integration with the [VS Code extension API](https://code.visualstudio.com/api/language-extensions/overview).

More information: 🌍 https://langium.org

## Getting Started

Langium offers a [Yeoman](https://yeoman.io) generator to create a new language extension for VS Code. The only prerequisite for the following terminal commands is [NodeJS](https://nodejs.org/) version 16 or higher.

1. Install Yeoman and the Langium extension generator.
```
npm install -g yo generator-langium
```

2. Run the generator and answer a few questions.
```
yo langium
```

3. Open the new folder in VS Code (replace `hello-world` with the extension name you chose).
```
code hello-world
```

4. Press **F5** to launch the extension in a new Extension Development Host window.

5. Open a folder, create a file with your chosen file name extension (`.hello` is the default), and see that validation and completion (ctrl+space) works:

Follow the instructions in `langium-quickstart.md` (in your extension folder) and the [documentation on the website](https://langium.org/docs/) to go further.

## How Does it Work?

The core of Langium is a _grammar declaration language_ in which you describe multiple aspects of your language:

 - Tokens (keywords and terminal rules)
 - Syntax (parser rules)
 - Abstract syntax tree (AST)

Please follow the [Langium documentation](https://langium.org/docs/grammar-language/) to learn how to use this language.

Langium features a command line interface ([langium-cli](https://www.npmjs.com/package/langium-cli)) that reads a grammar declaration and generates TypeScript type declarations for the AST and more.

Integration with the Language Server Protocol (LSP) is done with [vscode-languageserver](https://www.npmjs.com/package/vscode-languageserver). You have full access to the LSP API in Langium, so you can register additional message handlers or extend the protocol in a breeze.

The main code of Langium consists of a set of services that are connected via dependency injection (DI). You can override the default functionality and add your own service classes by specifying a DI module.

## Examples

The source repository of Langium includes [examples](https://github.com/eclipse-langium/langium/tree/main/examples) that demonstrate different use cases.
