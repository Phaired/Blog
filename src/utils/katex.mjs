import { defineMdastPlugin } from "satteri";
import katexLib from "katex";

const render = (value, displayMode) =>
    katexLib.renderToString(value, { displayMode, throwOnError: false, trust: true });

/** Rend les blocs `$...$` / `$$...$$` en HTML KaTeX (remplace remark-math + rehype-katex). */
export const katex = defineMdastPlugin({
    name: "katex",
    math(node, ctx) {
        ctx.replaceNode(node, { type: "html", value: render(node.value, true) });
    },
    inlineMath(node, ctx) {
        ctx.replaceNode(node, { type: "html", value: render(node.value, false) });
    },
});
