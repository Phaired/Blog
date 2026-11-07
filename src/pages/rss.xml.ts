import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import { DEFAULT_LANG } from "../i18n/utils";
import { entryUrl, getVisibleEntries } from "../utils/content";

export async function GET(context: APIContext) {
    const posts = await getVisibleEntries("blog", DEFAULT_LANG);
    return rss({
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        site: context.site!,
        items: posts.map((post) => ({
            title: post.data.title,
            description: post.data.description,
            pubDate: post.data.pubDate,
            link: entryUrl("blog", post),
        })),
    });
}
