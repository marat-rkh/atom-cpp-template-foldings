'use babel';

import { Point } from 'atom';

export default {
    isScreenTranslatedOnly(event) {
        return this._isTranslatedOnly(
            event.oldTailScreenPosition,
            event.oldHeadScreenPosition,
            event.newTailScreenPosition,
            event.newHeadScreenPosition
        );
    },

    isScreenShrunk(event) {
        return this._isShrunk(
            event.oldTailScreenPosition,
            event.oldHeadScreenPosition,
            event.newTailScreenPosition,
            event.newHeadScreenPosition
        );
    },

    isScreenExpanded(event) {
        return this._isExpanded(
            event.oldTailScreenPosition,
            event.oldHeadScreenPosition,
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

    _isShrunk(oldTail, oldHead, newTail, newHead) {
        let oldArea = this._area(oldTail, oldHead);
        let newArea = this._area(newTail, newHead);
        return oldArea > newArea;
    },

    _isExpanded(oldTail, oldHead, newTail, newHead) {
        let oldArea = this._area(oldTail, oldHead);
        let newArea = this._area(newTail, newHead);
        return oldArea < newArea;
    },

    _isTranslatedOnly(oldTail, oldHead, newTail, newHead) {
        let tailDelta = this._delta(oldTail, newTail);
        let headDelta = this._delta(oldHead, newHead);
        return tailDelta.isEqual(headDelta);
    },

    _delta(pos1, pos2) {
        return new Point(pos2.row - pos1.row, pos2.column - pos1.column);
    },

    _area(tail, head) {
        // we add 1 to each value to handle ranges like [(0, 1), (0, 7)]
        return (head.row - tail.row + 2) * (head.column - tail.column + 2);
    }
}
