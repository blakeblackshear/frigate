/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function dropdowns($elements) {
  $elements.forEach(($dropdown) => {
    if ($dropdown.classList.contains('dropdown--hoverable')) {
      return;
    }

    const $toggle = $dropdown.querySelector('[data-toggle="dropdown"]');
    $toggle.addEventListener('click', (e) => {
      function dismissDropdown() {
        $toggle.classList.remove('button--active');
        $dropdown.classList.remove('dropdown--show');
        document.removeEventListener('click', dismissDropdown);
      }

      if (!$dropdown.classList.contains('dropdown--show')) {
        $toggle.classList.add('button--active');
        $dropdown.classList.add('dropdown--show');
        setTimeout(() => {
          document.addEventListener('click', dismissDropdown);
        }, 0);
      } else {
        dismissDropdown();
      }
    });
  });
}
