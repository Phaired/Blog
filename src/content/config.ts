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
        lang: z.string(),
        altSlug: z.string(),
        isVisible: z.boolean().default(false),
    }),
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
        lang: z.string(),
        altSlug: z.string(),
        isVisible: z.boolean().default(false),
    }),
});

export const collections = {
    blog: blog,
    projects: projects,
};
