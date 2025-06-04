import { defineCollection, z } from "astro:content";

const blog = defineCollection({
    // Type-check frontmatter using a schema
    schema: z.object({
        title: z.string(),
        description: z.string(),
        // Transform string to Date object
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: z.string().optional(),
        heroGif: z.string().optional(),
        slug: z.string().optional(),
        lang: z.string(),
        isVisible: z.boolean().default(false),
    }),
    slug: ({ id, data }) =>
        data.slug ??
        id
            .split("/")
            .pop()
            ?.replace(/\.mdx?$/, "")
            ?.replace(/\.fr$/, "") ?? id,
});

const projects = defineCollection({
    // Type-check frontmatter using a schema
    schema: z.object({
        title: z.string(),
        description: z.string(),
        // Transform string to Date object
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: z.string().optional(),
        heroGif: z.string().optional(),
        slug: z.string().optional(),
        lang: z.string(),
        isVisible: z.boolean().default(false),
    }),
    slug: ({ id, data }) =>
        data.slug ??
        id
            .split("/")
            .pop()
            ?.replace(/\.mdx?$/, "")
            ?.replace(/\.fr$/, "") ?? id,
});

export const collections = {
    blog: blog,
    projects: projects,
};
