import { camelToDash } from '../../render/dom/utils/camel-to-dash.mjs';

const optimizedAppearDataId = "framerAppearId";
const optimizedAppearDataAttribute = "data-" + camelToDash(optimizedAppearDataId);

export { optimizedAppearDataAttribute, optimizedAppearDataId };
