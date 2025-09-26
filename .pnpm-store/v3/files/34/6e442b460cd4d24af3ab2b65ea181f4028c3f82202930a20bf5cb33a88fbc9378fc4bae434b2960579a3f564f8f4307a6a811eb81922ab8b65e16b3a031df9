import { Feed } from "./feed";
import { Author, Category, Extension, Item } from "./typings";

/**
 * Returns a JSON feed
 * @param ins
 */
export default (ins: Feed) => {
  const { options, items, extensions } = ins;

  let feed: any = {
    version: "https://jsonfeed.org/version/1",
    title: options.title,
  };

  if (options.link) {
    feed.home_page_url = options.link;
  }

  if (options.feedLinks && options.feedLinks.json) {
    feed.feed_url = options.feedLinks.json;
  }

  if (options.description) {
    feed.description = options.description;
  }

  if (options.image) {
    feed.icon = options.image;
  }

  if (options.author) {
    feed.author = {};
    if (options.author.name) {
      feed.author.name = options.author.name;
    }
    if (options.author.link) {
      feed.author.url = options.author.link;
    }
  }

  extensions.map((e: Extension) => {
    feed[e.name] = e.objects;
  });

  feed.items = items.map((item: Item) => {
    let feedItem: any = {
      id: item.id,
      // json_feed distinguishes between html and text content
      // but since we only take a single type, we'll assume HTML
      content_html: item.content,
    };
    if (item.link) {
      feedItem.url = item.link;
    }
    if (item.title) {
      feedItem.title = item.title;
    }
    if (item.description) {
      feedItem.summary = item.description;
    }

    if (item.image) {
      feedItem.image = item.image;
    }

    if (item.date) {
      feedItem.date_modified = item.date.toISOString();
    }
    if (item.published) {
      feedItem.date_published = item.published.toISOString();
    }

    if (item.author) {
      let author: Author | Author[] = item.author;
      if (author instanceof Array) {
        // json feed only supports 1 author per post
        author = author[0];
      }
      feedItem.author = {};
      if (author.name) {
        feedItem.author.name = author.name;
      }
      if (author.link) {
        feedItem.author.url = author.link;
      }
    }

    if (Array.isArray(item.category)) {
      feedItem.tags = [];
      item.category.map((category: Category) => {
        if (category.name) {
          feedItem.tags.push(category.name);
        }
      });
    }

    if (item.extensions) {
      item.extensions.map((e: Extension) => {
        feedItem[e.name] = e.objects;
      });
    }

    return feedItem;
  });

  return JSON.stringify(feed, null, 4);
};
