"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionSelector = versionSelector;
exports.versionCrumb = versionCrumb;
const mustache_1 = require("mustache");
function versionSelector(versions) {
    const template = `<div class="dropdown dropdown--hoverable dropdown--right">
  <button class="button button--block button--sm button--secondary"><span>Select API Version</span></button>
  <ul class="dropdown__menu">
    {{#.}}<li><a class="dropdown__link" href="{{{baseUrl}}}">{{{label}}}</a></li>{{/.}}
  </ul>
</div>
      `;
    const view = (0, mustache_1.render)(template, versions);
    return view;
}
function versionCrumb(version) {
    const template = `<ul style="display: flex;" class="breadcrumbs breadcrumbs--sm">
  <li style="margin-left: auto; margin-right: 0;" class="breadcrumbs__item breadcrumbs__item--active">
  <a class="breadcrumbs__link"><span>{{{.}}}</span></a></li></ul>
      `;
    const view = (0, mustache_1.render)(template, version);
    return view;
}
