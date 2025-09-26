declare namespace _default {
    export namespace base {
        export { baseThemeVariables as getThemeVariables };
    }
    export namespace dark {
        export { darkThemeVariables as getThemeVariables };
    }
    namespace _default {
        export { defaultThemeVariables as getThemeVariables };
    }
    export { _default as default };
    export namespace forest {
        export { forestThemeVariables as getThemeVariables };
    }
    export namespace neutral {
        export { neutralThemeVariables as getThemeVariables };
    }
}
export default _default;
import { getThemeVariables as baseThemeVariables } from './theme-base.js';
import { getThemeVariables as darkThemeVariables } from './theme-dark.js';
import { getThemeVariables as defaultThemeVariables } from './theme-default.js';
import { getThemeVariables as forestThemeVariables } from './theme-forest.js';
import { getThemeVariables as neutralThemeVariables } from './theme-neutral.js';
