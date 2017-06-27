'use babel';

export const TemplateParameterKind = {
    TYPE: 0,
    NON_TYPE: 1,
    TEMPLATE: 2
};

export function TypeP(isPack, name, default_) {
    return { kind: TemplateParameterKind.TYPE, isPack, name, 'default': default_ };
}

export function NonTypeP(value) {
    return { kind: TemplateParameterKind.NON_TYPE, value };
}

export function TemplateP(params, isPack, name, default_) {
    return { kind: TemplateParameterKind.TEMPLATE, params, isPack, name, 'default': default_ };
}
