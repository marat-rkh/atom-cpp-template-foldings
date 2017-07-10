'use babel';

import { Point } from 'atom';

/*
* These functions assume marker has normal orientation, i.e. tail goes before head.
* See: https://atom.io/docs/api/v1.18.0/DisplayMarker
*/
export const MarkerEvent = {
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

    _isTranslatedOnly(oldTail, oldHead, newTail, newHead) {
        let tailDelta = this._delta(oldTail, newTail);
        let headDelta = this._delta(oldHead, newHead);
        return tailDelta.isEqual(headDelta);
    },

    _delta(pos1, pos2) {
        return new Point(pos2.row - pos1.row, pos2.column - pos1.column);
    }
}
