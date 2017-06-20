'use babel';

import { Point } from 'atom';

export class TemplateFolding {
    constructor(editor, opts) {
        this.editor = editor;
        this.marker = opts.marker;
        this.name = opts.name;
        this.marker.onDidChange(this._onDidChangeCallback.bind(this));
        this.decorateParams = opts.decorateParams;
        this.decoration = this.editor.decorateMarker(this.marker, this.decorateParams);
    }

    _onDidChangeCallback(event) {
        let oldTSP = event.oldTailScreenPosition;
        let oldHSP = event.oldHeadScreenPosition;
        let newTSP = event.newTailScreenPosition;
        let newHSP = event.newHeadScreenPosition;

        let tailChange = new Point(newTSP.row - oldTSP.row, newTSP.column - oldTSP.column);
        let headChange = new Point(newHSP.row - oldHSP.row, newHSP.column - oldHSP.column);
        if(tailChange.isEqual(headChange)) {
            console.log(`marker '${this.name}' translated`);
        } else if(newTSP.isEqual(newHSP)) {
            if(event.textChanged) {
                console.log(`marker '${this.name}' text changed`);
                this.marker.destroy();
            } else {
                console.log(`marker '${this.name}' became hidden`);
                this.decoration.destroy();
            }
        } else if(newHSP.isGreaterThan(oldTSP)) {
            if(oldTSP.isEqual(oldHSP)) {
                console.log(`marker '${this.name}' became visible`);
                this.decoration = this.editor.decorateMarker(this.marker, this.decorateParams);
            } else {
                console.log(`marker '${this.name}' expanded`);
                this.marker.destroy();
            }
        } else {
            console.log(`marker '${this.name}' unexpected change`);
            console.log(event);
            this.marker.destroy();
        }
    }
};
