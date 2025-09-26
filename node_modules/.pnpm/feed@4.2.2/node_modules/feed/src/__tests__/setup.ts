import { Feed } from "../feed";

export const updated = new Date("Sat, 13 Jul 2013 23:00:00 GMT");
export const published = new Date("Sat, 10 Jul 2013 23:00:00 GMT");

export const sampleFeed = new Feed({
  title: "Feed Title",
  description: "This is my personnal feed!",
  link: "http://example.com/",
  id: "http://example.com/",
  feed: "http://example.com/sampleFeed.rss",
  feedLinks: {
    json: "http://example.com/sampleFeed.json",
  },
  language: "en",
  ttl: 60,
  image: "http://example.com/image.png",
  favicon: "http://example.com/image.ico",
  copyright: "All rights reserved 2013, John Doe",
  hub: "wss://example.com/",
  updated, // optional, default = today

  author: {
    name: "John Doe",
    email: "johndoe@example.com",
    link: "https://example.com/johndoe?link=sanitized&value=2"
  }
});

sampleFeed.addCategory("Technology");

sampleFeed.addContributor({
  name: "Johan Cruyff",
  email: "johancruyff@example.com",
  link: "https://example.com/johancruyff",
});

sampleFeed.addItem({
  title: "Hello World",
  id: "https://example.com/hello-world?id=this&that=true",
  link: "https://example.com/hello-world?link=sanitized&value=2",
  description: "This is an article about Hello World.",
  content: "Content of my item",
  author: [
    {
      name: "Jane Doe",
      email: "janedoe@example.com",
      link: "https://example.com/janedoe?link=sanitized&value=2",
    },
    {
      name: "Joe Smith",
      email: "joesmith@example.com",
      link: "https://example.com/joesmith",
    },
    {
      name: "Joe Smith, Name Only",
    }
  ],
  contributor: [
    {
      name: "Shawn Kemp",
      email: "shawnkemp@example.com",
      link: "https://example.com/shawnkemp",
    },
    {
      name: "Reggie Miller",
      email: "reggiemiller@example.com",
      link: "https://example.com/reggiemiller",
    },
  ],
  extensions: [
    {
      name: "_item_extension_1",
      objects: {
        about: "just an item extension example",
        dummy1: "example",
      },
    },
    {
      name: "_item_extension_2",
      objects: {
        about: "just a second item extension example",
        dummy1: "example",
      },
    },
  ],
  category: [
    {
      name: "Grateful Dead",
    },
    {
      name: "MSFT",
      domain: "http://www.fool.com/cusips",
    },
  ],
  date: updated,
  image: "https://example.com/hello-world.jpg",
  enclosure: { url: "https://example.com/hello-world.jpg", length: 12665, type: "image/jpeg" },
  published,
});

sampleFeed.addExtension({
  name: "_example_extension",
  objects: {
    about: "just an extension example",
    dummy: "example",
  },
});
