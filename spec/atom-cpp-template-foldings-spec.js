'use babel';

import AtomCppTemplateFoldings from '../lib/atom-cpp-template-foldings';

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

xdescribe('AtomCppTemplateFoldings', () => {
  let workspaceElement, activationPromise;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('atom-cpp-template-foldings');
  });

  describe('when the atom-cpp-template-foldings:toggle event is triggered', () => {
    it('hides and shows the modal panel', () => {
      // Before the activation event the view is not on the DOM, and no panel
      // has been created
      expect(workspaceElement.querySelector('.atom-cpp-template-foldings')).not.toExist();

      // This is an activation event, triggering it will cause the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'atom-cpp-template-foldings:toggle');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        expect(workspaceElement.querySelector('.atom-cpp-template-foldings')).toExist();

        let atomCppTemplateFoldingsElement = workspaceElement.querySelector('.atom-cpp-template-foldings');
        expect(atomCppTemplateFoldingsElement).toExist();

        let atomCppTemplateFoldingsPanel = atom.workspace.panelForItem(atomCppTemplateFoldingsElement);
        expect(atomCppTemplateFoldingsPanel.isVisible()).toBe(true);
        atom.commands.dispatch(workspaceElement, 'atom-cpp-template-foldings:toggle');
        expect(atomCppTemplateFoldingsPanel.isVisible()).toBe(false);
      });
    });

    it('hides and shows the view', () => {
      // This test shows you an integration test testing at the view level.

      // Attaching the workspaceElement to the DOM is required to allow the
      // `toBeVisible()` matchers to work. Anything testing visibility or focus
      // requires that the workspaceElement is on the DOM. Tests that attach the
      // workspaceElement to the DOM are generally slower than those off DOM.
      jasmine.attachToDOM(workspaceElement);

      expect(workspaceElement.querySelector('.atom-cpp-template-foldings')).not.toExist();

      // This is an activation event, triggering it causes the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'atom-cpp-template-foldings:toggle');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        // Now we can test for view visibility
        let atomCppTemplateFoldingsElement = workspaceElement.querySelector('.atom-cpp-template-foldings');
        expect(atomCppTemplateFoldingsElement).toBeVisible();
        atom.commands.dispatch(workspaceElement, 'atom-cpp-template-foldings:toggle');
        expect(atomCppTemplateFoldingsElement).not.toBeVisible();
      });
    });
  });
});
