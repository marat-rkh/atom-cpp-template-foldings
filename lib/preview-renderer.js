'use babel';

import { TypeP, NonTypeP, TemplateP, TemplateParameterKind } from './parser/model.js';

export const PreviewRenderer = {
    render(parsedParams) {
        if(parsedParams.length === 0) {
            return { success: false };
        }
        if(parsedParams.every(p => p.kind === TemplateParameterKind.NON_TYPE)) {
            return { success: false };
        }
        return { success: true, text: this._renderParams(parsedParams) };
    },

    _renderParams(params) {
        let rendered = 'template<';
        let notFirst = false;
        for(let param of params) {
            if(notFirst) {
                rendered += ', ';
            } else {
                notFirst = true;
            }
            if(param.kind === TemplateParameterKind.TYPE) {
                rendered += this._renderTypeP(param);
            } else if(param.kind === TemplateParameterKind.NON_TYPE) {
                rendered += this._renderNonTypeP(param);
            } else if(param.kind === TemplateParameterKind.TEMPLATE) {
                rendered += this._renderTemplateP(param);
            } else {
                throw new Error('unexpected template parameter kind');
            }
        }
        rendered += '>';
        return rendered;
    },

    _renderTypeP(param) {
        let rendered = '';
        if(param.isPack) {
            rendered += '...';
        }
        const name = this._normalize(param.name);
        rendered += name.length ? name : '_';
        const default_ = this._normalize(param['default']);
        if(default_.length) {
            rendered += ` = ${default_}`;
        }
        return rendered;
    },

    _renderNonTypeP(param) { return this._normalize(param.value); },

    _renderTemplateP(param) {
        return `${this._renderParams(param.params)} ${this._renderTypeP(param)}`;
    },

    _normalize(str) { return str.replace(/\s+/g, ' ').trim(); }
};
