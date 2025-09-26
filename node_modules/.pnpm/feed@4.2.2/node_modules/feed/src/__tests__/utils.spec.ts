import { sanitize } from "../utils";

describe("Sanitizing", () => {
  it("should sanitize & to &amp;", () => {
    expect('&amp;').toEqual(sanitize('&'));
  });
  it("should handle multiple &", () => {
    expect('https://test.com/?page=1&amp;size=3&amp;length=10').toEqual(sanitize('https://test.com/?page=1&size=3&length=10'));
  });

  it("should handle undefined", () => {
    var undefined;
    expect(sanitize(undefined)).toBeUndefined();
  });
});
