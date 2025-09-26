/**
 *
 */
class CodeBuilder {
  /**
   *
   * @param {Number} indentSize
   * @param {String} indentCharacter
   */
  constructor (indentSize, indentCharacter) {
    this.indentSize = indentSize;
    this.indentCharacter = indentCharacter;
    this.currentIndentCount = 0;
    this.snippet = '';
    this.usings = [];
    this.newLineChar = '\n';
  }

  /**
   *
   * @param {String} using - The namespace that is needed to be imported in order
   *   for the code to be able to be built on it's own
   */
  addUsing (using) {
    this.usings.push(using);
  }

  /**
   *
   * @param {String} line - the line to be appended
   */
  appendLine (line) {
    this.snippet += this.indentation + line + this.newLineChar;
  }

  /**
   *
   * @param {String[]} lines
   */
  appendLines (lines) {
    lines.forEach((l) => {
      this.appendLine(l);
    });
  }

  /**
   *
   * @param {String} body - the value to append to the running block of code
   */
  append (body) {
    this.snippet += body;
  }

  /**
   *
   * @param {String} line - the line to be appened followed by the start of a new block
   */
  appendBlock (line) {
    this.snippet += this.indentation + line + this.newLineChar +
      this.indentation + '{' + this.newLineChar;
    this.currentIndentCount++;
  }

  /**
   *
   * @param {String} extra - value to add after closing brace
   */
  endBlock (extra) {
    if (!extra) {
      extra = '';
    }
    this.currentIndentCount--;
    this.snippet += this.indentation + '}' + extra + this.newLineChar;
  }

  /**
   *
   * @param {Boolean} addUsings - Whether to actually append the usings at the top
   *
   * @returns {String} the full block of code
   */
  build (addUsings) {
    if (addUsings) {
      var builder = new CodeBuilder(this.indentSize, this.indentCharacter);
      this.uniqueUsings().forEach((using) => {
        builder.appendLine(`using ${using};`);
      });
      builder.append(this.snippet);
      return builder.build(false);
    }

    return this.snippet;
  }

  /**
   * @returns {Array<String>} the unique usings
   */
  uniqueUsings () {
    var arr = [],
      i = 0;
    for (i = 0; i < this.usings.length; i++) {
      if (!arr.includes(this.usings[i])) {
        arr.push(this.usings[i]);
      }
    }
    return arr.sort();
  }

  get indentation () {
    return this.indentCharacter.repeat(this.indentSize * this.currentIndentCount);
  }
}

module.exports = CodeBuilder;
