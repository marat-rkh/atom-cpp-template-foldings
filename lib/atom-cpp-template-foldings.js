'use babel';

import path from 'path';
import os from 'os';
import logger from './logger.js';

import { CompositeDisposable, Point, Range } from 'atom';
import FoldingsManager from './foldings-manager.js';
import * as child_process from 'child_process';

export default {
    subscriptions: null,
    foldingManagers: new Map(),

    activate(state) {
        logger.enabled = true;
        logger.initLogFile(path.join(os.homedir(), 'atom-cpp-template-foldings.log'));
        // Events subscribed to in atom's system can be easily
        // cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();
        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'atom-cpp-template-foldings:fold-all': () => this.foldAll()
        }));
        const subscr = atom.workspace.observeTextEditors((editor) => {
            this.foldingManagers.set(editor, new FoldingsManager(editor));
            const subscr = editor.onDidDestroy(() => {
                this.foldingManagers.delete(editor);
            });
            this.subscriptions.add(subscr);
        });
        this.subscriptions.add(subscr);
    },

    deactivate() {
        this.foldingManagers.forEach((fm) => fm.dispose());
        this.subscriptions.dispose();
    },

    foldAll() {
        logger.debug('app', 'fold requested');
        const editor = atom.workspace.getActiveTextEditor();
        if(!editor) {
            return;
        }
        const foldingsManager = this.foldingManagers.get(editor);
        if(foldingsManager === undefined) {
            const msg = 'error - no foldings manager available for current text editor';
            logger.debug('app', msg);
            return;
        }
        foldingsManager.unfoldAll();
        const finder = child_process.spawn(
            'cpp-template-finder',
            [editor.getPath(), '--', '-xc++', '-std=c++11']
        );
        finder.stdout.on('data', (output) => {
            const templatesData = JSON.parse(output);
            templatesData.forEach((data, idx) => {
                if(data['type'] === 0) {
                    let range = new Range(
                        [data['beg']['line'] - 1, data['beg']['col'] - 1],
                        [data['end']['line'] - 1, data['end']['col'] - 1]
                    );
                    let previewText = 'template<...>';
                    foldingsManager.foldWithPreview(range, previewText, idx);
                }
            });
        });
        finder.stderr.on('data', (data) => {
            logger.debug('app', `folding failed`);
        });
        finder.on('close', (code) => {
            logger.debug('app', `cpp-template-finder finished`);
        });
    }
};
