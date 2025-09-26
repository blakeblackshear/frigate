/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import fileSaver from "file-saver";

const saveFile = (url: string) => {
  let fileName;
  if (url.endsWith("json") || url.endsWith("yaml") || url.endsWith("yml")) {
    fileName = url.substring(url.lastIndexOf("/") + 1);
  }
  fileSaver.saveAs(url, fileName ? fileName : "openapi.txt");
};

function Export({ url, proxy }: any) {
  return (
    <div
      style={{ float: "right" }}
      className="dropdown dropdown--hoverable dropdown--right"
    >
      <button className="export-button button button--sm button--secondary">
        Export
      </button>
      <ul className="export-dropdown dropdown__menu">
        <li>
          <a
            onClick={(e) => {
              e.preventDefault();
              saveFile(`${url}`);
            }}
            className="dropdown__link"
            href={`${url}`}
          >
            OpenAPI Spec
          </a>
        </li>
      </ul>
    </div>
  );
}

export default Export;
