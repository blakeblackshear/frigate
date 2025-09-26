/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function navbar($elements) {
  $elements.forEach(($navbar) => {
    // TODO: Use data-toggle approach.
    const $toggle = $navbar.querySelector('.navbar__toggle');
    const $sidebar = $navbar.querySelector('.navbar-sidebar');
    const $sidebarClose = $navbar.querySelector('.navbar-sidebar__close');
    const $backdrop = $navbar.querySelector('.navbar-sidebar__backdrop');
    const $sidebarItems = $navbar.querySelector('.navbar-sidebar__items');

    if ($toggle == null || $sidebarClose == null) {
      return;
    }

    $toggle.addEventListener('click', (e) => {
      $navbar.classList.add('navbar-sidebar--show');
      $sidebarItems.classList.add('navbar-sidebar__items--show-secondary');
    });

    [$backdrop, $sidebarClose].forEach(($el) =>
      $el.addEventListener('click', (e) => {
        $navbar.classList.remove('navbar-sidebar--show');
      }),
    );
  });
}
