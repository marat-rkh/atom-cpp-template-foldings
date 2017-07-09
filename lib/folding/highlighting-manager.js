'use babel';

import { CompositeDisposable } from 'atom';
import { MarkersAtRows } from './markers-at-rows';
import { MarkerEvent } from './marker-event';
import logger from '../utils/logger';

export class HighlightingManager {
    constructor(textEditor, foldings) {
        this._foldings = foldings;
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

    manageFolding(foldingMarker, highlightImmediately = false) {
        this._markersAtRows.saveMarkerAtRow(foldingMarker, foldingMarker.getStartScreenPosition().row);
        this._setupEventsHandling(foldingMarker);
        if(highlightImmediately) {
            this._addHighlighting(this._foldings.get(foldingMarker));
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
        markersAtOldRow.forEach(marker => {
            const data = this._foldings.get(marker);
            if(!data.preview.isHidden() && this._isCursorLeavedFolding(event, marker)) {
                logger.debug(this, `cursor left fold preview '${data.foldingId}'`);
                this._removeHighlighting(data);
            }
        });
    }

    _addHighlightingAtNewPosition(event) {
        const markersAtNewRow = this._markersAtRows.get(event.newScreenPosition.row);
        if(!markersAtNewRow) {
            return;
        }
        markersAtNewRow.forEach(marker => {
            const data = this._foldings.get(marker);
            if(!data.preview.isHidden() && this._isCursorEnteredFolding(event, marker)) {
                logger.debug(this, `cursor entered fold preview '${data.foldingId}'`);
                this._addHighlighting(data);
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

    _addHighlighting(foldingData) {
        foldingData.preview.updateClass('folding-preview-under-cursor');
        foldingData.foldingInfo.highlighted = true;
    }

    _removeHighlighting(foldingData) {
        foldingData.preview.updateClass('folding-preview');
        foldingData.foldingInfo.highlighted = false;
    }

    _setupEventsHandling(marker) {
        const data = this._foldings.get(marker);
        const subscr = MarkerEvent.setChangeHandlers(marker, {
            handlingEnabled: event => !data.isUnderDestruction,
            handlers: {
                onTranslated: event => {
                    this._markersAtRows.updateMarkerRow(
                        marker,
                        event.oldTailScreenPosition.row,
                        event.newTailScreenPosition.row
                    );
                },
                onInvalidated: event => {
                    // marker is at one of these two rows
                    this._markersAtRows.removeMarkerFromRow(marker, event.oldTailScreenPosition.row);
                    this._markersAtRows.removeMarkerFromRow(marker, event.newTailScreenPosition.row);
                },
                onRangeDestructed: event => {
                    // marker is at one of these two rows
                    this._markersAtRows.removeMarkerFromRow(marker, event.oldTailScreenPosition.row);
                    this._markersAtRows.removeMarkerFromRow(marker, event.newTailScreenPosition.row);
                },
                onBecameVisible: event => {
                    this._markersAtRows.saveMarkerAtRow(marker, event.newTailScreenPosition.row);
                },
                onBecameHidden: event => {
                    this._markersAtRows.removeMarkerFromRow(marker, event.oldTailScreenPosition.row);
                }
            }
        });
        this._managedFoldingsSubscrs.add(subscr);
    }
}
