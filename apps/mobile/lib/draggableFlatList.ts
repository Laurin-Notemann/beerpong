/**
 * react-native-draggable-flatlist, for the rules and moves lists. Import it from here: the
 * library calls `InteractionManager.runAfterInteractions` while it renders, whenever the keys of
 * its data change, and React Native 0.88 removed `InteractionManager`. That render threw, React
 * re-rendered the whole app synchronously to recover ("There was an error during concurrent
 * rendering"), and the list's drag state was never reset. This puts back the one call it uses.
 */
// the real exports object: `import * as` may hand out a copy
const ReactNative = require('react-native') as Record<string, unknown>;

function hasInteractionManager() {
    try {
        const manager = ReactNative.InteractionManager as
            | { runAfterInteractions?: unknown }
            | undefined;
        return typeof manager?.runAfterInteractions === 'function';
    } catch {
        // development builds throw when it's read
        return false;
    }
}

if (!hasInteractionManager()) {
    Object.defineProperty(ReactNative, 'InteractionManager', {
        configurable: true,
        value: {
            runAfterInteractions: (task: () => void) => {
                const id = setTimeout(task, 0);
                return { cancel: () => clearTimeout(id) };
            },
        },
    });
}

export * from 'react-native-draggable-flatlist';
export { default } from 'react-native-draggable-flatlist';
