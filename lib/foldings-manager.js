'use babel';

import { CompositeDisposable, Point } from 'atom';
import logger from './logger.js';
import MarkerEvent from './marker-event.js';
import FoldingPreview from './folding-preview.js';

export default class FoldingsManager {
    constructor(textEditor) {
        this.foldPreviews = new Map();
        this.textEditor = textEditor;
        this._subscriptions = new CompositeDisposable();

        const subscr = this.textEditor.observeCursors((cursor) => {
            const callback = this.highlightFoldPreviewUnderCursor.bind(this);
            const subscr = cursor.onDidChangePosition(callback);
            this._subscriptions.add(subscr);
        });
        this._subscriptions.add(subscr);
    }

    dispose() {
        this._subscriptions.dispose();
    }

    foldWithPreview(bufferRange, previewText, foldingId) {
        const cursorBufPos = this.textEditor.getCursorBufferPosition();
        let text = this.textEditor.getTextInBufferRange(bufferRange);
        let textVisualLength = this.getVisualLength(text);
        if(previewText.length > textVisualLength) {
            // folding with larger text is not supported
            return;
        }
        this.foldTemplate(this.textEditor, bufferRange, previewText, text, textVisualLength);
        this.createOverlayDecoration(this.textEditor, foldingId, bufferRange, previewText);
        this.textEditor.setCursorBufferPosition(cursorBufPos);
    }

    // private members

    highlightFoldPreviewUnderCursor(event) {
        const oldCursorBufPos = event.oldBufferPosition;
        const newCursorBufPos = event.newBufferPosition;
        this.foldPreviews.forEach((preview, marker) => {
            if(!preview.isHidden()) {
                const markerBufRange = marker.getBufferRange();
                if(!markerBufRange.containsPoint(oldCursorBufPos) &&
                    markerBufRange.containsPoint(newCursorBufPos)
                ) {
                    logger.debug(this, 'cursor entered fold preview');
                    preview.updateClass('folding-preview-under-cursor');
                } else if(markerBufRange.containsPoint(oldCursorBufPos) &&
                    !markerBufRange.containsPoint(newCursorBufPos)
                ) {
                    logger.debug(this, 'cursor leaves fold preview');
                    preview.updateClass('folding-preview');
                }
            }
        });
    }

    getVisualLength(text) {
        let crlfCount = 0;
        for(let i = 0; i < text.length - 1; ++i) {
            if(text[i] === '\r' && text[i + 1] === '\n') {
                ++crlfCount;
            }
        }
        return text.length - crlfCount;
    }

    foldTemplate(editor, range, previewText, text, textVisualLength) {
        // fold line endings
        let fstLine = range[0][0];
        let lastLine = range[1][0];
        for(let line = fstLine; line < lastLine; ++line) {
            let lineEnd = editor.clipBufferPosition([line, Infinity]);
            editor.setSelectedBufferRange([lineEnd, [lineEnd.row + 1, 0]]);
            editor.foldSelectedLines();
        }
        // fold template
        let templateScreenStart = editor.screenPositionForBufferPosition(range[0]);
        let redundantPrefixLength = textVisualLength - previewText.length;
        // we add 1 because folding leaves ellipsis that occupies 1 character position
        // so, for example, folding 1 character does not save any visual space
        let prefixEnd = [
            templateScreenStart.row,
            templateScreenStart.column + redundantPrefixLength + 1
        ];
        editor.setSelectedScreenRange([templateScreenStart, prefixEnd]);
        editor.foldSelectedLines();
    }

    createOverlayDecoration(editor, index, range, previewText) {
        let marker = editor.markBufferRange(range, { invalidate: 'never' });
        const preview = new FoldingPreview(editor, marker, previewText, 'folding-preview');
        this.foldPreviews.set(marker, preview);

        marker.onDidChange((event) => {
            if(event.textChanged) {
                logger.debug(this, `marker '${index}' text changed`);
                this.destroyFolding(marker);
            } else if(MarkerEvent.isScreenTranslatedOnly(event)) {
                logger.debug(this, `marker '${index}' translated`);
            } else if(MarkerEvent.isScreenShrunk(event) && MarkerEvent.isScreenInvisible(event)) {
                logger.debug(this, `marker '${index}' became hidden`);
                this.foldPreviews.get(marker).hide();
            } else if(MarkerEvent.isScreenExpanded(event)) {
                if(MarkerEvent.wasScreenInvisible(event)) {
                    logger.debug(this, `marker '${index}' became visible`);
                    this.foldPreviews.get(marker).show();
                } else {
                    logger.debug(this, `marker '${index}' expanded`);
                    this.destroyFolding(marker);
                }
            } else {
                logger.debug(this, `marker '${index}' unexpected change`);
                logger.debug(this, event);
                this.destroyFolding(marker);
            }
        });
    }

    destroyFolding(marker) {
        this.foldPreviews.get(marker).destroy();
        this.foldPreviews.delete(marker);
        const bufferRange = marker.getBufferRange();
        marker.destroy();
        for(let r = bufferRange.start.row; r <= bufferRange.end.row; ++r) {
            this.textEditor.unfoldBufferRow(r);
        }
    }
};
