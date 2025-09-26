import { Feed } from "../feed";
import { published, sampleFeed, updated } from "./setup";

describe("rss 2.0", () => {
  it("should generate a valid feed", () => {
    const actual = sampleFeed.rss2();
    expect(actual).toMatchSnapshot();
  });
  it("should generate a valid feed with image properties", () => {
    sampleFeed.addItem({
      title: "Hello World",
      guid: "419c523a-28f4-489c-877e-9604be64c001",
      link: "https://example.com/hello-world2",
      description: "This is an article about Hello World.",
      content: "Content of my item",
      author: [
        {
          name: "Jane Doe",
          email: "janedoe@example.com",
          link: "https://example.com/janedoe",
        },
        {
          name: "Joe Smith",
          email: "joesmith@example.com",
          link: "https://example.com/joesmith",
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
      image: { url: "https://example.com/hello-world.jpg", length: 12665 },
      published,
    });
    const actual = sampleFeed.rss2();
    expect(actual).toMatchSnapshot();
  });
  it("should generate a valid feed with enclosure", () => {
    sampleFeed.addItem({
      title: "Hello World",
      guid: "419c523a-28f4-489c-877e-9604be64c001",
      link: "https://example.com/hello-world2",
      description: "This is an article about Hello World.",
      content: "Content of my item",
      author: [
        {
          name: "Jane Doe",
          email: "janedoe@example.com",
          link: "https://example.com/janedoe",
        },
        {
          name: "Joe Smith",
          email: "joesmith@example.com",
          link: "https://example.com/joesmith",
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
      enclosure: { url: "https://example.com/hello-world.jpg", length: 12665 },
      published,
    });
    const actual = sampleFeed.rss2();
    expect(actual).toMatchSnapshot();
  });
  it("should generate a valid feed with audio", () => {
    sampleFeed.addItem({
      title: "Hello World",
      link: "https://example.com/hello-world3",
      description: "This is an article about Hello World.",
      content: "Content of my item",
      author: [
        {
          name: "Jane Doe",
          email: "janedoe@example.com",
          link: "https://example.com/janedoe",
        },
        {
          name: "Joe Smith",
          email: "joesmith@example.com",
          link: "https://example.com/joesmith",
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
      audio: { url: "https://example.com/hello-world.mp3", length: 12665, type: "audio/mpeg" },
      published,
    });
    const actual = sampleFeed.rss2();
    expect(actual).toMatchSnapshot();
  });
  it("should generate a valid feed with video", () => {
    const sampleFeed = new Feed({
      title: "Feed Title",
      description: "This is my personnal feed!",
      link: "http://example.com/",
      id: "http://example.com/",
      language: "en",
      ttl: 60,
      image: "http://example.com/image.png",
      copyright: "All rights reserved 2013, John Doe",
      hub: "wss://example.com/",
      updated, // optional, default = today

      author: {
        name: "John Doe",
        email: "johndoe@example.com",
        link: "https://example.com/johndoe",
      },
    });
    sampleFeed.addItem({
      title: "Hello World",
      id: "419c523a-28f4-489c-877e-9604be64c005",
      link: "https://example.com/hello-world4",
      description: "This is an article about Hello World.",
      content: "Content of my item",
      author: [
        {
          name: "Jane Doe",
          email: "janedoe@example.com",
          link: "https://example.com/janedoe",
        },
        {
          name: "Joe Smith",
          email: "joesmith@example.com",
          link: "https://example.com/joesmith",
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
      video: "https://example.com/hello-world.mp4",
      published,
    });
    const actual = sampleFeed.rss2();
    expect(actual).toMatchSnapshot();
  });
});
