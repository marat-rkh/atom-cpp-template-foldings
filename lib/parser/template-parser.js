'use babel';

import { default as P } from 'parsimmon';
import { TypeP, NonTypeP, TemplateP } from './model.js';

function opt(parser) {
    return P.alt(parser, P.succeed(''));
}

export const TemplateParser = P.createLanguage({
    templateAsPrefix: r =>
        P.seq(
            r.templateOnly,
            P.index
        )
        .skip(P.all)
        .map(arr => ({
            params: arr[0].params,
            charsParsed: arr[1].offset,
            endLine: arr[1].line - 1,
            endColumn: arr[1].column - 1
        }))
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
            opt(r.identifier.wrap(P.whitespace, P.succeed(''))),
            P.string('=').trim(P.optWhitespace),
            r.defaultType
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
            opt(r.identifier),
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

    // Real grammar for this is hard so for now we use some approximation
    nonTypeP: r =>
        r.typeLike
        .map(NonTypeP)
        .desc('non type parameter'),

    identifier: r => P.regexp(/[^,><=]/).atLeast(1).tie().desc('identifier'),

    defaultType: r => r.typeLike.desc('default'),

    optEllipsis: _ => P.regexp(/(\.\.\.)?/),

    typeLike: r =>
        P.seq(
            r.almostAny.atLeast(1).tie(),
            opt(
                P.seq(
                    P.string('<'),
                    opt(r.typeLikeRelaxed),
                    P.string('>'),
                    opt(r.typeLike)
                )
                .tie()
            )
        )
        .tie()
        .desc('type like'),

    typeLikeRelaxed: r =>
        P.seq(
            P.regexp(/[^><]/).atLeast(1).tie(),
            opt(
                P.seq(
                    P.string('<'),
                    opt(r.typeLikeRelaxed),
                    P.string('>'),
                    opt(r.typeLikeRelaxed)
                )
                .tie()
            )
        )
        .tie()
        .desc('type like (relaxed)'),

    almostAny: r => P.regexp(/[^,><]/).desc('almost any')
});
