import { MotionValue } from '../index.mjs';
import { getWillChangeName } from './get-will-change-name.mjs';
import { addUniqueItem } from '../../utils/array.mjs';

class WillChangeMotionValue extends MotionValue {
    constructor() {
        super(...arguments);
        this.values = [];
    }
    add(name) {
        const styleName = getWillChangeName(name);
        if (styleName) {
            addUniqueItem(this.values, styleName);
            this.update();
        }
    }
    update() {
        this.set(this.values.length ? this.values.join(", ") : "auto");
    }
}

export { WillChangeMotionValue };
