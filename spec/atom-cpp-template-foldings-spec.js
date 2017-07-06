'use babel';

import TestUtils from './test-utils';

describe('AtomCppTemplateFoldings', () => {
    let workspaceElement, activationPromise;

    beforeEach(() => {
        workspaceElement = atom.views.getView(atom.workspace);
        activationPromise = atom.packages.activatePackage('atom-cpp-template-foldings');
    });

    describe('with autoFoldOnFileOpen disabled', () => {
        let autoFoldOnFileOpen;
        beforeEach(() => {
            atom.config.set('atom-cpp-template-foldings.autoFoldOnFileOpen', false);
        });
        afterEach(() => {
            atom.config.set('atom-cpp-template-foldings.autoFoldOnFileOpen', autoFoldOnFileOpen);
        });

        it('shows notification when only editor.softWrap option is enabled', () => {
            waitsForPromise(() => { return activationPromise; });
            const testDataPath = TestUtils.testDataAbsolutePath('nested_class_template.h');
            TestUtils.withTextEditor(testDataPath, editor => {
                TestUtils.withConfig({ 'editor.softWrap': true }, () => {
                    atom.commands.dispatch(workspaceElement, 'atom-cpp-template-foldings:fold-all');
                    runs(() => {
                        const ns = atom.notifications.getNotifications();
                        expect(ns.length).toBe(1);
                        expect(ns[0].type).toBe('warning');
                    });
                });
            });
        });

        it('shows notification when editor.softWrapAtPreferredLineLength option is enabled', () => {
            waitsForPromise(() => { return activationPromise; });
            const testDataPath = TestUtils.testDataAbsolutePath('nested_class_template.h');
            TestUtils.withTextEditor(testDataPath, editor => {
                const config = {
                    'editor.softWrap': true,
                    'editor.softWrapAtPreferredLineLength': true,
                    'editor.preferredLineLength': 50
                };
                TestUtils.withConfig(config, () => {
                    atom.commands.dispatch(workspaceElement, 'atom-cpp-template-foldings:fold-all');
                    runs(() => {
                        const ns = atom.notifications.getNotifications();
                        expect(ns.length).toBe(1);
                        expect(ns[0].type).toBe('info');
                    });
                });
            });
        });

        it('does not show notification when atom-cpp-template-foldings.notifyAboutNotFoldedTemplates option is enabled', () => {
            waitsForPromise(() => { return activationPromise; });
            const testDataPath = TestUtils.testDataAbsolutePath('nested_class_template.h');
            TestUtils.withTextEditor(testDataPath, editor => {
                const config = {
                    'editor.softWrap': true,
                    'editor.softWrapAtPreferredLineLength': true,
                    'editor.preferredLineLength': 50,
                    'atom-cpp-template-foldings.notifyAboutNotFoldedTemplates': false
                };
                TestUtils.withConfig(config, () => {
                    atom.commands.dispatch(workspaceElement, 'atom-cpp-template-foldings:fold-all');
                    runs(() => {
                        expect(atom.notifications.getNotifications().length).toBe(0);
                    });
                });
            });
        });
    });

    describe('with autoFoldOnFileOpen enabled', () => {
        let autoFoldOnFileOpen;
        beforeEach(() => {
            atom.config.set('atom-cpp-template-foldings.autoFoldOnFileOpen', true);
        });
        afterEach(() => {
            atom.config.set('atom-cpp-template-foldings.autoFoldOnFileOpen', autoFoldOnFileOpen);
        });

        it('automatically folds all templates when file opened', () => {
            waitsForPromise(() => { return activationPromise; });
            const testDataPath = TestUtils.testDataAbsolutePath('nested_class_template.h');
            TestUtils.withTextEditor(testDataPath, editor => {
                runs(() => {
                    expect(editor.getOverlayDecorations().length).toBe(2);
                });
            });
        });
    });
});
