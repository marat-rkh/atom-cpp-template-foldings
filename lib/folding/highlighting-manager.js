'use babel';

import { CompositeDisposable } from 'atom';
import { FoldingMarker } from './folding-marker';
import { MultiMap } from '../utils/multimap';
import logger from '../utils/logger';

export class HighlightingManager {
    constructor(textEditor) {
        this._rowsToFoldings = new MultiMap();
        this._highlightingEnabled = true;
        this._cursorsSubscrs = new CompositeDisposable();
        const subscr = textEditor.observeCursors((cursor) => {
            const callback = this._highlightFoldingUnderCursor.bind(this);
            const subscr = cursor.onDidChangePosition(callback);
            this._cursorsSubscrs.add(subscr);
        });
        this._cursorsSubscrs.add(subscr);
        this._managedFoldingsSubscrs = new CompositeDisposable();
    }

    dispose() {
        this._cursorsSubscrs.dispose();
        this._managedFoldingsSubscrs.dispose();
    }

    manageFolding(folding, highlightImmediately = false) {
        this._rowsToFoldings.set(folding.marker.getStartScreenPosition().row, folding);
        this._setupEventsHandling(folding);
        if(highlightImmediately) {
            this._addHighlighting(folding);
        }
    }

    removeAllManagedFoldings() {
        this._managedFoldingsSubscrs.dispose();
        this._rowsToFoldings.clear();
    }

    disableHighlighting() { this._highlightingEnabled = false; }

    enableHighlighting() { this._highlightingEnabled = true; }

    _highlightFoldingUnderCursor(event) {
        if(!this._highlightingEnabled) {
            return;
        }
        this._removeHighlightingAtOldPosition(event);
        this._addHighlightingAtNewPosition(event);
    }

    _removeHighlightingAtOldPosition(event) {
        const foldingsAtOldRow = this._rowsToFoldings.get(event.oldScreenPosition.row);
        if(!foldingsAtOldRow) {
            return;
        }
        foldingsAtOldRow.forEach(folding => {
            if(!folding.preview.isHidden() && this._isCursorLeavedFolding(event, folding.marker)) {
                logger.debug(this, `cursor left fold preview '${folding.foldingId}'`);
                this._removeHighlighting(folding);
            }
        });
    }

    _addHighlightingAtNewPosition(event) {
        const foldingsAtNewRow = this._rowsToFoldings.get(event.newScreenPosition.row);
        if(!foldingsAtNewRow) {
            return;
        }
        foldingsAtNewRow.forEach(folding => {
            if(!folding.preview.isHidden() && this._isCursorEnteredFolding(event, folding.marker)) {
                logger.debug(this, `cursor entered fold preview '${folding.foldingId}'`);
                this._addHighlighting(folding);
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

    _addHighlighting(folding) {
        folding.preview.updateClass('folding-preview-under-cursor');
        folding.foldingInfo.highlighted = true;
    }

    _removeHighlighting(folding) {
        folding.preview.updateClass('folding-preview');
        folding.foldingInfo.highlighted = false;
    }

    _setupEventsHandling(folding) {
        const subscr = folding.marker.setupEventsHandling({
            handlingEnabled: event => !folding.isUnderDestruction,
            handlers: {
                onTranslated: event => {
                    this._rowsToFoldings.delete(event.oldTailScreenPosition.row, folding);
                    this._rowsToFoldings.set(event.newTailScreenPosition.row, folding);
                },
                onInvalidated: event => {
                    // marker is at one of these two rows
                    this._rowsToFoldings.delete(event.oldTailScreenPosition.row, folding);
                    this._rowsToFoldings.delete(event.newTailScreenPosition.row, folding);
                },
                onRangeDestructed: event => {
                    // marker is at one of these two rows
                    this._rowsToFoldings.delete(event.oldTailScreenPosition.row, folding);
                    this._rowsToFoldings.delete(event.newTailScreenPosition.row, folding);
                },
                onBecameVisible: event => {
                    this._rowsToFoldings.set(event.newTailScreenPosition.row, folding);
                },
                onBecameHidden: event => {
                    this._rowsToFoldings.set(event.oldTailScreenPosition.row, folding);
                }
            }
        });
        this._managedFoldingsSubscrs.add(subscr);
    }
}
