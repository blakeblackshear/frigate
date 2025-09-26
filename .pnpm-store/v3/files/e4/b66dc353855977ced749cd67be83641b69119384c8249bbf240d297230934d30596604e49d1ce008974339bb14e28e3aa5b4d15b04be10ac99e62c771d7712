"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
process.on('message', (message) => {
    if (message.command === 'exit') {
        process.exit(0);
    }
    else if (message.command === 'resolve') {
        try {
            let result = require.resolve(message.args);
            process.send({ command: 'resolve', success: true, result: result });
        }
        catch (err) {
            process.send({ command: 'resolve', success: false });
        }
    }
});
