// src/index.ts
import {
  fromCodeActionTriggerType,
  fromFormattingOptions,
  fromPosition,
  fromRange,
  toCodeAction,
  toCompletionList,
  toDocumentSymbol,
  toFoldingRange,
  toHover,
  toLink,
  toLocationLink,
  toMarkerData,
  toRange,
  toSelectionRanges,
  toTextEdit
} from "monaco-languageserver-types";
import { registerMarkerDataProvider } from "monaco-marker-data-provider";
import { createWorkerManager } from "monaco-worker-manager";
function configureMonacoYaml(monaco, options) {
  const createData = {
    completion: true,
    customTags: [],
    enableSchemaRequest: false,
    format: true,
    isKubernetes: false,
    hover: true,
    schemas: [],
    validate: true,
    yamlVersion: "1.2",
    ...options
  };
  monaco.languages.register({
    id: "yaml",
    extensions: [".yaml", ".yml"],
    aliases: ["YAML", "yaml", "YML", "yml"],
    mimetypes: ["application/x-yaml"]
  });
  const workerManager = createWorkerManager(monaco, {
    label: "yaml",
    moduleId: "monaco-yaml/yaml.worker",
    createData
  });
  const diagnosticMap = /* @__PURE__ */ new WeakMap();
  const markerDataProvider = registerMarkerDataProvider(monaco, "yaml", {
    owner: "yaml",
    async provideMarkerData(model) {
      const worker = await workerManager.getWorker(model.uri);
      const diagnostics = await worker.doValidation(String(model.uri));
      diagnosticMap.set(model, diagnostics);
      return diagnostics == null ? void 0 : diagnostics.map(toMarkerData);
    },
    async doReset(model) {
      const worker = await workerManager.getWorker(model.uri);
      await worker.resetSchema(String(model.uri));
    }
  });
  const disposables = [
    workerManager,
    markerDataProvider,
    monaco.languages.registerCompletionItemProvider("yaml", {
      triggerCharacters: [" ", ":"],
      async provideCompletionItems(model, position) {
        const wordInfo = model.getWordUntilPosition(position);
        const worker = await workerManager.getWorker(model.uri);
        const info = await worker.doComplete(String(model.uri), fromPosition(position));
        if (info) {
          return toCompletionList(info, {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: wordInfo.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: wordInfo.endColumn
            }
          });
        }
      }
    }),
    monaco.languages.registerHoverProvider("yaml", {
      async provideHover(model, position) {
        const worker = await workerManager.getWorker(model.uri);
        const info = await worker.doHover(String(model.uri), fromPosition(position));
        if (info) {
          return toHover(info);
        }
      }
    }),
    monaco.languages.registerDefinitionProvider("yaml", {
      async provideDefinition(model, position) {
        const worker = await workerManager.getWorker(model.uri);
        const locationLinks = await worker.doDefinition(String(model.uri), fromPosition(position));
        return locationLinks == null ? void 0 : locationLinks.map(toLocationLink);
      }
    }),
    monaco.languages.registerDocumentSymbolProvider("yaml", {
      displayName: "yaml",
      async provideDocumentSymbols(model) {
        const worker = await workerManager.getWorker(model.uri);
        const items = await worker.findDocumentSymbols(String(model.uri));
        return items == null ? void 0 : items.map(toDocumentSymbol);
      }
    }),
    monaco.languages.registerDocumentFormattingEditProvider("yaml", {
      displayName: "yaml",
      async provideDocumentFormattingEdits(model) {
        const worker = await workerManager.getWorker(model.uri);
        const edits = await worker.format(String(model.uri));
        return edits == null ? void 0 : edits.map(toTextEdit);
      }
    }),
    monaco.languages.registerLinkProvider("yaml", {
      async provideLinks(model) {
        const worker = await workerManager.getWorker(model.uri);
        const links = await worker.findLinks(String(model.uri));
        if (links) {
          return {
            links: links.map(toLink)
          };
        }
      }
    }),
    monaco.languages.registerCodeActionProvider("yaml", {
      async provideCodeActions(model, range, context) {
        var _a;
        const worker = await workerManager.getWorker(model.uri);
        const codeActions = await worker.getCodeAction(String(model.uri), fromRange(range), {
          diagnostics: ((_a = diagnosticMap.get(model)) == null ? void 0 : _a.filter((diagnostic) => range.intersectRanges(toRange(diagnostic.range)))) || [],
          only: context.only ? [context.only] : void 0,
          triggerKind: fromCodeActionTriggerType(context.trigger)
        });
        if (codeActions) {
          return {
            actions: codeActions.map(toCodeAction),
            dispose() {
            }
          };
        }
      }
    }),
    monaco.languages.registerFoldingRangeProvider("yaml", {
      async provideFoldingRanges(model) {
        const worker = await workerManager.getWorker(model.uri);
        const foldingRanges = await worker.getFoldingRanges(String(model.uri));
        return foldingRanges == null ? void 0 : foldingRanges.map(toFoldingRange);
      }
    }),
    monaco.languages.setLanguageConfiguration("yaml", {
      comments: {
        lineComment: "#"
      },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"]
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    }),
    monaco.languages.registerOnTypeFormattingEditProvider("yaml", {
      autoFormatTriggerCharacters: ["\n"],
      async provideOnTypeFormattingEdits(model, position, ch, formattingOptions) {
        const worker = await workerManager.getWorker(model.uri);
        const edits = await worker.doDocumentOnTypeFormatting(
          String(model.uri),
          fromPosition(position),
          ch,
          fromFormattingOptions(formattingOptions)
        );
        return edits == null ? void 0 : edits.map(toTextEdit);
      }
    }),
    monaco.languages.registerSelectionRangeProvider("yaml", {
      async provideSelectionRanges(model, positions) {
        const worker = await workerManager.getWorker(model.uri);
        const selectionRanges = await worker.getSelectionRanges(
          String(model.uri),
          positions.map(fromPosition)
        );
        return selectionRanges == null ? void 0 : selectionRanges.map(toSelectionRanges);
      }
    })
  ];
  return {
    dispose() {
      for (const disposable of disposables) {
        disposable.dispose();
      }
    },
    async update(newOptions) {
      workerManager.updateCreateData(Object.assign(createData, newOptions));
      await markerDataProvider.revalidate();
    }
  };
}
export {
  configureMonacoYaml
};
//# sourceMappingURL=index.js.map
