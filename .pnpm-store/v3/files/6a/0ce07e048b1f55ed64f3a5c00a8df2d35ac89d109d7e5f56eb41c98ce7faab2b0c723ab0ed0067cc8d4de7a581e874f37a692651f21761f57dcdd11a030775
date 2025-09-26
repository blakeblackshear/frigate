beforeEach(() => {
  jest.resetModules();
});

describe("fileMatchSize()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("should return true if the file object doesn't have a {size} property", () => {
    expect(utils.fileMatchSize({})).toEqual([true, null]);
    expect(utils.fileMatchSize({ size: null })).toEqual([true, null]);
  });

  it("should return true if the minSize and maxSize were not provided", () => {
    expect(utils.fileMatchSize({ size: 100 })).toEqual([true, null]);
    expect(utils.fileMatchSize({ size: 100 }, undefined, undefined)).toEqual([
      true,
      null,
    ]);
    expect(utils.fileMatchSize({ size: 100 }, null, null)).toEqual([
      true,
      null,
    ]);
  });

  it("should return true if the file {size} is within the [minSize, maxSize] range", () => {
    expect(utils.fileMatchSize({ size: 100 }, 10, 200)).toEqual([true, null]);
    expect(utils.fileMatchSize({ size: 100 }, 10, 99)).toEqual([
      false,
      { code: "file-too-large", message: "File is larger than 99 bytes" },
    ]);
    expect(utils.fileMatchSize({ size: 100 }, 101, 200)).toEqual([
      false,
      { code: "file-too-small", message: "File is smaller than 101 bytes" },
    ]);
  });

  it("should return true if the file {size} is more than minSize", () => {
    expect(utils.fileMatchSize({ size: 100 }, 100)).toEqual([true, null]);
    expect(utils.fileMatchSize({ size: 100 }, 101)).toEqual([
      false,
      { code: "file-too-small", message: "File is smaller than 101 bytes" },
    ]);
  });

  it("should return true if the file {size} is less than maxSize", () => {
    expect(utils.fileMatchSize({ size: 100 }, undefined, 100)).toEqual([
      true,
      null,
    ]);
    expect(utils.fileMatchSize({ size: 100 }, null, 100)).toEqual([true, null]);
    expect(utils.fileMatchSize({ size: 100 }, undefined, 99)).toEqual([
      false,
      { code: "file-too-large", message: "File is larger than 99 bytes" },
    ]);
    expect(utils.fileMatchSize({ size: 100 }, null, 99)).toEqual([
      false,
      { code: "file-too-large", message: "File is larger than 99 bytes" },
    ]);
  });
});

describe("isIeOrEdge", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("should return true for IE10", () => {
    const userAgent =
      "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; WOW64; Trident/6.0; .NET4.0E; .NET4.0C; .NET CLR 3.5.30729; .NET CLR 2.0.50727; .NET CLR 3.0.30729)";

    expect(utils.isIeOrEdge(userAgent)).toBe(true);
  });

  it("should return true for IE11", () => {
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; rv:11.0) like Gecko";
    expect(utils.isIeOrEdge(userAgent)).toBe(true);
  });

  it("should return true for Edge", () => {
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16258";

    expect(utils.isIeOrEdge(userAgent)).toBe(true);
  });

  it("should return false for Chrome", () => {
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36";

    expect(utils.isIeOrEdge(userAgent)).toBe(false);
  });
});

describe("isKindFile()", () => {
  it('should return true for DataTransferItem of kind "file"', async () => {
    /**
     * @constant
     * @type {import('./index')}
     */
    const utils = await import("./index");
    expect(utils.isKindFile({ kind: "file" })).toBe(true);
    expect(utils.isKindFile({ kind: "text/html" })).toBe(false);
    expect(utils.isKindFile({})).toBe(false);
    expect(utils.isKindFile(null)).toBe(false);
  });
});

describe("isPropagationStopped()", () => {
  const trueFn = jest.fn(() => true);

  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("should return result of isPropagationStopped() if isPropagationStopped exists", () => {
    expect(utils.isPropagationStopped({ isPropagationStopped: trueFn })).toBe(
      true
    );
  });

  it("should return value of cancelBubble if isPropagationStopped doesnt exist and cancelBubble exists", () => {
    expect(utils.isPropagationStopped({ cancelBubble: true })).toBe(true);
  });

  it("should return false if isPropagationStopped and cancelBubble are missing", () => {
    expect(utils.isPropagationStopped({})).toBe(false);
  });
});

