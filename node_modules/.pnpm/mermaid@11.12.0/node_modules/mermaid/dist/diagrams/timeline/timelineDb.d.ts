export function getCommonDb(): typeof commonDb;
export function clear(): void;
export function addSection(txt: any): void;
export function getSections(): any[];
export function getTasks(): any[];
export function addTask(period: any, length: any, event: any): void;
export function addEvent(event: any): void;
export function addTaskOrg(descr: any): void;
declare namespace _default {
    export { clear };
    export { getCommonDb };
    export { addSection };
    export { getSections };
    export { getTasks };
    export { addTask };
    export { addTaskOrg };
    export { addEvent };
}
export default _default;
import * as commonDb from '../common/commonDb.js';
