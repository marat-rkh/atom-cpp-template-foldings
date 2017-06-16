'use babel';

import { CompositeDisposable } from 'atom';

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
            // call cpp-template-finder and get data
            editor.setSelectedBufferRange([
                [0, 0],
                [0, 4]
            ]);
            editor.foldSelectedLines();
        }
    }
};