describe("isEvtWithFiles()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("should return true if some dragged types are files", () => {
    expect(utils.isEvtWithFiles({ dataTransfer: { types: ["Files"] } })).toBe(
      true
    );
    expect(
      utils.isEvtWithFiles({
        dataTransfer: { types: ["application/x-moz-file"] },
      })
    ).toBe(true);
    expect(
      utils.isEvtWithFiles({
        dataTransfer: { types: ["Files", "application/x-moz-file"] },
      })
    ).toBe(true);
    expect(
      utils.isEvtWithFiles({ dataTransfer: { types: ["text/plain"] } })
    ).toBe(false);
    expect(
      utils.isEvtWithFiles({ dataTransfer: { types: ["text/html"] } })
    ).toBe(false);
    expect(
      utils.isEvtWithFiles({
        dataTransfer: { types: ["Files", "application/test"] },
      })
    ).toBe(true);
    expect(
      utils.isEvtWithFiles({
        dataTransfer: { types: ["application/x-moz-file", "application/test"] },
      })
    ).toBe(true);
  });

  it("should return true if the event has a target with files", () => {
    expect(utils.isEvtWithFiles({ target: { files: [] } })).toBe(true);
  });

  it("should return false otherwise", () => {
    expect(utils.isEvtWithFiles({})).toBe(false);
  });
});

describe("composeEventHandlers()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("returns a fn", () => {
    const fn = utils.composeEventHandlers(() => {});
    expect(typeof fn).toBe("function");
  });

  it("runs every passed fn in order", () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const fn = utils.composeEventHandlers(fn1, fn2);
    const event = { type: "click" };
    const data = { ping: true };
    fn(event, data);
    expect(fn1).toHaveBeenCalledWith(event, data);
    expect(fn2).toHaveBeenCalledWith(event, data);
  });

  it("stops after first fn that calls stopPropagation()", () => {
    const fn1 = jest.fn().mockImplementation((event) => {
      Object.defineProperty(event, "cancelBubble", { value: true });
      return event;
    });
    const fn2 = jest.fn();
    const fn = utils.composeEventHandlers(fn1, fn2);
    const event = new MouseEvent("click");
    fn(event);
    expect(fn1).toHaveBeenCalledWith(event);
    expect(fn2).not.toHaveBeenCalled();
  });

  it("stops before first fn if bubble is already canceled", () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const fn = utils.composeEventHandlers(fn1, fn2);
    const event = new MouseEvent("click");
    Object.defineProperty(event, "cancelBubble", { value: true });
    fn(event);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });
});

describe("fileAccepted()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("accepts bogus firefox file", () => {
    const file = createFile("bogus.png", 100, "application/x-moz-file");
    expect(utils.fileAccepted(file, ".pdf")).toEqual([true, null]);
  });

  it("accepts file when single accept criteria", () => {
    const file = createFile("hamster.pdf", 100, "application/pdf");
    expect(utils.fileAccepted(file, ".pdf")).toEqual([true, null]);
  });

  it("accepts file when multiple accept criteria", () => {
    const file = createFile("hamster.pdf", 100, "application/pdf");
    expect(utils.fileAccepted(file, ".pdf,.png")).toEqual([true, null]);
  });

  it("rejects file when single accept criteria", () => {
    const file = createFile("hamster.pdf", 100, "application/pdf");
    expect(utils.fileAccepted(file, ".png")).toEqual([
      false,
      { code: "file-invalid-type", message: "File type must be .png" },
    ]);
  });

  it("rejects file when multiple accept criteria", () => {
    const file = createFile("hamster.pdf", 100, "application/pdf");
    expect(utils.fileAccepted(file, ".gif,.png")).toEqual([
      false,
      {
        code: "file-invalid-type",
        message: "File type must be one of .gif, .png",
      },
    ]);
  });
});

describe("getTooLargeRejectionErr()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("prints byte when maxSize is 1", () => {
    expect(utils.getTooLargeRejectionErr(1).message).toEqual(
      "File is larger than 1 byte"
    );
  });

  it("prints bytes when maxSize > 1", () => {
    expect(utils.getTooLargeRejectionErr(100).message).toEqual(
      "File is larger than 100 bytes"
    );
  });
});

describe("getTooSmallRejectionErr()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("prints byte when minSize is 1", () => {
    expect(utils.getTooSmallRejectionErr(1).message).toEqual(
      "File is smaller than 1 byte"
    );
  });

  it("prints bytes when minSize > 1", () => {
    expect(utils.getTooSmallRejectionErr(100).message).toEqual(
      "File is smaller than 100 bytes"
    );
  });
});

describe("allFilesAccepted()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });
  it("rejects file when multiple accept criteria", () => {
    const files = [
      createFile("hamster.pdf", 100, "application/pdf"),
      createFile("fish.pdf", 100, "application/pdf"),
    ];
    const images = [
      createFile("cats.gif", 1234, "image/gif"),
      createFile("dogs.gif", 2345, "image/jpeg"),
    ];
    expect(utils.allFilesAccepted({ files, multiple: true })).toEqual(true);
    expect(
      utils.allFilesAccepted({ files, multiple: true, maxFiles: 10 })
    ).toEqual(true);
    expect(
      utils.allFilesAccepted({ files, multiple: false, maxFiles: 10 })
    ).toEqual(false);
    expect(
      utils.allFilesAccepted({ files, multiple: true, accept: "image/jpeg" })
    ).toEqual(false);
    expect(
      utils.allFilesAccepted({
        files: images,
        multiple: true,
        accept: "image/*",
      })
    ).toEqual(true);
    expect(
      utils.allFilesAccepted({ files, multiple: true, minSize: 110 })
    ).toEqual(false);
    expect(
      utils.allFilesAccepted({ files, multiple: true, maxSize: 99 })
    ).toEqual(false);
    expect(
      utils.allFilesAccepted({ files, multiple: true, maxFiles: 1 })
    ).toEqual(false);

    expect(
      utils.allFilesAccepted({
        files,
        validator: () => ({ code: "not-allowed", message: "Cannot do this!" }),
      })
    ).toEqual(false);
  });
});

