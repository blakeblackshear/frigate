/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export var Disposable;
(function (Disposable) {
    function create(callback) {
        return {
            dispose: async () => await callback()
        };
    }
    Disposable.create = create;
})(Disposable || (Disposable = {}));
//# sourceMappingURL=disposable.js.map