'use babel';

import { CompositeDisposable, Point } from 'atom';
import logger from './logger.js';

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
        this.foldPreviews.forEach((decoration, marker) => {
            const markerBufRange = marker.getBufferRange();
            if(!markerBufRange.containsPoint(oldCursorBufPos) &&
                markerBufRange.containsPoint(newCursorBufPos)
            ) {
                logger.debug(this, 'cursor entered fold preview');
                const newDecoration =
                    this.resetDecoration(marker, decoration, 'folding-preview-under-cursor');
                this.foldPreviews.set(marker, newDecoration);
            } else if(markerBufRange.containsPoint(oldCursorBufPos) &&
                !markerBufRange.containsPoint(newCursorBufPos)
            ) {
                logger.debug(this, 'cursor leaves fold preview');
                const newDecoration =
                    this.resetDecoration(marker, decoration, 'folding-preview');
                this.foldPreviews.set(marker, newDecoration);
            }
        });
    }

    resetDecoration(marker, oldDecoration, newClass) {
        // TODO decoration.setProperties doesn't work for some reason...
        const props = oldDecoration.getProperties();
        oldDecoration.destroy();
        props.class = newClass;
        return this.textEditor.decorateMarker(marker, props);
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
        let decorateParams = this.makeDecorateParams(previewText, 'folding-preview', marker);
        let decoration = editor.decorateMarker(marker, decorateParams);
        this.foldPreviews.set(marker, decoration);

        marker.onDidChange((event) => {
            let oldTSP = event.oldTailScreenPosition;
            let oldHSP = event.oldHeadScreenPosition;
            let newTSP = event.newTailScreenPosition;
            let newHSP = event.newHeadScreenPosition;

            let tailChange = new Point(newTSP.row - oldTSP.row, newTSP.column - oldTSP.column);
            let headChange = new Point(newHSP.row - oldHSP.row, newHSP.column - oldHSP.column);
            if(tailChange.isEqual(headChange)) {
                console.log(`marker '${index}' translated`);
            } else if(newTSP.isEqual(newHSP)) {
                if(event.textChanged) {
                    console.log(`marker '${index}' text changed`);
                    this.foldPreviews.delete(marker);
                    marker.destroy();
                } else {
                    console.log(`marker '${index}' became hidden`);
                    this.foldPreviews.get(marker).destroy();
                    this.foldPreviews.delete(marker);
                }
            } else if(newHSP.isGreaterThan(oldTSP)) {
                if(oldTSP.isEqual(oldHSP)) {
                    console.log(`marker '${index}' became visible`);
                    const restoredDecor = editor.decorateMarker(marker, decorateParams);
                    this.foldPreviews.set(marker, restoredDecor);
                } else {
                    console.log(`marker '${index}' expanded`);
                    let bufferRange = marker.getBufferRange();
                    this.foldPreviews.delete(marker);
                    marker.destroy();
                    for(let r = bufferRange.start.row; r <= bufferRange.end.row; ++r) {
                        editor.unfoldBufferRow(r);
                    }
                }
            } else {
                console.log(`marker '${index}' unexpected change`);
                console.log(event);
                this.foldPreviews.delete(marker);
                marker.destroy();
            }
        });
    }

    makeDecorateParams(previewText, class_, marker) {
        let foldingPreview = document.createElement('div');
        foldingPreview.innerText = previewText;
        foldingPreview.addEventListener('click', (e) => {
            this.textEditor.setCursorBufferPosition(marker.getBufferRange().start);
        });
        return {
            type: 'overlay',
            item: foldingPreview,
            class: class_,
            position: 'tail',
            avoidOverflow: false
        };
    }
};
