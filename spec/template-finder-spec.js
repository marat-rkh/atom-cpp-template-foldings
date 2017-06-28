'use babel';

import { TemplateFinder } from '../lib/template-finder.js';
import TestUtils from './test-utils.js';

describe('TemplateFinder', () => {
    const editor = atom.workspace.buildTextEditor();

    afterEach(() => {
        editor.setText('');
    });

    it('should find simple class template', () => {
        const text = TestUtils.readTestDataAsString('simple_class_template.h');
        editor.setText(text);
        const actual = TemplateFinder.find(editor);
        expect(actual.length).toBe(1);
        expect(actual[0].range.isEqual([[2, 0], [9, 1]])).toBe(true);
    });

    it('should find nested class template', () => {
        const text = TestUtils.readTestDataAsString('nested_class_template.h');
        editor.setText(text);
        const actual = TemplateFinder.find(editor);
        expect(actual.length).toBe(2);
        expect(actual[0].range.isEqual([[2, 0], [9, 1]])).toBe(true);
        expect(actual[1].range.isEqual([[14, 4], [14, 21]])).toBe(true);
    });

    it('should find multiple class templates', () => {
        const text = TestUtils.readTestDataAsString('multiple_class_templates.h');
        editor.setText(text);
        const actual = TemplateFinder.find(editor);
        expect(actual.length).toBe(3);
        expect(actual[0].range.isEqual([[0, 0], [0, 17]])).toBe(true);
        expect(actual[1].range.isEqual([[3, 0], [3, 17]])).toBe(true);
        expect(actual[2].range.isEqual([[6, 0], [6, 25]])).toBe(true);
    });
});
