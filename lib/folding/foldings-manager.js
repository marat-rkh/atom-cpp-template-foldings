'use babel';

import { Point } from 'atom';
import logger from '../utils/logger.js';
import { PseudoFolding, PseudoFoldingCheck } from './pseudo-folding.js';
import FoldingPreview from './folding-preview.js';
import { MarkerEvent } from './marker-event';
import { FoldingEvent } from './folding-event.js';
import { HighlightingManager } from './highlighting-manager';

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
        this._hlManager = new HighlightingManager(textEditor, this._foldings);
    }

    dispose() {
        this.unfoldAll();
        this._hlManager.dispose();
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
        this._hlManager.disableHighlighting();
        const atomicSoftTabs = atom.config.get('editor.atomicSoftTabs');
        atom.config.set('editor.atomicSoftTabs', false);
        const results = foldingsData.map(fd => this._foldWithPreview(
            fd.bufferRange, fd.previewData, fd.foldingId
        ));
        this._hlManager.enableHighlighting();
        atom.config.set('editor.atomicSoftTabs', atomicSoftTabs);
        return results;
    }

    unfoldAll() {
        this._hlManager.disableHighlighting();
        this._hlManager.removeAllManagedFoldings();
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
        const highlightImmediately = marker.getBufferRange().containsPoint(cursorBufPos);
        this._hlManager.manageFolding(marker, highlightImmediately);
        this._setupEventsHandling(marker, foldingId);
        this.textEditor.setCursorBufferPosition(cursorBufPos);
        return foldingInfo;
    }

    _setupEventsHandling(marker) {
        const data = this._foldings.get(marker);
        MarkerEvent.setChangeHandlers(marker, {
            handlingEnabled: event => !data.isUnderDestruction,
            handlers: {
                onInvalidated: event => {
                    logger.debug(this, `marker '${data.foldingId}' is invalidated`);
                    this._removeFolding(marker, event);
                },
                onBecameVisible: event => {
                    logger.debug(this, `marker '${data.foldingId}' became visible`);
                    data.preview.show();
                    data.foldingInfo.lastEvent = FoldingEvent.BECAME_VISIBLE;
                },
                onTranslated: event => {
                    logger.debug(this, `marker '${data.foldingId}' translated`);
                    data.foldingInfo.lastEvent = FoldingEvent.MOVED;
                },
                onBecameHidden: event => {
                    logger.debug(this, `marker '${data.foldingId}' became hidden`);
                    data.preview.hide();
                    data.foldingInfo.lastEvent = FoldingEvent.BECAME_HIDDEN;
                },
                onRangeDestructed: event => {
                    logger.debug(this, `marker '${data.foldingId}' destructive change happened`);
                    logger.debug(this, event);
                    this._removeFolding(marker, event);
                }
            }
        });
    }

    _removeFolding(marker, event) {
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
