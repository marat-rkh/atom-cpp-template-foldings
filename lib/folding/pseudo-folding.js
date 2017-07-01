'use babel';

import { TextEditorUtils as TEUtils } from '../utils/text-editor-utils.js';

export default class PseudoFolding {
    static canBeFolded(textEditor, bufferRange, foldedAreaSize) {
        if(foldedAreaSize <= 0) {
            return false;
        }
        const text = textEditor.getTextInBufferRange(bufferRange);
        const textVisualLength = PseudoFolding._visualLength(text);
        return foldedAreaSize <= textVisualLength;
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

    constructor(textEditor, id, bufferRange, foldedAreaSize) {
        if(foldedAreaSize <= 0) {
            const msg = 'cannot create pseudo folding of size <= 0';
            throw new Error(msg);
        }
        this.textEditor = textEditor;
        this.id = id;
        this.bufferRange = bufferRange;

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
        TEUtils.unfoldRowsInBufferRange(this.textEditor, this.bufferRange);
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
        // TODO consider moving this toggle to FoldingsManager
        const atomicSoftTabsOption = atom.config.get('editor.atomicSoftTabs');
        atom.config.set('editor.atomicSoftTabs', false);
        this.textEditor.setSelectedBufferRange([bufRangeStart, prefixEnd], { preserveFolds: true });
        this.textEditor.foldSelectedLines();
        atom.config.set('editor.atomicSoftTabs', atomicSoftTabsOption);
    }
}
