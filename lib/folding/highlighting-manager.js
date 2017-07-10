'use babel';

import { CompositeDisposable } from 'atom';
import { MarkersAtRows } from './markers-at-rows';
import { FoldingMarker } from './folding-marker';
import logger from '../utils/logger';

export class HighlightingManager {
    constructor(textEditor) {
        this._markersAtRows = new MarkersAtRows();
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
        this._markersAtRows.saveMarkerAtRow(folding, folding.marker.getStartScreenPosition().row);
        this._setupEventsHandling(folding);
        if(highlightImmediately) {
            this._addHighlighting(folding);
        }
    }

    removeAllManagedFoldings() {
        this._managedFoldingsSubscrs.dispose();
        this._markersAtRows.clear();
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
        const markersAtOldRow = this._markersAtRows.get(event.oldScreenPosition.row);
        if(!markersAtOldRow) {
            return;
        }
        markersAtOldRow.forEach(folding => {
            if(!folding.preview.isHidden() && this._isCursorLeavedFolding(event, folding.marker)) {
                logger.debug(this, `cursor left fold preview '${folding.foldingId}'`);
                this._removeHighlighting(folding);
            }
        });
    }

    _addHighlightingAtNewPosition(event) {
        const markersAtNewRow = this._markersAtRows.get(event.newScreenPosition.row);
        if(!markersAtNewRow) {
            return;
        }
        markersAtNewRow.forEach(folding => {
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
                    this._markersAtRows.updateMarkerRow(
                        folding,
                        event.oldTailScreenPosition.row,
                        event.newTailScreenPosition.row
                    );
                },
                onInvalidated: event => {
                    // marker is at one of these two rows
                    this._markersAtRows.removeMarkerFromRow(folding, event.oldTailScreenPosition.row);
                    this._markersAtRows.removeMarkerFromRow(folding, event.newTailScreenPosition.row);
                },
                onRangeDestructed: event => {
                    // marker is at one of these two rows
                    this._markersAtRows.removeMarkerFromRow(folding, event.oldTailScreenPosition.row);
                    this._markersAtRows.removeMarkerFromRow(folding, event.newTailScreenPosition.row);
                },
                onBecameVisible: event => {
                    this._markersAtRows.saveMarkerAtRow(folding, event.newTailScreenPosition.row);
                },
                onBecameHidden: event => {
                    this._markersAtRows.removeMarkerFromRow(folding, event.oldTailScreenPosition.row);
                }
            }
        });
        this._managedFoldingsSubscrs.add(subscr);
    }
}
