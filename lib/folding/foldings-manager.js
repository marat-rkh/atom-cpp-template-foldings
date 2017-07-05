'use babel';

import { CompositeDisposable, Point } from 'atom';
import logger from '../utils/logger.js';
import { PseudoFolding, PseudoFoldingCheck } from './pseudo-folding.js';
import FoldingPreview from './folding-preview.js';
import MarkerEvent from './marker-event.js';
import { FoldingEvent } from './folding-event.js';

export const FoldingsManagerConfigCheck = {
    OK: 0,
    SOFT_WRAP_ONLY_ENABLED: 1
}

export const FoldingStatus = {
    OK: 0,
    ERROR: 1, // some unclassified error
    WILL_EXCEED_MAX_LINE_LENGTH: 2,
    TEXT_HAS_TABS: 3
};

export class FoldingsManager {
    constructor(textEditor) {
        this.textEditor = textEditor;
        this._foldings = new Map();
        this._subscriptions = new CompositeDisposable();
        this._highlightingEnabled = true;

        const subscr = this.textEditor.observeCursors((cursor) => {
            const callback = this._highlightFoldingUnderCursor.bind(this);
            const subscr = cursor.onDidChangePosition(callback);
            this._subscriptions.add(subscr);
        });
        this._subscriptions.add(subscr);
    }

    dispose() {
        this.unfoldAll();
        this._subscriptions.dispose();
    }

    static checkAtomConfig() {
        const softWrap = atom.config.get('editor.softWrap');
        const softWrapAtPreferredLineLength = atom.config.get('editor.softWrapAtPreferredLineLength');
        if(softWrap && !softWrapAtPreferredLineLength) {
            return FoldingsManagerConfigCheck.SOFT_WRAP_ONLY_ENABLED;
        }
        return FoldingsManagerConfigCheck.OK;
    }

    foldWithPreview(bufferRange, previewData, foldingId) {
        return this.foldAllWithPreview([{bufferRange, previewData, foldingId}])[0];
    }

    foldAllWithPreview(foldingsData) {
        this._highlightingEnabled = false;
        const atomicSoftTabs = atom.config.get('editor.atomicSoftTabs');
        atom.config.set('editor.atomicSoftTabs', false);
        const results = foldingsData.map(fd => this._foldWithPreview(
            fd.bufferRange, fd.previewData, fd.foldingId
        ));
        this._highlightingEnabled = true;
        atom.config.set('editor.atomicSoftTabs', atomicSoftTabs);
        return results;
    }

    unfoldAll() {
        this._foldings.forEach((data, marker) => {
            this._destroyFolding(marker, data);
        });
        this._foldings.clear();
    }

    _foldWithPreview(bufferRange, previewData, foldingId) {
        if(FoldingsManager.checkAtomConfig() !== FoldingsManagerConfigCheck.OK) {
            throw new Error('preconditions are not met');
        }
        const maxLineLength = this._getEditorMaxLineLength();
        const check = PseudoFolding.checkFoldingPossible(
            this.textEditor,
            bufferRange,
            previewData.text.length,
            maxLineLength
        );
        if(check === PseudoFoldingCheck.POSSIBLE) {
            const foldingInfo = this._performFolding(bufferRange, previewData, foldingId);
            return { status: FoldingStatus.OK, foldingInfo };
        } else if(check === PseudoFoldingCheck.WILL_EXCEED_MAX_LINE_LENGTH) {
            return { status: FoldingStatus.WILL_EXCEED_MAX_LINE_LENGTH };
        } else if(check === PseudoFoldingCheck.TEXT_HAS_TABS) {
            return { status: FoldingStatus.TEXT_HAS_TABS };
        } else {
            return { status: FoldingStatus.ERROR };
        }
    }

    _highlightFoldingUnderCursor(event) {
        if(!this._highlightingEnabled) {
            return;
        }
        this._foldings.forEach((data, marker) => {
            if(!data.preview.isHidden()) {
                if(this._isCursorEnteredFolding(event, marker)) {
                    logger.debug(this, `cursor entered fold preview '${data.foldingId}'`);
                    this._enableHighlighting(data);
                } else if(this._isCursorLeavedFolding(event, marker)) {
                    logger.debug(this, `cursor left fold preview '${data.foldingId}'`);
                    this._disableHighlighting(data);
                }
            }
        });
    }

