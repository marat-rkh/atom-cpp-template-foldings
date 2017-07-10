'use babel';

import { Folding, FoldingStatus } from './folding';
import { HighlightingManager } from './highlighting-manager';

export const FoldingsManagerConfigCheck = {
    OK: 0,
    SOFT_WRAP_ONLY_ENABLED: 1
}

export { FoldingStatus };

export class FoldingsManager {
    constructor(textEditor) {
        this.textEditor = textEditor;
        this._foldings = [];
        this._hlManager = new HighlightingManager(textEditor);
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
        this._foldings.forEach(f => { f.destroy(); });
        // js arrays are cleared this way... what a shame...
        this._foldings.length = 0;
    }

    _foldWithPreview(bufferRange, previewData, foldingId) {
        if(FoldingsManager.checkAtomConfig() !== FoldingsManagerConfigCheck.OK) {
            throw new Error('preconditions are not met');
        }
        const maxLineLength = this._getEditorMaxLineLength();
        const check = Folding.checkPossible(
            this.textEditor, bufferRange, previewData.text.length, maxLineLength);
        if(check !== FoldingStatus.OK) {
            return { status: check };
        }
        const folding = new Folding(this.textEditor, bufferRange, previewData, foldingId);
        this._foldings.push(folding);
        const cursorBufPos = this.textEditor.getCursorBufferPosition();
        const highlightImmediately = folding.marker.getBufferRange().containsPoint(cursorBufPos);
        this._hlManager.manageFolding(folding, highlightImmediately);
        return { status: check, foldingInfo: folding.foldingInfo };
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
};
