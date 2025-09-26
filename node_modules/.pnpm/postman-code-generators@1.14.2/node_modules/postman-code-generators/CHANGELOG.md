# Postman Code Generators Changelog

## [Unreleased]

## [v1.14.2] - 2025-02-21

### Fixed

-   Fix for - [#772](https://github.com/postmanlabs/postman-code-generators/issues/772) Ignore workspace dependencies while deepinstall for pnpm.

## [v1.14.1] - 2024-12-18

### Fixed

-   Fix for - [#780](https://github.com/postmanlabs/postman-code-generators/issues/780) Made the codegens package manager agnostic by removing lock files.

## [v1.14.0] - 2024-10-10

### Fixed

-   Fix for - [#5330](https://github.com/postmanlabs/postman-app-support/issues/5330) Added support for usage of --data-binary flag when using long format option for body type binary.

-   Fix for - [#540](https://github.com/postmanlabs/postman-code-generators/issues/540) Curl codesnippet's JSON body must follow multiLine option's configuration.

## [v1.13.0] - 2024-09-11

### Fixed

-   Fix for - [#760](https://github.com/postmanlabs/postman-code-generators/issues/760) Fixed package installation issues with yarn (v4) and pnpm.

## [v1.12.0] - 2024-07-22

### Chore

-   Updated postman-collection sdk to version 4.4.0 in missing codegens.

### Fixed

-   Fix typo in Content-Header for audio/midi files in codegens.
-   Added support for NTLM auth support in cURL codegen.

## [v1.11.0] - 2024-07-10

### Chore

-   Updated postman-collection to v4.4.0.

## [v1.10.1] - 2024-05-06

### Fixed

-   Fix `+` char being encoded in query params of multiple languages.
-   Fix special characters not being escaped in multiple languages.

## [v1.9.0] - 2024-01-18

### Fixed

-   Fix for - [#10139](https://github.com/postmanlabs/postman-app-support/issues/10139) Modify Swift codegen to work with multipart/form-data format, used for video file upload

## [v1.8.0] - 2023-06-27

-   Fix for - [#10521](https://github.com/postmanlabs/postman-app-support/issues/10521) Add support for Dart Dio snippet generation

## [v1.7.2] - 2023-05-04

### Fixed

-   Fix for - [#11934](https://github.com/postmanlabs/postman-app-support/issues/11934) Prevent `%` double encoding in query params

## [v1.7.1] - 2023-03-29

-   Minor fix - Add language labels for Rust and Kotlin

## Previous Releases

Newer releases follow the [Keep a Changelog](https://keepachangelog.com) format.

v1.7.0 (March 28, 2023)

-   Fix for - [#192](https://github.com/postmanlabs/postman-code-generators/issues/192) Added support for Rust reqwest code snippets.

v1.6.1 (March 27, 2023)

-   Fix backlashes being unescaped unnecessarily in cURL codegen

v1.6.0 (March 17, 2023)

-   PEP8 improvements in python-requests code
-   Fix for - [#491](https://github.com/postmanlabs/postman-code-generators/issues/491) Added support for kotlin okhttp code snippets.
-   Refactored code for nodejs-axios util.js.

v1.5.1 (March 28, 2023)

-   Fix backlashes being escaped unnecessarily in cURL codegen

v1.5.0 (March 2, 2023)

-   Change minimum supported NodeJS version to 12
-   Fix for - [#11049](https://github.com/postmanlabs/postman-app-support/issues/11049) Escape backslash character in raw bodies for curl codegen
-   Fix for - [#302](https://github.com/postmanlabs/postman-code-generators/issues/302) Add option to use async/await in NodeJS Axios codegen
-   Fix for - [#322](https://github.com/postmanlabs/postman-code-generators/issues/322) Use multiline quotes in Powershell to simplify generated code
-   Add long form option for -g flag in curl codegen
-   Minor Swift codegen improvements

v1.4.1 (February 22, 2023)

-   cURL codegen should work when request has a protocolProfileBehavior with null value

v1.4.0 (February 6, 2023)

-   Add support for C# HttpClient Codegen
-   Fix for - [#9511](https://github.com/postmanlabs/postman-app-support/issues/9511) - Use short options in CURL as long as possible
-   Fix for - [#10581](https://github.com/postmanlabs/postman-app-support/issues/10581) - Do not add HTTP method explicitly in CURL when not required
-   Fix for - [#10053](https://github.com/postmanlabs/postman-app-support/issues/10053) - Remove usage of semaphore from Swift Codegen

v1.3.0 (December 16, 2022)

-   Update C# restsharp codegen to support [107](https://restsharp.dev/v107/)
-   Fix for - [#11084](https://github.com/postmanlabs/postman-app-support/issues/11084) Fixes an issue where HTTP code snippet was generating wrong boundaries
-   Fixes an issue with Axios code snippets not including maxBodyLength param

v1.2.1 (April 26, 2022)

-   Add label for 'R' language

v1.2.0 (April 22, 2022)

-   Add new codegens - php-guzzle, R-httr, R-rcurl
-   Fix issue with pipeline failing due to updated version of RestSharp
-   Fix for - [#502](https://github.com/postmanlabs/postman-code-generators/issues/502) Allow GET method to have a body in java-okhttp if present in input request
-   Fix for - [#476](https://github.com/postmanlabs/postman-code-generators/pull/476) Properly escape already escaped double quotes in curl body

v1.1.5 (May 10, 2021)

-   Fixed an issue with how JSON bodies are shown in code snippets for Ruby, C#, and Dart.

v1.1.4 (May 6, 2021)

-   Fix an issue with empty GraphQL body

v1.1.3 (Mar 2, 2021)

-   Use proper indentation for JSON bodies in Javascript and Nodejs codegens
-   Fix for - [#445](https://github.com/postmanlabs/postman-code-generators/issues/445) Add proper indentation in nodejs-axios when bodytype is urlencoded
-   Fix for - [#248](https://github.com/postmanlabs/postman-code-generators/issues/248) Use quoteType everywhere in curl, not just in the url
-   Fix for - [#454](https://github.com/postmanlabs/postman-code-generators/issues/454) Fix encoding when generating HTTP code snippets
-   Fix for - [#426](https://github.com/postmanlabs/postman-code-generators/issues/426) Use json.dumps in Python codegens if Content-Type is JSON

v1.1.2 (Dec 15, 2020)

-   Fix for - [#8736](https://github.com/postmanlabs/postman-app-support/issues/8736) Add content type support for individual form-data fields
-   Fix for - [#8635](https://github.com/postmanlabs/postman-app-support/issues/8635) Use Json.parse for all json like application types
-   Fix for - [#9212](https://github.com/postmanlabs/postman-app-support/issues/9212) Add semicolon after header key in curl codegen if the value is empty string. 
-   Add Newman test for powershell

v1.1.1 (Nov 10, 2020)

-   Change string to enum in cURL quoteType option.
-   Fix new line issue in dart-http and HTTP codegen
-   Fix an issue where deepinstall was failing when folder name had spaces.

v1.1.0 (Nov 2, 2020)

-   Added support for Dart http
-   Fix for - [#315](https://github.com/postmanlabs/postman-code-generators/issues/315): Manually parse url provided in the request.
-   Fix for - [#253](https://github.com/postmanlabs/postman-code-generators/issues/253): Add -g flag to curl if braces ({}) or brackets ([#]) are present in the url.
-   Fix for - [#257](https://github.com/postmanlabs/postman-code-generators/issues/257): Use double quotes to escape semicolon in curl requests
-   Fix for - [#247](https://github.com/postmanlabs/postman-code-generators/issues/247): Add ContentType to python snippets for multipart/formdata
-   Fix for - [#186](https://github.com/postmanlabs/postman-code-generators/issues/186): Add \` as line continuation delimiter for curl codegen
-   Fix for - [#248](https://github.com/postmanlabs/postman-code-generators/issues/248): Add quoteType as an additional option in curl codegen
-   Fix deadlock in error case in Swift and Objective-C codegens.
-   Fix for - [#325](https://github.com/postmanlabs/postman-code-generators/issues/325): Use encodeURIComponent instead of escape for urlencoded request body.
-   Fix for - [#350](https://github.com/postmanlabs/postman-code-generators/issues/350): Sanitize \\r in request body.
-   Fix for - [#366](https://github.com/postmanlabs/postman-code-generators/issues/366): Add support for uploading binary files for multipart/form-data bodies in python-http.client.
-   Fix for - [#353](https://github.com/postmanlabs/postman-code-generators/issues/353): Add optional import of FoundationNetworking in swift codegen
-   Fix for - [#284](https://github.com/postmanlabs/postman-code-generators/issues/284): Replace double-quotes by single-quotes in codegen/php-curl
-   Fix for - [#330](https://github.com/postmanlabs/postman-code-generators/issues/330): Use url.toString method for converting url in shell-httpie codegen

v1.0.2 (Oct 15, 2020)

-   Fixed spaces around variables and arguments in Python codgen to comply with PEP 8.
-   Added Content-Length header to generated HTTP snippets.
-   Switched to multiline strings for Raw bodies in Go.
-   Stopped manually encoding response bodes in `utf8` for Python-requests.
-   Removed unnecessary semicolons at the end of statements in Ruby.
-   Fixed wrong name of HTTP codegen in README

v1.0.1 (Jun 29, 2020)

-   Fix for - [#8674](https://github.com/postmanlabs/postman-app-support/issues/8674): Add URL sanitization for quotes in cURL, Java Unirest, NodeJS Native, Python http.client, and Swift. 

v1.0.0 (May 29, 2020)

-   Add axios framework support
-   Add ES6 syntax support for NodeJS Request, NodeJS Native and NodeJS Unirest
-   Fix snippet generation for powershell and jquery, where form data params had no type field

[Unreleased]: https://github.com/postmanlabs/postman-code-generators/compare/v1.14.2...HEAD

[v1.14.2]: https://github.com/postmanlabs/postman-code-generators/compare/v1.14.1...v1.14.2

[v1.14.1]: https://github.com/postmanlabs/postman-code-generators/compare/v1.14.0...v1.14.1

[v1.14.0]: https://github.com/postmanlabs/postman-code-generators/compare/v1.13.0...v1.14.0

[v1.13.0]: https://github.com/postmanlabs/postman-code-generators/compare/v1.12.0...v1.13.0

[v1.12.0]: https://github.com/postmanlabs/postman-code-generators/compare/v1.11.0...v1.12.0

[v1.11.0]: https://github.com/postmanlabs/postman-code-generators/compare/v1.10.1...v1.11.0

[v1.10.1]: https://github.com/postmanlabs/postman-code-generators/compare/v1.10.0...v1.9.0

[v1.9.0]: https://github.com/postmanlabs/postman-code-generators/compare/v1.8.0...v1.9.0

[v1.8.0]: https://github.com/postmanlabs/postman-code-generators/compare/v1.7.2...v1.8.0

[v1.7.2]: https://github.com/postmanlabs/postman-code-generators/compare/v1.7.1...v1.7.2

[v1.7.1]: https://github.com/postmanlabs/postman-code-generators/compare/v1.7.0...v1.7.1