    _isCursorEnteredFolding(event, marker) {
        const range = marker.getBufferRange();
        return !range.containsPoint(event.oldBufferPosition) &&
            range.containsPoint(event.newBufferPosition);
    }

    _isCursorLeavedFolding(event, marker) {
        const range = marker.getBufferRange();
        return range.containsPoint(event.oldBufferPosition) &&
            !range.containsPoint(event.newBufferPosition);
    }

    _enableHighlighting(foldingData) {
        foldingData.preview.updateClass('folding-preview-under-cursor');
        foldingData.foldingInfo.highlighted = true;
    }

    _disableHighlighting(foldingData) {
        foldingData.preview.updateClass('folding-preview');
        foldingData.foldingInfo.highlighted = false;
    }

    _getEditorMaxLineLength() {
        const softWrap = atom.config.get('editor.softWrap');
        const softWrapAtPreferredLineLength = atom.config.get('editor.softWrapAtPreferredLineLength');
        if(softWrap && softWrapAtPreferredLineLength) {
            const length = atom.config.get('editor.preferredLineLength');
            // 80 is atom's default, not added to config
            return length !== null && length !== undefined ? length : 80;
        }
        return -1;
    }

    _performFolding(bufferRange, previewData, foldingId) {
        const cursorBufPos = this.textEditor.getCursorBufferPosition();
        const marker = this.textEditor.markBufferRange(bufferRange, { invalidate: 'inside' });
        const folding = new PseudoFolding(
            this.textEditor,
            foldingId,
            marker,
            previewData.text.length
        );
        const preview = new FoldingPreview(
            this.textEditor,
            marker,
            previewData,
            'folding-preview'
        );
        const foldingInfo = { lastEvent: FoldingEvent.CREATED, highlighted: false };
        const foldingData = { folding, preview, foldingId, foldingInfo, isUnderDestruction: false };
        this._foldings.set(marker, foldingData);
        this._setupEventsHandling(marker, foldingId);
        if(marker.getBufferRange().containsPoint(cursorBufPos)) {
            this._enableHighlighting(foldingData);
        }
        this.textEditor.setCursorBufferPosition(cursorBufPos);
        return foldingInfo;
    }

    _setupEventsHandling(marker) {
        const initScreenRange = marker.getScreenRange();
        const data = this._foldings.get(marker);
        marker.onDidChange((event) => {
            if(data.isUnderDestruction) {
                return;
            }
            if(!event.isValid) {
                logger.debug(this, `marker '${data.foldingId}' is invalidated`);
                this._removeFolding(marker);
            } else if(MarkerEvent.isNewScreenRangeEquals(event, initScreenRange)) {
                if(MarkerEvent.wasScreenInvisible(event)) {
                    logger.debug(this, `marker '${data.foldingId}' became visible`);
                    data.preview.show();
                    data.foldingInfo.lastEvent = FoldingEvent.BECAME_VISIBLE;
                } else {
                    console.assert(MarkerEvent.isScreenTranslatedOnly(event));
                    logger.debug(this, `marker '${data.foldingId}' translated`);
                    data.foldingInfo.lastEvent = FoldingEvent.MOVED;
                }
            } else {
                if(MarkerEvent.isScreenInvisible(event)) {
                    logger.debug(this, `marker '${data.foldingId}' became hidden`);
                    data.preview.hide();
                    data.foldingInfo.lastEvent = FoldingEvent.BECAME_HIDDEN;
                } else {
                    logger.debug(this, `marker '${data.foldingId}' destructive change happened`);
                    logger.debug(this, event);
                    this._removeFolding(marker);
                }
            }
        });
    }

    _removeFolding(marker) {
        const data = this._foldings.get(marker);
        this._destroyFolding(marker, data);
        this._foldings.delete(marker);
    }

    _destroyFolding(marker, data) {
        data.isUnderDestruction = true;
        data.preview.destroy();
        data.folding.destroy();
        // pseudo folding uses marker to destroy itself so marker
        // must be destroyed after pseudo folding
        marker.destroy();
        data.foldingInfo.lastEvent = FoldingEvent.DESTROYED;
        data.foldingInfo.highlighted = false;
    }
};
