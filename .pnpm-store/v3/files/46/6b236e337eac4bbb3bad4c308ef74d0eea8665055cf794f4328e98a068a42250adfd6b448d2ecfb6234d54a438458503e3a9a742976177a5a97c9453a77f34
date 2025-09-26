/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { render } from "mustache";

export function versionSelector(versions: object[]) {
  const template = `<div class="dropdown dropdown--hoverable dropdown--right">
  <button class="button button--block button--sm button--secondary"><span>Select API Version</span></button>
  <ul class="dropdown__menu">
    {{#.}}<li><a class="dropdown__link" href="{{{baseUrl}}}">{{{label}}}</a></li>{{/.}}
  </ul>
</div>
      `;
  const view = render(template, versions);
  return view;
}

export function versionCrumb(version: string) {
  const template = `<ul style="display: flex;" class="breadcrumbs breadcrumbs--sm">
  <li style="margin-left: auto; margin-right: 0;" class="breadcrumbs__item breadcrumbs__item--active">
  <a class="breadcrumbs__link"><span>{{{.}}}</span></a></li></ul>
      `;
  const view = render(template, version);
  return view;
}
