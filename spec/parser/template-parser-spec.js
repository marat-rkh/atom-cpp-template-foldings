'use babel';

import { TemplateParser } from '../../lib/parser/template-parser.js';
import { TypeP, NonTypeP, TemplateP } from '../../lib/parser/model.js';

describe('TemplateParser', () => {
    const EMPTY_TYPE_PARAM = TypeP(/*isPack*/false, '', '');

    it('should parse simple general template', () => {
        const text =
            `template<
                typename A,
                class B,
                int N,
                template<class> class TT,
                typename C = One,
                typename = double
            >`;
        const actual = TemplateParser.templateOnly.parse(text);
        expect(actual.status).toBe(true);
        expect(actual.value.params).toEqual([
            TypeP(/*isPack*/false, 'A', ''),
            TypeP(/*isPack*/false, 'B', ''),
            NonTypeP('int N'),
            TemplateP([EMPTY_TYPE_PARAM], /*isPack*/false, 'TT', ''),
            TypeP(/*isPack*/false, 'C', 'One'),
            TypeP(/*isPack*/false, '', 'double')
        ]);
    });

    it('should parse template type parameter with no name', () => {
        const text1 = 'template<class>';
        const actual1 = TemplateParser.templateOnly.parse(text1);
        expect(actual1.status).toBe(true);
        expect(actual1.value.params).toEqual([EMPTY_TYPE_PARAM]);

        const text2 = 'template<typename>';
        const actual2 = TemplateParser.templateOnly.parse(text2);
        expect(actual2.status).toBe(true);
        expect(actual2.value.params).toEqual([EMPTY_TYPE_PARAM]);
    });

    it('should parse template template parameter', () => {
        const text = `template<class> class TT`;
        const actual = TemplateParser.templateP.parse(text);
        expect(actual.status).toBe(true);
        expect(actual.value).toEqual(TemplateP([EMPTY_TYPE_PARAM], /*isPack*/false, 'TT', ''));
    });
});
