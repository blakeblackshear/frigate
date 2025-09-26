(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    // TODO: remove dependency to Chevrotain
    define(["../vendor/railroad-diagrams"], factory);
  } else if (typeof module === "object" && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    // TODO: remove dependency to Chevrotain
    module.exports = factory(require("../vendor/railroad-diagrams"));
  } else {
    // Browser globals (root is window)
    root.diagrams_builder = factory(root.railroad);
  }
})(this, function (railroad) {
  var Diagram = railroad.Diagram;
  var Sequence = railroad.Sequence;
  var Choice = railroad.Choice;
  var Optional = railroad.Optional;
  var OneOrMore = railroad.OneOrMore;
  var ZeroOrMore = railroad.ZeroOrMore;
  // var Terminal = railroad.Terminal
  var NonTerminal = railroad.NonTerminal;

  /**
   * @param {chevrotain.gast.ISerializedGast} topRules
   *
   * @returns {string} - The htmlText that will render the diagrams
   */
  function buildSyntaxDiagramsText(topRules) {
    var diagramsHtml = "";

    topRules.forEach(function (production) {
      var currDiagramHtml = convertProductionToDiagram(
        production,
        production.name,
      );
      diagramsHtml +=
        '<h2 class="diagramHeader">' +
        production.name +
        "</h2>" +
        currDiagramHtml;
    });

    return diagramsHtml;
  }

  function definitionsToSubDiagrams(definitions, topRuleName) {
    var subDiagrams = definitions.map(function (subProd) {
      return convertProductionToDiagram(subProd, topRuleName);
    });
    return subDiagrams;
  }

  /**
   * @param {chevrotain.gast.ISerializedTerminal} prod
   * @param {string} topRuleName
   * @param {string} dslRuleName
   *
   * @return {RailRoadDiagram.Terminal}
   */
  function createTerminalFromSerializedGast(prod, topRuleName, dslRuleName) {
    // PATTERN static property will not exist when using custom lexers (hand built or other lexer generators)
    var toolTipTitle = undefined;
    // avoid trying to use a custom token pattern as the title.
    if (
      typeof prod.pattern === "string" ||
      Object.prototype.toString.call(prod.pattern) === "[object RegExp]"
    ) {
      toolTipTitle = prod.pattern;
    }

    return railroad.Terminal(
      prod.label,
      undefined,
      toolTipTitle,
      prod.occurrenceInParent,
      topRuleName,
      dslRuleName,
      prod.name,
    );
  }

  /**
   * @param prod
   * @param topRuleName
   *
   * Converts a single Chevrotain Grammar production to a RailRoad Diagram.
   * This is also exported to allow custom logic in the creation of the diagrams.
   * @returns {*}
   */
  function convertProductionToDiagram(prod, topRuleName) {
    if (prod.type === "NonTerminal") {
      // must handle NonTerminal separately from the other AbstractProductions as we do not want to expand the subDefinition
      // of a reference and cause infinite loops
      return NonTerminal(
        getNonTerminalName(prod),
        undefined,
        prod.occurrenceInParent,
        topRuleName,
      );
    } else if (prod.type !== "Terminal") {
      var subDiagrams = definitionsToSubDiagrams(prod.definition, topRuleName);
      if (prod.type === "Rule") {
        return Diagram.apply(this, subDiagrams);
      } else if (prod.type === "Alternative") {
        return Sequence.apply(this, subDiagrams);
      } else if (prod.type === "Option") {
        if (subDiagrams.length > 1) {
          return Optional(Sequence.apply(this, subDiagrams));
        } else if (subDiagrams.length === 1) {
          return Optional(subDiagrams[0]);
        } else {
          throw Error("Empty Optional production, OOPS!");
        }
      } else if (prod.type === "Repetition") {
        if (subDiagrams.length > 1) {
          return ZeroOrMore(Sequence.apply(this, subDiagrams));
        } else if (subDiagrams.length === 1) {
          return ZeroOrMore(subDiagrams[0]);
        } else {
          throw Error("Empty Optional production, OOPS!");
        }
      } else if (prod.type === "Alternation") {
        // todo: what does the first argument of choice (the index 0 means?)
        return Choice.apply(this, [0].concat(subDiagrams));
      } else if (prod.type === "RepetitionMandatory") {
        if (subDiagrams.length > 1) {
          return OneOrMore(Sequence.apply(this, subDiagrams));
        } else if (subDiagrams.length === 1) {
          return OneOrMore(subDiagrams[0]);
        } else {
          throw Error("Empty Optional production, OOPS!");
        }
      } else if (prod.type === "RepetitionWithSeparator") {
        if (subDiagrams.length > 0) {
          // MANY_SEP(separator, definition) === (definition (separator definition)*)?
          return Optional(
            Sequence.apply(
              this,
              subDiagrams.concat([
                ZeroOrMore(
                  Sequence.apply(
                    this,
                    [
                      createTerminalFromSerializedGast(
                        prod.separator,
                        topRuleName,
                        "many_sep",
                      ),
                    ].concat(subDiagrams),
                  ),
                ),
              ]),
            ),
          );
        } else {
          throw Error("Empty Optional production, OOPS!");
        }
      } else if (prod.type === "RepetitionMandatoryWithSeparator") {
        if (subDiagrams.length > 0) {
          // AT_LEAST_ONE_SEP(separator, definition) === definition (separator definition)*
          return Sequence.apply(
            this,
            subDiagrams.concat([
              ZeroOrMore(
                Sequence.apply(
                  this,
                  [
                    createTerminalFromSerializedGast(
                      prod.separator,
                      topRuleName,
                      "at_least_one_sep",
                    ),
                  ].concat(subDiagrams),
                ),
              ),
            ]),
          );
        } else {
          throw Error("Empty Optional production, OOPS!");
        }
      }
    } else if (prod.type === "Terminal") {
      return createTerminalFromSerializedGast(prod, topRuleName, "consume");
    } else {
      throw Error("non exhaustive match");
    }
  }

  function getNonTerminalName(prod) {
    if (prod.nonTerminalName !== undefined) {
      return prod.nonTerminalName;
    } else {
      return prod.name;
    }
  }

  return {
    buildSyntaxDiagramsText: buildSyntaxDiagramsText,
    convertProductionToDiagram: convertProductionToDiagram,
  };
});