describe("ErrorCode", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("should exist and have known error code properties", () => {
    expect(utils.ErrorCode.FileInvalidType).toEqual(utils.FILE_INVALID_TYPE);
    expect(utils.ErrorCode.FileTooLarge).toEqual(utils.FILE_TOO_LARGE);
    expect(utils.ErrorCode.FileTooSmall).toEqual(utils.FILE_TOO_SMALL);
    expect(utils.ErrorCode.TooManyFiles).toEqual(utils.TOO_MANY_FILES);
  });
});

describe("canUseFileSystemAccessAPI()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("should return false if not", () => {
    expect(utils.canUseFileSystemAccessAPI()).toBe(false);
  });

  it("should return true if yes", () => {
    // TODO: If we use these in other tests, restore once test is done
    window.showOpenFilePicker = jest.fn();
    expect(utils.canUseFileSystemAccessAPI()).toBe(true);
  });
});

describe("pickerOptionsFromAccept()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("converts the {accept} prop to file picker options", () => {
    expect(
      utils.pickerOptionsFromAccept({
        "image/*": [".png", ".jpg"], // ok
        "text/*": [".txt", ".pdf"], // ok
        "audio/*": ["mp3"], // not ok
        "*": [".p12"], // not ok
      })
    ).toEqual([
      {
        description: "Files",
        accept: {
          "image/*": [".png", ".jpg"],
          "text/*": [".txt", ".pdf"],
        },
      },
    ]);
  });
});

describe("acceptPropAsAcceptAttr()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("converts {accept} to an array of strings", () => {
    expect(
      utils.acceptPropAsAcceptAttr({
        "image/*": [".png", ".jpg"],
        "text/*": [".txt", ".pdf"],
        "audio/*": ["mp3"], // `mp3` not ok
        "*": [".p12"], // `*` not ok
      })
    ).toEqual("image/*,.png,.jpg,text/*,.txt,.pdf,audio/*,.p12");
  });
});

describe("isMIMEType()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("checks that the value is a valid MIME type string", () => {
    expect(utils.isMIMEType("text/html")).toBe(true);
    expect(utils.isMIMEType("text/*")).toBe(true);
    expect(utils.isMIMEType("image/*")).toBe(true);
    expect(utils.isMIMEType("video/*")).toBe(true);
    expect(utils.isMIMEType("audio/*")).toBe(true);
    expect(utils.isMIMEType("application/*")).toBe(true);
    expect(utils.isMIMEType("test/*")).toBe(false);
    expect(utils.isMIMEType("text")).toBe(false);
    expect(utils.isMIMEType("")).toBe(false);
    expect(utils.isMIMEType(undefined)).toBe(false);
  });
});

describe("isExt()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("checks that the value is a valid file extension", () => {
    expect(utils.isExt(".jpg")).toBe(true);
    expect(utils.isExt("me.jpg")).toBe(true);
    expect(utils.isExt("me.prev.png")).toBe(true);
    expect(utils.isExt("")).toBe(false);
    expect(utils.isExt("text")).toBe(false);
    expect(utils.isExt(undefined)).toBe(false);
  });
});

describe("isAbort()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("should work as expected", () => {
    expect(utils.isAbort(new DOMException())).toBe(false);
    expect(utils.isAbort(new DOMException("some err"))).toBe(false);
    expect(utils.isAbort(new DOMException("some err", "Noop"))).toBe(false);
    expect(utils.isAbort(new DOMException("some err", "AbortError"))).toBe(
      true
    );
    const err = new DOMException("some err");
    const e = new Proxy(err, {
      get(t, p) {
        if (p === "code") {
          return 20;
        }
        return t[p];
      },
    });
    expect(utils.isAbort(e)).toBe(true);
  });
});

describe("isSecurityError()", () => {
  /**
   * @constant
   * @type {import('./index')}
   */
  let utils;
  beforeEach(async () => {
    utils = await import("./index");
  });

  it("should work as expected", () => {
    expect(utils.isSecurityError(new DOMException())).toBe(false);
    expect(utils.isSecurityError(new DOMException("some err"))).toBe(false);
    expect(utils.isSecurityError(new DOMException("some err", "Noop"))).toBe(
      false
    );
    expect(
      utils.isSecurityError(new DOMException("some err", "SecurityError"))
    ).toBe(true);
    const err = new DOMException("some err");
    const e = new Proxy(err, {
      get(t, p) {
        if (p === "code") {
          return 18;
        }
        return t[p];
      },
    });
    expect(utils.isSecurityError(e)).toBe(true);
  });
});

function createFile(name, size, type) {
  const file = new File([], name, { type });
  Object.defineProperty(file, "size", {
    get() {
      return size;
    },
  });
  return file;
}
