'use babel';

// TODO change to MapOfSets and move to `utils`
export class MarkersAtRows {
    constructor() {
        this._markersAtRows = new Map();
    }

    get(row) {
        return this._markersAtRows.get(row);
    }

    saveMarkerAtRow(marker, row) {
        let markers = this._markersAtRows.get(row);
        if(!markers) {
            markers = new Set();
            this._markersAtRows.set(row, markers);
        }
        markers.add(marker);
    }

    removeMarkerFromRow(marker, row) {
        const markers = this._markersAtRows.get(row);
        if(markers) {
            markers.delete(marker);
        }
    }

    updateMarkerRow(marker, oldRow, newRow) {
        this.removeMarkerFromRow(marker, oldRow);
        this.saveMarkerAtRow(marker, newRow);
    }

    clear() {
        this._markersAtRows.clear();
    }
}
