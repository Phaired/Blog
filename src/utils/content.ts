import { getCollection, type CollectionEntry } from "astro:content";
import type { UiType } from "../i18n/utils";

export type Kind = "blog" | "projects";
export type Entry = CollectionEntry<Kind>;

/** Slug d'URL sans le suffixe de langue (ex: "blog-with-vps-en" -> "blog-with-vps"). */
export const entrySlug = (entry: Entry) => entry.id.replace(/-(en|fr)$/, "");

export const entryUrl = (kind: Kind, entry: Entry) =>
    `/${entry.data.lang}/${kind}/${entrySlug(entry)}/`;

/** Entrées visibles d'une langue, les plus récentes d'abord. */
export async function getVisibleEntries(kind: Kind, lang: UiType) {
    return (await getCollection(kind))
        .filter((e) => e.data.isVisible && e.data.lang === lang)
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
