'use babel';

import { default as P } from 'parsimmon';
import { TypeP, NonTypeP, TemplateP } from './model.js';

export const TemplateParser = P.createLanguage({
    templateAsPrefix: r =>
        P.seq(
            r.templateOnly,
            P.index
        )
        .skip(P.all)
        .map(arr => ({ params: arr[0].params, charsParsed: arr[1].offset }))
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
            return TypeP(isPack, arr[1].trim(), arr[3].trim());
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
            return TypeP(isPack, arr[2].trim(), '');
        })
        .desc('type parameter with no default'),

    templateP: r =>
        P.seq(r.templateOnly.skip(P.optWhitespace), r.typeP)
        .map(arr => TemplateP(arr[0].params, arr[1].isPack, arr[1].name, arr[1]['default']))
        .desc('template parameter'),

    // Real grammar for this is hard so for now everything that is not Type parameter and not
    // Template parameter is considered Non type parameter
    nonTypeP: r =>
        r.almostAny.atLeast(1).tie()
        .map(NonTypeP)
        .desc('non type parameter'),

    optEllipsis: _ => P.regexp(/(\.\.\.)?/),

    // This one is used to parse identifiers, defaults and non type template parameters.
    // As `,` is excluded, non type template parameters with multiple c++11 attributes
    // will be parsed incorrectly.
    almostAny: _ => P.regexp(/[^,=>]/)
});
