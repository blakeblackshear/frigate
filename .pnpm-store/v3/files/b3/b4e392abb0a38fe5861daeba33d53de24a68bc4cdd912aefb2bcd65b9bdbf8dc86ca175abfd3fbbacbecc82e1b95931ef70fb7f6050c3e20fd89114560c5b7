/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function makeRadioBehavior(eventName, itemClass, activeItemClass) {
  return function radioBehavior($elements) {
    $elements.forEach(($element) => {
      $element.addEventListener(eventName, (event) => {
        if (event.target && event.target.classList.contains(itemClass)) {
          $element
            .querySelectorAll('.' + itemClass)
            .forEach(($elItem) => $elItem.classList.remove(activeItemClass));
          event.target.classList.add(activeItemClass);
        }
      });
    });
  };
}
