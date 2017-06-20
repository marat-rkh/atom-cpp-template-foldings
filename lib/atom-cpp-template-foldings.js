'use babel';

import { CompositeDisposable, Point } from 'atom';
import * as child_process from 'child_process';

export default {
    subscriptions: null,

    activate(state) {
        // Events subscribed to in atom's system can be easily
        // cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();
        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'atom-cpp-template-foldings:fold': () => this.fold()
        }));
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    fold() {
        console.log('CppTemplateFoldings: fold');
        let editor
        if(editor = atom.workspace.getActiveTextEditor()) {
            const finder = child_process.spawn(
                'cpp-template-finder',
                [editor.getPath(), '--', '-xc++', '-std=c++11']
            )
            finder.stdout.on('data', (output) => {
                const templatesData = JSON.parse(output);
                templatesData.forEach((data, idx) => {
                    if(data['type'] === 0) {
                        editor.setSelectedBufferRange([
                            [data['beg']['line'] - 1, data['beg']['col'] - 1],
                            [data['end']['line'] - 1, data['end']['col'] - 1]
                        ]);
                        editor.foldSelectedLines();
                        this.createOverlayDecoration(editor, data, idx);
                    }
                });
            });
            finder.stderr.on('data', (data) => {
                console.log(`CppTemplateFoldings: folding failed`);
            });
            finder.on('close', (code) => {
                console.log(`CppTemplateFoldings: cpp-template-finder finished`);
            });
        }
    },

    createOverlayDecoration(editor, data, index) {
        let range = [
            [data['beg']['line'] - 1, data['beg']['col'] - 1],
            [data['end']['line'] - 1, data['end']['col'] - 1]
        ];
        let marker = editor.markBufferRange(range, { invalidate: 'never' });
        let decorateParams = this.makeDecorateParams(data);
        let decoration = editor.decorateMarker(marker, decorateParams);
        let callback = this.onTemplateFoldMarkerChange.bind({
            editor,
            marker,
            name: index,
            decorateParams: decorateParams,
            decoration
        });
        marker.onDidChange(callback);
    },

    makeDecorateParams(data) {
        let foldingPreview = document.createElement('div');
        foldingPreview.innerText = 'template<...>';
        foldingPreview.className = 'folding-preview';
        return {
            type: 'overlay',
            item: foldingPreview,
            position: 'tail',
            avoidOverflow: false
        };
    },

    onTemplateFoldMarkerChange(event) {
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
