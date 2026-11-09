import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import compress from "astro-compress";
import astroD2 from "astro-d2";
import { katex } from "./src/utils/katex.mjs";

const inter = (weight, file) => ({
    weight,
    style: "normal",
    src: [`./src/assets/fonts/Inter-${file}.woff2`],
});

export default defineConfig({
    site: "https://remybarranco.fr",
    trailingSlash: "always",
    // En prod, nginx redirige "/" selon la langue du navigateur ; ceci ne sert qu'en dev/preview.
    redirects: { "/": "/en/" },
    fonts: [
        {
            provider: fontProviders.local(),
            name: "Inter",
            cssVariable: "--font-inter",
            fallbacks: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
            options: {
                variants: [
                    inter(400, "Regular"),
                    inter(500, "Medium"),
                    inter(600, "SemiBold"),
                    inter(700, "Bold"),
                ],
            },
        },
        {
            provider: fontProviders.local(),
            name: "Inter Tight",
            cssVariable: "--font-display",
            fallbacks: ["Arial", "sans-serif"],
            options: {
                variants: [700, 800].map((weight) => ({
                    weight,
                    style: "normal",
                    src: [`@fontsource/inter-tight/files/inter-tight-latin-${weight}-normal.woff2`],
                })),
            },
        },
    ],
    markdown: {
        processor: satteri({
            features: { math: true },
            mdastPlugins: [katex],
        }),
    },
    integrations: [
        mdx(),
        sitemap({
            filter: (page) => page !== "https://remybarranco.fr/",
            i18n: { defaultLocale: "en", locales: { en: "en", fr: "fr" } },
        }),
        astroD2(),
        compress({
            CSS: true,
            HTML: { "html-minifier-terser": { removeAttributeQuotes: false } },
            Image: false,
            JavaScript: true,
            SVG: false,
        }),
    ],
});
