'use babel';

import { default as P } from 'parsimmon';

function toParameter(kind, isPack, name, default_) {
    return { kind, isPack, name, 'default': default_ };
}

export const TemplateParameterKind = {
    TYPE: 0,
    NON_TYPE: 1,
    TEMPLATE: 2
};

export const TemplateParser = P.createLanguage({
    templateAsPrefix: r =>
        P.seq(
            P.index,
            r.templateOnly,
            P.index
        )
        .skip(P.all)
        .map(arr => ({ start: arr[0], params: arr[1].params, end: arr[2] }))
        .desc('template as prefix'),

    templateOnly: r =>
        P.seq(
            P.string('template').skip(P.optWhitespace),
            P.string('<'),
            r.params,
            P.string('>')
        )
        .map(arr => ({ params: arr[2] }))
        .desc('template only'),

    params: r => r.param.trim(P.optWhitespace).sepBy(P.string(',')).desc('params'),

    param: r =>
        P.alt(
            r.typeP,
            r.templateP,
            r.nonTypeP // this one should be the last alternative as the rule for it is approximate
        )
        .desc('param'),

    typeP: r => P.alt(r.typePWithDefault, r.typePNoDefault),

    typePWithDefault: r =>
        P.seq(
            P.alt(P.string('class'), P.string('typename')),
            r.almostAny.many().tie(),
            P.string('='),
            r.almostAny.atLeast(1).tie()
        )
        .map(arr => {
            console.assert(arr.length === 4);
            const isPack = false;
            return toParameter(TemplateParameterKind.TYPE, isPack, arr[1].trim(), arr[3].trim());
        })
        .desc('type parameter with default'),

    typePNoDefault: r =>
        P.seq(
            P.alt(P.string('class'), P.string('typename')).skip(P.optWhitespace),
            r.optEllipsis.skip(P.optWhitespace),
            r.almostAny.many().tie()
        )
        .map(arr => {
            console.assert(arr.length === 3);
            const isPack = arr[1] === '...';
            return toParameter(TemplateParameterKind.TYPE, isPack, arr[2].trim(), '');
        })
        .desc('type parameter with no default'),

    templateP: r =>
        P.seq(r.templateOnly.skip(P.optWhitespace), r.typeP)
        .map(arr => ({
            kind: TemplateParameterKind.TEMPLATE,
            params: arr[0].params,
            isPack: arr[1].isPack,
            name: arr[1].name,
            'default': arr[1]['default']
        }))
        .desc('template parameter'),

    // Real grammar for this is hard so for now everything that is not Type parameter and not
    // Template parameter is considered Non type parameter
    nonTypeP: r =>
        r.almostAny.atLeast(1).tie()
        .map(str => ({ kind: TemplateParameterKind.NON_TYPE, value: str }))
        .desc('non type parameter'),

    optEllipsis: _ => P.regexp(/(\.\.\.)?/),

    // This one is used to parse identifiers, defaults and non type template parameters.
    // As `,` is excluded, non type template parameters with multiple c++11 attributes
    // will be parsed incorrectly.
    almostAny: _ => P.regexp(/[^,=>]/)
});
