'use babel';

import logger from '../utils/logger.js';
import { PseudoFolding, PseudoFoldingCheck } from './pseudo-folding.js';
import FoldingPreview from './folding-preview.js';
import { FoldingMarker } from './folding-marker';

export const FoldingStatus = {
    OK: 0,
    ERROR: 1, // some unclassified error
    WILL_EXCEED_MAX_LINE_LENGTH: 2,
    TEXT_HAS_TABS: 3
};

export const FoldingEvent = {
    CREATED: 0,
    DESTROYED: 1,
    MOVED: 2,
    BECAME_HIDDEN: 3,
    BECAME_VISIBLE: 4
};

export class Folding {
    static checkPossible(textEditor, bufferRange, foldedAreaSize, editorMaxLineLength = -1) {
        const check = PseudoFolding.checkFoldingPossible(
            textEditor, bufferRange, foldedAreaSize, editorMaxLineLength);
        switch(check) {
            case PseudoFoldingCheck.POSSIBLE: return FoldingStatus.OK;
            case PseudoFoldingCheck.WILL_EXCEED_MAX_LINE_LENGTH:
                return FoldingStatus.WILL_EXCEED_MAX_LINE_LENGTH;
            case PseudoFoldingCheck.TEXT_HAS_TABS: return FoldingStatus.TEXT_HAS_TABS;
            default: return FoldingStatus.ERROR;
        }
    }

    constructor(textEditor, bufferRange, previewData, id) {
        if(Folding.checkPossible(textEditor, bufferRange, previewData.text.length) !== FoldingStatus.OK) {
            throw new Error('Preconditions are not met');
        }
        const cursorBufPos = textEditor.getCursorBufferPosition();
        this.id = id;
        this.marker = new FoldingMarker(textEditor, bufferRange);
        this.pFolding = new PseudoFolding(textEditor, id, this.marker, previewData.text.length);
        this.preview = new FoldingPreview(textEditor, this.marker, previewData, 'folding-preview');
        this.info = { lastEvent: FoldingEvent.CREATED, highlighted: false };
        this.isUnderDestruction = false;
        this._setupEventsHandling();
        textEditor.setCursorBufferPosition(cursorBufPos);
    }

    destroy() {
        this.isUnderDestruction = true;
        this.preview.destroy();
        this.pFolding.destroy();
        // pseudo folding uses marker to destroy itself so marker
        // must be destroyed after pseudo folding
        this.marker.destroy();
        this.info.lastEvent = FoldingEvent.DESTROYED;
        this.info.highlighted = false;
    }

    _setupEventsHandling() {
        this.marker.setupEventsHandling({
            handlingEnabled: event => !this.isUnderDestruction,
            handlers: {
                onInvalidated: event => {
                    logger.debug(this, `marker '${this.id}' is invalidated`);
                    this.destroy();
                },
                onBecameVisible: event => {
                    logger.debug(this, `marker '${this.id}' became visible`);
                    this.preview.show();
                    this.info.lastEvent = FoldingEvent.BECAME_VISIBLE;
                },
                onTranslated: event => {
                    logger.debug(this, `marker '${this.id}' translated`);
                    this.info.lastEvent = FoldingEvent.MOVED;
                },
                onBecameHidden: event => {
                    logger.debug(this, `marker '${this.id}' became hidden`);
                    this.preview.hide();
                    this.info.lastEvent = FoldingEvent.BECAME_HIDDEN;
                },
                onRangeDestructed: event => {
                    logger.debug(this, `marker '${this.id}' destructive change happened`);
                    logger.debug(this, event);
                    this.destroy();
                }
            }
        });
    }
}
