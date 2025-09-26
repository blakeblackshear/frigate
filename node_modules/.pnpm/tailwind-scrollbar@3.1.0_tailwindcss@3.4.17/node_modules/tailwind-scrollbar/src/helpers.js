/**
 * Gets the underlying default import of a module.
 *
 * This is used to handle internal imoprts from Tailwind, since Tailwind Play
 * handles these imports differently.
 *
 * @template T
 * @param {T | { __esModule: unknown, default: T }} mod The module
 * @returns {T} The bare export
 */
// eslint-disable-next-line no-underscore-dangle
const importDefault = mod => (mod && mod.__esModule ? mod.default : mod);

module.exports = {
  importDefault
};
