import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import { DEFAULT_LANG } from "../i18n/utils";

export async function GET(context) {
    const posts = (await getCollection("blog")).filter(
        (p) => p.data.lang === DEFAULT_LANG,
    );
    return rss({
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        site: context.site,
        items: posts.map((post) => ({
            ...post.data,
            link: `/${DEFAULT_LANG}/blog/${post.data.slug}/`,
        })),
    });
}
