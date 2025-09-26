import { sampleFeed } from "./setup";

describe("atom 1.0", () => {
  it("should generate a valid feed", () => {
    const actual = sampleFeed.atom1();
    expect(actual).toMatchSnapshot();
  });
});
