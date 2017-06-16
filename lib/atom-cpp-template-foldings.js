'use babel';

import AtomCppTemplateFoldingsView from './atom-cpp-template-foldings-view';
import { CompositeDisposable } from 'atom';

export default {

  atomCppTemplateFoldingsView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.atomCppTemplateFoldingsView = new AtomCppTemplateFoldingsView(state.atomCppTemplateFoldingsViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.atomCppTemplateFoldingsView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-cpp-template-foldings:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.atomCppTemplateFoldingsView.destroy();
  },

  serialize() {
    return {
      atomCppTemplateFoldingsViewState: this.atomCppTemplateFoldingsView.serialize()
    };
  },

  toggle() {
    console.log('AtomCppTemplateFoldings was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
