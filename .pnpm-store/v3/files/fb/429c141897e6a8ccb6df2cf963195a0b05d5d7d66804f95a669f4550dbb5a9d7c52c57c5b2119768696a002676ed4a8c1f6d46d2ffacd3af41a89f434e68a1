import React, { Component } from "react";
import Dropzone from "../../";

export class TestReactDragEvt extends Component {
  getFiles = async (event: React.DragEvent<HTMLDivElement>) => {
    const files = Array.from(event.dataTransfer.files);
    return files;
  };

  render() {
    return (
      <div>
        <Dropzone getFilesFromEvent={this.getFiles}>
          {({ getRootProps }) => <div {...getRootProps()} />}
        </Dropzone>
      </div>
    );
  }
}

export class TestDataTransferItems extends Component {
  getFiles = async (event: React.DragEvent<HTMLDivElement>) => {
    const items = Array.from(event.dataTransfer.items);
    return items;
  };

  render() {
    return (
      <div>
        <Dropzone getFilesFromEvent={this.getFiles}>
          {({ getRootProps }) => <div {...getRootProps()} />}
        </Dropzone>
      </div>
    );
  }
}

export class TestNativeDragEventEvt extends Component {
  getFiles = async (event: DragEvent) => {
    const files = Array.from(event.dataTransfer.files);
    return files;
  };

  render() {
    return (
      <div>
        <Dropzone getFilesFromEvent={this.getFiles}>
          {({ getRootProps }) => <div {...getRootProps()} />}
        </Dropzone>
      </div>
    );
  }
}

export class TestChangeEvt extends Component {
  getFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files);
    return files;
  };

  render() {
    return (
      <div>
        <Dropzone getFilesFromEvent={this.getFiles}>
          {({ getRootProps }) => <div {...getRootProps()} />}
        </Dropzone>
      </div>
    );
  }
}

export class TestNativeEvt extends Component {
  getFiles = async (event: Event) => {
    const files = Array.from((event.target as HTMLInputElement).files);
    return files;
  };

  render() {
    return (
      <div>
        <Dropzone getFilesFromEvent={this.getFiles}>
          {({ getRootProps }) => <div {...getRootProps()} />}
        </Dropzone>
      </div>
    );
  }
}
