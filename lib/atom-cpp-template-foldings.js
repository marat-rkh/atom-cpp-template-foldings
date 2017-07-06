'use babel';

import path from 'path';
import os from 'os';
import logger from './utils/logger.js';

import { CompositeDisposable, Point, Range } from 'atom';
import {
    FoldingsManager,
    FoldingStatus,
    FoldingsManagerConfigCheck } from './folding/foldings-manager';
import { TemplateFinder } from './template-finder.js';
import { PreviewRenderer } from './preview-renderer.js';

export default {
    config: {
        notifyAboutNotFoldedTemplates: {
            title: 'Notify about not folded templates',
            type: 'boolean',
            default: true
        },
        autoFoldOnFileOpen: {
            title: 'Auto fold on file open',
            type: 'boolean',
            default: true
        },
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
            if(atom.config.get('atom-cpp-template-foldings.autoFoldOnFileOpen')) {
                this.foldAll(editor);
            }
        });
        this.subscriptions.add(subscr);
    },

    deactivate() {
        this.foldingManagers.forEach((fm) => fm.dispose());
        this.subscriptions.dispose();
    },

    foldAll(editor) {
        logger.debug('app', 'fold-all requested');
        if(!editor) {
            editor = atom.workspace.getActiveTextEditor();
        }
        if(!editor) {
            const msg = 'text editor is not available';
            logger.debug('app', msg);
            return;
        }
        const foldingsManager = this.foldingManagers.get(editor);
        if(!foldingsManager) {
            const msg = 'error - no foldings manager available for current text editor';
            logger.debug('app', msg);
            return;
        }
        const check = FoldingsManager.checkAtomConfig();
        if(check !== FoldingsManagerConfigCheck.OK) {
            if(check === FoldingsManagerConfigCheck.SOFT_WRAP_ONLY_ENABLED) {
                this._notifySoftWrapEnabled();
            } else {
                this._notifyFoldingFailed();
            }
            return;
        }
        foldingsManager.unfoldAll();
        const templates = TemplateFinder.find(editor);
        const notFolded = this._foldTemplates(foldingsManager, templates);
        this._notifyNotFolded(notFolded);
        logger.debug('app', 'fold-all finished');
    },

    _foldTemplates(foldingsManager, templates) {
        const foldingsData =
            templates.map((t, idx) => ({
                bufferRange: t.range,
                previewData: PreviewRenderer.render(t.params),
                foldingId: idx
            }))
            .filter(fd => fd.previewData.success)
        const results = foldingsManager.foldAllWithPreview(foldingsData);
        const notFolded = results.filter(r => r.status !== FoldingStatus.OK)
            .map((result, idx) => {
                let reason;
                if(result.status === FoldingStatus.WILL_EXCEED_MAX_LINE_LENGTH) {
                    reason = this._tooLongMsg;
                } else if(result.status === FoldingStatus.TEXT_HAS_TABS) {
                    reason = this._textHasTabs;
                } else {
                    reason = this._unknownErrorMsg;
                }
                return { row: foldingsData[idx].bufferRange.start.row, reason };
            });
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

    _notifyFoldingFailed() {
        atom.notifications.addWarning("Templates folding failed", {
            description: 'Reason is unknown',
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
    _textHasTabs: "template contains tab characters",
    _unknownErrorMsg: "unknown error"
};
