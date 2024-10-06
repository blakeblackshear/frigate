import type * as Preset from '@docusaurus/preset-classic';
import * as path from 'node:path';
import type { Config, PluginConfig } from '@docusaurus/types';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';

const config: Config = {
  title: 'Frigate',
  tagline: 'NVR With Realtime Object Detection for IP Cameras',
  url: 'https://docs.frigate.video',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'blakeblackshear',
  projectName: 'frigate',
  themes: ['@docusaurus/theme-mermaid', 'docusaurus-theme-openapi-docs'],
  markdown: {
    mermaid: true,
  },
  themeConfig: {
    algolia: {
      appId: 'WIURGBNBPY',
      apiKey: 'd02cc0a6a61178b25da550212925226b',
      indexName: 'frigate',
    },
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    prism: {
      additionalLanguages: ['bash', 'json'],
    },
    languageTabs: [
      {
        highlight: 'python',
        language: 'python',
        logoClass: 'python',
      },
      {
        highlight: 'javascript',
        language: 'nodejs',
        logoClass: 'nodejs',
      },
      {
        highlight: 'javascript',
        language: 'javascript',
        logoClass: 'javascript',
      },
      {
        highlight: 'bash',
        language: 'curl',
        logoClass: 'curl',
      },
      {
        highlight: "rust",
        language: "rust",
        logoClass: "rust",
      },
    ],
    navbar: {
      title: 'Frigate',
      logo: {
        alt: 'Frigate',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          to: '/',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://frigate.video',
          label: 'Website',
          position: 'right',
        },
        {
          href: 'http://demo.frigate.video',
          label: 'Demo',
          position: 'right',
        },
        {
          href: 'https://github.com/blakeblackshear/frigate',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/blakeblackshear/frigate',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/blakeblackshear/frigate/discussions',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Blake Blackshear`,
    },
  },
  plugins: [
    path.resolve(__dirname, 'plugins', 'raw-loader'),
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'openapi',
        docsPluginId: 'classic', // configured for preset-classic
        config: {
          frigateApi: {
            specPath: 'static/frigate-api.yaml',
            outputDir: 'docs/integrations/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
              categoryLinkSource: 'tag',
              sidebarCollapsible: true,
              sidebarCollapsed: true,
            },
            showSchemas: true,
          } satisfies OpenApiPlugin.Options,
        },
      },
    ]
  ] as PluginConfig[],
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          editUrl: 'https://github.com/blakeblackshear/frigate/edit/master/docs/',
          sidebarCollapsible: false,
          docItemComponent: '@theme/ApiItem', // Derived from docusaurus-theme-openapi
        },

        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
};

export default async function createConfig() {
  return config;
}
