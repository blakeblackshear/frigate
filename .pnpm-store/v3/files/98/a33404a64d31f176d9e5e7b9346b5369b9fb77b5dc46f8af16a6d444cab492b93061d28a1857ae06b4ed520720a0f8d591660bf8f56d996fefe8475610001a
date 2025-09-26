import { RoughCanvas } from './canvas';
import { RoughGenerator } from './generator';
import { RoughSVG } from './svg';
export default {
    canvas(canvas, config) {
        return new RoughCanvas(canvas, config);
    },
    svg(svg, config) {
        return new RoughSVG(svg, config);
    },
    generator(config) {
        return new RoughGenerator(config);
    },
    newSeed() {
        return RoughGenerator.newSeed();
    },
};
