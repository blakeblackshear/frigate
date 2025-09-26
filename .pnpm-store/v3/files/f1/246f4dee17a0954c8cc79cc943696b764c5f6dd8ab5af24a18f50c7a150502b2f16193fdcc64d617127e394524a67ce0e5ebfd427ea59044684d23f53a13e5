const {randomU32} = require('../randomU32');

test('works', () => {
    for (let i = 0; i < 1000; i++) {
        const min = Math.round(Math.random() * 0xFFFFFF);
        const max = min + Math.round(Math.random() * 0xFFFFFF);
        const num = randomU32(min, max);
        expect(num >= min && num <= max).toBe(true);
    }
});
