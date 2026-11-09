import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const schema = z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    heroGif: z.string().optional(),
    slug: z.string().optional(),
    lang: z.enum(["en", "fr"]),
    isVisible: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
});

// L'id vient du `slug` du frontmatter (ex: "blog-with-vps-en").
const collection = (dir: string) =>
    defineCollection({
        loader: glob({ pattern: "**/*.{md,mdx}", base: `./src/content/${dir}` }),
        schema,
    });

export const collections = {
    blog: collection("blog"),
    projects: collection("projects"),
};

