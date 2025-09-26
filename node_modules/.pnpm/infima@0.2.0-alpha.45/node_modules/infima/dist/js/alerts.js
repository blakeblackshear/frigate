/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function alert($elements) {
  $elements.forEach(($alert) => {
    $alert.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('close')) {
        $alert.remove();
      }
    });
  });
}
