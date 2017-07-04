'use babel';

import path from 'path';
import os from 'os';
import logger from './utils/logger.js';

import { CompositeDisposable, Point, Range } from 'atom';
import { FoldingsManager, FoldingStatus } from './folding/foldings-manager.js';
import { TemplateFinder } from './template-finder.js';
import { PreviewRenderer } from './preview-renderer.js';

export default {
    config: {
        notifyAboutNotFoldedTemplates: {
            title: 'Notify about not folded templates',
            type: 'boolean',
            default: true
        }
    },

    subscriptions: null,
    foldingManagers: new Map(),

    activate(state) {
        logger.enabled = true;
        logger.initLogFile(path.join(os.homedir(), 'atom-cpp-template-foldings.log'));
        // Events subscribed to in atom's system can be easily
        // cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();
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
        const notFolded = this._foldTemplates(foldingsManager, templates);
        this._notifyNotFolded(notFolded);
        logger.debug('app', 'fold-all finished');
    },

    _foldTemplates(foldingsManager, templates) {
        const notFolded = [];
        for(let i = 0; i < templates.length; ++i) {
            const templ = templates[i];
            const preview = PreviewRenderer.render(templ.params);
            if(preview.success) {
                const result = foldingsManager.foldWithPreview(templ.range, preview.text, i);
                if(result.status !== FoldingStatus.OK) {
                    const templRow = templ.range.start.row;
                    if(result.status === FoldingStatus.SOFT_WRAP_ONLY_ENABLED) {
                        this._notifySoftWrapEnabled();
                        return [];
                    } else if(result.status === FoldingStatus.WILL_EXCEED_MAX_LINE_LENGTH) {
                        notFolded.push({ row: templRow, reason: this._tooLongMsg });
                    } else {
                        notFolded.push({ row: templRow, reason: this._unknownErrorMsg });
                    }
                }
            }
        }
        return notFolded;
    },

    _notifySoftWrapEnabled() {
        atom.notifications.addWarning("Templates folding failed", {
            description:
                `Templates folding is possible only when 'Soft Wrap' option is disabled or both
                'Soft Wrap' and 'Soft Wrap At Preferred Line Length' options are enabled.
                Please, check your settings (Edit > Preferences > Editor).`,
            dismissable: true
        });
    },

    _notifyNotFolded(notFoldedTemplates) {
        const needNotifyConfig = 'atom-cpp-template-foldings.notifyAboutNotFoldedTemplates';
        const needNotify = atom.config.get(needNotifyConfig);
        if(!needNotify || notFoldedTemplates.length === 0) {
            return;
        }
        const description = notFoldedTemplates.map(t => `* line ${t.row + 1}: ${t.reason}`).join('\n');
        atom.notifications.addInfo("Some templates are not folded", {
            description,
            dismissable: true,
            buttons: [{
                text: 'Do not show this again',
                onDidClick(args) {
                    atom.config.set(needNotifyConfig, false);
                    this.getModel().dismiss();
                }
            }]
        });
    },

    _tooLongMsg: "folding exceeds preferred line length",
    _unknownErrorMsg: "unknown error"
};
