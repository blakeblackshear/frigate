import { transformProps } from '../../render/html/utils/keys-transform.mjs';

const appearStoreId = (elementId, valueName) => {
    const key = transformProps.has(valueName) ? "transform" : valueName;
    return `${elementId}: ${key}`;
};

export { appearStoreId };
