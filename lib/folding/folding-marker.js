'use babel';

import { Range } from 'atom';
import { MarkerEvent } from './marker-event';

export class FoldingMarker {
    constructor(textEditor, bufferRange) {
        this.innerMarker = textEditor.markBufferRange(bufferRange, { invalidate: 'inside' });
    }

    setupEventsHandling(options) {
        // TODO maybe it will be better to move the implementation
        // of setChangeHandlers here
        return MarkerEvent.setChangeHandlers(this.innerMarker, options);
    }

    getBufferRange() { return this.innerMarker.getBufferRange(); }

    getScreenRange() { return this.innerMarker.getScreenRange(); }

    getStartScreenPosition() { return this.innerMarker.getStartScreenPosition(); }

    destroy() { return this.innerMarker.destroy(); }
}
