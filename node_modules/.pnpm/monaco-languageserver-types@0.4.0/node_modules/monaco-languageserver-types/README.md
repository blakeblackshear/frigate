# monaco-languageserver-types

[![github actions](https://github.com/remcohaszing/monaco-languageserver-types/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/monaco-languageserver-types/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/monaco-languageserver-types)](https://www.npmjs.com/package/monaco-languageserver-types)
[![npm downloads](https://img.shields.io/npm/dm/monaco-languageserver-types)](https://www.npmjs.com/package/monaco-languageserver-types)
[![codecov](https://codecov.io/gh/remcohaszing/monaco-languageserver-types/branch/main/graph/badge.svg)](https://codecov.io/gh/remcohaszing/monaco-languageserver-types)

Convert between language server types and [Monaco editor](https://microsoft.github.io/monaco-editor)
types.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [`fromCodeAction(codeAction)`](#fromcodeactioncodeaction)
  - [`fromCodeActionContext(codeActionContext)`](#fromcodeactioncontextcodeactioncontext)
  - [`fromCodeActionTriggerType(type)`](#fromcodeactiontriggertypetype)
  - [`fromCodeLens(codeLens)`](#fromcodelenscodelens)
  - [`fromColor(color)`](#fromcolorcolor)
  - [`fromColorInformation(colorInformation)`](#fromcolorinformationcolorinformation)
  - [`fromColorPresentation(colorPresentation)`](#fromcolorpresentationcolorpresentation)
  - [`fromCommand(command)`](#fromcommandcommand)
  - [`fromCompletionContext(completionContext)`](#fromcompletioncontextcompletioncontext)
  - [`fromCompletionItem(completionItem)`](#fromcompletionitemcompletionitem)
  - [`fromCompletionItemKind(kind)`](#fromcompletionitemkindkind)
  - [`fromCompletionItemTag(tag)`](#fromcompletionitemtagtag)
  - [`fromCompletionList(completionList)`](#fromcompletionlistcompletionlist)
  - [`fromCompletionTriggerKind(kind)`](#fromcompletiontriggerkindkind)
  - [`fromDefinition(definition)`](#fromdefinitiondefinition)
  - [`fromDocumentHighlight(documentHighlight)`](#fromdocumenthighlightdocumenthighlight)
  - [`fromDocumentHighlightKind(kind)`](#fromdocumenthighlightkindkind)
  - [`fromDocumentSymbol(documentSymbol)`](#fromdocumentsymboldocumentsymbol)
  - [`fromFoldingRange(foldingRange)`](#fromfoldingrangefoldingrange)
  - [`fromFormattingOptions(formattingOptions)`](#fromformattingoptionsformattingoptions)
  - [`fromHover(hover)`](#fromhoverhover)
  - [`fromInlayHint(inlayHint)`](#frominlayhintinlayhint)
  - [`fromInlayHintKind(inlayHintKind)`](#frominlayhintkindinlayhintkind)
  - [`fromInlayHintLabelPart(inlayHintLabelPart)`](#frominlayhintlabelpartinlayhintlabelpart)
  - [`fromLink(link)`](#fromlinklink)
  - [`fromLinkedEditingRanges(linkedEditingRanges)`](#fromlinkededitingrangeslinkededitingranges)
  - [`fromLocation(location)`](#fromlocationlocation)
  - [`fromLocationLink(locationLink)`](#fromlocationlinklocationlink)
  - [`fromMarkdownString(markdownString)`](#frommarkdownstringmarkdownstring)
  - [`fromMarkerData(markerData)`](#frommarkerdatamarkerdata)
  - [`fromMarkerSeverity(severity)`](#frommarkerseverityseverity)
  - [`fromMarkerTag(tag)`](#frommarkertagtag)
  - [`fromParameterInformation(parameterInformation)`](#fromparameterinformationparameterinformation)
  - [`fromPosition(position)`](#frompositionposition)
  - [`fromRange(range)`](#fromrangerange)
  - [`fromRelatedInformation(relatedInformation)`](#fromrelatedinformationrelatedinformation)
  - [`fromSelectionRange(selectionRange)`](#fromselectionrangeselectionrange)
  - [`fromSemanticTokens(semanticTokens)`](#fromsemantictokenssemantictokens)
  - [`fromSemanticTokensEdit(semanticTokensEdit)`](#fromsemantictokenseditsemantictokensedit)
  - [`fromSemanticTokensEdits(semanticTokensEdits)`](#fromsemantictokenseditssemantictokensedits)
  - [`fromSignatureHelp(signatureHelp)`](#fromsignaturehelpsignaturehelp)
  - [`fromSignatureHelpContext(signatureHelpContext)`](#fromsignaturehelpcontextsignaturehelpcontext)
  - [`fromSignatureHelpTriggerKind(signatureHelpTriggerKind)`](#fromsignaturehelptriggerkindsignaturehelptriggerkind)
  - [`fromSignatureInformation(signatureInformation)`](#fromsignatureinformationsignatureinformation)
  - [`fromSingleEditOperation(singleEditOperation)`](#fromsingleeditoperationsingleeditoperation)
  - [`fromSymbolKind(symbolKind)`](#fromsymbolkindsymbolkind)
  - [`fromSymbolTag(symbolTag)`](#fromsymboltagsymboltag)
  - [`fromTextEdit(textEdit)`](#fromtextedittextedit)
  - [`fromWorkspaceEdit(workspaceEdit)`](#fromworkspaceeditworkspaceedit)
  - [`fromWorkspaceFileEdit(workspaceFileEdit)`](#fromworkspacefileeditworkspacefileedit)
  - [`fromWorkspaceFileEditOptions(options)`](#fromworkspacefileeditoptionsoptions)
  - [`toCodeAction(codeAction)`](#tocodeactioncodeaction)
  - [`toCodeActionContext(codeActionContext)`](#tocodeactioncontextcodeactioncontext)
  - [`toCodeActionTriggerType(kind)`](#tocodeactiontriggertypekind)
  - [`toCodeLens(codeLens)`](#tocodelenscodelens)
  - [`toColor(color)`](#tocolorcolor)
  - [`toColorInformation(colorInformation)`](#tocolorinformationcolorinformation)
  - [`toColorPresentation(colorPresentation)`](#tocolorpresentationcolorpresentation)
  - [`toCommand(command)`](#tocommandcommand)
  - [`toCompletionContext(completionContext)`](#tocompletioncontextcompletioncontext)
  - [`toCompletionItem(completionItem, options)`](#tocompletionitemcompletionitem-options)
  - [`toCompletionItemKind(kind)`](#tocompletionitemkindkind)
  - [`toCompletionItemTag(tag)`](#tocompletionitemtagtag)
  - [`toCompletionList(completionList, options)`](#tocompletionlistcompletionlist-options)
  - [`toCompletionTriggerKind(kind)`](#tocompletiontriggerkindkind)
  - [`toDefinition(definition)`](#todefinitiondefinition)
  - [`toDocumentHighlight(documentHighlight)`](#todocumenthighlightdocumenthighlight)
  - [`toDocumentHighlightKind(kind)`](#todocumenthighlightkindkind)
  - [`toDocumentSymbol(documentSymbol)`](#todocumentsymboldocumentsymbol)
  - [`toFoldingRange(foldingRange)`](#tofoldingrangefoldingrange)
  - [`toFormattingOptions(formattingOptions)`](#toformattingoptionsformattingoptions)
  - [`toHover(hover)`](#tohoverhover)
  - [`toInlayHint(inlayHint)`](#toinlayhintinlayhint)
  - [`toInlayHintKind(inlayHintKind)`](#toinlayhintkindinlayhintkind)
  - [`toInlayHintLabelPart(inlayHintLabelPart)`](#toinlayhintlabelpartinlayhintlabelpart)
  - [`toLink(documentLink)`](#tolinkdocumentlink)
  - [`toLinkedEditingRanges(linkedEditingRanges)`](#tolinkededitingrangeslinkededitingranges)
  - [`toLocation(location)`](#tolocationlocation)
  - [`toLocationLink(locationLink)`](#tolocationlinklocationlink)
  - [`toMarkdownString(markupContent)`](#tomarkdownstringmarkupcontent)
  - [`toMarkerData(diagnostic)`](#tomarkerdatadiagnostic)
  - [`toMarkerSeverity(severity)`](#tomarkerseverityseverity)
  - [`toMarkerTag(tag)`](#tomarkertagtag)
  - [`toParameterInformation(parameterInformation)`](#toparameterinformationparameterinformation)
  - [`toPosition(position)`](#topositionposition)
  - [`toRange(range)`](#torangerange)
  - [`toRelatedInformation(relatedInformation)`](#torelatedinformationrelatedinformation)
  - [`toSelectionRange(selectionRange)`](#toselectionrangeselectionrange)
  - [`toSemanticTokens(semanticTokens)`](#tosemantictokenssemantictokens)
  - [`toSemanticTokensEdit(semanticTokensEdit)`](#tosemantictokenseditsemantictokensedit)
  - [`toSemanticTokensEdits(semanticTokensDelta)`](#tosemantictokenseditssemantictokensdelta)
  - [`toSignatureHelp(signatureHelp)`](#tosignaturehelpsignaturehelp)
  - [`toSignatureHelpContext(signatureHelpContext)`](#tosignaturehelpcontextsignaturehelpcontext)
  - [`toSignatureHelpTriggerKind(signatureHelpTriggerKind)`](#tosignaturehelptriggerkindsignaturehelptriggerkind)
  - [`toSignatureInformation(signatureInformation)`](#tosignatureinformationsignatureinformation)
  - [`toSingleEditOperation(textEdit)`](#tosingleeditoperationtextedit)
  - [`toSymbolKind(symbolKind)`](#tosymbolkindsymbolkind)
  - [`toSymbolTag(symbolTag)`](#tosymboltagsymboltag)
  - [`toTextEdit(textEdit)`](#totextedittextedit)
  - [`toWorkspaceEdit(workspaceEdit)`](#toworkspaceeditworkspaceedit)
  - [`toWorkspaceFileEdit(workspaceFileEdit)`](#toworkspacefileeditworkspacefileedit)
  - [`toWorkspaceFileEditOptions(options)`](#toworkspacefileeditoptionsoptions)
- [License](#license)

## Installation

```sh
npm install monaco-languageserver-types
```

## Usage

This package exports function to convert language server types to Monaco editor types and vise
versa. It does so without importing `monaco-editor` or `vscode-languageserver-protocol`.

For each Monaco editor / language server type, there are two functions:

- `from*` converts a value from a Monaco editor type to a language server type.
- `to*` converts a value from a language server type to a Monaco editor type.

For example:

```typescript
import type * as monaco from 'monaco-editor'
import { fromRange, toRange } from 'monaco-languageserver-types'

const monacoRange: monaco.IRange = {
  startLineNumber: 1,
  startColumn: 2,
  endLineNumber: 3,
  endColumn: 4
}

const lsRange = fromRange(monacoRange)
// { start: { line: 0, column: 1 }, end: { line: 2, column: 3 } }

console.log(toRange(lsRange))
// { startLineNumber: 1, startColumn: 2, endLineNumber: 3, endColumn: 4 }
```

## API

### `fromCodeAction(codeAction)`

Convert a Monaco editor code action to an LSP code action.

#### Parameters

- `codeAction` (`monaco.languages.CodeAction`) — the Monaco code action to convert

#### Returns

The code action as an LSP code action (`lsp.CodeAction`).

### `fromCodeActionContext(codeActionContext)`

Convert a Monaco editor code action context to an LSP code action context.

#### Parameters

- `codeActionContext` (`monaco.languages.CodeActionContext`) — the Monaco code action context to
  convert

#### Returns

The code action context as an LSP code action context (`lsp.CodeActionContext`).

### `fromCodeActionTriggerType(type)`

Convert a Monaco editor code action trigger type to an LSP completion item kind.

#### Parameters

- `type` (`monaco.languages.CodeActionTriggerType`) — the Monaco code action trigger type to convert

#### Returns

The code action trigger type as an LSP completion item kind (`lsp.CodeActionTriggerKind`).

### `fromCodeLens(codeLens)`

Convert a Monaco editor code lens to an LSP code lens.

#### Parameters

- `codeLens` (`monaco.languages.CodeLens`) — the Monaco code lens to convert

#### Returns

The code lens as an LSP code lens (`lsp.CodeLens`).

### `fromColor(color)`

Convert a Monaco editor color to an LSP color.

#### Parameters

- `color` (`monaco.languages.IColor`) — the Monaco color to convert

#### Returns

The color as an LSP color (`lsp.Color`).

### `fromColorInformation(colorInformation)`

Convert a Monaco editor color information to an LSP color information.

#### Parameters

- `colorInformation` (`monaco.languages.IColorInformation`) — the Monaco color information to
  convert

#### Returns

The color information as an LSP color information (`lsp.ColorInformation`).

### `fromColorPresentation(colorPresentation)`

Convert a Monaco editor color presentation to an LSP color presentation.

#### Parameters

- `colorPresentation` (`monaco.languages.IColorPresentation`) — the Monaco color presentation to
  convert

#### Returns

The color presentation as an LSP color presentation (`lsp.ColorPresentation`).

### `fromCommand(command)`

Convert a Monaco editor command to an LSP command.

#### Parameters

- `command` (`monaco.languages.Command`) — the Monaco command to convert

#### Returns

The command as an LSP command (`lsp.Command`).

### `fromCompletionContext(completionContext)`

Convert a Monaco editor completion context to an LSP completion context.

#### Parameters

- `completionContext` (`monaco.languages.CompletionContext`) — the Monaco completion context to
  convert

#### Returns

The completion context as an LSP completion context (`lsp.CompletionContext`).

### `fromCompletionItem(completionItem)`

Convert a Monaco editor completion item to an LSP completion item.

#### Parameters

- `completionItem` (`monaco.languages.CompletionItem`) — the Monaco completion item to convert

#### Returns

The completion item as an LSP completion item (`lsp.CompletionItem`).

### `fromCompletionItemKind(kind)`

Convert a Monaco editor completion item kind to an LSP completion item kind.

#### Parameters

- `kind` (`monaco.languages.CompletionItemKind`) — the Monaco completion item kind to convert

#### Returns

The completion item kind as an LSP completion item kind (`lsp.CompletionItemKind | undefined`).

### `fromCompletionItemTag(tag)`

Convert a Monaco editor completion item tag to an LSP completion item tag.

#### Parameters

- `tag` (`monaco.languages.CompletionItemTag`) — the Monaco completion item tag to convert

#### Returns

The completion item tag as an LSP completion item tag (`lsp.CompletionItemTag`).

### `fromCompletionList(completionList)`

Convert a Monaco editor completion list to an LSP completion list.

#### Parameters

- `completionList` (`monaco.languages.CompletionList`) — the Monaco completion list to convert

#### Returns

The completion list as an LSP completion list (`lsp.CompletionList`).

### `fromCompletionTriggerKind(kind)`

Convert a Monaco editor completion trigger kind to an LSP completion trigger kind.

#### Parameters

- `kind` (`monaco.languages.CompletionTriggerKind`) — the Monaco completion trigger kind to convert

#### Returns

The completion trigger kind as an LSP completion trigger kind (`lsp.CompletionTriggerKind`).

### `fromDefinition(definition)`

Convert a Monaco editor definition to an LSP definition.

#### Parameters

- `definition` (`monaco.languages.Definition`) — the Monaco definition to convert

#### Returns

The definition as an LSP definition (`lsp.Definition`).

### `fromDocumentHighlight(documentHighlight)`

Convert a Monaco editor document highlight to an LSP document highlight.

#### Parameters

- `documentHighlight` (`monaco.languages.DocumentHighlight`) — the Monaco document highlight to
  convert

#### Returns

The document highlight as an LSP document highlight (`lsp.DocumentHighlight`).

### `fromDocumentHighlightKind(kind)`

Convert a Monaco editor document highlight kind to an LSP document highlight kind.

#### Parameters

- `kind` (`monaco.languages.DocumentHighlightKind`) — the Monaco document highlight kind to convert

#### Returns

The document highlight kind as an LSP document highlight kind (`lsp.DocumentHighlightKind`).

### `fromDocumentSymbol(documentSymbol)`

Convert a Monaco editor document symbol to an LSP document symbol.

#### Parameters

- `documentSymbol` (`monaco.languages.DocumentSymbol`) — the Monaco document symbol to convert

#### Returns

The document symbol as an LSP document symbol (`lsp.DocumentSymbol`).

### `fromFoldingRange(foldingRange)`

Convert a Monaco editor folding range to an LSP folding range.

#### Parameters

- `foldingRange` (`monaco.languages.FoldingRange`) — the Monaco folding range to convert

#### Returns

The folding range as an LSP folding range (`lsp.FoldingRange`).

### `fromFormattingOptions(formattingOptions)`

Convert a Monaco editor formatting options to an LSP formatting options.

#### Parameters

- `formattingOptions` (`monaco.languages.FormattingOptions`) — the Monaco formatting options to
  convert

#### Returns

The formatting options as an LSP formatting options (`lsp.FormattingOptions`).

### `fromHover(hover)`

Convert a Monaco editor hover to an LSP hover.

#### Parameters

- `hover` (`monaco.languages.Hover`) — the Monaco hover to convert

#### Returns

The hover as an LSP hover (`lsp.Hover`).

### `fromInlayHint(inlayHint)`

Convert a Monaco editor inlay hint to an LSP inlay hint.

#### Parameters

- `inlayHint` (`monaco.languages.InlayHint`) — the Monaco inlay hint to convert

#### Returns

The inlay hint as an LSP inlay hint (`lsp.InlayHint`).

### `fromInlayHintKind(inlayHintKind)`

Convert a Monaco editor inlay hint kind to an LSP inlay hint kind.

#### Parameters

- `inlayHintKind` (`monaco.languages.InlayHintKind`) — the Monaco inlay hint kind to convert

#### Returns

The inlay hint kind as an LSP inlay hint kind (`lsp.InlayHintKind`).

### `fromInlayHintLabelPart(inlayHintLabelPart)`

Convert a Monaco editor inlay hint label part to an LSP inlay hint label part.

#### Parameters

- `inlayHintLabelPart` (`monaco.languages.InlayHintLabelPart`) — the Monaco inlay hint label part to
  convert

#### Returns

The inlay hint label part as an LSP inlay hint label part (`lsp.InlayHintPart`).

### `fromLink(link)`

Convert a Monaco editor link to an LSP document link.

#### Parameters

- `link` (`monaco.languages.ILink`) — the Monaco link to convert

#### Returns

The link as an LSP document link (`lsp.DocumentLink`).

### `fromLinkedEditingRanges(linkedEditingRanges)`

Convert Monaco editor linked editing ranges to LSP linked editing ranges.

#### Parameters

- `linkedEditingRanges` (`monaco.languages.LinkedEditingRanges`) — the Monaco linked editing ranges
  to convert

#### Returns

The linked editing ranges as LSP linked editing ranges (`lsp.LinkedEditingRanges`).

### `fromLocation(location)`

Convert a Monaco editor location to an LSP location.

#### Parameters

- `location` (`monaco.languages.Location`) — the Monaco location to convert

#### Returns

The location as an LSP location (`lsp.Location`).

### `fromLocationLink(locationLink)`

Convert a Monaco editor location link to an LSP location link.

#### Parameters

- `locationLink` (`monaco.languages.LocationLink`) — the Monaco location link to convert

#### Returns

The location link as an LSP location link (`lsp.LocationLink`).

### `fromMarkdownString(markdownString)`

Convert a Monaco editor markdown string to an LSP markup content.

#### Parameters

- `markdownString` (`monaco.IMarkdownString`) — the Monaco markdown string to convert

#### Returns

The markdown string as an LSP markup content (`lsp.MarkupContent`).

### `fromMarkerData(markerData)`

Convert a Monaco editor marker data to an LSP diagnostic.

#### Parameters

- `markerData` (`monaco.editor.IMarkerData`) — the Monaco marker data to convert

#### Returns

The marker data as an LSP diagnostic (`lsp.Diagnostic`).

### `fromMarkerSeverity(severity)`

Convert a Monaco editor marker severity to an LSP diagnostic severity.

#### Parameters

- `severity` (`monaco.MarkerSeverity`) — the Monaco marker severity to convert

#### Returns

The marker severity as an LSP diagnostic severity (`lsp.DiagnosticSeverity`).

### `fromMarkerTag(tag)`

Convert a Monaco editor marker tag to an LSP diagnostic tag.

#### Parameters

- `tag` (`monaco.MarkerTag`) — the Monaco marker tag to convert

#### Returns

The marker tag as an LSP diagnostic tag (`lsp.DiagnosticTag`).

### `fromParameterInformation(parameterInformation)`

Convert a Monaco editor parameter information to an LSP parameter information.

#### Parameters

- `parameterInformation` (`monaco.languages.ParameterInformation`) — the Monaco parameter
  information to convert

#### Returns

The parameter information as an LSP parameter information (`lsp.ParameterInformation`).

### `fromPosition(position)`

Convert a Monaco editor position to an LSP range.

#### Parameters

- `position` (`monaco.IPosition`) — the Monaco position to convert

#### Returns

The position as an LSP position (`lsp.Position`).

### `fromRange(range)`

Convert a Monaco editor range to an LSP range.

#### Parameters

- `range` (`monaco.IRange`) — the Monaco range to convert

#### Returns

The range as an LSP range (`lsp.Range`).

### `fromRelatedInformation(relatedInformation)`

Convert a Monaco editor related information to an LSP diagnostic related information.

#### Parameters

- `relatedInformation` (`monaco.editor.IRelatedInformation`) — the Monaco related information to
  convert

#### Returns

The related information as an LSP diagnostic related information
(`lsp.DiagnosticRelatedInformation`).

### `fromSelectionRange(selectionRange)`

Convert a Monaco editor selection range to an LSP selection range.

#### Parameters

- `selectionRange` (`monaco.languages.SelectionRange`) — the Monaco selection range to convert

#### Returns

The selection range as an LSP selection range (`lsp.SelectionRange`).

### `fromSemanticTokens(semanticTokens)`

Convert Monaco editor semantic tokens to LSP semantic tokens.

#### Parameters

- `semanticTokens` (`monaco.languages.SemanticTokens`) — the Monaco semantic tokens to convert

#### Returns

The semantic tokens as LSP semantic tokens (`lsp.SemanticTokens`).

### `fromSemanticTokensEdit(semanticTokensEdit)`

Convert Monaco editor semantic tokens to LSP semantic tokens.

#### Parameters

- `semanticTokensEdit` (`monaco.languages.SemanticTokensEdit`) — the Monaco semantic tokens to
  convert

#### Returns

The semantic tokens as LSP semantic tokens (`lsp.SemanticTokensEdit`).

### `fromSemanticTokensEdits(semanticTokensEdits)`

Convert Monaco editsor semantic tokens edits to an LSP semantic tokens delta.

#### Parameters

- `semanticTokensEdits` (`monaco.languages.SemanticTokensEdits`) — the Monaco semantic tokens edits
  to convert

#### Returns

The semantic tokens edits as an LSP semantic tokens delta (`lsp.SemanticTokensDelta`).

### `fromSignatureHelp(signatureHelp)`

Convert a Monaco editor signature help to an LSP signature help.

#### Parameters

- `signatureHelp` (`monaco.languages.SignatureHelp`) — the Monaco signature help to convert

#### Returns

The signature help as an LSP signature help (`lsp.SignatureHelp`).

### `fromSignatureHelpContext(signatureHelpContext)`

Convert a Monaco editor signature help context to an LSP signature help context.

#### Parameters

- `signatureHelpContext` (`monaco.languages.SignatureHelpContext`) — the Monaco signature help
  context to convert

#### Returns

The signature help context as an LSP signature help context (`lsp.SignatureHelpContext`).

### `fromSignatureHelpTriggerKind(signatureHelpTriggerKind)`

Convert a Monaco editor signature help trigger kind to an LSP signature help trigger kind.

#### Parameters

- `signatureHelpTriggerKind` (`monaco.languages.SignatureHelpTriggerKind`) — the Monaco signature
  help trigger kind to convert

#### Returns

The signature help trigger kind as an LSP signature help trigger kind
(`lsp.SignatureHelpTriggerKind`).

### `fromSignatureInformation(signatureInformation)`

Convert a Monaco editor signature information to an LSP signature information.

#### Parameters

- `signatureInformation` (`monaco.languages.SignatureInformation`) — the Monaco signature
  information to convert

#### Returns

The signature information as an LSP signature information (`lsp.SignatureInformation`).

### `fromSingleEditOperation(singleEditOperation)`

Convert a Monaco editor single edit operation to an LSP text edit.

#### Parameters

- `singleEditOperation` (`monaco.editor.ISingleEditOperation`) — the Monaco single edit operation to
  convert

#### Returns

The single edit operation as an LSP text edit (`lsp.TextEdit`).

### `fromSymbolKind(symbolKind)`

Convert a Monaco editor symbol kind to an LSP symbol kind.

#### Parameters

- `symbolKind` (`monaco.languages.SymbolKind`) — the Monaco symbol kind to convert

#### Returns

The symbol kind as an LSP symbol kind (`lsp.SymbolKind`).

### `fromSymbolTag(symbolTag)`

Convert a Monaco editor symbol tag to an LSP symbol tag.

#### Parameters

- `symbolTag` (`monaco.languages.SymbolTag`) — the Monaco symbol tag to convert

#### Returns

The symbol tag as an LSP symbol tag (`lsp.SymbolTag`).

### `fromTextEdit(textEdit)`

Convert a Monaco editor text edit to an LSP text edit.

#### Parameters

- `textEdit` (`monaco.languages.TextEdit`) — the Monaco text edit to convert

#### Returns

The text edit as an LSP text edit (`lsp.TextEdit`).

### `fromWorkspaceEdit(workspaceEdit)`

Convert a Monaco editor workspace edit to an LSP workspace edit.

#### Parameters

- `workspaceEdit` (`monaco.languages.WorkspaceEdit`) — the Monaco workspace edit to convert

#### Returns

The workspace edit as an LSP workspace edit (`lsp.WorkspaceEdit`).

### `fromWorkspaceFileEdit(workspaceFileEdit)`

Convert Monaco editor workspace file edit options to LSP workspace file edit options.

#### Parameters

- `workspaceFileEdit` (`monaco.languages.IWorkspaceFileEdit`) — the Monaco workspace file edit
  options to convert

#### Returns

The range as LSP workspace file edit options (`lsp.CreateFile | lsp.DeleteFile | lsp.RenameFile`).

### `fromWorkspaceFileEditOptions(options)`

Convert Monaco editor workspace file edit options to LSP workspace file edit options.

#### Parameters

- `options` (`monaco.languages.WorkspaceFileEditOptions`) — the Monaco workspace file edit options
  to convert

#### Returns

The range as LSP workspace file edit options
(`lsp.CreateFileOptions & lsp.DeleteFileOptions & lsp.RenameFileOptions`).

### `toCodeAction(codeAction)`

Convert an LSP code action to a Monaco editor code action.

#### Parameters

- `codeAction` (`lsp.CodeAction`) — the LSP code action to convert

#### Returns

The code action as Monaco editor code action (`monaco.languages.CodeAction`).

### `toCodeActionContext(codeActionContext)`

Convert an LSP code action context to a Monaco editor code action context.

#### Parameters

- `codeActionContext` (`lsp.CodeActionContext`) — the LSP code action context to convert

#### Returns

The code action context as Monaco editor code action context (`monaco.languages.CodeActionContext`).

### `toCodeActionTriggerType(kind)`

Convert an LSP completion item kind to a Monaco editor code action trigger type.

#### Parameters

- `kind` (`lsp.CodeActionTriggerType`) — the LSP completion item kind to convert

#### Returns

The completion item kind as Monaco editor code action trigger type
(`monaco.languages.CodeActionTriggerType`).

### `toCodeLens(codeLens)`

Convert an LSP code lens to a Monaco editor code lens.

#### Parameters

- `codeLens` (`lsp.CodeLens`) — the LSP code lens to convert

#### Returns

The code lens as Monaco editor code lens (`monaco.languages.CodeLens`).

### `toColor(color)`

Convert an LSP color to a Monaco editor color.

#### Parameters

- `color` (`lsp.Color`) — the LSP color to convert

#### Returns

The color as Monaco editor color (`monaco.languages.IColor`).

### `toColorInformation(colorInformation)`

Convert an LSP color information to a Monaco editor color information.

#### Parameters

- `colorInformation` (`lsp.ColorInformation`) — the LSP color information to convert

#### Returns

The color information as Monaco editor color information (`monaco.languages.IColorInformation`).

### `toColorPresentation(colorPresentation)`

Convert an LSP color presentation to a Monaco editor color presentation.

#### Parameters

- `colorPresentation` (`lsp.ColorPresentation`) — the LSP color presentation to convert

#### Returns

The color presentation as Monaco editor color presentation (`monaco.languages.IColorPresentation`).

### `toCommand(command)`

Convert an LSP command to a Monaco editor command.

#### Parameters

- `command` (`lsp.Command`) — the LSP command to convert

#### Returns

The command as Monaco editor command (`monaco.languages.Command`).

### `toCompletionContext(completionContext)`

Convert an LSP completion context to a Monaco editor completion context.

#### Parameters

- `completionContext` (`lsp.CompletionContext`) — the LSP completion context to convert

#### Returns

The completion context as Monaco editor completion context (`monaco.languages.CompletionContext`).

### `toCompletionItem(completionItem, options)`

Convert an LSP completion item to a Monaco editor completion item.

#### Parameters

- `completionItem` (`lsp.CompletionItem`) — the LSP completion item to convert
- `options` (`ToCompletionItemOptions`) — additional options needed to construct the Monaco
  completion item

#### Returns

The completion item as Monaco editor completion item (`monaco.languages.CompletionItem`).

### `toCompletionItemKind(kind)`

Convert an LSP completion item kind to a Monaco editor completion item kind.

#### Parameters

- `kind` (`lsp.CompletionItemKind`) — the LSP completion item kind to convert

#### Returns

The completion item kind as Monaco editor completion item kind
(`monaco.languages.CompletionItemKind`).

### `toCompletionItemTag(tag)`

Convert an LSP completion item tag to a Monaco editor completion item tag.

#### Parameters

- `tag` (`lsp.CompletionItemTag`) — the LSP completion item tag to convert

#### Returns

The completion item tag as Monaco editor completion item tag (`monaco.languages.CompletionItemTag`).

### `toCompletionList(completionList, options)`

Convert an LSP completion list to a Monaco editor completion list.

#### Parameters

- `completionList` (`lsp.CompletionList`) — the LSP completion list to convert
- `options` (`ToCompletionListOptions`) — additional options needed to construct the Monaco
  completion list

#### Returns

The completion list as Monaco editor completion list (`monaco.languages.CompletionList`).

### `toCompletionTriggerKind(kind)`

Convert an LSP completion trigger kind to a Monaco editor completion trigger kind.

#### Parameters

- `kind` (`lsp.CompletionTriggerKind`) — the LSP completion trigger kind to convert

#### Returns

The completion trigger kind as Monaco editor completion trigger kind
(`monaco.languages.CompletionTriggerKind`).

### `toDefinition(definition)`

Convert an LSP definition to a Monaco editor definition.

#### Parameters

- `definition` (`lsp.Definition`) — the LSP definition to convert

#### Returns

The definition as Monaco editor definition (`monaco.languages.Definition`).

### `toDocumentHighlight(documentHighlight)`

Convert an LSP document highlight to a Monaco editor document highlight.

#### Parameters

- `documentHighlight` (`lsp.DocumentHighlight`) — the LSP document highlight to convert

#### Returns

The document highlight as Monaco editor document highlight (`monaco.languages.DocumentHighlight`).

### `toDocumentHighlightKind(kind)`

Convert an LSP document highlight kind to a Monaco editor document highlight kind.

#### Parameters

- `kind` (`lsp.DocumentHighlightKind`) — the LSP document highlight kind to convert

#### Returns

The document highlight kind as Monaco editor document highlight kind
(`monaco.languages.DocumentHighlightKind`).

### `toDocumentSymbol(documentSymbol)`

Convert an LSP document symbol to a Monaco editor document symbol.

#### Parameters

- `documentSymbol` (`lsp.DocumentSymbol`) — the LSP document symbol to convert

#### Returns

The document symbol as Monaco editor document symbol (`monaco.languages.DocumentSymbol`).

### `toFoldingRange(foldingRange)`

Convert an LSP folding range to a Monaco editor folding range.

#### Parameters

- `foldingRange` (`lsp.FoldingRange`) — the LSP folding range to convert

#### Returns

The folding range as Monaco editor folding range (`monaco.languages.FoldingRange`).

### `toFormattingOptions(formattingOptions)`

Convert an LSP formatting options to a Monaco editor formatting options.

#### Parameters

- `formattingOptions` (`lsp.FormattingOptions`) — the LSP formatting options to convert

#### Returns

The formatting options as Monaco editor formatting options (`monaco.languages.FormattingOptions`).

### `toHover(hover)`

Convert an LSP hover to a Monaco editor hover.

#### Parameters

- `hover` (`lsp.Hover`) — the LSP hover to convert

#### Returns

The hover as Monaco editor hover (`monaco.languages.Hover`).

### `toInlayHint(inlayHint)`

Convert an LSP inlay hint to a Monaco editor inlay hint.

#### Parameters

- `inlayHint` (`lsp.InlayHint`) — the LSP inlay hint to convert

#### Returns

The inlay hint as Monaco editor inlay hint (`monaco.languages.InlayHint`).

### `toInlayHintKind(inlayHintKind)`

Convert an LSP inlay hint kind to a Monaco editor inlay hint kind.

#### Parameters

- `inlayHintKind` (`lsp.InlayHintKind`) — the LSP inlay hint kind to convert

#### Returns

The inlay hint kind as Monaco editor inlay hint kind (`monaco.languages.InlayHintKind`).

### `toInlayHintLabelPart(inlayHintLabelPart)`

Convert an LSP inlay hint label part to a Monaco editor inlay hint label part.

#### Parameters

- `inlayHintLabelPart` (`lsp.InlayHintLabelPart`) — the LSP inlay hint label part to convert

#### Returns

The inlay hint label part as Monaco editor inlay hint label part
(`monaco.languages.InlayHintLabelPart`).

### `toLink(documentLink)`

Convert an LSP document link to a Monaco editor link.

#### Parameters

- `documentLink` (`lsp.DocumentLink`) — the LSP document link to convert

#### Returns

The document link as Monaco editor link (`monaco.languages.ILink`).

### `toLinkedEditingRanges(linkedEditingRanges)`

Convert LSP linked editing ranges to Monaco editor linked editing ranges.

#### Parameters

- `linkedEditingRanges` (`lsp.LinkedEditingRanges`) — the LSP linked editing ranges to convert

#### Returns

The linked editing ranges Monaco editor linked editing ranges
(`monaco.languages.LinkedEditingRanges`).

### `toLocation(location)`

Convert an LSP location to a Monaco editor location.

#### Parameters

- `location` (`lsp.Location`) — the LSP location to convert

#### Returns

The location as Monaco editor location (`monaco.languages.Location`).

### `toLocationLink(locationLink)`

Convert an LSP location link to a Monaco editor location link.

#### Parameters

- `locationLink` (`lsp.LocationLink`) — the LSP location link to convert

#### Returns

The location link as Monaco editor location link (`monaco.languages.LocationLink`).

### `toMarkdownString(markupContent)`

Convert an LSP markup content to a Monaco editor markdown string.

#### Parameters

- `markupContent` (`lsp.MarkupContent`) — the LSP markup content to convert

#### Returns

The markup content as a Monaco editor markdown string (`monaco.IMarkdownString`).

### `toMarkerData(diagnostic)`

Convert an LSP diagnostic to a Monaco editor marker data.

#### Parameters

- `diagnostic` (`lsp.Diagnostic`) — the LSP diagnostic to convert

#### Returns

The diagnostic as Monaco editor marker data (`monaco.editor.IMarkerData`).

### `toMarkerSeverity(severity)`

Convert an LSP diagnostic severity to a Monaco editor marker severity.

#### Parameters

- `severity` (`lsp.DiagnosticSeverity`) — the LSP diagnostic severity to convert

#### Returns

The diagnostic severity as Monaco editor marker severity (`monaco.MarkerSeverity`).

### `toMarkerTag(tag)`

Convert an LSP diagnostic tag to a Monaco editor marker tag.

#### Parameters

- `tag` (`lsp.DiagnosticTag`) — the LSP diagnostic tag to convert

#### Returns

The diagnostic tag as Monaco editor marker tag (`monaco.MarkerTag`).

### `toParameterInformation(parameterInformation)`

Convert an LSP parameter information to a Monaco editor parameter information.

#### Parameters

- `parameterInformation` (`lsp.ParameterInformation`) — the LSP parameter information to convert

#### Returns

The parameter information as Monaco editor parameter information
(`monaco.languages.ParameterInformation`).

### `toPosition(position)`

Convert an LSP position to a Monaco editor position.

#### Parameters

- `position` (`lsp.Position`) — the LSP position to convert

#### Returns

The position as Monaco editor position (`monaco.IPosition`).

### `toRange(range)`

Convert an LSP range to a Monaco editor range.

#### Parameters

- `range` (`lsp.Range`) — the LSP range to convert

#### Returns

The range as Monaco editor range (`monaco.IRange`).

### `toRelatedInformation(relatedInformation)`

Convert an LSP diagnostic related information to a Monaco editor related information.

#### Parameters

- `relatedInformation` (`lsp.DiagnosticRelatedInformation`) — the LSP diagnostic related information
  to convert

#### Returns

The diagnostic related information as Monaco editor related information
(`monaco.editor.IRelatedInformation`).

### `toSelectionRange(selectionRange)`

Convert an LSP selection range to a Monaco editor selection range.

#### Parameters

- `selectionRange` (`lsp.SelectionRange`) — the LSP selection range to convert

#### Returns

The selection range as Monaco editor selection range (`monaco.languages.SelectionRange`).

### `toSemanticTokens(semanticTokens)`

Convert LSP semantic tokens to Monaco editor semantic tokens.

#### Parameters

- `semanticTokens` (`lsp.SemanticTokens`) — the LSP semantic tokens to convert

#### Returns

The semantic tokens as Monaco editor semantic tokens (`monaco.languages.SemanticTokens`).

### `toSemanticTokensEdit(semanticTokensEdit)`

Convert LSP semantic tokens to Monaco editor semantic tokens.

#### Parameters

- `semanticTokensEdit` (`lsp.SemanticTokensEdit`) — the LSP semantic tokens to convert

#### Returns

The semantic tokens as Monaco editor semantic tokens (`monaco.languages.SemanticTokensEdit`).

### `toSemanticTokensEdits(semanticTokensDelta)`

Convert an LSP semantic tokens delta to Monaco editsor semantic tokens edits.

#### Parameters

- `semanticTokensDelta` (`lsp.SemanticTokensDelta`) — the LSP semantic tokens delta to convert

#### Returns

The semantic tokens delta as Monaco editsor semantic tokens edits
(`monaco.languages.SemanticTokensEdits`).

### `toSignatureHelp(signatureHelp)`

Convert an LSP signature help to a Monaco editor signature help.

#### Parameters

- `signatureHelp` (`lsp.SignatureHelp`) — the LSP signature help to convert

#### Returns

The signature help as Monaco editor signature help (`monaco.languages.SignatureHelp`).

### `toSignatureHelpContext(signatureHelpContext)`

Convert an LSP signature help context to a Monaco editor signature help context.

#### Parameters

- `signatureHelpContext` (`lsp.SignatureHelpContext`) — the LSP signature help context to convert

#### Returns

The signature help context as Monaco editor signature help context
(`monaco.languages.SignatureHelpContext`).

### `toSignatureHelpTriggerKind(signatureHelpTriggerKind)`

Convert an LSP signature help trigger kind to a Monaco editor signature help trigger kind.

#### Parameters

- `signatureHelpTriggerKind` (`lsp.SignatureHelpTriggerKind`) — the LSP signature help trigger kind
  to convert

#### Returns

The signature help trigger kind as Monaco editor signature help trigger kind
(`monaco.languages.SignatureHelpTriggerKind`).

### `toSignatureInformation(signatureInformation)`

Convert an LSP signature information to a Monaco editor signature information.

#### Parameters

- `signatureInformation` (`lsp.SignatureInformation`) — the LSP signature information to convert

#### Returns

The signature information as Monaco editor signature information
(`monaco.languages.SignatureInformation`).

### `toSingleEditOperation(textEdit)`

Convert an LSP text edit to a Monaco editor single edit operation.

#### Parameters

- `textEdit` (`lsp.TextEdit`) — the LSP text edit to convert

#### Returns

The text edit as Monaco editor single edit operation (`monaco.editor.ISingleEditOperation`).

### `toSymbolKind(symbolKind)`

Convert an LSP symbol kind to a Monaco editor symbol kind.

#### Parameters

- `symbolKind` (`lsp.SymbolKind`) — the LSP symbol kind to convert

#### Returns

The symbol kind as Monaco editor symbol kind (`monaco.languages.SymbolKind`).

### `toSymbolTag(symbolTag)`

Convert an LSP symbol tag to a Monaco editor symbol tag.

#### Parameters

- `symbolTag` (`lsp.SymbolTag`) — the LSP symbol tag to convert

#### Returns

The symbol tag as Monaco editor symbol tag (`monaco.languages.SymbolTag`).

### `toTextEdit(textEdit)`

Convert an LSP text edit to a Monaco editor text edit.

#### Parameters

- `textEdit` (`lsp.TextEdit`) — the LSP text edit to convert

#### Returns

The text edit as Monaco editor text edit (`monaco.languages.TextEdit`).

### `toWorkspaceEdit(workspaceEdit)`

Convert an LSP workspace edit to a Monaco editor workspace edit.

#### Parameters

- `workspaceEdit` (`lsp.WorkspaceEdit`) — the LSP workspace edit to convert

#### Returns

The workspace edit as Monaco editor workspace edit (`monaco.languages.WorkspaceEdit`).

### `toWorkspaceFileEdit(workspaceFileEdit)`

Convert an LSP workspace file edit to a Monaco editor workspace file edit.

#### Parameters

- `workspaceFileEdit` (`lsp.CreateFile | lsp.DeleteFile | lsp.RenameFile`) — the LSP workspace file
  edit to convert

#### Returns

The workspace file edit options Monaco editor workspace file edit options
(`monaco.languages.IWorkspaceFileEdit`).

### `toWorkspaceFileEditOptions(options)`

Convert LSP workspace file edit options to Monaco editor workspace file edit options.

#### Parameters

- `options` (`lsp.CreateFileOptions & lsp.DeleteFileOptions & lsp.RenameFileOptions`) — the LSP
  workspace file edit options to convert

#### Returns

The workspace file edit options Monaco editor workspace file edit options
(`monaco.languages.WorkspaceFileEditOptions`).

## License

[MIT](LICENSE.md) © [Remco Haszing](https://github.com/remcohaszing)
