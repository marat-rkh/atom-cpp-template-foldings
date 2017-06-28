'use babel';

import path from 'path';
import os from 'os';
import logger from './logger.js';

import { CompositeDisposable, Point, Range } from 'atom';
import FoldingsManager from './foldings-manager.js';
import { TemplateFinder } from './template-finder.js';
import { PreviewRenderer } from './preview-renderer.js';

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
        logger.debug('app', 'fold-all requested');
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
        const templates = TemplateFinder.find(editor);
        templates.forEach((t, idx) => {
            const preview = PreviewRenderer.render(t.params);
            if(preview.success) {
                foldingsManager.foldWithPreview(t.range, preview.text, idx);
            }
        });
        logger.debug('app', 'fold-all finished');
    }
};
