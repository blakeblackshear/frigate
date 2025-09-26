/* eslint react/prop-types: 0, jsx-a11y/label-has-for: 0 */
import React, { createRef } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";
import { fromEvent } from "file-selector";
import * as utils from "./utils";
import Dropzone, { useDropzone } from "./index";

describe("useDropzone() hook", () => {
  let files;
  let images;

  beforeEach(() => {
    files = [createFile("file1.pdf", 1111, "application/pdf")];
    images = [
      createFile("cats.gif", 1234, "image/gif"),
      createFile("dogs.gif", 2345, "image/jpeg"),
    ];
  });

  afterEach(cleanup);

  describe("behavior", () => {
    it("renders the root and input nodes with the necessary props", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("sets {accept} prop on the <input>", () => {
      const accept = {
        "image/jpeg": [],
      };
      const { container } = render(
        <Dropzone accept={accept}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("input")).toHaveAttribute(
        "accept",
        "image/jpeg"
      );
    });

    it("updates {multiple} prop on the <input> when it changes", () => {
      const { container, rerender } = render(
        <Dropzone
          accept={{
            "image/jpeg": [],
          }}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("input")).toHaveAttribute(
        "accept",
        "image/jpeg"
      );

      rerender(
        <Dropzone
          accept={{
            "image/png": [],
          }}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("input")).toHaveAttribute(
        "accept",
        "image/png"
      );
    });

    it("sets {multiple} prop on the <input>", () => {
      const { container } = render(
        <Dropzone multiple>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("input")).toHaveAttribute("multiple");
    });

    it("updates {multiple} prop on the <input> when it changes", () => {
      const { container, rerender } = render(
        <Dropzone multiple={false}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("input")).not.toHaveAttribute("multiple");

      rerender(
        <Dropzone multiple>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("input")).toHaveAttribute("multiple");
    });

    it("sets any props passed to the input props getter on the <input>", () => {
      const name = "dropzone-input";
      const { container } = render(
        <Dropzone multiple>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps({ name })} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("input")).toHaveAttribute("name", name);
    });

    it("sets any props passed to the root props getter on the root node", () => {
      const ariaLabel = "Dropzone area";
      const { container } = render(
        <Dropzone multiple>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps({ "aria-label": ariaLabel })}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("div")).toHaveAttribute(
        "aria-label",
        ariaLabel
      );
    });

    it("runs the custom callback handlers provided to the root props getter", async () => {
      const event = createDtWithFiles(files);

      const rootProps = {
        onClick: jest.fn(),
        onKeyDown: jest.fn(),
        onFocus: jest.fn(),
        onBlur: jest.fn(),
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps(rootProps)}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);
      expect(rootProps.onClick).toHaveBeenCalled();

      fireEvent.focus(dropzone);
      fireEvent.keyDown(dropzone);
      expect(rootProps.onFocus).toHaveBeenCalled();
      expect(rootProps.onKeyDown).toHaveBeenCalled();

      fireEvent.blur(dropzone);
      expect(rootProps.onBlur).toHaveBeenCalled();

      await act(() => fireEvent.dragEnter(dropzone, event));
      expect(rootProps.onDragEnter).toHaveBeenCalled();

      fireEvent.dragOver(dropzone, event);
      expect(rootProps.onDragOver).toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, event);
      expect(rootProps.onDragLeave).toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, event));
      expect(rootProps.onDrop).toHaveBeenCalled();
    });

    it("runs the custom callback handlers provided to the input props getter", async () => {
      const inputProps = {
        onClick: jest.fn(),
        onChange: jest.fn(),
      };

      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps(inputProps)} />
            </div>
          )}
        </Dropzone>
      );

      const input = container.querySelector("input");

      fireEvent.click(input);
      expect(inputProps.onClick).toHaveBeenCalled();

      await act(async () => fireEvent.change(input, { target: { files: [] } }));
      expect(inputProps.onChange).toHaveBeenCalled();
    });

    it("runs no callback handlers if {disabled} is true", async () => {
      const event = createDtWithFiles(files);

      const rootProps = {
        onClick: jest.fn(),
        onKeyDown: jest.fn(),
        onFocus: jest.fn(),
        onBlur: jest.fn(),
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const inputProps = {
        onClick: jest.fn(),
        onChange: jest.fn(),
      };

      const { container } = render(
        <Dropzone disabled>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps(rootProps)}>
              <input {...getInputProps(inputProps)} />
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);
      expect(rootProps.onClick).not.toHaveBeenCalled();

      fireEvent.focus(dropzone);
      fireEvent.keyDown(dropzone);
      expect(rootProps.onFocus).not.toHaveBeenCalled();
      expect(rootProps.onKeyDown).not.toHaveBeenCalled();

      fireEvent.blur(dropzone);
      expect(rootProps.onBlur).not.toHaveBeenCalled();

      await act(() => fireEvent.dragEnter(dropzone, event));
      expect(rootProps.onDragEnter).not.toHaveBeenCalled();

      fireEvent.dragOver(dropzone, event);
      expect(rootProps.onDragOver).not.toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, event);
      expect(rootProps.onDragLeave).not.toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, event));
      expect(rootProps.onDrop).not.toHaveBeenCalled();

      const input = container.querySelector("input");

      fireEvent.click(input);
      expect(inputProps.onClick).not.toHaveBeenCalled();

      await act(() => fireEvent.change(input));
      expect(inputProps.onChange).not.toHaveBeenCalled();
    });

    test("{rootRef, inputRef} are exposed", () => {
      const { result } = renderHook(() => useDropzone());
      const { rootRef, inputRef, getRootProps, getInputProps } = result.current;

      const { container } = render(
        <div {...getRootProps()}>
          <input {...getInputProps()} />
        </div>
      );

      expect(container.querySelector("div")).toEqual(rootRef.current);
      expect(container.querySelector("input")).toEqual(inputRef.current);
    });

    test("<Dropzone> exposes and sets the ref if using a ref object", () => {
      const dropzoneRef = createRef();
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const ui = (
        <Dropzone ref={dropzoneRef}>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const { rerender } = render(ui);

      expect(dropzoneRef.current).not.toBeNull();
      expect(typeof dropzoneRef.current.open).toEqual("function");

      act(() => dropzoneRef.current.open());
      expect(onClickSpy).toHaveBeenCalled();

      rerender(null);

      expect(dropzoneRef.current).toBeNull();
    });

    test("<Dropzone> exposes and sets the ref if using a ref fn", () => {
      let dropzoneRef;
      const setRef = (ref) => (dropzoneRef = ref);
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const ui = (
        <Dropzone ref={setRef}>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const { rerender } = render(ui);

      expect(dropzoneRef).not.toBeNull();
      expect(typeof dropzoneRef.open).toEqual("function");

      act(() => dropzoneRef.open());
      expect(onClickSpy).toHaveBeenCalled();

      rerender(null);
      expect(dropzoneRef).toBeNull();
    });

    test("<Dropzone> doesn't invoke the ref fn if it hasn't changed", () => {
      const setRef = jest.fn();

      const { rerender } = render(
        <Dropzone ref={setRef}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      rerender(
        <Dropzone ref={setRef}>
          {({ getRootProps }) => <div {...getRootProps()} />}
        </Dropzone>
      );

      expect(setRef).toHaveBeenCalledTimes(1);
    });

    it("sets {isFocused} to false if {disabled} is true", () => {
      const { container, rerender } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();

      rerender(
        <Dropzone disabled>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      expect(dropzone.querySelector("#focus")).toBeNull();
    });

    test("{tabindex} is 0 if {disabled} is false", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      expect(container.querySelector("div")).toHaveAttribute("tabindex", "0");
    });

    test("{tabindex} is not set if {disabled} is true", () => {
      const { container, rerender } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("div")).toHaveAttribute("tabindex", "0");

      rerender(
        <Dropzone disabled>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("div")).not.toHaveAttribute("tabindex");
    });

    test("{tabindex} is not set if {noKeyboard} is true", () => {
      const { container, rerender } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("div")).toHaveAttribute("tabindex", "0");

      rerender(
        <Dropzone noKeyboard>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(container.querySelector("div")).not.toHaveAttribute("tabindex");
    });

    test("refs are set when {refKey} is set to a different value", (done) => {
      const data = createDtWithFiles(files);

      class MyView extends React.Component {
        render() {
          const { children, innerRef, ...rest } = this.props;
          return (
            <div id="dropzone" ref={innerRef} {...rest}>
              <div>{children}</div>
            </div>
          );
        }
      }

      const ui = (
        <Dropzone>
          {({ getRootProps }) => (
            <MyView {...getRootProps({ refKey: "innerRef" })}>
              <span>Drop some files here ...</span>
            </MyView>
          )}
        </Dropzone>
      );

      const { container, rerender } = render(ui);
      const dropzone = container.querySelector("#dropzone");

      const fn = async () => {
        await act(() => fireEvent.drop(dropzone, data));
        rerender(ui);
        done();
      };

      expect(fn).not.toThrow();
    });

    test("click events originating from <label> should not trigger file dialog open twice", () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <label {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </label>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("label");

      fireEvent.click(dropzone, { bubbles: true, cancelable: true });

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);
      expect(onClickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("document drop protection", () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
    // Collect the list of addEventListener/removeEventListener spy calls into an object keyed by event name
    const collectEventListenerCalls = (spy) =>
      spy.mock.calls.reduce(
        (acc, [eventName, ...rest]) => ({
          ...acc,
          [eventName]: rest,
        }),
        {}
      );

    it("installs hooks to prevent stray drops from taking over the browser window", () => {
      render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);

      const addEventCalls = collectEventListenerCalls(addEventListenerSpy);
      const events = Object.keys(addEventCalls);

      expect(events).toContain("dragover");
      expect(events).toContain("drop");

      events.forEach((eventName) => {
        const [fn, options] = addEventCalls[eventName];
        expect(fn).toBeDefined();
        expect(options).toBe(false);
      });
    });

    it("removes document hooks when unmounted", () => {
      const { unmount } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);

      const addEventCalls = collectEventListenerCalls(addEventListenerSpy);
      const removeEventCalls = collectEventListenerCalls(
        removeEventListenerSpy
      );
      const events = Object.keys(removeEventCalls);

      expect(events).toContain("dragover");
      expect(events).toContain("drop");

      events.forEach((eventName) => {
        const [a] = addEventCalls[eventName];
        const [b] = removeEventCalls[eventName];
        expect(a).toEqual(b);
      });
    });

    it("terminates drags and drops on elements outside our dropzone", () => {
      render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dragEvt = new Event("dragover", { bubbles: true });
      const dragEvtPreventDefaultSpy = jest.spyOn(dragEvt, "preventDefault");
      fireEvent(document.body, dragEvt);
      expect(dragEvtPreventDefaultSpy).toHaveBeenCalled();

      const dropEvt = new Event("drop", { bubbles: true });
      const dropEvtPreventDefaultSpy = jest.spyOn(dropEvt, "preventDefault");
      fireEvent(document.body, dropEvt);
      expect(dropEvtPreventDefaultSpy).toHaveBeenCalled();
    });

    it("permits drags and drops on elements inside our dropzone", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dropEvt = new Event("drop", { bubbles: true });
      const dropEvtPreventDefaultSpy = jest.spyOn(dropEvt, "preventDefault");

      fireEvent(container.querySelector("div"), dropEvt);
      // A call is from the onDrop handler for the dropzone,
      // but there should be no more than 1
      expect(dropEvtPreventDefaultSpy).toHaveBeenCalled();
    });

    it("does not prevent stray drops when {preventDropOnDocument} is false", () => {
      render(
        <Dropzone preventDropOnDocument={false}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dropEvt = new Event("drop", { bubbles: true });
      const dropEvtPreventDefaultSpy = jest.spyOn(dropEvt, "preventDefault");
      fireEvent(document.body, dropEvt);
      expect(dropEvtPreventDefaultSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("event propagation", () => {
    const data = createDtWithFiles(files);

    test("drag events propagate from the inner dropzone to parents", async () => {
      const innerProps = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const InnerDropzone = () => (
        <Dropzone {...innerProps}>
          {({ getRootProps, getInputProps }) => (
            <div id="inner-dropzone" {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const parentProps = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const { container } = render(
        <Dropzone {...parentProps}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <InnerDropzone />
            </div>
          )}
        </Dropzone>
      );

      const innerDropzone = container.querySelector("#inner-dropzone");

      await act(() => fireEvent.dragEnter(innerDropzone, data));
      expect(innerProps.onDragEnter).toHaveBeenCalled();
      expect(parentProps.onDragEnter).toHaveBeenCalled();

      fireEvent.dragOver(innerDropzone, data);
      expect(innerProps.onDragOver).toHaveBeenCalled();
      expect(parentProps.onDragOver).toHaveBeenCalled();

      fireEvent.dragLeave(innerDropzone, data);
      expect(innerProps.onDragLeave).toHaveBeenCalled();
      expect(parentProps.onDragLeave).toHaveBeenCalled();

      await act(() => fireEvent.drop(innerDropzone, data));
      expect(innerProps.onDrop).toHaveBeenCalled();
      expect(parentProps.onDrop).toHaveBeenCalled();
    });

    test("drag events do not propagate from the inner dropzone to parent dropzone if user invoked stopPropagation() on the events", async () => {
      const innerProps = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      Object.keys(innerProps).forEach((prop) =>
        innerProps[prop].mockImplementation((...args) => {
          const event = prop === "onDrop" ? args.pop() : args.shift();
          event.stopPropagation();
        })
      );

      const InnerDropzone = () => (
        <Dropzone {...innerProps}>
          {({ getRootProps, getInputProps }) => (
            <div id="inner-dropzone" {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const parentProps = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const { container } = render(
        <Dropzone {...parentProps}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <InnerDropzone />
            </div>
          )}
        </Dropzone>
      );

      const innerDropzone = container.querySelector("#inner-dropzone");

      await act(() => fireEvent.dragEnter(innerDropzone, data));
      expect(innerProps.onDragEnter).toHaveBeenCalled();
      expect(parentProps.onDragEnter).not.toHaveBeenCalled();

      fireEvent.dragOver(innerDropzone, data);
      expect(innerProps.onDragOver).toHaveBeenCalled();
      expect(parentProps.onDragOver).not.toHaveBeenCalled();

      fireEvent.dragLeave(innerDropzone, data);
      expect(innerProps.onDragLeave).toHaveBeenCalled();
      expect(parentProps.onDragLeave).not.toHaveBeenCalled();

      await act(() => fireEvent.drop(innerDropzone, data));
      expect(innerProps.onDrop).toHaveBeenCalled();
      expect(parentProps.onDrop).not.toHaveBeenCalled();
    });

    test("drag events do not propagate from the inner dropzone to parent dropzone if {noDragEventsBubbling} is true", async () => {
      const innerProps = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const InnerDropzone = () => (
        <Dropzone {...innerProps} noDragEventsBubbling>
          {({ getRootProps, getInputProps }) => (
            <div id="inner-dropzone" {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const parentProps = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const { container } = render(
        <Dropzone {...parentProps}>
          {({ getRootProps, getInputProps }) => (
            <div id="outer-dropzone" {...getRootProps()}>
              <input {...getInputProps()} />
              <InnerDropzone />
            </div>
          )}
        </Dropzone>
      );

      const outerDropzone = container.querySelector("#outer-dropzone");
      const innerDropzone = container.querySelector("#inner-dropzone");

      // Sets drag targets on the outer dropzone
      await act(() => fireEvent.dragEnter(outerDropzone, data));

      await act(() => fireEvent.dragEnter(innerDropzone, data));
      expect(innerProps.onDragEnter).toHaveBeenCalled();
      expect(parentProps.onDragEnter).toHaveBeenCalledTimes(1);

      fireEvent.dragOver(innerDropzone, data);
      expect(innerProps.onDragOver).toHaveBeenCalled();
      expect(parentProps.onDragOver).not.toHaveBeenCalled();

      fireEvent.dragLeave(innerDropzone, data);
      expect(innerProps.onDragLeave).toHaveBeenCalled();
      expect(parentProps.onDragLeave).not.toHaveBeenCalled();

      await act(() => fireEvent.drop(innerDropzone, data));
      expect(innerProps.onDrop).toHaveBeenCalled();
      expect(parentProps.onDrop).not.toHaveBeenCalled();
    });

    test("onDragLeave is not invoked for the parent dropzone if it was invoked for an inner dropzone", async () => {
      const innerDragLeave = jest.fn();
      const InnerDropzone = () => (
        <Dropzone onDragLeave={innerDragLeave}>
          {({ getRootProps, getInputProps }) => (
            <div id="inner-dropzone" {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const parentDragLeave = jest.fn();

      const { container } = render(
        <Dropzone onDragLeave={parentDragLeave}>
          {({ getRootProps, getInputProps }) => (
            <div id="parent-dropzone" {...getRootProps()}>
              <input {...getInputProps()} />
              <InnerDropzone />
            </div>
          )}
        </Dropzone>
      );

      const parentDropzone = container.querySelector("#parent-dropzone");

      await act(() => fireEvent.dragEnter(parentDropzone, data));

      const innerDropzone = container.querySelector("#inner-dropzone");
      await act(() => fireEvent.dragEnter(innerDropzone, data));

      fireEvent.dragLeave(innerDropzone, data);
      expect(innerDragLeave).toHaveBeenCalled();
      expect(parentDragLeave).not.toHaveBeenCalled();
    });
  });

  describe("plugin integration", () => {
    it("uses provided getFilesFromEvent()", async () => {
      const data = createDtWithFiles(files);

      const props = {
        getFilesFromEvent: jest
          .fn()
          .mockImplementation((event) => fromEvent(event)),
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const { container } = render(
        <Dropzone {...props}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, data));
      expect(props.onDragEnter).toHaveBeenCalled();

      fireEvent.dragOver(dropzone, data);
      expect(props.onDragOver).toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, data);
      expect(props.onDragLeave).toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, data));
      expect(props.onDrop).toHaveBeenCalled();
      expect(props.getFilesFromEvent).toHaveBeenCalledTimes(2);
    });

    it("calls {onError} when getFilesFromEvent() rejects", async () => {
      const data = createDtWithFiles(files);

      const props = {
        getFilesFromEvent: jest
          .fn()
          .mockImplementation(() => Promise.reject("oops :(")),
        onDragEnter: jest.fn(),
        onDrop: jest.fn(),
        onError: jest.fn(),
      };

      const ui = (
        <Dropzone {...props}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const { container } = render(ui);
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, data));
      expect(props.onDragEnter).not.toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, data));
      expect(props.onDrop).not.toHaveBeenCalled();

      expect(props.getFilesFromEvent).toHaveBeenCalledTimes(2);
      expect(props.onError).toHaveBeenCalledTimes(2);
    });
  });

  describe("onFocus", () => {
    it("sets focus state", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();
    });

    it("does not set focus state if user stopped event propagation", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div
              {...getRootProps({ onFocus: (event) => event.stopPropagation() })}
            >
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).toBeNull();
    });

    it("does not set focus state if {noKeyboard} is true", () => {
      const { container } = render(
        <Dropzone noKeyboard>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).toBeNull();
    });

    it("restores focus behavior if {noKeyboard} is set back to false", () => {
      const { container, rerender } = render(
        <Dropzone noKeyboard>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).toBeNull();

      rerender(
        <Dropzone noKeyboard={false}>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();
    });

    it("{autoFocus} sets the focus state on render", () => {
      const { container, rerender } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      expect(dropzone.querySelector("#focus")).toBeNull();

      rerender(
        /* eslint-disable-next-line jsx-a11y/no-autofocus */
        <Dropzone autoFocus>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      expect(dropzone.querySelector("#focus")).not.toBeNull();

      rerender(
        /* eslint-disable-next-line jsx-a11y/no-autofocus */
        <Dropzone autoFocus disabled>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      expect(dropzone.querySelector("#focus")).toBeNull();
    });
  });

  describe("onBlur", () => {
    it("unsets focus state", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();

      fireEvent.blur(dropzone);
      expect(dropzone.querySelector("#focus")).toBeNull();
    });

    it("does not unset focus state if user stopped event propagation", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div
              {...getRootProps({ onBlur: (event) => event.stopPropagation() })}
            >
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();
      fireEvent.blur(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();
    });

    it("does not unset focus state if {noKeyboard} is true", () => {
      const { container, rerender } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();

      rerender(
        <Dropzone noKeyboard>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      fireEvent.blur(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();
    });

    it("restores blur behavior if {noKeyboard} is set back to false", () => {
      const { container, rerender } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.focus(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();

      rerender(
        <Dropzone noKeyboard>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      fireEvent.blur(dropzone);
      expect(dropzone.querySelector("#focus")).not.toBeNull();

      rerender(
        <Dropzone noKeyboard={false}>
          {({ getRootProps, getInputProps, isFocused }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFocused && <div id="focus" />}
            </div>
          )}
        </Dropzone>
      );

      fireEvent.blur(dropzone);
      expect(dropzone.querySelector("#focus")).toBeNull();
    });
  });

  describe("onClick", () => {
    let currentShowOpenFilePicker;

    beforeEach(() => {
      currentShowOpenFilePicker = window.showOpenFilePicker;
    });

    afterEach(() => {
      if (currentShowOpenFilePicker) {
        window.showOpenFilePicker = currentShowOpenFilePicker;
      } else {
        delete window.showOpenFilePicker;
      }
    });

    it("should proxy the click event to the input", () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);
      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);
      expect(onClickSpy).toHaveBeenCalled();
    });

    it("should not not proxy the click event to the input if event propagation was stopped", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps({ onClick: (event) => event.stopPropagation() })}
            >
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("div"));
      expect(onClickSpy).not.toHaveBeenCalled();
    });

    it("should not not proxy the click event to the input if {noClick} is true", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone noClick>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("div"));
      expect(onClickSpy).not.toHaveBeenCalled();
    });

    it("restores click behavior if {noClick} is set back to false", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container, rerender } = render(
        <Dropzone noClick>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);
      expect(onClickSpy).not.toHaveBeenCalled();

      rerender(
        <Dropzone noClick={false}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(dropzone);
      expect(onClickSpy).toHaveBeenCalled();
    });

    // https://github.com/react-dropzone/react-dropzone/issues/783
    it("should continue event propagation if {noClick} is true", () => {
      const btnClickSpy = jest.fn();
      const inputClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone noClick>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button onClick={btnClickSpy} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("div"));
      expect(inputClickSpy).not.toHaveBeenCalled();

      fireEvent.click(container.querySelector("button"));
      expect(btnClickSpy).toHaveBeenCalled();
    });

    it("should schedule input click on next tick in Edge", () => {
      jest.useFakeTimers();

      const isIeOrEdgeSpy = jest
        .spyOn(utils, "isIeOrEdge")
        .mockReturnValueOnce(true);
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("div"));
      drainPendingTimers();

      expect(onClickSpy).toHaveBeenCalled();
      jest.useRealTimers();
      isIeOrEdgeSpy.mockClear();
    });

    it("should not use showOpenFilePicker() if supported and {useFsAccessApi} is not true", () => {
      jest.useFakeTimers();

      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const showOpenFilePickerMock = jest.fn();

      window.showOpenFilePicker = showOpenFilePickerMock;

      const onDropSpy = jest.fn();
      const onFileDialogOpenSpy = jest.fn();

      const { container } = render(
        <Dropzone
          onDrop={onDropSpy}
          onFileDialogOpen={onFileDialogOpenSpy}
          accept={{
            "application/pdf": [],
          }}
          multiple
        >
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(showOpenFilePickerMock).not.toHaveBeenCalled();
      expect(onClickSpy).toHaveBeenCalled();
      expect(onFileDialogOpenSpy).toHaveBeenCalled();
      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);

      focusWindow();
      drainPendingTimers();

      expect(activeRef.current).toBeNull();
      expect(dropzone).not.toContainElement(activeRef.current);
      expect(onDropSpy).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("should not use showOpenFilePicker() if supported and {isSecureContext} is not true", () => {
      jest.useFakeTimers();

      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const showOpenFilePickerMock = jest.fn();

      window.showOpenFilePicker = showOpenFilePickerMock;
      window.isSecureContext = false;

      const onDropSpy = jest.fn();
      const onFileDialogOpenSpy = jest.fn();

      const { container } = render(
        <Dropzone
          onDrop={onDropSpy}
          onFileDialogOpen={onFileDialogOpenSpy}
          accept={{
            "application/pdf": [],
          }}
          multiple
        >
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(showOpenFilePickerMock).not.toHaveBeenCalled();
      expect(onClickSpy).toHaveBeenCalled();
      expect(onFileDialogOpenSpy).toHaveBeenCalled();
      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);

      focusWindow();
      drainPendingTimers();

      expect(activeRef.current).toBeNull();
      expect(dropzone).not.toContainElement(activeRef.current);
      expect(onDropSpy).not.toHaveBeenCalled();

      jest.useRealTimers();

      window.isSecureContext = true;
    });

    it("should use showOpenFilePicker() if supported and {useFsAccessApi} is true, and not trigger click on input", async () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const handlers = files.map((f) => createFileSystemFileHandle(f));
      const thenable = createThenable();
      const showOpenFilePickerMock = jest
        .fn()
        .mockReturnValue(thenable.promise);

      window.showOpenFilePicker = showOpenFilePickerMock;

      const onDropSpy = jest.fn();
      const onFileDialogOpenSpy = jest.fn();

      const { container } = render(
        <Dropzone
          onDrop={onDropSpy}
          onFileDialogOpen={onFileDialogOpenSpy}
          accept={{
            "application/pdf": [],
          }}
          multiple
          useFsAccessApi
        >
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(showOpenFilePickerMock).toHaveBeenCalledWith({
        multiple: true,
        types: [
          {
            description: "Files",
            accept: { "application/pdf": [] },
          },
        ],
      });
      expect(onClickSpy).not.toHaveBeenCalled();
      expect(onFileDialogOpenSpy).toHaveBeenCalled();

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);

      await act(() => thenable.done(handlers));

      expect(activeRef.current).toBeNull();
      expect(dropzone).not.toContainElement(activeRef.current);

      expect(onDropSpy).toHaveBeenCalledWith(files, [], null);
    });

    test("if showOpenFilePicker() is supported and {useFsAccessApi} is true, it should work without the <input>", async () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;

      const handlers = files.map((f) => createFileSystemFileHandle(f));
      const thenable = createThenable();
      const showOpenFilePickerMock = jest
        .fn()
        .mockReturnValue(thenable.promise);

      window.showOpenFilePicker = showOpenFilePickerMock;

      const onDropSpy = jest.fn();
      const onFileDialogOpenSpy = jest.fn();

      const { container } = render(
        <Dropzone
          onDrop={onDropSpy}
          onFileDialogOpen={onFileDialogOpenSpy}
          useFsAccessApi
        >
          {({ getRootProps, isFileDialogActive }) => (
            <div {...getRootProps()}>{isFileDialogActive && active}</div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(showOpenFilePickerMock).toHaveBeenCalled();
      expect(onFileDialogOpenSpy).toHaveBeenCalled();

      await act(() => thenable.done(handlers));

      expect(activeRef.current).toBeNull();
      expect(dropzone).not.toContainElement(activeRef.current);
      expect(onDropSpy).toHaveBeenCalledWith(files, [], null);
    });

    test("if showOpenFilePicker() is supported and {useFsAccessApi} is true, and the user cancels it should call onFileDialogCancel", async () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;

      const thenable = createThenable();
      const showOpenFilePickerMock = jest
        .fn()
        .mockReturnValue(thenable.promise);

      window.showOpenFilePicker = showOpenFilePickerMock;

      const onDropSpy = jest.fn();
      const onFileDialogCancelSpy = jest.fn();

      const { container } = render(
        <Dropzone
          onDrop={onDropSpy}
          onFileDialogCancel={onFileDialogCancelSpy}
          useFsAccessApi
        >
          {({ getRootProps, isFileDialogActive }) => (
            <div {...getRootProps()}>{isFileDialogActive && active}</div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(showOpenFilePickerMock).toHaveBeenCalled();

      await act(() =>
        thenable.cancel(new DOMException("user aborted request", "AbortError"))
      );

      expect(activeRef.current).toBeNull();
      expect(dropzone).not.toContainElement(activeRef.current);
      expect(onFileDialogCancelSpy).toHaveBeenCalled();
      expect(onDropSpy).not.toHaveBeenCalled();
    });

    test("window focus evt is not bound if showOpenFilePicker() is supported and {useFsAccessApi} is true", async () => {
      jest.useFakeTimers();

      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onFileDialogCancelSpy = jest.fn();

      const thenable = createThenable();
      const showOpenFilePickerMock = jest
        .fn()
        .mockReturnValue(thenable.promise);

      window.showOpenFilePicker = showOpenFilePickerMock;

      const { container } = render(
        <Dropzone onFileDialogCancel={onFileDialogCancelSpy} useFsAccessApi>
          {({ getRootProps, isFileDialogActive }) => (
            <div {...getRootProps()}>{isFileDialogActive && active}</div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);

      await act(() =>
        thenable.cancel(new DOMException("user aborted request", "AbortError"))
      );

      // Try to focus window and run timers
      focusWindow();
      drainPendingTimers();

      expect(activeRef.current).toBeNull();
      expect(dropzone).not.toContainElement(activeRef.current);
      expect(onFileDialogCancelSpy).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it("should try to use showOpenFilePicker() and fallback to input in case of a security error", async () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");

      const thenable = createThenable();
      const showOpenFilePickerMock = jest
        .fn()
        .mockReturnValue(thenable.promise);

      window.showOpenFilePicker = showOpenFilePickerMock;

      const onDropSpy = jest.fn();
      const onFileDialogOpenSpy = jest.fn();

      const { container } = render(
        <Dropzone
          onDrop={onDropSpy}
          onFileDialogOpen={onFileDialogOpenSpy}
          accept={{
            "application/pdf": [],
          }}
          multiple
          useFsAccessApi
        >
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);
      expect(onFileDialogOpenSpy).toHaveBeenCalled();

      await act(() =>
        thenable.cancel(
          new DOMException("Cannot use this API cross-origin", "SecurityError")
        )
      );

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);
      expect(onClickSpy).toHaveBeenCalled();
    });

    test("window focus evt is bound if showOpenFilePicker() is supported but errors due to a security error", async () => {
      jest.useFakeTimers();

      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onFileDialogCancelSpy = jest.fn();

      const thenable = createThenable();
      const showOpenFilePickerMock = jest
        .fn()
        .mockReturnValue(thenable.promise);

      window.showOpenFilePicker = showOpenFilePickerMock;

      const { container } = render(
        <Dropzone onFileDialogCancel={onFileDialogCancelSpy} useFsAccessApi>
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);

      await act(() =>
        thenable.cancel(
          new DOMException("Cannot use this API cross-origin", "SecurityError")
        )
      );

      focusWindow();
      drainPendingTimers();

      expect(onFileDialogCancelSpy).toHaveBeenCalled();
      expect(dropzone).not.toContainElement(activeRef.current);

      jest.useRealTimers();
    });

    test("showOpenFilePicker() should call {onError} when an unexpected error occurs", async () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;

      const thenable = createThenable();
      const showOpenFilePickerMock = jest
        .fn()
        .mockReturnValue(thenable.promise);

      window.showOpenFilePicker = showOpenFilePickerMock;

      const onErrorSpy = jest.fn();
      const onDropSpy = jest.fn();
      const onFileDialogOpenSpy = jest.fn();

      const ui = (
        <Dropzone
          onError={onErrorSpy}
          onDrop={onDropSpy}
          onFileDialogOpen={onFileDialogOpenSpy}
          accept={{
            "application/pdf": [],
          }}
          multiple
          useFsAccessApi
        >
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const { container } = render(ui);

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);
      expect(onFileDialogOpenSpy).toHaveBeenCalled();

      const err = new Error("oops :(");
      await act(() => thenable.cancel(err));
      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);
      expect(onErrorSpy).toHaveBeenCalledWith(err);
    });

    test("showOpenFilePicker() should call {onError} when a security error occurs and no <input> was provided", async () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;

      const thenable = createThenable();
      const showOpenFilePickerMock = jest
        .fn()
        .mockReturnValue(thenable.promise);

      window.showOpenFilePicker = showOpenFilePickerMock;

      const onErrorSpy = jest.fn();
      const onDropSpy = jest.fn();
      const onFileDialogOpenSpy = jest.fn();

      const ui = (
        <Dropzone
          onError={onErrorSpy}
          onDrop={onDropSpy}
          onFileDialogOpen={onFileDialogOpenSpy}
          accept={{
            "application/pdf": [],
          }}
          multiple
          useFsAccessApi
        >
          {({ getRootProps, isFileDialogActive }) => (
            <div {...getRootProps()}>{isFileDialogActive && active}</div>
          )}
        </Dropzone>
      );

      const { container } = render(ui);

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);
      expect(onFileDialogOpenSpy).toHaveBeenCalled();

      const err = new DOMException("oops :(", "SecurityError");
      await act(() => thenable.cancel(err));
      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);
      expect(onErrorSpy).toHaveBeenCalled();
    });
  });

  describe("onKeyDown", () => {
    it("triggers the click event on the input if the SPACE/ENTER keys are pressed", () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.keyDown(dropzone, {
        keyCode: 32, // Space
      });

      fireEvent.keyDown(dropzone, {
        keyCode: 13, // Enter
      });

      fireEvent.keyDown(dropzone, {
        key: " ", // Space
      });

      fireEvent.keyDown(dropzone, {
        key: "Enter",
      });

      const ref = activeRef.current;
      expect(ref).not.toBeNull();
      expect(dropzone).toContainElement(ref);
      expect(onClickSpy).toHaveBeenCalledTimes(4);
    });

    it("does not trigger the click event on the input if the dropzone is not in focus", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const input = container.querySelector("input");

      fireEvent.keyDown(input, {
        keyCode: 32, // Space
      });

      fireEvent.keyDown(input, {
        key: " ", // Space
      });

      expect(onClickSpy).not.toHaveBeenCalled();
    });

    it("does not trigger the click event on the input if event propagation was stopped", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps({
                onKeyDown: (event) => event.stopPropagation(),
              })}
            >
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.keyDown(dropzone, {
        keyCode: 32, // Space
      });
      fireEvent.keyDown(dropzone, {
        key: " ", // Space
      });
      expect(onClickSpy).not.toHaveBeenCalled();
    });

    it("does not trigger the click event on the input if {noKeyboard} is true", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone noKeyboard>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.keyDown(dropzone, {
        keyCode: 32, // Space
      });
      fireEvent.keyDown(dropzone, {
        key: " ", // Space
      });
      expect(onClickSpy).not.toHaveBeenCalled();
    });

    it("restores the keydown behavior when {noKeyboard} is set back to false", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container, rerender } = render(
        <Dropzone noKeyboard>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.keyDown(dropzone, {
        keyCode: 32, // Space
      });
      fireEvent.keyDown(dropzone, {
        key: " ", // Space
      });
      expect(onClickSpy).not.toHaveBeenCalled();

      rerender(
        <Dropzone noKeyboard={false}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.keyDown(dropzone, {
        keyCode: 32, // Space
      });
      fireEvent.keyDown(dropzone, {
        key: " ", // Space
      });
      expect(onClickSpy).toHaveBeenCalledTimes(2);
    });

    it("does not trigger the click event on the input for other keys", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.keyDown(dropzone, {
        keyCode: 97, // Numpad1
      });
      fireEvent.keyDown(dropzone, {
        key: "1",
      });
      expect(onClickSpy).not.toHaveBeenCalled();
    });
  });

  describe("onDrag*", () => {
    it("invokes callbacks for the appropriate events", async () => {
      const data = createDtWithFiles(files);

      const props = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const { container } = render(
        <Dropzone {...props}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, data));
      expect(props.onDragEnter).toHaveBeenCalled();

      fireEvent.dragOver(dropzone, data);
      expect(props.onDragOver).toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, data);
      expect(props.onDragLeave).toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, data));
      expect(props.onDrop).toHaveBeenCalled();
    });

    it("invokes callbacks for the appropriate events even if it cannot access the data", async () => {
      const emptyData = createDtWithFiles([]);

      const props = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
        onDropAccepted: jest.fn(),
        onDropRejected: jest.fn(),
      };

      const { container } = render(
        <Dropzone {...props}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, emptyData));
      expect(props.onDragEnter).toHaveBeenCalled();

      fireEvent.dragOver(dropzone, emptyData);
      expect(props.onDragOver).toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, emptyData);
      expect(props.onDragLeave).toHaveBeenCalled();

      const data = createDtWithFiles(files);
      await act(() => fireEvent.drop(dropzone, data));
      expect(props.onDrop).toHaveBeenCalled();
      expect(props.onDropAccepted).toHaveBeenCalledWith(
        files,
        expect.any(Object)
      );
      expect(props.onDropRejected).not.toHaveBeenCalled();
    });

    it("does not invoke callbacks if no files are detected", async () => {
      const data = {
        dataTransfer: {
          items: [],
          types: ["text/html", "text/plain"],
        },
      };

      const props = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
        onDropAccepted: jest.fn(),
        onDropRejected: jest.fn(),
      };

      const { container } = render(
        <Dropzone {...props}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, data));
      expect(props.onDragEnter).not.toHaveBeenCalled();

      fireEvent.dragOver(dropzone, data);
      expect(props.onDragOver).not.toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, data);
      expect(props.onDragLeave).not.toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, data));
      expect(props.onDrop).not.toHaveBeenCalled();
      expect(props.onDropAccepted).not.toHaveBeenCalled();
      expect(props.onDropRejected).not.toHaveBeenCalled();
    });

    it("does not invoke callbacks if {noDrag} is true", async () => {
      const data = createDtWithFiles(files);

      const props = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
        onDropAccepted: jest.fn(),
        onDropRejected: jest.fn(),
      };

      const { container } = render(
        <Dropzone {...props} noDrag>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, data));
      expect(props.onDragEnter).not.toHaveBeenCalled();

      fireEvent.dragOver(dropzone, data);
      expect(props.onDragOver).not.toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, data);
      expect(props.onDragLeave).not.toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, data));
      expect(props.onDrop).not.toHaveBeenCalled();
      expect(props.onDropAccepted).not.toHaveBeenCalled();
      expect(props.onDropRejected).not.toHaveBeenCalled();
    });

    it("restores drag behavior if {noDrag} is set back to false", async () => {
      const data = createDtWithFiles(files);

      const props = {
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      };

      const { container, rerender } = render(
        <Dropzone {...props} noDrag>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, data));
      expect(props.onDragEnter).not.toHaveBeenCalled();

      fireEvent.dragOver(dropzone, data);
      expect(props.onDragOver).not.toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, data);
      expect(props.onDragLeave).not.toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, data));
      expect(props.onDrop).not.toHaveBeenCalled();

      rerender(
        <Dropzone {...props} noDrag={false}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      await act(() => fireEvent.dragEnter(dropzone, data));
      expect(props.onDragEnter).toHaveBeenCalled();

      fireEvent.dragOver(dropzone, data);
      expect(props.onDragOver).toHaveBeenCalled();

      fireEvent.dragLeave(dropzone, data);
      expect(props.onDragLeave).toHaveBeenCalled();

      await act(() => fireEvent.drop(dropzone, data));
      expect(props.onDrop).toHaveBeenCalled();
    });

    it("sets {isDragActive} and {isDragAccept} if some files are accepted on dragenter", async () => {
      const { container } = render(
        <Dropzone>
          {({
            getRootProps,
            getInputProps,
            isDragActive,
            isDragAccept,
            isDragReject,
          }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive && "dragActive"}
              {isDragAccept && "dragAccept"}
              {isDragReject && "dragReject"}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, createDtWithFiles(files)));

      expect(dropzone).toHaveTextContent("dragActive");
      expect(dropzone).toHaveTextContent("dragAccept");
      expect(dropzone).not.toHaveTextContent("dragReject");
    });

    it("sets {isDragActive} and {isDragReject} of some files are not accepted on dragenter", async () => {
      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
        >
          {({
            getRootProps,
            getInputProps,
            isDragActive,
            isDragAccept,
            isDragReject,
          }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive && "dragActive"}
              {isDragAccept && "dragAccept"}
              {isDragReject && "dragReject"}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() =>
        fireEvent.dragEnter(dropzone, createDtWithFiles([...files, ...images]))
      );

      expect(dropzone).toHaveTextContent("dragActive");
      expect(dropzone).not.toHaveTextContent("dragAccept");
      expect(dropzone).toHaveTextContent("dragReject");
    });

    it("sets {isDragReject} if some files are too large", async () => {
      const { container } = render(
        <Dropzone maxSize={0}>
          {({ getRootProps, getInputProps, isDragAccept, isDragReject }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragAccept && "dragAccept"}
              {isDragReject && "dragReject"}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, createDtWithFiles(files)));

      expect(dropzone).not.toHaveTextContent("dragAccept");
      expect(dropzone).toHaveTextContent("dragReject");
    });

    it("sets {isDragActive, isDragAccept, isDragReject} if any files are rejected and {multiple} is false on dragenter", async () => {
      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          multiple={false}
        >
          {({
            getRootProps,
            getInputProps,
            isDragActive,
            isDragAccept,
            isDragReject,
          }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive && "dragActive"}
              {isDragAccept && "dragAccept"}
              {isDragReject && "dragReject"}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, createDtWithFiles(images)));

      expect(dropzone).toHaveTextContent("dragActive");
      expect(dropzone).not.toHaveTextContent("dragAccept");
      expect(dropzone).toHaveTextContent("dragReject");
    });

    it("keeps {isDragActive} if dragleave is triggered for some arbitrary node", async () => {
      const { container: overlayContainer } = render(<div />);

      const { container } = render(
        <Dropzone>
          {({
            getRootProps,
            getInputProps,
            isDragActive,
            isDragAccept,
            isDragReject,
          }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive && "dragActive"}
              {isDragAccept && "dragAccept"}
              {isDragReject && "dragReject"}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, createDtWithFiles(files)));

      fireEvent.dragLeave(dropzone, {
        bubbles: true,
        target: overlayContainer.querySelector("div"),
      });

      expect(dropzone).toHaveTextContent("dragActive");
    });

    it("resets {isDragActive, isDragAccept, isDragReject} on dragleave", async () => {
      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
        >
          {({
            getRootProps,
            getInputProps,
            isDragActive,
            isDragAccept,
            isDragReject,
          }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive && "dragActive"}
              {isDragAccept && "dragAccept"}
              {isDragReject && "dragReject"}
              {!isDragActive && (
                <span
                  id="child"
                  data-accept={isDragAccept}
                  data-reject={isDragReject}
                />
              )}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      const data = createDtWithFiles(images);

      await act(() =>
        fireEvent.dragEnter(container.querySelector("#child"), data)
      );
      await act(() => fireEvent.dragEnter(dropzone, data));

      await act(() => fireEvent.dragEnter(dropzone, data));

      expect(dropzone).toHaveTextContent("dragActive");
      expect(dropzone).toHaveTextContent("dragAccept");
      expect(dropzone).not.toHaveTextContent("dragReject");

      fireEvent.dragLeave(dropzone, data);
      expect(dropzone).toHaveTextContent("dragActive");
      expect(dropzone).toHaveTextContent("dragAccept");
      expect(dropzone).not.toHaveTextContent("dragReject");

      fireEvent.dragLeave(dropzone, data);
      expect(dropzone).not.toHaveTextContent("dragActive");
      expect(dropzone).not.toHaveTextContent("dragAccept");
      expect(dropzone).not.toHaveTextContent("dragReject");

      const child = container.querySelector("#child");
      expect(child).toHaveAttribute("data-accept", "false");
      expect(child).toHaveAttribute("data-reject", "false");
    });
  });

  describe("onDrop", () => {
    test("callback is invoked when <input> change event occurs", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone onDrop={onDropSpy}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      await act(async () =>
        fireEvent.change(container.querySelector("input"), {
          target: { files },
        })
      );

      expect(onDropSpy).toHaveBeenCalledWith(files, [], expect.anything());
    });

    it("sets {acceptedFiles, fileRejections, isDragReject}", async () => {
      const FileList = ({ files = [] }) => (
        <ul>
          {files.map((file) => (
            <li key={file.name} data-type={"accepted"}>
              {file.name}
            </li>
          ))}
        </ul>
      );

      const RejectedFileList = ({ fileRejections = [] }) => (
        <ul>
          {fileRejections.map(({ file, errors }) => (
            <li key={file.name}>
              <span data-type={"rejected"}>{file.name}</span>
              <ul>
                {errors.map((e) => (
                  <li key={e.code} data-type={"error"}>
                    {e.code}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      );

      const getAcceptedFiles = (node) =>
        node.querySelectorAll(`[data-type="accepted"]`);
      const getRejectedFiles = (node) =>
        node.querySelectorAll(`[data-type="rejected"]`);
      const getRejectedFilesErrors = (node) =>
        node.querySelectorAll(`[data-type="error"]`);

      const matchToFiles = (fileList, files) =>
        Array.from(fileList).every(
          (item) => !!files.find((file) => file.name === item.textContent)
        );
      const matchToErrorCode = (errorList, code) =>
        Array.from(errorList).every((item) => item.textContent === code);

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
        >
          {({
            getRootProps,
            getInputProps,
            acceptedFiles,
            fileRejections,
            isDragReject,
          }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <FileList files={acceptedFiles} />
              <RejectedFileList fileRejections={fileRejections} />
              {isDragReject && "dragReject"}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(images)));

      const acceptedFileList = getAcceptedFiles(dropzone);
      expect(acceptedFileList).toHaveLength(images.length);
      expect(matchToFiles(acceptedFileList, images)).toBe(true);
      expect(dropzone).not.toHaveTextContent("dragReject");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(files)));

      const rejectedFileList = getRejectedFiles(dropzone);
      expect(rejectedFileList).toHaveLength(files.length);
      expect(matchToFiles(rejectedFileList, files)).toBe(true);
      const rejectedFileErrorList = getRejectedFilesErrors(dropzone);
      expect(rejectedFileErrorList).toHaveLength(files.length);
      expect(matchToErrorCode(rejectedFileErrorList, "file-invalid-type")).toBe(
        true
      );
      expect(dropzone).toHaveTextContent("dragReject");
    });

    it("resets {isDragActive, isDragAccept, isDragReject}", async () => {
      const { container } = render(
        <Dropzone>
          {({
            getRootProps,
            getInputProps,
            isDragActive,
            isDragAccept,
            isDragReject,
          }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive && "dragActive"}
              {isDragAccept && "dragAccept"}
              {isDragReject && "dragReject"}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      const data = createDtWithFiles(files);

      await act(() => fireEvent.dragEnter(dropzone, data));

      expect(dropzone).toHaveTextContent("dragActive");
      expect(dropzone).toHaveTextContent("dragAccept");
      expect(dropzone).not.toHaveTextContent("dragReject");

      await act(() => fireEvent.drop(dropzone, data));

      expect(dropzone).not.toHaveTextContent("dragActive");
      expect(dropzone).not.toHaveTextContent("dragAccept");
      expect(dropzone).not.toHaveTextContent("dragReject");
    });

    it("rejects all files if {multiple} is false and {accept} criteria is not met", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDrop={onDropSpy}
          multiple={false}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(files)));

      expect(onDropSpy).toHaveBeenCalledWith(
        [],
        [
          {
            file: files[0],
            errors: [
              {
                code: "file-invalid-type",
                message: "File type must be image/*",
              },
            ],
          },
        ],
        expect.anything()
      );
    });

    it("rejects all files if {multiple} is false and {accept} criteria is met", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDrop={onDropSpy}
          multiple={false}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(images)));

      expect(onDropSpy).toHaveBeenCalledWith(
        [],
        [
          {
            file: images[0],
            errors: [
              {
                code: "too-many-files",
                message: "Too many files",
              },
            ],
          },
          {
            file: images[1],
            errors: [
              {
                code: "too-many-files",
                message: "Too many files",
              },
            ],
          },
        ],
        expect.anything()
      );
    });

    it("rejects all files if {multiple} is true and maxFiles is less than files and {accept} criteria is met", async () => {
      const onDropSpy = jest.fn();
      const onDropRejectedSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDrop={onDropSpy}
          onDropRejected={onDropRejectedSpy}
          multiple={true}
          maxFiles={1}
        >
          {({ getRootProps, getInputProps, isDragReject, isDragAccept }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragReject && "dragReject"}
              {isDragAccept && "dragAccept"}
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(images)));

      expect(onDropRejectedSpy).toHaveBeenCalled();

      await act(() => fireEvent.dragEnter(dropzone, createDtWithFiles(images)));

      expect(dropzone).toHaveTextContent("dragReject");
      expect(dropzone).not.toHaveTextContent("dragAccept");
      expect(onDropSpy).toHaveBeenCalledWith(
        [],
        [
          {
            file: images[0],
            errors: [
              {
                code: "too-many-files",
                message: "Too many files",
              },
            ],
          },
          {
            file: images[1],
            errors: [
              {
                code: "too-many-files",
                message: "Too many files",
              },
            ],
          },
        ],
        expect.anything()
      );
    });

    it("rejects all files if {multiple} is true and maxFiles has been updated so that it is less than files", async () => {
      const onDropSpy = jest.fn();
      const onDropRejectedSpy = jest.fn();
      const ui = (maxFiles) => (
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDrop={onDropSpy}
          multiple={true}
          maxFiles={maxFiles}
          onDropRejected={onDropRejectedSpy}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const { container, rerender } = render(ui(3));
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(images)));
      rerender(ui(3));

      expect(onDropRejectedSpy).not.toHaveBeenCalled();
      expect(onDropSpy).toHaveBeenCalledWith(images, [], expect.anything());

      rerender(ui(1));

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(images)));
      rerender(ui(1));

      expect(onDropRejectedSpy).toHaveBeenCalledWith(
        expect.arrayContaining(
          images.map((image) =>
            expect.objectContaining({ errors: expect.any(Array), file: image })
          )
        ),
        expect.anything()
      );
    });

    it("accepts multiple files if {multiple} is true and {accept} criteria is met", async () => {
      const onDropSpy = jest.fn();
      const onDropRejectedSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDrop={onDropSpy}
          multiple={true}
          maxFiles={3}
          onDropRejected={onDropRejectedSpy}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      await act(() =>
        fireEvent.drop(
          container.querySelector("div"),
          createDtWithFiles(images)
        )
      );

      expect(onDropRejectedSpy).not.toHaveBeenCalled();
      expect(onDropSpy).toHaveBeenCalledWith(images, [], expect.anything());
    });

    it("accepts a single files if {multiple} is false and {accept} criteria is met", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDrop={onDropSpy}
          multiple={false}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const [image] = images;
      await act(() =>
        fireEvent.drop(
          container.querySelector("div"),
          createDtWithFiles([image])
        )
      );

      expect(onDropSpy).toHaveBeenCalledWith([image], [], expect.anything());
    });

    it("accepts all files if {multiple} is true", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone onDrop={onDropSpy}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      await act(() =>
        fireEvent.drop(container.querySelector("div"), createDtWithFiles(files))
      );

      expect(onDropSpy).toHaveBeenCalledWith(files, [], expect.anything());
    });

    it("resets {isFileDialogActive} state", async () => {
      const onDropSpy = jest.fn();
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;

      const { container } = render(
        <Dropzone onDrop={onDropSpy}>
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(files)));

      expect(activeRef.current).toBeNull();
      expect(dropzone).not.toContainElement(activeRef.current);
    });

    it("gets invoked with both accepted/rejected files", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDrop={onDropSpy}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(files)));

      expect(onDropSpy).toHaveBeenCalledWith(
        [],
        [
          {
            file: files[0],
            errors: [
              {
                code: "file-invalid-type",
                message: "File type must be image/*",
              },
            ],
          },
        ],
        expect.anything()
      );
      onDropSpy.mockClear();

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(images)));

      expect(onDropSpy).toHaveBeenCalledWith(images, [], expect.anything());
      onDropSpy.mockClear();

      await act(() =>
        fireEvent.drop(dropzone, createDtWithFiles([...files, ...images]))
      );

      expect(onDropSpy).toHaveBeenCalledWith(
        images,
        [
          {
            file: files[0],
            errors: [
              {
                code: "file-invalid-type",
                message: "File type must be image/*",
              },
            ],
          },
        ],
        expect.anything()
      );
    });

    test("onDropAccepted callback is invoked if some files are accepted", async () => {
      const onDropAcceptedSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDropAccepted={onDropAcceptedSpy}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(files)));
      expect(onDropAcceptedSpy).not.toHaveBeenCalled();
      onDropAcceptedSpy.mockClear();

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(images)));

      expect(onDropAcceptedSpy).toHaveBeenCalledWith(images, expect.anything());
      onDropAcceptedSpy.mockClear();

      await act(() =>
        fireEvent.drop(dropzone, createDtWithFiles([...files, ...images]))
      );

      expect(onDropAcceptedSpy).toHaveBeenCalledWith(images, expect.anything());
    });

    test("onDropRejected callback is invoked if some files are rejected", async () => {
      const onDropRejectedSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDropRejected={onDropRejectedSpy}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(files)));

      expect(onDropRejectedSpy).toHaveBeenCalledWith(
        [
          {
            file: files[0],
            errors: [
              {
                code: "file-invalid-type",
                message: "File type must be image/*",
              },
            ],
          },
        ],
        expect.anything()
      );
      onDropRejectedSpy.mockClear();

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(images)));

      expect(onDropRejectedSpy).not.toHaveBeenCalled();
      onDropRejectedSpy.mockClear();

      await act(() =>
        fireEvent.drop(dropzone, createDtWithFiles([...files, ...images]))
      );

      expect(onDropRejectedSpy).toHaveBeenCalledWith(
        [
          {
            file: files[0],
            errors: [
              {
                code: "file-invalid-type",
                message: "File type must be image/*",
              },
            ],
          },
        ],
        expect.anything()
      );
    });

    it("accepts a dropped image when Firefox provides a bogus file type", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone
          accept={{
            "image/*": [],
          }}
          onDrop={onDropSpy}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      const images = [createFile("bogus.gif", 1234, "application/x-moz-file")];
      await act(() =>
        fireEvent.drop(
          container.querySelector("div"),
          createDtWithFiles(images)
        )
      );

      expect(onDropSpy).toHaveBeenCalledWith(images, [], expect.anything());
    });

    it("filters files according to {maxSize}", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone onDrop={onDropSpy} maxSize={1111}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      await act(() =>
        fireEvent.drop(
          container.querySelector("div"),
          createDtWithFiles(images)
        )
      );

      expect(onDropSpy).toHaveBeenCalledWith(
        [],
        [
          {
            file: images[0],
            errors: [
              {
                code: "file-too-large",
                message: "File is larger than 1111 bytes",
              },
            ],
          },
          {
            file: images[1],
            errors: [
              {
                code: "file-too-large",
                message: "File is larger than 1111 bytes",
              },
            ],
          },
        ],
        expect.anything()
      );
    });

    it("filters files according to {minSize}", async () => {
      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone onDrop={onDropSpy} minSize={1112}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.drop(dropzone, createDtWithFiles(files)));

      expect(onDropSpy).toHaveBeenCalledWith(
        [],
        [
          {
            file: files[0],
            errors: [
              {
                code: "file-too-small",
                message: "File is smaller than 1112 bytes",
              },
            ],
          },
        ],
        expect.anything()
      );
    });
  });

  describe("onFileDialogCancel", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("is not invoked every time window receives focus", () => {
      const onFileDialogCancelSpy = jest.fn();

      render(
        <Dropzone onFileDialogCancel={onFileDialogCancelSpy}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      focusWindow();
      drainPendingTimers();

      expect(onFileDialogCancelSpy).not.toHaveBeenCalled();
    });

    it("resets {isFileDialogActive}", () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const onFileDialogCancelSpy = jest.fn();

      const { container } = render(
        <Dropzone onFileDialogCancel={onFileDialogCancelSpy}>
          {({ getRootProps, getInputProps, isFileDialogActive }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
            </div>
          )}
        </Dropzone>
      );

      const dropzone = container.querySelector("div");

      fireEvent.click(dropzone);

      expect(activeRef.current).not.toBeNull();
      expect(dropzone).toContainElement(activeRef.current);

      focusWindow();
      drainPendingTimers();

      expect(onFileDialogCancelSpy).toHaveBeenCalled();
      expect(dropzone).not.toContainElement(activeRef.current);
    });

    it("is not invoked if <input> is not rendered", () => {
      const onFileDialogCancelSpy = jest.fn();
      const { container, rerender } = render(
        <Dropzone onFileDialogCancel={onFileDialogCancelSpy}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("div"));

      // Remove the input, then on window focus nothing should happen because we check if the input ref is set
      rerender(
        <Dropzone onFileDialogCancel={onFileDialogCancelSpy}>
          {({ getRootProps }) => <div {...getRootProps()} />}
        </Dropzone>
      );

      focusWindow();
      drainPendingTimers();

      expect(onFileDialogCancelSpy).not.toHaveBeenCalled();
    });

    it("is not invoked if files were selected", async () => {
      const onFileDialogCancelSpy = jest.fn();

      const { container } = render(
        <Dropzone onFileDialogCancel={onFileDialogCancelSpy}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      await act(async () =>
        fireEvent.change(container.querySelector("input"), {
          target: { files },
        })
      );
      fireEvent.click(container.querySelector("div"));

      focusWindow();
      drainPendingTimers();

      expect(onFileDialogCancelSpy).not.toHaveBeenCalled();
    });

    it("does not throw if callback is not provided", () => {
      const { container } = render(
        <Dropzone onFileDialogCancel={null}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("div"));

      const fn = () => {
        focusWindow();
        drainPendingTimers();
      };
      expect(fn).not.toThrow();
    });
  });

  describe("onFileDialogOpen", () => {
    it("is invoked when opening the file dialog", () => {
      const onFileDialogOpenSpy = jest.fn();
      const { container } = render(
        <Dropzone onFileDialogOpen={onFileDialogOpenSpy}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("div"));

      expect(onFileDialogOpenSpy).toHaveBeenCalled();
    });

    it("is invoked when opening the file dialog programmatically", () => {
      const onFileDialogOpenSpy = jest.fn();
      const { container } = render(
        <Dropzone onFileDialogOpen={onFileDialogOpenSpy}>
          {({ getRootProps, getInputProps, open }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button type="button" onClick={open}>
                Open
              </button>
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("button"));

      expect(onFileDialogOpenSpy).toHaveBeenCalled();
    });
  });

  describe("{open}", () => {
    it("can open file dialog programmatically", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, open }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button type="button" onClick={open}>
                Open
              </button>
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("button"));

      expect(onClickSpy).toHaveBeenCalled();
    });

    it("sets {isFileDialogActive} state", () => {
      const activeRef = createRef();
      const active = <span ref={activeRef}>I am active</span>;
      const { container } = render(
        <Dropzone>
          {({ getRootProps, getInputProps, isFileDialogActive, open }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isFileDialogActive && active}
              <button type="button" onClick={open}>
                Open
              </button>
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("button"));

      expect(activeRef.current).not.toBeNull();
      expect(container.querySelector("div")).toContainElement(
        activeRef.current
      );
    });

    it("does nothing if {disabled} is true", () => {
      const onClickSpy = jest.spyOn(HTMLInputElement.prototype, "click");
      const { container } = render(
        <Dropzone disabled>
          {({ getRootProps, getInputProps, open }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button type="button" onClick={open}>
                Open
              </button>
            </div>
          )}
        </Dropzone>
      );

      fireEvent.click(container.querySelector("button"));

      expect(onClickSpy).not.toHaveBeenCalled();
    });

    it("does not throw if <input> is missing", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps, open }) => (
            <div {...getRootProps()}>
              <button type="button" onClick={open}>
                Open
              </button>
            </div>
          )}
        </Dropzone>
      );

      const fn = () => fireEvent.click(container.querySelector("button"));
      expect(fn).not.toThrow();
    });
  });

  describe("validator", () => {
    it("rejects with custom error", async () => {
      const validator = (file) => {
        if (/dogs/i.test(file.name))
          return { code: "dogs-not-allowed", message: "Dogs not allowed" };

        return null;
      };

      const onDropSpy = jest.fn();

      const { container } = render(
        <Dropzone validator={validator} onDrop={onDropSpy} multiple={true}>
          {({ getRootProps }) => <div {...getRootProps()} />}
        </Dropzone>
      );

      await act(() =>
        fireEvent.drop(
          container.querySelector("div"),
          createDtWithFiles(images)
        )
      );

      expect(onDropSpy).toHaveBeenCalledWith(
        [images[0]],
        [
          {
            file: images[1],
            errors: [
              {
                code: "dogs-not-allowed",
                message: "Dogs not allowed",
              },
            ],
          },
        ],
        expect.anything()
      );
    });

    it("sets {isDragAccept, isDragReject}", async () => {
      const data = createDtWithFiles(images);
      const validator = () => ({
        code: "not-allowed",
        message: "Cannot do this!",
      });

      const ui = (
        <Dropzone validator={validator} multiple={true}>
          {({ getRootProps, getInputProps, isDragAccept, isDragReject }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragAccept && "dragAccept"}
              {isDragReject && "dragReject"}
            </div>
          )}
        </Dropzone>
      );

      const { container } = render(ui);
      const dropzone = container.querySelector("div");

      await act(() => fireEvent.dragEnter(dropzone, data));

      expect(dropzone).not.toHaveTextContent("dragAccept");
      expect(dropzone).toHaveTextContent("dragReject");
    });
  });

  describe("accessibility", () => {
    it("sets the role attribute to button by default on the root", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps }) => <div id="root" {...getRootProps()} />}
        </Dropzone>
      );

      expect(container.querySelector("#root")).toHaveAttribute(
        "role",
        "presentation"
      );
    });

    test("users can override the default role attribute on the root", () => {
      const { container } = render(
        <Dropzone>
          {({ getRootProps }) => (
            <div id="root" {...getRootProps({ role: "generic" })} />
          )}
        </Dropzone>
      );

      expect(container.querySelector("#root")).toHaveAttribute(
        "role",
        "generic"
      );
    });
  });
});

