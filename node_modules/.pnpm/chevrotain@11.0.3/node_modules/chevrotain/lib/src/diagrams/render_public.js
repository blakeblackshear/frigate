import { VERSION } from "../version.js";
export function createSyntaxDiagramsCode(grammar, { resourceBase = `https://unpkg.com/chevrotain@${VERSION}/diagrams/`, css = `https://unpkg.com/chevrotain@${VERSION}/diagrams/diagrams.css`, } = {}) {
    const header = `
<!-- This is a generated file -->
<!DOCTYPE html>
<meta charset="utf-8">
<style>
  body {
    background-color: hsl(30, 20%, 95%)
  }
</style>

`;
    const cssHtml = `
<link rel='stylesheet' href='${css}'>
`;
    const scripts = `
<script src='${resourceBase}vendor/railroad-diagrams.js'></script>
<script src='${resourceBase}src/diagrams_builder.js'></script>
<script src='${resourceBase}src/diagrams_behavior.js'></script>
<script src='${resourceBase}src/main.js'></script>
`;
    const diagramsDiv = `
<div id="diagrams" align="center"></div>    
`;
    const serializedGrammar = `
<script>
    window.serializedGrammar = ${JSON.stringify(grammar, null, "  ")};
</script>
`;
    const initLogic = `
<script>
    var diagramsDiv = document.getElementById("diagrams");
    main.drawDiagramsFromSerializedGrammar(serializedGrammar, diagramsDiv);
</script>
`;
    return (header + cssHtml + scripts + diagramsDiv + serializedGrammar + initLogic);
}
//# sourceMappingURL=render_public.js.map