'use babel';

import { PseudoFolding, PseudoFoldingCheck as PFCheck } from '../../lib/folding/pseudo-folding.js';
import TestUtils from '../test-utils.js';
import { Range } from 'atom';

describe('PseudoFolding', () => {
    let atomicSoftTabs;
    beforeEach(() => {
        atomicSoftTabs = atom.config.get('editor.atomicSoftTabs');
        atom.config.set('editor.atomicSoftTabs', false);
    });

    itShouldWorkOn(TestUtils.testDataAbsolutePath('nested_class_template.h'));

    itShouldWorkOn(TestUtils.testDataAbsolutePath('nested_class_template_crlf.h'));

    it('should fail fold check when text contains tabs', () => {
        const testDataPath = TestUtils.testDataAbsolutePath('nested_class_template_tabs.h');
        TestUtils.withTextEditor(testDataPath, editor => {
            const range = new Range([2, 0], [9, 1]);
            expect(PseudoFolding.checkFoldingPossible(editor, range, 58)).toBe(PFCheck.TEXT_HAS_TABS);
        });
    });

    afterEach(() => {
        atom.config.set('editor.atomicSoftTabs', atomicSoftTabs);
    });
});

function itShouldWorkOn(testDataPath) {
    describe(`on ${testDataPath}`, () => {
        it('should fold valid range with valid fold area size', () => {
            TestUtils.withTextEditor(testDataPath, editor => {
                const range = new Range([2, 0], [9, 1]);
                const marker = editor.markBufferRange(range, { invalidate: 'inside' });
                const visualSymbolsInRange = 125; // all symbols including spaces, tabs and newlines
                for(let size = 1; size <= visualSymbolsInRange; ++size) {
                    expect(PseudoFolding.checkFoldingPossible(editor, range, size)).toBe(PFCheck.POSSIBLE);
                    let folding;
                    expect(() => { folding = new PseudoFolding(editor, 0, marker, size) }).not.toThrow();
                    expect(editor.lineTextForScreenRow(1)).toBe('');
                    expect(TestUtils.getVisibleCharsNumberAtScreenRow(editor, 2)).toBe(size);
                    expect(editor.lineTextForScreenRow(3)).toBe('class Two');
                    folding.destroy();
                }
            });
        });

        it('should fold when some folding already presents in the range 1', () => {
            TestUtils.withTextEditor(testDataPath, editor => {
                const range = new Range([2, 0], [9, 1]);
                const marker = editor.markBufferRange(range, { invalidate: 'inside' });
                const size = 8;
                for(let row = 2; row <= 9; ++row) {
                    const rowEnd = editor.clipBufferPosition([row, Infinity]);
                    editor.setSelectedBufferRange([[row, 0], rowEnd]);
                    editor.foldSelectedLines();

                    expect(PseudoFolding.checkFoldingPossible(editor, range, size)).toBe(PFCheck.POSSIBLE);
                    let folding;
                    expect(() => { folding = new PseudoFolding(editor, 0, marker, size) }).not.toThrow();
                    expect(editor.lineTextForScreenRow(1)).toBe('');
                    expect(TestUtils.getVisibleCharsNumberAtScreenRow(editor, 2)).toBe(size);
                    expect(editor.lineTextForScreenRow(3)).toBe('class Two');
                    folding.destroy();

                    editor.unfoldAll();
                }
            });
        });

        it('should fold when some folding already presents in the range 2', () => {
            TestUtils.withTextEditor(testDataPath, editor => {
                const range = new Range([2, 0], [9, 1]);
                const marker = editor.markBufferRange(range, { invalidate: 'inside' });
                const size = 8;
                for(let row = 2; row <= 8; ++row) {
                    const rowEnd = editor.clipBufferPosition([row + 1, Infinity]);
                    editor.setSelectedBufferRange([[row, 0], rowEnd]);
                    editor.foldSelectedLines();

                    expect(PseudoFolding.checkFoldingPossible(editor, range, size)).toBe(PFCheck.POSSIBLE);
                    let folding;
                    expect(() => { folding = new PseudoFolding(editor, 0, marker, size) }).not.toThrow();
                    expect(editor.lineTextForScreenRow(1)).toBe('');
                    expect(TestUtils.getVisibleCharsNumberAtScreenRow(editor, 2)).toBe(size);
                    expect(editor.lineTextForScreenRow(3)).toBe('class Two');
                    folding.destroy();

                    editor.unfoldAll();
                }
            });
        });

        it('should not fold invalid size', () => {
            TestUtils.withTextEditor(testDataPath, editor => {
                const range = new Range([2, 0], [9, 1]);
                const marker = editor.markBufferRange(range, { invalidate: 'inside' });
                for(let size of [-1, 0]) {
                    expect(PseudoFolding.checkFoldingPossible(editor, range, size))
                        .toBe(PFCheck.FOLD_AREA_IS_INCORRECT);
                    expect(() => { folding = new PseudoFolding(editor, 0, marker, size) }).toThrow();
                }
                for(let size of [126, 127]) {
                    expect(PseudoFolding.checkFoldingPossible(editor, range, size))
                        .toBe(PFCheck.FOLD_AREA_IS_TOO_WIDE);
                    expect(() => { folding = new PseudoFolding(editor, 0, marker, size) }).toThrow();
                }
            });
        });

        it('should fail fold check when folding length >= max line length', () => {
            TestUtils.withTextEditor(testDataPath, editor => {
                const range = new Range([2, 0], [9, 1]);
                const maxLineLength = 120;
                expect(PseudoFolding.checkFoldingPossible(editor, range, 120, maxLineLength))
                    .toBe(PFCheck.WILL_EXCEED_MAX_LINE_LENGTH);
                expect(PseudoFolding.checkFoldingPossible(editor, range, 121, maxLineLength))
                    .toBe(PFCheck.WILL_EXCEED_MAX_LINE_LENGTH);
            });
        });

        it('should destroy folding', () => {
            TestUtils.withTextEditor(testDataPath, editor => {
                const range = new Range([2, 0], [9, 1]);
                const marker = editor.markBufferRange(range, { invalidate: 'inside' });
                const size = 8;
                let folding = new PseudoFolding(editor, 0, marker, size);
                folding.destroy();
                for(let r = 0; r <= editor.getLastBufferRow(); ++r) {
                    expect(editor.isFoldedAtBufferRow(r)).toBe(false);
                }
            });
        });

        it('should destroy folding after it was moved', () => {
            TestUtils.withTextEditor(testDataPath, editor => {
                const range = new Range([2, 0], [9, 1]);
                const marker = editor.markBufferRange(range, { invalidate: 'inside' });
                const size = 8;
                let folding = new PseudoFolding(editor, 0, marker, size);
                editor.setTextInBufferRange([[1, 0], [1, 0]], '\n\n');
                folding.destroy();
                for(let r = 0; r <= editor.getLastBufferRow(); ++r) {
                    expect(editor.isFoldedAtBufferRow(r)).toBe(false);
                }
            });
        });
    });
}
