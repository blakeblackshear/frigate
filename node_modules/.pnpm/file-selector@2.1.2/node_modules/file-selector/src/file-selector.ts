import {FileWithPath, toFileWithPath} from './file';


const FILES_TO_IGNORE = [
    // Thumbnail cache files for macOS and Windows
    '.DS_Store', // macOs
    'Thumbs.db'  // Windows
];


/**
 * Convert a DragEvent's DataTrasfer object to a list of File objects
 * NOTE: If some of the items are folders,
 * everything will be flattened and placed in the same list but the paths will be kept as a {path} property.
 *
 * EXPERIMENTAL: A list of https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle objects can also be passed as an arg
 * and a list of File objects will be returned.
 *
 * @param evt
 */
export async function fromEvent(evt: Event | any): Promise<(FileWithPath | DataTransferItem)[]> {
    if (isObject<DragEvent>(evt) && isDataTransfer(evt.dataTransfer)) {
        return getDataTransferFiles(evt.dataTransfer, evt.type);
    } else if (isChangeEvt(evt)) {
        return getInputFiles(evt);
    } else if (Array.isArray(evt) && evt.every(item => 'getFile' in item && typeof item.getFile === 'function')) {
        return getFsHandleFiles(evt)
    }
    return [];
}

function isDataTransfer(value: any): value is DataTransfer {
    return isObject(value);
}

function isChangeEvt(value: any): value is Event {
    return isObject<Event>(value) && isObject(value.target);
}

function isObject<T>(v: any): v is T {
    return typeof v === 'object' && v !== null
}

function getInputFiles(evt: Event) {
    return fromList<FileWithPath>((evt.target as HTMLInputElement).files).map(file => toFileWithPath(file));
}

// Ee expect each handle to be https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle
async function getFsHandleFiles(handles: any[]) {
    const files = await Promise.all(handles.map(h => h.getFile()));
    return files.map(file => toFileWithPath(file));
}


async function getDataTransferFiles(dt: DataTransfer, type: string) {
    // IE11 does not support dataTransfer.items
    // See https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/items#Browser_compatibility
    if (dt.items) {
        const items = fromList<DataTransferItem>(dt.items)
            .filter(item => item.kind === 'file');
        // According to https://html.spec.whatwg.org/multipage/dnd.html#dndevents,
        // only 'dragstart' and 'drop' has access to the data (source node)
        if (type !== 'drop') {
            return items;
        }
        const files = await Promise.all(items.map(toFilePromises));
        return noIgnoredFiles(flatten<FileWithPath>(files));
    }

    return noIgnoredFiles(fromList<FileWithPath>(dt.files)
        .map(file => toFileWithPath(file)));
}

function noIgnoredFiles(files: FileWithPath[]) {
    return files.filter(file => FILES_TO_IGNORE.indexOf(file.name) === -1);
}

// IE11 does not support Array.from()
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#Browser_compatibility
// https://developer.mozilla.org/en-US/docs/Web/API/FileList
// https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItemList
function fromList<T>(items: DataTransferItemList | FileList | null): T[] {
    if (items === null) {
        return [];
    }

    const files = [];

    // tslint:disable: prefer-for-of
    for (let i = 0; i < items.length; i++) {
        const file = items[i];
        files.push(file);
    }

    return files as any;
}

// https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem
function toFilePromises(item: DataTransferItem) {
    if (typeof item.webkitGetAsEntry !== 'function') {
        return fromDataTransferItem(item);
    }

    const entry = item.webkitGetAsEntry();

    // Safari supports dropping an image node from a different window and can be retrieved using
    // the DataTransferItem.getAsFile() API
    // NOTE: FileSystemEntry.file() throws if trying to get the file
    if (entry && entry.isDirectory) {
        return fromDirEntry(entry) as any;
    }

    return fromDataTransferItem(item, entry);
}

function flatten<T>(items: any[]): T[] {
    return items.reduce((acc, files) => [
        ...acc,
        ...(Array.isArray(files) ? flatten(files) : [files])
    ], []);
}

async function fromDataTransferItem(item: DataTransferItem, entry?: FileSystemEntry | null) {
    // Check if we're in a secure context; due to a bug in Chrome (as far as we know)
    // the browser crashes when calling this API (yet to be confirmed as a consistent behaviour).
    //
    // See:
    // - https://issues.chromium.org/issues/40186242
    // - https://github.com/react-dropzone/react-dropzone/issues/1397
    if (globalThis.isSecureContext && typeof (item as any).getAsFileSystemHandle === 'function') {
        const h = await (item as any).getAsFileSystemHandle();
        if (h === null) {
            throw new Error(`${item} is not a File`);
        }
        // It seems that the handle can be `undefined` (see https://github.com/react-dropzone/file-selector/issues/120),
        // so we check if it isn't; if it is, the code path continues to the next API (`getAsFile`).
        if (h !== undefined) {
            const file = await h.getFile();
            file.handle = h;
            return toFileWithPath(file);
        }
    }
    const file = item.getAsFile();
    if (!file) {
        throw new Error(`${item} is not a File`);
    }
    const fwp = toFileWithPath(file, entry?.fullPath ?? undefined);
    return fwp;
}

// https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry
async function fromEntry(entry: any) {
    return entry.isDirectory ? fromDirEntry(entry) : fromFileEntry(entry);
}

// https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry
function fromDirEntry(entry: any) {
    const reader = entry.createReader();

    return new Promise<FileArray[]>((resolve, reject) => {
        const entries: Promise<FileValue[]>[] = [];

        function readEntries() {
            // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/createReader
            // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryReader/readEntries
            reader.readEntries(async (batch: any[]) => {
                if (!batch.length) {
                    // Done reading directory
                    try {
                        const files = await Promise.all(entries);
                        resolve(files);
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    const items = Promise.all(batch.map(fromEntry));
                    entries.push(items);

                    // Continue reading
                    readEntries();
                }
            }, (err: any) => {
                reject(err);
            });
        }

        readEntries();
    });
}

// https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileEntry
async function fromFileEntry(entry: any) {
    return new Promise<FileWithPath>((resolve, reject) => {
        entry.file((file: FileWithPath) => {
            const fwp = toFileWithPath(file, entry.fullPath);
            resolve(fwp);
        }, (err: any) => {
            reject(err);
        });
    });
}

// Infinite type recursion
// https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
interface FileArray extends Array<FileValue> {}
type FileValue = FileWithPath
    | FileArray[];
