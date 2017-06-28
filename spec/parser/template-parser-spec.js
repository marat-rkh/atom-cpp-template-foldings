'use babel';

import { TemplateParser } from '../../lib/parser/template-parser.js';
import { TypeP, NonTypeP, TemplateP } from '../../lib/parser/model.js';
import TestUtils from '../test-utils.js';

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

    it('should parse template as prefix', () => {
        const text = TestUtils.readTestDataAsString('multiple_class_templates.h');
        const actual = TemplateParser.templateAsPrefix.parse(text);
        expect(actual.status).toBe(true);
        expect(actual.value).toEqual({
            charsParsed: 17,
            params: [TypeP(/*isPack*/false, 'T', '')]
        });
    });

    it('should parse default with parametrized type', () => {
        const text =
            `template<
                typename Key,
                typename Val,
                typename Hash = std::hash<Key>,
                typename KeyEq = std::equal_to<Key>
            >`;
        const actual = TemplateParser.templateOnly.parse(text);
        console.log(actual);
        expect(actual.status).toBe(true);
        expect(actual.value.params).toEqual([
            TypeP(/*isPack*/false, 'Key', ''),
            TypeP(/*isPack*/false, 'Val', ''),
            TypeP(/*isPack*/false, 'Hash', 'std::hash<Key>'),
            TypeP(/*isPack*/false, 'KeyEq', 'std::equal_to<Key>')
        ]);
    });
});
