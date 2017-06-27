'use babel';

import {
    TemplateParser,
    TemplateParameterKind as Kind
} from '../../lib/parser/template-parser.js';

fdescribe('TemplateParser', () => {
    const EMPTY_TYPE_PARAM = {
        kind: Kind.TYPE,
        isPack: false,
        name: '',
        'default': ''
    };

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
            { kind: Kind.TYPE, isPack: false, name: 'A', 'default': '' },
            { kind: Kind.TYPE, isPack: false, name: 'B', 'default': '' },
            { kind: Kind.NON_TYPE, value: 'int N' },
            { kind: Kind.TEMPLATE, params: [EMPTY_TYPE_PARAM], isPack: false, name: 'TT', 'default': '' },
            { kind: Kind.TYPE, isPack: false, name: 'C', 'default': 'One' },
            { kind: Kind.TYPE, isPack: false, name: '', 'default': 'double' }
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
        expect(actual.value).toEqual({
            kind: Kind.TEMPLATE,
            params: [EMPTY_TYPE_PARAM],
            isPack: false,
            name: 'TT',
            'default': ''
        });
    });
});
