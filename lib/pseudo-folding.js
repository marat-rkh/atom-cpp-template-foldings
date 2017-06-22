'use babel';

export default class PseudoFolding {
    static canBeFolded(textEditor, bufferRange, foldedAreaSize) {
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
        this.textEditor = textEditor;
        this.id = id;

        const text = textEditor.getTextInBufferRange(bufferRange);
        const textVisualLength = PseudoFolding._visualLength(text);
        if(foldedAreaSize > textVisualLength) {
            const msg = 'cannot create pseudo folding of size larger than text in folded range';
            throw new Error(msg);
        }
        this.marker = this._fold(bufferRange, textVisualLength, foldedAreaSize);
    }

    destroy() {
        const bufferRange = this.marker.getBufferRange();
        this.marker.destroy();
        for(let r = bufferRange.start.row; r <= bufferRange.end.row; ++r) {
            this.textEditor.unfoldBufferRow(r);
        }
    }

    _fold(bufferRange, textVisualLength, foldedAreaSize) {
        // fold line endings
        const bufRangeStart = bufferRange.start;
        const fstRow = bufRangeStart.row;
        const lastRow = bufferRange.end.row;
        for(let row = fstRow; row < lastRow; ++row) {
            const rowEnd = this.textEditor.clipBufferPosition([row, Infinity]);
            this.textEditor.setSelectedBufferRange([rowEnd, [rowEnd.row + 1, 0]]);
            this.textEditor.foldSelectedLines();
        }
        // fold prefix
        let prefixStart = this.textEditor.screenPositionForBufferPosition(bufRangeStart);
        let redundantPrefixLength = textVisualLength - foldedAreaSize;
        // we add 1 because folding leaves ellipsis that occupies 1 character position
        // so, for example, folding 1 character does not save any visual space
        let prefixEnd = [
            prefixStart.row,
            prefixStart.column + redundantPrefixLength + 1
        ];
        this.textEditor.setSelectedScreenRange([prefixStart, prefixEnd]);
        this.textEditor.foldSelectedLines();
        return this.textEditor.markBufferRange(bufferRange, { invalidate: 'inside' });
    }
}
