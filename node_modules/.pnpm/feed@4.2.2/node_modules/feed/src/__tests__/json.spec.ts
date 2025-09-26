import { sampleFeed } from "./setup";

describe("json 1", () => {
  it("should generate a valid feed", () => {
    const actual = sampleFeed.json1();
    expect(actual).toMatchSnapshot();
  });
});
