import type { Plugin, Rule } from 'postcss';

/**
 * Flexbox `gap` needs Chromium 84; older TV browsers ignore it, and everything touches. For
 * those (`no-flex-gap` on <html>, set in __root.tsx) every gap utility also puts margins
 * between the children of a flex container. Grids keep their gap, which those browsers have.
 */
export function flexGapFallback(): Plugin {
    return {
        postcssPlugin: 'flex-gap-fallback',
        Rule(rule: Rule) {
            if (!/^\.gap(-[xy])?-\S+$/.test(rule.selector) || rule.nodes.length !== 1) return;
            const decl = rule.first;
            if (decl?.type !== 'decl' || !['gap', 'column-gap', 'row-gap'].includes(decl.prop)) {
                return;
            }
            const sel = `.no-flex-gap ${rule.selector}`;
            const between = (selector: string, prop: string) =>
                rule.cloneAfter({ selector: `${selector} > * + *`, nodes: [] }).append({
                    prop,
                    value: decl.value,
                });
            if (decl.prop !== 'row-gap') {
                between(`${sel}.flex:not(.flex-col):not(.flex-row-reverse)`, 'margin-left');
                between(`${sel}.flex.flex-row-reverse`, 'margin-right');
            }
            if (decl.prop !== 'column-gap') between(`${sel}.flex.flex-col`, 'margin-top');
        },
    };
}
