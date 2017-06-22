'use babel';

import { CompositeDisposable, Point } from 'atom';
import logger from './logger.js';
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
            const folding = new PseudoFolding(
                this.textEditor,
                foldingId,
                bufferRange,
                previewText.length
            );
            const preview = new FoldingPreview(
                this.textEditor,
                folding.marker,
                previewText,
                'folding-preview'
            );
            this.foldPreviews.set(folding, preview);
            this._setupEventsHandling(folding);
            this.textEditor.setCursorBufferPosition(cursorBufPos);
        }
    }

    unfoldAll() {
        this.foldPreviews.forEach((preview, folding) => {
            preview.destroy();
            folding.destroy();
        });
        this.foldPreviews.clear();
    }

    _highlightFoldingUnderCursor(event) {
        this.foldPreviews.forEach((preview, folding) => {
            if(!preview.isHidden()) {
                if(this._isCursorEnteredFolding(event, folding)) {
                    logger.debug(this, 'cursor entered fold preview');
                    preview.updateClass('folding-preview-under-cursor');
                } else if(this._isCursorLeavedFolding(event, folding)) {
                    logger.debug(this, 'cursor leaves fold preview');
                    preview.updateClass('folding-preview');
                }
            }
        });
    }

    _isCursorEnteredFolding(event, folding) {
        const range = folding.marker.getBufferRange();
        return !range.containsPoint(event.oldBufferPosition) &&
            range.containsPoint(event.newBufferPosition);
    }

    _isCursorLeavedFolding(event, folding) {
        const range = folding.marker.getBufferRange();
        return range.containsPoint(event.oldBufferPosition) &&
            !range.containsPoint(event.newBufferPosition);
    }

    _setupEventsHandling(folding) {
        folding.marker.onDidChange((event) => {
            if(event.textChanged) {
                logger.debug(this, `folding '${folding.id}' text changed`);
                this._destroyFolding(folding);
            } else if(MarkerEvent.isScreenTranslatedOnly(event)) {
                logger.debug(this, `folding '${folding.id}' translated`);
            } else if(MarkerEvent.isScreenShrunk(event) && MarkerEvent.isScreenInvisible(event)) {
                logger.debug(this, `folding '${folding.id}' became hidden`);
                this.foldPreviews.get(folding).hide();
            } else if(MarkerEvent.isScreenExpanded(event)) {
                if(MarkerEvent.wasScreenInvisible(event)) {
                    logger.debug(this, `folding '${folding.id}' became visible`);
                    this.foldPreviews.get(folding).show();
                } else {
                    logger.debug(this, `folding '${folding.id}' expanded`);
                    this._destroyFolding(folding);
                }
            } else {
                logger.debug(this, `folding '${folding.id}' unexpected change`);
                logger.debug(this, event);
                this._destroyFolding(folding);
            }
        });
    }

    _destroyFolding(folding) {
        this.foldPreviews.get(folding).destroy();
        folding.destroy();
        this.foldPreviews.delete(folding);
    }
};
