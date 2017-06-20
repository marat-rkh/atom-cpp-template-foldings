'use babel';

import { CompositeDisposable } from 'atom';
import * as child_process from 'child_process';
import { TemplateFolding } from './template-folding.js';

export default {
    subscriptions: null,
    foldData: null,

    activate(state) {
        // Events subscribed to in atom's system can be easily
        // cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();
        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'atom-cpp-template-foldings:fold': () => this.fold()
        }));
        this.foldData = new Map();
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
                this.foldData.clear();
                templatesData.forEach((data) => {
                    this.foldData.set(data['beg']['line'] - 1, true);
                });
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
        let marker = editor.markBufferRange([
            [data['beg']['line'] - 1, data['beg']['col'] - 1],
            [data['end']['line'] - 1, data['end']['col'] - 1]
        ], {
            invalidate: 'never'
        });
        let item = document.createElement('div');
        item.innerText = 'template<...>';
        item.style.cssText = `
            display: inline-block;
            border-style: solid;
            border-width: 1px;
            border-color: #cccccc;
            background-color: #000000;
            transform: translate(0, -100%)`;
        let decorateParams = {
            type: 'overlay',
            item: item,
            position: 'tail',
            avoidOverflow: false
        };
        let templateFolding = new TemplateFolding(editor, {
            marker: marker,
            name: index,
            decorateParams: decorateParams
        });
    },
};
