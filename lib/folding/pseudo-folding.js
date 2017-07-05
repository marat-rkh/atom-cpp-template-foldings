'use babel';

import { TextEditorUtils as TEUtils } from '../utils/text-editor-utils.js';

export const PseudoFoldingCheck = {
    POSSIBLE: 0,
    FOLD_AREA_IS_TOO_WIDE: 1,
    FOLD_AREA_IS_INCORRECT: 2,
    WILL_EXCEED_MAX_LINE_LENGTH: 3,
    TEXT_HAS_TABS: 4
};

export class PseudoFolding {
    static checkFoldingPossible(textEditor, bufferRange, foldedAreaSize, editorMaxLineLength = -1) {
        if(foldedAreaSize <= 0) {
            return PseudoFoldingCheck.FOLD_AREA_IS_INCORRECT;
        }
        const text = textEditor.getTextInBufferRange(bufferRange);
        if(text.includes('\t')) {
            return PseudoFoldingCheck.TEXT_HAS_TABS;
        }
        const textVisualLength = PseudoFolding._visualLength(text);
        if(foldedAreaSize > textVisualLength) {
            return PseudoFoldingCheck.FOLD_AREA_IS_TOO_WIDE;
        }
        if(editorMaxLineLength < 0) {
            // there is no restrictions on line length
            return PseudoFoldingCheck.POSSIBLE;
        }
        const screenRange = textEditor.screenRangeForBufferRange(bufferRange);
        if(screenRange.start.column + foldedAreaSize < editorMaxLineLength) {
            return PseudoFoldingCheck.POSSIBLE;
        }
        return PseudoFoldingCheck.WILL_EXCEED_MAX_LINE_LENGTH;
    }

    static _visualLength(text) {
        let crlfCount = 0;
        for(let i = 0; i < text.length - 1; ++i) {
            if(text[i] === '\r' && text[i + 1] === '\n') {
                ++crlfCount;
            }
        }
        return text.length - crlfCount;
    }

    /*
    * This constructor expects that editor.atomicSoftTabs option is set to false.
    */
    constructor(textEditor, id, marker, foldedAreaSize) {
        if(atom.config.get('editor.atomicSoftTabs')) {
            throw new Error('PseudoFolding is not possible with editor.atomicSoftTabs enabled');
        }
        if(foldedAreaSize <= 0) {
            const msg = 'cannot create pseudo folding of size <= 0';
            throw new Error(msg);
        }
        this.textEditor = textEditor;
        this.id = id;
        this.marker = marker;

        const bufferRange = marker.getBufferRange();
        const text = textEditor.getTextInBufferRange(bufferRange);
        const textVisualLength = PseudoFolding._visualLength(text);
        if(foldedAreaSize > textVisualLength) {
            const msg = 'cannot create pseudo folding of size larger than text in folded range';
            throw new Error(msg);
        }
        TEUtils.unfoldRowsInBufferRange(textEditor, bufferRange);
        this._fold(bufferRange, textVisualLength, foldedAreaSize);
    }

    destroy() {
        TEUtils.unfoldRowsInBufferRange(this.textEditor, this.marker.getBufferRange());
    }

    _fold(bufferRange, textVisualLength, foldedAreaSize) {
        // fold line endings
        const bufRangeStart = bufferRange.start;
        const fstRow = bufRangeStart.row;
        const lastRow = bufferRange.end.row;
        for(let row = fstRow; row < lastRow; ++row) {
            const rowEnd = this.textEditor.clipBufferPosition([row, Infinity]);
            const range = [rowEnd, [rowEnd.row + 1, 0]];
            this.textEditor.setSelectedBufferRange(range, { preserveFolds: true });
            this.textEditor.foldSelectedLines();
        }
        // fold prefix
        const redundantPrefixLength = textVisualLength - foldedAreaSize;
        // we add 1 because folding leaves ellipsis that occupies 1 character position
        // so, for example, folding 1 character does not save any visual space
        const prefixEnd = TEUtils.advanceBufferPosition(
            this.textEditor, bufRangeStart, redundantPrefixLength + 1
        );
        this.textEditor.setSelectedBufferRange([bufRangeStart, prefixEnd], { preserveFolds: true });
        this.textEditor.foldSelectedLines();
    }
}
