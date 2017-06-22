'use babel';

export default class FoldingPreview {
    constructor(textEditor, marker, previewText, class_) {
        this.marker = marker;
        this.textEditor = textEditor;
        this._decorateParams = {
            type: 'overlay',
            item: this._makeDiv(previewText),
            class: class_,
            position: 'tail',
            avoidOverflow: false
        };
        this._decoration = null;
        this._create();
        this._isHidden = false;
    }

    destroy() { this._decoration.destroy(); }

    updateClass(class_) {
        this.destroy();
        this._decorateParams['class'] = class_;
        this._create();
    }

    hide() {
        this.destroy();
        this._isHidden = true;
    }

    show() {
        this._create();
        this._isHidden = false;
    }

    isHidden() { return this._isHidden; }

    _makeDiv(previewText) {
        const div = document.createElement('div');
        div.innerText = previewText;
        div.addEventListener('click', (e) => {
            this.textEditor.setCursorBufferPosition(this.marker.getBufferRange().start);
        });
        return div;
    }

    _create() {
        this._decoration = this.textEditor.decorateMarker(this.marker, this._decorateParams);
    }
}
