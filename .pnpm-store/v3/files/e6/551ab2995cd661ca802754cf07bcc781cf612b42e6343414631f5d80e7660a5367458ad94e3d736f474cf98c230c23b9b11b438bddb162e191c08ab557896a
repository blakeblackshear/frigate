import { BaseGroupPlaybackControls } from './BaseGroup.mjs';

/**
 * TODO: This is a temporary class to support the legacy
 * thennable API
 */
class GroupPlaybackControls extends BaseGroupPlaybackControls {
    then(onResolve, onReject) {
        return Promise.all(this.animations).then(onResolve).catch(onReject);
    }
}

export { GroupPlaybackControls };
