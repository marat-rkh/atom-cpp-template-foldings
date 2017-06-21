'use babel';

import { CompositeDisposable, Point } from 'atom';
import * as child_process from 'child_process';

export default {
    subscriptions: null,
    foldPreviews: new Map(),

    activate(state) {
        // Events subscribed to in atom's system can be easily
        // cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();
        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'atom-cpp-template-foldings:fold': () => this.fold()
        }));
        atom.workspace.observeTextEditors((editor) => {
            editor.observeCursors((cursor) => {
                cursor.onDidChangePosition(this.highlightFoldPreviewUnderCursor.bind(this));
            })
        })
    },

    highlightFoldPreviewUnderCursor(event) {
        const oldCursorBufPos = event.oldBufferPosition;
        const newCursorBufPos = event.newBufferPosition;
        this.foldPreviews.forEach((decoration, marker) => {
            const markerBufRange = marker.getBufferRange();
            if(!markerBufRange.containsPoint(oldCursorBufPos) &&
                markerBufRange.containsPoint(newCursorBufPos)
            ) {
                console.log('cursor entered fold preview');
                const newDecoration =
                    this.resetDecoration(marker, decoration, 'folding-preview-under-cursor');
                this.foldPreviews.set(marker, newDecoration);
            } else if(markerBufRange.containsPoint(oldCursorBufPos) &&
                !markerBufRange.containsPoint(newCursorBufPos)
            ) {
                console.log('cursor leaves fold preview');
                const newDecoration =
                    this.resetDecoration(marker, decoration, 'folding-preview');
                this.foldPreviews.set(marker, newDecoration);
            }
        });
    },

    resetDecoration(marker, oldDecoration, newClass) {
        // TODO decoration.setProperties doesn't work for some reason...
        const props = oldDecoration.getProperties();
        oldDecoration.destroy();
        props.class = newClass;
        const editor = atom.workspace.getActiveTextEditor();
        return editor.decorateMarker(marker, props);
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
                        let range = [
                            [data['beg']['line'] - 1, data['beg']['col'] - 1],
                            [data['end']['line'] - 1, data['end']['col'] - 1]
                        ];
                        let previewText = 'template<...>';
                        let text = editor.getTextInBufferRange(range);
                        let textVisualLength = this.getVisualLength(text);
                        if(previewText.length > textVisualLength) {
                            // folding with larger text is not supported
                            return;
                        }
                        this.foldTemplate(editor, range, previewText, text, textVisualLength);
                        this.createOverlayDecoration(editor, idx, range, previewText);
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

    getVisualLength(text) {
        let crlfCount = 0;
        for(let i = 0; i < text.length - 1; ++i) {
            if(text[i] === '\r' && text[i + 1] === '\n') {
                ++crlfCount;
            }
        }
        return text.length - crlfCount;
    },

    foldTemplate(editor, range, previewText, text, textVisualLength) {
        // fold line endings
        let fstLine = range[0][0];
        let lastLine = range[1][0];
        for(let line = fstLine; line < lastLine; ++line) {
            let lineEnd = editor.clipBufferPosition([line, Infinity]);
            editor.setSelectedBufferRange([lineEnd, [lineEnd.row + 1, 0]]);
            editor.foldSelectedLines();
        }
        // fold template
        let templateScreenStart = editor.screenPositionForBufferPosition(range[0]);
        let redundantPrefixLength = textVisualLength - previewText.length;
        // we add 1 because folding leaves ellipsis that occupies 1 character position
        // so, for example, folding 1 character does not save any visual space
        let prefixEnd = [
            templateScreenStart.row,
            templateScreenStart.column + redundantPrefixLength + 1
        ];
        editor.setSelectedScreenRange([templateScreenStart, prefixEnd]);
        editor.foldSelectedLines();
    },

    createOverlayDecoration(editor, index, range, previewText) {
        let marker = editor.markBufferRange(range, { invalidate: 'never' });
        let decorateParams = this.makeDecorateParams(previewText, 'folding-preview', marker);
        let decoration = editor.decorateMarker(marker, decorateParams);
        this.foldPreviews.set(marker, decoration);

        marker.onDidChange((event) => {
            let oldTSP = event.oldTailScreenPosition;
            let oldHSP = event.oldHeadScreenPosition;
            let newTSP = event.newTailScreenPosition;
            let newHSP = event.newHeadScreenPosition;

            let tailChange = new Point(newTSP.row - oldTSP.row, newTSP.column - oldTSP.column);
            let headChange = new Point(newHSP.row - oldHSP.row, newHSP.column - oldHSP.column);
            if(tailChange.isEqual(headChange)) {
                console.log(`marker '${index}' translated`);
            } else if(newTSP.isEqual(newHSP)) {
                if(event.textChanged) {
                    console.log(`marker '${index}' text changed`);
                    this.foldPreviews.delete(marker);
                    marker.destroy();
                } else {
                    console.log(`marker '${index}' became hidden`);
                    this.foldPreviews.get(marker).destroy();
                    this.foldPreviews.delete(marker);
                }
            } else if(newHSP.isGreaterThan(oldTSP)) {
                if(oldTSP.isEqual(oldHSP)) {
                    console.log(`marker '${index}' became visible`);
                    const restoredDecor = editor.decorateMarker(marker, decorateParams);
                    this.foldPreviews.set(marker, restoredDecor);
                } else {
                    console.log(`marker '${index}' expanded`);
                    let bufferRange = marker.getBufferRange();
                    this.foldPreviews.delete(marker);
                    marker.destroy();
                    for(let r = bufferRange.start.row; r <= bufferRange.end.row; ++r) {
                        editor.unfoldBufferRow(r);
                    }
                }
            } else {
                console.log(`marker '${index}' unexpected change`);
                console.log(event);
                this.foldPreviews.delete(marker);
                marker.destroy();
            }
        });
    },

    makeDecorateParams(previewText, class_, marker) {
        let foldingPreview = document.createElement('div');
        foldingPreview.innerText = previewText;
        foldingPreview.addEventListener('click', (e) => {
            const editor = atom.workspace.getActiveTextEditor();
            editor.setCursorBufferPosition(marker.getBufferRange().start);
        });
        return {
            type: 'overlay',
            item: foldingPreview,
            class: class_,
            position: 'tail',
            avoidOverflow: false
        };
    }
};
