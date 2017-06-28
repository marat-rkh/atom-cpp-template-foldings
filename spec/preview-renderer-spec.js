'use babel';

import { PreviewRenderer } from '../lib/preview-renderer.js';
import { TypeP, NonTypeP, TemplateP } from '../lib/parser/model.js';

describe('PreviewRenderer', () => {
    const EMPTY_TYPE_PARAM = TypeP(/*isPack*/false, '', '');

    it('should render simple general template', () => {
        const params = [
            TypeP(/*isPack*/false, 'A', ''),
            TypeP(/*isPack*/false, 'B', ''),
            NonTypeP('int N'),
            TemplateP([EMPTY_TYPE_PARAM], /*isPack*/false, 'TT', ''),
            TypeP(/*isPack*/false, 'C', 'One'),
            TypeP(/*isPack*/false, '', 'double')
        ];
        expect(PreviewRenderer.render(params)).toEqual({
            success: true,
            text: 'template<A, B, int N, template<_> TT, C = One, _ = double>'
        });
    });

    it('should not render when params list is empty', () => {
        expect(PreviewRenderer.render([])).toEqual({ success: false });
    });

    it('should not render when all params are non type', () => {
        const params = [
            NonTypeP('int A'),
            NonTypeP('bool'),
            NonTypeP('SomeClass ...C'),
        ];
        expect(PreviewRenderer.render(params)).toEqual({ success: false });
    });

    it('should replace multiple whitespaces in preview text with one whitespace', () => {
        const params = [
            NonTypeP('With	tab'),
            NonTypeP('With     spaces'),
            TypeP(/*isPack*/false, `With
                                            newlines and spaces`, '')
        ];
        expect(PreviewRenderer.render(params)).toEqual({
            success: true,
            text: 'template<With tab, With spaces, With newlines and spaces>'
        });
    });

    it('should create preview as one line text', () => {
        const multilineDefaultValue =
            `typename std::enable_if<
                std::is_same<typename detail::decay<Other>::type, basic_tuple>::value
            >::type`;
        const params = [
            TypeP(/*isPack*/false, 'Other', ''),
            TypeP(/*isPack*/false, '', multilineDefaultValue)
        ];
        expect(PreviewRenderer.render(params)).toEqual({
            success: true,
            text: 'template<Other, _ = typename std::enable_if< std::is_same<typename detail::decay<Other>::type, basic_tuple>::value >::type>'
        });
    });
});
