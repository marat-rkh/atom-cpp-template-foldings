'use babel';

import PseudoFolding from '../../lib/folding/pseudo-folding.js';
import TestUtils from '../test-utils.js';
import { Range } from 'atom';

describe('PseudoFolding', () => {
    it('should fold valid range with valid fold area size', () => {
        const testDataPath = TestUtils.testDataAbsolutePath('nested_class_template.h');
        TestUtils.withTextEditor(testDataPath, editor => {
            const range = new Range([2, 0], [9, 1]);
            const visualSymbolsInRange = 125; // all symbols including spaces, tabs and newlines
            for(let size = 1; size <= visualSymbolsInRange; ++size) {
                expect(PseudoFolding.canBeFolded(editor, range, size)).toBe(true);
                let folding;
                expect(() => { folding = new PseudoFolding(editor, 0, range, size) }).not.toThrow();
                expect(editor.lineTextForScreenRow(1)).toBe('');
                expect(TestUtils.getVisibleCharsNumberAtScreenRow(editor, 2)).toBe(size);
                expect(editor.lineTextForScreenRow(3)).toBe('class Two');
                folding.destroy();
            }
        });
    });

    it('should fold when some folding already presents in the range', () => {
        const testDataPath = TestUtils.testDataAbsolutePath('nested_class_template.h');
        TestUtils.withTextEditor(testDataPath, editor => {
            const range = new Range([2, 0], [9, 1]);
            const size = 8;
            for(let row = 2; row <= 9; ++row) {
                const rowEnd = editor.clipBufferPosition([row, Infinity]);
                editor.setSelectedBufferRange([[row, 0], rowEnd]);
                editor.foldSelectedLines();

                expect(PseudoFolding.canBeFolded(editor, range, size)).toBe(true);
                let folding;
                expect(() => { folding = new PseudoFolding(editor, 0, range, size) }).not.toThrow();
                expect(editor.lineTextForScreenRow(1)).toBe('');
                expect(TestUtils.getVisibleCharsNumberAtScreenRow(editor, 2)).toBe(size);
                expect(editor.lineTextForScreenRow(3)).toBe('class Two');
                folding.destroy();

                editor.unfoldAll();
            }

            for(let row = 2; row <= 8; ++row) {
                const rowEnd = editor.clipBufferPosition([row + 1, Infinity]);
                editor.setSelectedBufferRange([[row, 0], rowEnd]);
                editor.foldSelectedLines();

                expect(PseudoFolding.canBeFolded(editor, range, size)).toBe(true);
                let folding;
                expect(() => { folding = new PseudoFolding(editor, 0, range, size) }).not.toThrow();
                expect(editor.lineTextForScreenRow(1)).toBe('');
                expect(TestUtils.getVisibleCharsNumberAtScreenRow(editor, 2)).toBe(size);
                expect(editor.lineTextForScreenRow(3)).toBe('class Two');
                folding.destroy();

                editor.unfoldAll();
            }
        });
    });
});