/**
 * drainPendingTimers just runs pending timers wrapped in act() to avoid
 * getting warnings from react about side effects that happen async.
 *
 * This can be used whenever a setTimeout(), setInterval() or async operation is used
 * which triggers a state update.
 */
function drainPendingTimers() {
  return act(() => jest.runOnlyPendingTimers());
}

/**
 * focusWindow triggers focus on the window
 */
function focusWindow() {
  return fireEvent.focus(document.body, { bubbles: true });
}

/**
 * createDtWithFiles creates a mock data transfer object that can be used for drop events
 * @param {File[]} files
 */
function createDtWithFiles(files = []) {
  return {
    dataTransfer: {
      files,
      items: files.map((file) => ({
        kind: "file",
        size: file.size,
        type: file.type,
        getAsFile: () => file,
      })),
      types: ["Files"],
    },
  };
}

/**
 * createFileSystemFileHandle creates a mock [FileSystemFileHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle)
 * @param {File} file
 */
function createFileSystemFileHandle(file) {
  return { getFile: () => Promise.resolve(file) };
}

/**
 * createFile creates a mock File object
 * @param {string} name
 * @param {number} size
 * @param {string} type
 */
function createFile(name, size, type) {
  const file = new File([], name, { type });
  Object.defineProperty(file, "size", {
    get() {
      return size;
    },
  });
  return file;
}

/**
 * createThenable creates a Promise that can be controlled from outside its inner scope
 */
function createThenable() {
  let done, cancel;

  const promise = new Promise((resolve, reject) => {
    done = resolve;
    cancel = reject;
  });

  return {
    promise,
    done,
    cancel,
  };
}
