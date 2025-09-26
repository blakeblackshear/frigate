## Installation

Install NPM package

```sh
    npm install @inkeep/docusaurus
```

## Configuration

Add the code shown below to ```docusaurus.config``` to connect the plugin to docusaurus:

For ChatButton component type:

```sh
    themes: ["@inkeep/docusaurus/chatButton"],
```

For SearchBar component type:

```sh
     themes: ["@inkeep/docusaurus/searchBar"],
```

Customize your widget's config (Example shown below):

```sh
//..
    themeConfig: {
        inkeepConfig: {
            chatButtonType: 'RECTANGLE_SHORTCUT', // optional
            baseSettings: {
                apiKey: "apiKey", // required
                integrationId: "integrationId", // required
                organizationId: "organizationId", // required
                primaryBrandColor: "#522FC9", // required -- your brand color, widget color scheme is derived from this
                organizationDisplayName: "Inkeep", // optional
                // ...optional settings
                theme: {
                    stylesheetUrls: ['/path/to/stylesheets'], // optional
                },
            },
            modalSettings: {
                // optional settings
            },
            searchSettings: {
                // optional settings
            },
            aiChatSettings: {
                // optional settings
                botAvatarSrcUrl: "img/logo.svg", // use your own bot avatar
                quickQuestions: [
                    "Example question 1?",
                    "Example question 2?",
                    "Example question 3?",
                ],
            },
        }
    },
```

## Publishing a new verison

1. `cd path/to/docusaurus-widgets`
2. in `shared/consts.js` update the `WIDGET_VERSION`
3. in `shared/consts.js` update the corresponding `INTEGRITY_SHA` (go to https://unpkg.com/@inkeep/uikit-js@<WIDGET_VERSION>/dist/embed.js?meta)
4. update the package version in `package.json`
5. `npm run build`
6. `npm pack`
7. `npm publish`
