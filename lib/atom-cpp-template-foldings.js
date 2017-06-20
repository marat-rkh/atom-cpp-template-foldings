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

// TRYS

// let marker = editor.markBufferRange([
//     [data['beg']['line'] - 1, data['beg']['col'] - 1],
//     [data['end']['line'] - 1, data['end']['col'] - 1]
// ]);
// let item = document.createElement('div');
// item.innerText = 'template<...\n...>';
// item.style.cssText = `
//     display: inline-block;
//     border-style: solid;
//     border-width: 1px;
//     border-color: #cccccc;
//     background-color: #000000;
//     transform: translate(0, -50%)`;
// let decorateParams = {
//     type: 'overlay',
//     item: item,
//     position: 'tail',
//     avoidOverflow: false
// };
// editor.decorateMarker(marker, decorateParams);

// let marker = editor.markBufferRange([
//     [data['beg']['line'] - 1, data['beg']['col'] - 1]
// ]);
// let item = document.createElement('div');
// item.innerText = 'template<...>...';
// item.style.cssText = 'display: inline-block; border-style: solid; border-width: 1px; border-color: #cccccc';
// let decorateParams = {
//     type: 'block',
//     item: item,
//     position: 'before'
//     // avoidOverflow: false
// };
// editor.decorateMarker(marker, decorateParams);

// let gutters = editor.getGutters();
// if(gutters.length) {
//     // assumption: 0 indexed gutter is the default one
//     let gutterElem = atom.views.getView(gutters[0])
// }

// $('.fold-marker').each((fm) => {
//     console.log(fm);
//     console.log($(this)[0]);
// })

// spyFoldMarkers(textEditor) {
//     console.log('spying new TextEditor');
//     this.foldLines.clear();
//     let editor = atom.workspace.getActiveTextEditor();
//     editor.onDidChange((changes) => {
//         if(changes.length) {
//             let bufferPos = editor.bufferPositionForScreenPosition(changes[0].start);
//             if(this.foldLines.has(bufferPos.row)) {
//                 console.log('change at template row');
//                 console.log(changes[0].start.row);
//                 // new Promise((resolve, reject) => {
//                     this.tryDecorateFoldMarker(changes[0].start.row);
//                 // });
//             }
//         }
//     });
// },
//
// tryDecorateFoldMarker(screenRow) {
//     let editor = atom.workspace.getActiveTextEditor();
//     let editorElem = atom.views.getView(editor);
//     let sel = `div[data-screen-row='${screenRow}'] > span.fold-marker`;
//     $(editorElem).find(sel).each((_, elem) => {
//         console.log('found fold-marker');
//         console.log(elem);
//     });
// },

// let editorElem = atom.views.getView(editor);
// foldLines.forEach((e) => console.log(e));
// $(editorElem).find('div.line').each((idx, elem) => {
//     let lineNo = parseInt($(elem).attr('data-screen-row'));
//     if(foldLines.has(lineNo)) {
//         console.log(`adding observer to line ${lineNo}`);
//         console.log(elem);
//         let observer = new MutationObserver((ms) => {
//             for(let m of ms) {
//                 for(let added of m.addedNodes.values()) {
//                     if($(added).hasClass('fold-marker')) {
//                         console.log(`marker added to line ${lineNo}`);
//                         observer.disconnect();
//                     }
//                 }
//             }
//         });
//         observer.observe(elem, {childList: true});
//     }
// });

// === MUTATION OBSERVERS

// createObserver() {
//     return new MutationObserver((ms) => {
//         let ac = 0;
//         for(let i = 0; i < ms.length; ++i) {
//             let addedNodes = ms[i].addedNodes;
//             for(let j = 0; j < addedNodes.length; ++j) {
//                 ++ac;
//                 let added = addedNodes[j];
//                 if($(added).hasClass('fold-marker')) {
//                     let row = this.getBufferRowForFoldMarker(added);
//                     console.log(`fold-marker at row ${row}`);
//                     let data = this.foldData.get(row);
//                     if(data !== undefined) {
//                         // $(added).before("<span class='my-fold'>TEMPLATE</span>");
//                         $(added).text("TEMPLATE");
//                     }
//                 }
//             }
//         }
//         console.log(`observed ADDED: ${ac}`);
//     });
// },
//
// setupObserver() {
//     let editorElem = atom.views.getView(atom.workspace.getActiveTextEditor());
//     let lines = $(editorElem).find('div.lines');
//
//     this.foldMarkersObserver.disconnect();
//     this.foldMarkersObserver.observe(lines[0], {childList: true, subtree: true});
// },
//
// getBufferRowForFoldMarker(foldMarkerElem) {
//     let parent = foldMarkerElem.parentElement;
//     return this.getBufferRowForLine(parent);
// },
//
// getBufferRowForLine(lineElem) {
//     console.assert($(lineElem).hasClass('line'));
//     let screenRow = parseInt($(lineElem).attr('data-screen-row'));
//     let editor = atom.workspace.getActiveTextEditor();
//     return editor.bufferPositionForScreenPosition([screenRow, 0]).row;
// },
