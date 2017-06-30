'use babel';

import PseudoFolding from '../../lib/folding/pseudo-folding.js';
import TestUtils from '../test-utils.js';
import { Range } from 'atom';

describe('PseudoFolding', () => {
    const editor = atom.workspace.buildTextEditor();
    const content = TestUtils.readTestDataAsString('nested_class_template.h');

    beforeEach(() => {
        editor.setText(content);
        // console.log(TestUtils.getVisibleCharsNumberAtScreenRow(editor, 8));
        // TestUtils.printScreenContent(editor);
        // editor.setSelectedBufferRange([[8, 0], [8, 2]]);
        // editor.foldSelectedLines();
        // console.log(TestUtils.getVisibleCharsNumberAtScreenRow(editor, 8));
        // TestUtils.printScreenContent(editor);
    });

    it('should fold valid range with valid fold area size', () => {
        const range = new Range([2, 0], [9, 1]);
        // const visualSymbolsInRange = 125; // all symbols including spaces, tabs and newlines
        const visualSymbolsInRange = 20; // TODO temporary, should be removed
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

    // TODO test folding when some folding already presents in the range
});
