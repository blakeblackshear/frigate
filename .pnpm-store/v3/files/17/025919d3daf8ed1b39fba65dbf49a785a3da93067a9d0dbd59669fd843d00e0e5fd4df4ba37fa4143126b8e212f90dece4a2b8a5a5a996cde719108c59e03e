/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { Body } from "@theme/ApiExplorer/Body/slice";
import * as sdk from "postman-collection";

function fetchWithtimeout(
  url: string,
  options: RequestInit,
  timeout = 5000
): any {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeout)
    ),
  ]);
}

async function loadImage(content: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((accept, reject) => {
    const reader = new FileReader();

    reader.onabort = () => {
      console.log("file reading was aborted");
      reject();
    };

    reader.onerror = () => {
      console.log("file reading has failed");
      reject();
    };

    reader.onload = () => {
      // Do whatever you want with the file contents
      const binaryStr = reader.result;
      accept(binaryStr);
    };
    reader.readAsArrayBuffer(content);
  });
}

async function makeRequest(
  request: sdk.Request,
  proxy: string | undefined,
  _body: Body
) {
  const headers = request.toJSON().header;

  let myHeaders = new Headers();
  if (headers) {
    headers.forEach((header: any) => {
      if (header.key && header.value) {
        myHeaders.append(header.key, header.value);
      }
    });
  }

  // The following code handles multiple files in the same formdata param.
  // It removes the form data params where the src property is an array of filepath strings
  // Splits that array into different form data params with src set as a single filepath string
  // TODO:
  // if (request.body && request.body.mode === 'formdata') {
  //   let formdata = request.body.formdata,
  //     formdataArray = [];
  //   formdata.members.forEach((param) => {
  //     let key = param.key,
  //       type = param.type,
  //       disabled = param.disabled,
  //       contentType = param.contentType;
  //     // check if type is file or text
  //     if (type === 'file') {
  //       // if src is not of type string we check for array(multiple files)
  //       if (typeof param.src !== 'string') {
  //         // if src is an array(not empty), iterate over it and add files as separate form fields
  //         if (Array.isArray(param.src) && param.src.length) {
  //           param.src.forEach((filePath) => {
  //             addFormParam(
  //               formdataArray,
  //               key,
  //               param.type,
  //               filePath,
  //               disabled,
  //               contentType
  //             );
  //           });
  //         }
  //         // if src is not an array or string, or is an empty array, add a placeholder for file path(no files case)
  //         else {
  //           addFormParam(
  //             formdataArray,
  //             key,
  //             param.type,
  //             '/path/to/file',
  //             disabled,
  //             contentType
  //           );
  //         }
  //       }
  //       // if src is string, directly add the param with src as filepath
  //       else {
  //         addFormParam(
  //           formdataArray,
  //           key,
  //           param.type,
  //           param.src,
  //           disabled,
  //           contentType
  //         );
  //       }
  //     }
  //     // if type is text, directly add it to formdata array
  //     else {
  //       addFormParam(
  //         formdataArray,
  //         key,
  //         param.type,
  //         param.value,
  //         disabled,
  //         contentType
  //       );
  //     }
  //   });
  //   request.body.update({
  //     mode: 'formdata',
  //     formdata: formdataArray,
  //   });
  // }

  const body = request.body?.toJSON();

  let myBody: RequestInit["body"] = undefined;
  if (body !== undefined && Object.keys(body).length > 0) {
    switch (body.mode) {
      case "urlencoded": {
        myBody = new URLSearchParams();
        if (Array.isArray(body.urlencoded)) {
          for (const data of body.urlencoded) {
            if (data.key && data.value) {
              myBody.append(data.key, data.value);
            }
          }
        }
        break;
      }
      case "raw": {
        myBody = (body.raw ?? "").toString();
        break;
      }
      case "formdata": {
        // The Content-Type header will be set automatically based on the type of body.
        myHeaders.delete("Content-Type");

        myBody = new FormData();
        const members = (request.body as any)?.formdata?.members;
        if (Array.isArray(members)) {
          for (const data of members) {
            if (data.key && data.value.content) {
              myBody.append(data.key, data.value.content);
            }
            // handle generic key-value payload
            if (data.key && typeof data.value === "string") {
              myBody.append(data.key, data.value);
            }
          }
        }
        break;
      }
      case "file": {
        if (_body.type === "raw" && _body.content?.type === "file") {
          myBody = await loadImage(_body.content.value.content);
        }
        break;
      }
      default:
        break;
    }
  }

  const requestOptions: RequestInit = {
    method: request.method,
    headers: myHeaders,
    body: myBody,
  };

  let finalUrl = request.url.toString();
  if (proxy) {
    // Ensure the proxy ends with a slash.
    let normalizedProxy = proxy.replace(/\/$/, "") + "/";
    finalUrl = normalizedProxy + request.url.toString();
  }

  return fetchWithtimeout(finalUrl, requestOptions).then((response: any) => {
    const contentType = response.headers.get("content-type");
    let fileExtension = "";

    if (contentType) {
      if (contentType.includes("application/pdf")) {
        fileExtension = ".pdf";
      } else if (contentType.includes("image/jpeg")) {
        fileExtension = ".jpg";
      } else if (contentType.includes("image/png")) {
        fileExtension = ".png";
      } else if (contentType.includes("image/gif")) {
        fileExtension = ".gif";
      } else if (contentType.includes("image/webp")) {
        fileExtension = ".webp";
      } else if (contentType.includes("video/mpeg")) {
        fileExtension = ".mpeg";
      } else if (contentType.includes("video/mp4")) {
        fileExtension = ".mp4";
      } else if (contentType.includes("audio/mpeg")) {
        fileExtension = ".mp3";
      } else if (contentType.includes("audio/ogg")) {
        fileExtension = ".ogg";
      } else if (contentType.includes("application/octet-stream")) {
        fileExtension = ".bin";
      } else if (contentType.includes("application/zip")) {
        fileExtension = ".zip";
      }

      if (fileExtension) {
        return response.blob().then((blob: any) => {
          const url = window.URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;
          // Now the file name includes the extension
          link.setAttribute("download", `file${fileExtension}`);

          // These two lines are necessary to make the link click in Firefox
          link.style.display = "none";
          document.body.appendChild(link);

          link.click();

          // After link is clicked, it's safe to remove it.
          setTimeout(() => document.body.removeChild(link), 0);

          return response;
        });
      } else {
        return response;
      }
    }

    return response;
  });
}

export default makeRequest;
