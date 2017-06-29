'use babel';

import { CompositeDisposable, Point } from 'atom';
import logger from '../utils/logger.js';
import PseudoFolding from './pseudo-folding.js';
import FoldingPreview from './folding-preview.js';
import MarkerEvent from './marker-event.js';

export default class FoldingsManager {
    constructor(textEditor) {
        this.foldPreviews = new Map();
        this.textEditor = textEditor;
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
            this.foldPreviews.set(marker, { folding, preview, foldingId });
            this._setupEventsHandling(marker, foldingId);
            this.textEditor.setCursorBufferPosition(cursorBufPos);
        }
    }

    unfoldAll() {
        this.foldPreviews.forEach((data, marker) => {
            data.preview.destroy();
            data.folding.destroy();
            marker.destroy();
        });
        this.foldPreviews.clear();
    }

    _highlightFoldingUnderCursor(event) {
        this.foldPreviews.forEach((data, marker) => {
            if(!data.preview.isHidden()) {
                if(this._isCursorEnteredFolding(event, marker)) {
                    logger.debug(this, `cursor entered fold preview '${data.foldingId}'`);
                    data.preview.updateClass('folding-preview-under-cursor');
                } else if(this._isCursorLeavedFolding(event, marker)) {
                    logger.debug(this, `cursor left fold preview '${data.foldingId}'`);
                    data.preview.updateClass('folding-preview');
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

    _setupEventsHandling(marker) {
        const foldingId = this.foldPreviews.get(marker).foldingId;
        marker.onDidChange((event) => {
            if(!event.isValid) {
                logger.debug(this, `marker '${foldingId}' is invalidated`);
                this._destroyFolding(marker);
            } else if(MarkerEvent.isScreenTranslatedOnly(event)) {
                logger.debug(this, `marker '${foldingId}' translated`);
            } else if(MarkerEvent.isScreenShrunk(event) && MarkerEvent.isScreenInvisible(event)) {
                logger.debug(this, `marker '${foldingId}' became hidden`);
                this.foldPreviews.get(marker).preview.hide();
            } else if(MarkerEvent.isScreenExpanded(event)) {
                if(MarkerEvent.wasScreenInvisible(event)) {
                    logger.debug(this, `marker '${foldingId}' became visible`);
                    this.foldPreviews.get(marker).preview.show();
                } else {
                    logger.debug(this, `marker '${foldingId}' expanded`);
                    this._destroyFolding(marker);
                }
            } else {
                logger.debug(this, `marker '${foldingId}' unexpected change`);
                logger.debug(this, event);
                this._destroyFolding(marker);
            }
        });
    }

    _destroyFolding(marker) {
        const data = this.foldPreviews.get(marker);
        data.preview.destroy();
        data.folding.destroy();
        marker.destroy();
        this.foldPreviews.delete(marker);
    }
};
