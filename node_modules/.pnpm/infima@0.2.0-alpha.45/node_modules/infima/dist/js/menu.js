/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function menu($elements) {
  $elements.forEach(($menu) => {
    $menu.addEventListener('click', (event) => {
      let $listItem = event.target;
      while ($listItem) {
        if ($listItem.classList.contains('menu')) {
          return;
        }

        if ($listItem.classList.contains('menu__list-item')) {
          break;
        }
        $listItem = $listItem.parentNode;
      }

      // Not clicking on a list item.
      if (!$listItem) {
        return;
      }

      const regularSubList =
        $listItem.classList.contains('menu__list-item') &&
        !$listItem.querySelector('.menu__list-item-collapsible');
      const caretBtn = event.target.classList.contains('menu__caret');

      if (regularSubList || caretBtn) {
        $listItem.classList.toggle('menu__list-item--collapsed');
      }

      // Don't add any active class if non-leaf item selected.
      if ($listItem.querySelector('.menu__list')) {
        return;
      }

      $menu
        .querySelectorAll('.menu__link')
        .forEach(($elItem) => $elItem.classList.remove('menu__link--active'));

      // Traverse parents and add active class.
      while ($listItem) {
        if ($listItem.classList.contains('menu')) {
          return;
        }

        if ($listItem.classList.contains('menu__list-item')) {
          const $link = $listItem.querySelector('.menu__link');
          if ($link) {
            $link.classList.add('menu__link--active');
          }

          const $listItemCollapsible = $listItem.querySelector(
            '.menu__list-item-collapsible',
          );
          if ($listItemCollapsible) {
            $listItemCollapsible.classList.add(
              'menu__list-item-collapsible--active',
            );
          }
        }

        $listItem = $listItem.parentNode;
      }
    });

    $navbarSidebarBackButton = document.querySelector('.navbar-sidebar__back');
    $navbarSidebarItems = document.querySelector('.navbar-sidebar__items');
    if ($navbarSidebarBackButton) {
      $navbarSidebarBackButton.addEventListener('click', () => {
        $navbarSidebarItems.classList.remove(
          'navbar-sidebar__items--show-secondary',
        );
      });
    }
  });
}
