'use babel';

import { CompositeDisposable, Point } from 'atom';
import logger from '../utils/logger.js';
import PseudoFolding from './pseudo-folding.js';
import FoldingPreview from './folding-preview.js';
import MarkerEvent from './marker-event.js';
import { FoldingEvent } from './folding-event.js';

export default class FoldingsManager {
    constructor(textEditor) {
        this.textEditor = textEditor;
        this._foldings = new Map();
        this._subscriptions = new CompositeDisposable();

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

    foldWithPreview(bufferRange, previewText, foldingId) {
        if(PseudoFolding.canBeFolded(this.textEditor, bufferRange, previewText.length)) {
            const cursorBufPos = this.textEditor.getCursorBufferPosition();
            const marker = this.textEditor.markBufferRange(bufferRange, { invalidate: 'inside' });
            const folding = new PseudoFolding(
                this.textEditor,
                foldingId,
                marker.getBufferRange(),
                previewText.length
            );
            const preview = new FoldingPreview(
                this.textEditor,
                marker,
                previewText,
                'folding-preview'
            );
            const foldingInfo = { lastEvent: FoldingEvent.CREATED, highlighted: false };
            const foldingData = { folding, preview, foldingId, foldingInfo };
            this._foldings.set(marker, foldingData);
            this._setupEventsHandling(marker, foldingId);
            if(marker.getBufferRange().containsPoint(cursorBufPos)) {
                this._enableHighlighting(foldingData);
            }
            this.textEditor.setCursorBufferPosition(cursorBufPos);
            return {
                folded: true,
                foldingInfo
            };
        }
        return { folded: false };
    }

    unfoldAll() {
        this._foldings.forEach((data, marker) => {
            this._destroyFolding(marker, data);
        });
        this._foldings.clear();
    }

    _highlightFoldingUnderCursor(event) {
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

    _setupEventsHandling(marker) {
        const data = this._foldings.get(marker);
        marker.onDidChange((event) => {
            if(!event.isValid) {
                logger.debug(this, `marker '${data.foldingId}' is invalidated`);
                this._removeFolding(marker);
            } else if(MarkerEvent.isScreenTranslatedOnly(event)) {
                logger.debug(this, `marker '${data.foldingId}' translated`);
                data.foldingInfo.lastEvent = FoldingEvent.MOVED;
            } else if(MarkerEvent.isScreenShrunk(event) && MarkerEvent.isScreenInvisible(event)) {
                logger.debug(this, `marker '${data.foldingId}' became hidden`);
                data.preview.hide();
                data.foldingInfo.lastEvent = FoldingEvent.BECAME_HIDDEN;
            } else if(MarkerEvent.isScreenExpanded(event)) {
                if(MarkerEvent.wasScreenInvisible(event)) {
                    logger.debug(this, `marker '${data.foldingId}' became visible`);
                    data.preview.show();
                    data.foldingInfo.lastEvent = FoldingEvent.BECAME_VISIBLE;
                } else {
                    logger.debug(this, `marker '${data.foldingId}' expanded`);
                    this._removeFolding(marker);
                }
            } else {
                logger.debug(this, `marker '${data.foldingId}' unexpected change`);
                logger.debug(this, event);
                this._removeFolding(marker);
            }
        });
    }

    _removeFolding(marker) {
        const data = this._foldings.get(marker);
        this._destroyFolding(marker, data);
        this._foldings.delete(marker);
    }

    _destroyFolding(marker, data) {
        data.preview.destroy();
        // we destroy marker first because folding destruction triggers multiple events
        // on marker and there is no need to handle these events
        marker.destroy();
        data.folding.destroy();
        data.foldingInfo.lastEvent = FoldingEvent.DESTROYED;
        data.foldingInfo.highlighted = false;
    }
};
