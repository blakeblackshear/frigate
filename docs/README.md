# Website

This website is built using [Docusaurus 3.5](https://docusaurus.io/docs), a modern static website generator.

For installation and contributing instructions, please follow the [Contributing Docs](https://docs.frigate.video/development/contributing).

# Development

1. Run `npm i` to install dependencies
2. Run `npm run start` to start the website

# Documentation Style Guide

## Internal Links

When adding or editing internal links, follow these conventions:

### Do not include the `.md` extension

Use paths without extensions. This avoids needing `index.md` for directory index pages and matches the web URL.

```markdown
<!-- Good -->
[zones](/configuration/zones)
[getting started](../guides/getting_started)

<!-- Bad -->
[zones](/configuration/zones.md)
```

### Use relative paths for same-directory links

Use relative `./` paths for links to pages in the same directory.

```markdown
[zones](./zones)
[masks](./masks)
```

### Use absolute paths for everything else

For links outside the current directory, use absolute paths from the docs root. The exception is deeply nested subdirectories (e.g., `configuration/custom_classification/`) where `../` to the parent directory is acceptable.

```markdown
[object detectors](/configuration/object_detectors)
[hardware](/frigate/hardware)
[getting started](/guides/getting_started)

<!-- Also OK from a nested subdirectory -->
[zones](../zones)
```

### Never use full URLs for internal links

```markdown
<!-- Good -->
[zones](/configuration/zones)

<!-- Bad -->
[zones](https://docs.frigate.video/configuration/zones)
```

> **Note:** Some existing links still use `.md` extensions. These should be updated when the file is being edited for other reasons.
