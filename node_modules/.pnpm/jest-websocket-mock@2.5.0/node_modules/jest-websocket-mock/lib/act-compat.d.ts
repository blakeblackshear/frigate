/**
 * A simple compatibility method for react's "act".
 * If @testing-library/react is already installed, we just use
 * their implementation - it's complete and has useful warnings.
 * If @testing-library/react is *not* installed, then we just assume
 * that the user is not testing a react application, and use a noop instead.
 */
declare type Callback = () => Promise<void | undefined> | void | undefined;
declare type AsyncAct = (callback: Callback) => Promise<undefined>;
declare type SyncAct = (callback: Callback) => void;
declare let act: AsyncAct | SyncAct;
export default act;
