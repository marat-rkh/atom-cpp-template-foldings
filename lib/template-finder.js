'use babel';

import { Range, Point } from 'atom';
import { TextEditorUtils as TEUtils } from './utils/text-editor-utils.js';
import { TemplateParser } from './parser/template-parser.js';

export const TemplateFinder = {
    find(textEditor) {
        const templates = [];
        const fullRange = TEUtils.getBufferRange(textEditor);
        TEUtils.scanWithSkips(textEditor, /template/g, fullRange, ctx => {
            // TODO this possibly creates substring that is inefficient
            const text = textEditor.getTextInBufferRange(new Range(ctx.range.start, fullRange.end));
            const parsed = TemplateParser.templateAsPrefix.parse(text);
            if(parsed.status) {
                const start = ctx.range.start;
                const charsParsed = parsed.value.charsParsed;
                const end = this._getTemplateEndBufferPosition(start, parsed.value);
                templates.push({
                    range: new Range(start, end),
                    params: parsed.value.params
                });
                ctx.continueFrom(end);
            }
        });
        return templates;
    },

    _getTemplateEndBufferPosition(start, parsedValue) {
        if(parsedValue.endLine === 0) {
            return new Point(start.row, start.column + parsedValue.endColumn);
        } else {
            return new Point(start.row + parsedValue.endLine, parsedValue.endColumn);
        }
    }
};
