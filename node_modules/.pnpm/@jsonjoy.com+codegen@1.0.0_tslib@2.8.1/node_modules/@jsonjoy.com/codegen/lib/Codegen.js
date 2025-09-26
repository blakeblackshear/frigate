"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Codegen = exports.CodegenStepExecJs = void 0;
const _1 = require(".");
class CodegenStepExecJs {
    constructor(js) {
        this.js = js;
    }
}
exports.CodegenStepExecJs = CodegenStepExecJs;
class Codegen {
    constructor(opts) {
        this.steps = [];
        this.dependencies = [];
        this.dependencyNames = [];
        this.linked = {};
        this.constants = [];
        this.constantNames = [];
        this.options = {
            args: ['r0'],
            name: '',
            prologue: '',
            epilogue: '',
            processSteps: (steps) => steps.filter((step) => step instanceof CodegenStepExecJs),
            linkable: {},
            ...opts,
        };
        this.registerCounter = this.options.args.length;
    }
    js(js) {
        this.steps.push(new CodegenStepExecJs(js));
    }
    var(expression) {
        const r = this.getRegister();
        if (expression)
            this.js('var ' + r + ' = ' + expression + ';');
        else
            this.js('var ' + r + ';');
        return r;
    }
    if(condition, then, otherwise) {
        this.js('if (' + condition + ') {');
        then();
        if (otherwise) {
            this.js('} else {');
            otherwise();
        }
        this.js('}');
    }
    while(condition, block) {
        this.js('while (' + condition + ') {');
        block();
        this.js('}');
    }
    doWhile(block, condition) {
        this.js('do {');
        block();
        this.js('} while (' + condition + ');');
    }
    switch(expression, cases, def) {
        this.js('switch (' + expression + ') {');
        for (const [match, block, noBreak] of cases) {
            this.js('case ' + match + ': {');
            block();
            if (!noBreak)
                this.js('break;');
            this.js('}');
        }
        if (def) {
            this.js('default: {');
            def();
            this.js('}');
        }
        this.js('}');
    }
    return(expression) {
        this.js('return ' + expression + ';');
    }
    step(step) {
        this.steps.push(step);
    }
    getRegister() {
        return `r${this.registerCounter++}`;
    }
    r() {
        return this.getRegister();
    }
    linkDependency(dep, name = 'd' + this.dependencies.length) {
        this.dependencies.push(dep);
        this.dependencyNames.push(name);
        return name;
    }
    linkDependencies(deps) {
        return deps.map((dep) => this.linkDependency(dep));
    }
    link(name) {
        if (this.linked[name])
            return;
        this.linked[name] = 1;
        this.linkDependency(this.options.linkable[name], name);
    }
    addConstant(constant, name = 'c' + this.constants.length) {
        this.constants.push(constant);
        this.constantNames.push(name);
        return name;
    }
    addConstants(constants) {
        return constants.map((constant) => this.addConstant(constant));
    }
    generate(opts = {}) {
        const { name, args, prologue, epilogue } = { ...this.options, ...opts };
        const steps = this.options.processSteps(this.steps);
        const js = `(function(${this.dependencyNames.join(', ')}) {
${this.constants.map((constant, index) => `var ${this.constantNames[index]} = (${constant});`).join('\n')}
return ${name ? `function ${name}` : 'function'}(${args.join(',')}){
${prologue}
${steps.map((step) => step.js).join('\n')}
${typeof epilogue === 'function' ? epilogue() : epilogue || ''}
}})`;
        return {
            deps: this.dependencies,
            js: js,
        };
    }
    compile(opts) {
        const closure = this.generate(opts);
        return (0, _1.compileClosure)(closure);
    }
}
exports.Codegen = Codegen;
//# sourceMappingURL=Codegen.js.map