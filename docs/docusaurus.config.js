const path = require('path');

module.exports = {
  title: 'Frigate',
  tagline: 'NVR With Realtime Object Detection for IP Cameras',
  url: 'https://blakeblackshear.github.io',
  baseUrl: '/frigate/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'blakeblackshear',
  projectName: 'frigate',
  themeConfig: {
    algolia: {
      apiKey: '81ec882db78f7fed05c51daf973f0362',
      indexName: 'frigate',
    },
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
          href: 'https://github.com/blakeblackshear/frigate',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    sidebarCollapsible: false,
    hideableSidebar: true,
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
  plugins: [path.resolve(__dirname, 'plugins', 'raw-loader')],
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/blakeblackshear/frigate/edit/master/docs/',
        },

        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
