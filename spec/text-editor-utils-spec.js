'use babel';

import { TextEditorUtils as TEUtils } from '../lib/text-editor-utils.js';
import { Point } from 'atom';

fdescribe('TextEditorUtils', () => {
    const editor = atom.workspace.buildTextEditor();

    afterEach(() => {
        editor.setText('');
    });

    it('should provide buffer range', () => {
        editor.setText('');
        expect(TEUtils.getBufferRange(editor).isEqual([[0, 0], [0, 0]])).toBe(true);
        editor.setText('Line one');
        expect(TEUtils.getBufferRange(editor).isEqual([[0, 0], [0, 8]])).toBe(true);
        editor.setText('Line one\nLine two');
        expect(TEUtils.getBufferRange(editor).isEqual([[0, 0], [1, 8]])).toBe(true);
        editor.setText('Line one\nLine two\nLine three');
        expect(TEUtils.getBufferRange(editor).isEqual([[0, 0], [2, 10]])).toBe(true);
    });

    it('should provide next buffer position', () => {
        editor.setText('Line one\nLine two');
        let pos = new Point(0, 0);
        expect(TEUtils.nextBufferPosition(editor, pos).isEqual([0, 1])).toBe(true);
        pos = new Point(0, 8);
        expect(TEUtils.nextBufferPosition(editor, pos).isEqual([1, 0])).toBe(true);
        pos = new Point(1, 8);
        expect(TEUtils.nextBufferPosition(editor, pos).isEqual([1, 8])).toBe(true);
    });

    it('should advance buffer position', () => {
        editor.setText('Line one\nLine two');
        let pos = new Point(0, 0);
        expect(TEUtils.advanceBufferPosition(editor, pos, 4).isEqual([0, 4])).toBe(true);
        pos = new Point(0, 4);
        expect(TEUtils.advanceBufferPosition(editor, pos, 9).isEqual([1, 4])).toBe(true);
        pos = new Point(1, 4);
        expect(TEUtils.advanceBufferPosition(editor, pos, 100).isEqual([1, 8])).toBe(true);
    });

    it('should scan with skips 1', () => {
        editor.setText('0123 456\n789a bcdef');
        const chars = [];
        const range = TEUtils.getBufferRange(editor);
        TEUtils.scanWithSkips(editor, /./g, range, ctx => {
            chars.push(ctx.matchText);
            const pt = TEUtils.advanceBufferPosition(editor, ctx.range.end, 2);
            ctx.continueFrom(pt);
        });
        expect(chars).toEqual(['0', '3', '5', '7', 'a', 'c', 'f']);
    });

    it('should scan with skips 2', () => {
        editor.setText('0123 456\n789a bcdef');
        const chars = [];
        const range = TEUtils.getBufferRange(editor);
        TEUtils.scanWithSkips(editor, /./g, range, ctx => {
            chars.push(ctx.matchText);
            if(ctx.matchText !== 'a') {
                const pt = TEUtils.advanceBufferPosition(editor, ctx.range.end, 2);
                ctx.continueFrom(pt);
            }
        });
        expect(chars).toEqual(['0', '3', '5', '7', 'a', ' ', 'd']);
    });
});
