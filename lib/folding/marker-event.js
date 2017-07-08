'use babel';

import { Point } from 'atom';

/*
* These functions assume marker has normal orientation, i.e. tail goes before head.
* See: https://atom.io/docs/api/v1.18.0/DisplayMarker
*/
export const MarkerEvent = {
    setChangeHandlers(marker, options) {
        this._setDefaultHandlers(options);
        const initScreenRange = marker.getScreenRange();
        return marker.onDidChange((event) => {
            if(!options.handlingEnabled(event)) {
                return;
            }
            if(!event.isValid) {
                options.handlers.onInvalidated(event);
            } else if(this.isNewScreenRangeEquals(event, initScreenRange)) {
                if(this.wasScreenInvisible(event)) {
                    options.handlers.onBecameVisible(event);
                } else {
                    console.assert(this.isScreenTranslatedOnly(event));
                    options.handlers.onTranslated(event);
                }
            } else {
                if(this.isScreenInvisible(event)) {
                    options.handlers.onBecameHidden(event);
                } else {
                    options.handlers.onRangeDestructed(event);
                }
            }
        });
    },

    isScreenTranslatedOnly(event) {
        return this._isTranslatedOnly(
            event.oldTailScreenPosition,
            event.oldHeadScreenPosition,
            event.newTailScreenPosition,
            event.newHeadScreenPosition
        );
    },

    isNewScreenRangeEquals(event, initScreenRange) {
        return this._isTranslatedOnly(
            initScreenRange.start,
            initScreenRange.end,
            event.newTailScreenPosition,
            event.newHeadScreenPosition
        );
    },

    isScreenInvisible(event) {
        return event.newTailScreenPosition.isEqual(event.newHeadScreenPosition);
    },

    wasScreenInvisible(event) {
        return event.oldTailScreenPosition.isEqual(event.oldHeadScreenPosition);
    },

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
    },

    _isTranslatedOnly(oldTail, oldHead, newTail, newHead) {
        let tailDelta = this._delta(oldTail, newTail);
        let headDelta = this._delta(oldHead, newHead);
        return tailDelta.isEqual(headDelta);
    },

    _delta(pos1, pos2) {
        return new Point(pos2.row - pos1.row, pos2.column - pos1.column);
    }
}
