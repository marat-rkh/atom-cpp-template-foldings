'use babel';

import { MarkerEvent } from './marker-event';

export class FoldingMarker {
    constructor(textEditor, bufferRange) {
        this.innerMarker = textEditor.markBufferRange(bufferRange, { invalidate: 'inside' });
    }

    setupEventsHandling(options) {
        this._setDefaultHandlers(options);
        const initScreenRange = this.innerMarker.getScreenRange();
        return this.innerMarker.onDidChange((event) => {
            if(!options.handlingEnabled(event)) {
                return;
            }
            if(!event.isValid) {
                options.handlers.onInvalidated(event);
            } else if(MarkerEvent.isNewScreenRangeEquals(event, initScreenRange)) {
                if(MarkerEvent.wasScreenInvisible(event)) {
                    options.handlers.onBecameVisible(event);
                } else {
                    console.assert(MarkerEvent.isScreenTranslatedOnly(event));
                    options.handlers.onTranslated(event);
                }
            } else {
                if(MarkerEvent.isScreenInvisible(event)) {
                    options.handlers.onBecameHidden(event);
                } else {
                    options.handlers.onRangeDestructed(event);
                }
            }
        });
    }

    getBufferRange() { return this.innerMarker.getBufferRange(); }

    getScreenRange() { return this.innerMarker.getScreenRange(); }

    getStartScreenPosition() { return this.innerMarker.getStartScreenPosition(); }

    destroy() { return this.innerMarker.destroy(); }

    _setDefaultHandlers(options) {
        if(!options.handlingEnabled) {
            options.handlingEnabled = () => true;
        }
        if(!options.handlers) {
            options.handlers = {};
        }
        if(!options.handlers.onInvalidated) {
            options.handlers.onInvalidated = () => {};
        }
        if(!options.handlers.onBecameVisible) {
            options.handlers.onBecameVisible = () => {};
        }
        if(!options.handlers.onBecameHidden) {
            options.handlers.onBecameHidden = () => {};
        }
        if(!options.handlers.onTranslated) {
            options.handlers.onTranslated = () => {};
        }
        if(!options.handlers.onRangeDestructed) {
            options.handlers.onRangeDestructed = () => {};
        }
    }
}
