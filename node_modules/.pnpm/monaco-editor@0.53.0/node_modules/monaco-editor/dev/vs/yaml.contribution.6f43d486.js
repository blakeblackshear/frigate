var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
define("vs/yaml.contribution.6f43d486", ["require", "./editor.api.001a2486"], function(require2, editor_api) {
  "use strict";
  const languageDefinitions = {};
  const lazyLanguageLoaders = {};
  class LazyLanguageLoader {
    constructor(languageId) {
      __publicField(this, "_languageId");
      __publicField(this, "_loadingTriggered");
      __publicField(this, "_lazyLoadPromise");
      __publicField(this, "_lazyLoadPromiseResolve");
      __publicField(this, "_lazyLoadPromiseReject");
      this._languageId = languageId;
      this._loadingTriggered = false;
      this._lazyLoadPromise = new Promise((resolve, reject) => {
        this._lazyLoadPromiseResolve = resolve;
        this._lazyLoadPromiseReject = reject;
      });
    }
    static getOrCreate(languageId) {
      if (!lazyLanguageLoaders[languageId]) {
        lazyLanguageLoaders[languageId] = new LazyLanguageLoader(languageId);
      }
      return lazyLanguageLoaders[languageId];
    }
    load() {
      if (!this._loadingTriggered) {
        this._loadingTriggered = true;
        languageDefinitions[this._languageId].loader().then(
          (mod) => this._lazyLoadPromiseResolve(mod),
          (err) => this._lazyLoadPromiseReject(err)
        );
      }
      return this._lazyLoadPromise;
    }
  }
  function registerLanguage(def) {
    const languageId = def.id;
    languageDefinitions[languageId] = def;
    editor_api.languages.register(def);
    const lazyLanguageLoader = LazyLanguageLoader.getOrCreate(languageId);
    editor_api.languages.registerTokensProviderFactory(languageId, {
      create: async () => {
        const mod = await lazyLanguageLoader.load();
        return mod.language;
      }
    });
    editor_api.languages.onLanguageEncountered(languageId, async () => {
      const mod = await lazyLanguageLoader.load();
      editor_api.languages.setLanguageConfiguration(languageId, mod.conf);
    });
  }
  registerLanguage({
    id: "abap",
    extensions: [".abap"],
    aliases: ["abap", "ABAP"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./abap.57cfd48a"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "apex",
    extensions: [".cls"],
    aliases: ["Apex", "apex"],
    mimetypes: ["text/x-apex-source", "text/x-apex"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./apex.6678db96"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "azcli",
    extensions: [".azcli"],
    aliases: ["Azure CLI", "azcli"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./azcli.fc692699"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "bat",
    extensions: [".bat", ".cmd"],
    aliases: ["Batch", "bat"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./bat.90dc8220"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "bicep",
    extensions: [".bicep"],
    aliases: ["Bicep"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./bicep.8971e114"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "cameligo",
    extensions: [".mligo"],
    aliases: ["Cameligo"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./cameligo.2fafdc9f"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "clojure",
    extensions: [".clj", ".cljs", ".cljc", ".edn"],
    aliases: ["clojure", "Clojure"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./clojure.b61e1803"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "coffeescript",
    extensions: [".coffee"],
    aliases: ["CoffeeScript", "coffeescript", "coffee"],
    mimetypes: ["text/x-coffeescript", "text/coffeescript"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./coffee.e77cde95"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "c",
    extensions: [".c", ".h"],
    aliases: ["C", "c"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./cpp.7e583a05"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "cpp",
    extensions: [".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"],
    aliases: ["C++", "Cpp", "cpp"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./cpp.7e583a05"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "csharp",
    extensions: [".cs", ".csx", ".cake"],
    aliases: ["C#", "csharp"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./csharp.3abdfafa"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "csp",
    extensions: [".csp"],
    aliases: ["CSP", "csp"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./csp.e0fcfb69"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "css",
    extensions: [".css"],
    aliases: ["CSS", "css"],
    mimetypes: ["text/css"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./css.2db598c5"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "cypher",
    extensions: [".cypher", ".cyp"],
    aliases: ["Cypher", "OpenCypher"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./cypher.a7170d54"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "dart",
    extensions: [".dart"],
    aliases: ["Dart", "dart"],
    mimetypes: ["text/x-dart-source", "text/x-dart"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./dart.dbac000d"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "dockerfile",
    extensions: [".dockerfile"],
    filenames: ["Dockerfile"],
    aliases: ["Dockerfile"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./dockerfile.fd07f053"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "ecl",
    extensions: [".ecl"],
    aliases: ["ECL", "Ecl", "ecl"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./ecl.53e50254"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "elixir",
    extensions: [".ex", ".exs"],
    aliases: ["Elixir", "elixir", "ex"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./elixir.85637170"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "flow9",
    extensions: [".flow"],
    aliases: ["Flow9", "Flow", "flow9", "flow"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./flow9.4d815440"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "fsharp",
    extensions: [".fs", ".fsi", ".ml", ".mli", ".fsx", ".fsscript"],
    aliases: ["F#", "FSharp", "fsharp"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./fsharp.39bb3213"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "freemarker2",
    extensions: [".ftl", ".ftlh", ".ftlx"],
    aliases: ["FreeMarker2", "Apache FreeMarker2"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./freemarker2.1d1f763d"], resolve, reject)).then((m) => m.TagAutoInterpolationDollar);
      }
    }
  });
  registerLanguage({
    id: "freemarker2.tag-angle.interpolation-dollar",
    aliases: ["FreeMarker2 (Angle/Dollar)", "Apache FreeMarker2 (Angle/Dollar)"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./freemarker2.1d1f763d"], resolve, reject)).then((m) => m.TagAngleInterpolationDollar);
      }
    }
  });
  registerLanguage({
    id: "freemarker2.tag-bracket.interpolation-dollar",
    aliases: ["FreeMarker2 (Bracket/Dollar)", "Apache FreeMarker2 (Bracket/Dollar)"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./freemarker2.1d1f763d"], resolve, reject)).then((m) => m.TagBracketInterpolationDollar);
      }
    }
  });
  registerLanguage({
    id: "freemarker2.tag-angle.interpolation-bracket",
    aliases: ["FreeMarker2 (Angle/Bracket)", "Apache FreeMarker2 (Angle/Bracket)"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./freemarker2.1d1f763d"], resolve, reject)).then((m) => m.TagAngleInterpolationBracket);
      }
    }
  });
  registerLanguage({
    id: "freemarker2.tag-bracket.interpolation-bracket",
    aliases: ["FreeMarker2 (Bracket/Bracket)", "Apache FreeMarker2 (Bracket/Bracket)"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./freemarker2.1d1f763d"], resolve, reject)).then((m) => m.TagBracketInterpolationBracket);
      }
    }
  });
  registerLanguage({
    id: "freemarker2.tag-auto.interpolation-dollar",
    aliases: ["FreeMarker2 (Auto/Dollar)", "Apache FreeMarker2 (Auto/Dollar)"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./freemarker2.1d1f763d"], resolve, reject)).then((m) => m.TagAutoInterpolationDollar);
      }
    }
  });
  registerLanguage({
    id: "freemarker2.tag-auto.interpolation-bracket",
    aliases: ["FreeMarker2 (Auto/Bracket)", "Apache FreeMarker2 (Auto/Bracket)"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./freemarker2.1d1f763d"], resolve, reject)).then((m) => m.TagAutoInterpolationBracket);
      }
    }
  });
  registerLanguage({
    id: "go",
    extensions: [".go"],
    aliases: ["Go"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./go.fb229974"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "graphql",
    extensions: [".graphql", ".gql"],
    aliases: ["GraphQL", "graphql", "gql"],
    mimetypes: ["application/graphql"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./graphql.0d18b9fd"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "handlebars",
    extensions: [".handlebars", ".hbs"],
    aliases: ["Handlebars", "handlebars", "hbs"],
    mimetypes: ["text/x-handlebars-template"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./handlebars.1c43a000"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "hcl",
    extensions: [".tf", ".tfvars", ".hcl"],
    aliases: ["Terraform", "tf", "HCL", "hcl"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./hcl.3b7f49f4"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "html",
    extensions: [".html", ".htm", ".shtml", ".xhtml", ".mdoc", ".jsp", ".asp", ".aspx", ".jshtm"],
    aliases: ["HTML", "htm", "html", "xhtml"],
    mimetypes: ["text/html", "text/x-jshtm", "text/template", "text/ng-template"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./html.50e520b0"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "ini",
    extensions: [".ini", ".properties", ".gitconfig"],
    filenames: ["config", ".gitattributes", ".gitconfig", ".editorconfig"],
    aliases: ["Ini", "ini"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./ini.ececa959"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "java",
    extensions: [".java", ".jav"],
    aliases: ["Java", "java"],
    mimetypes: ["text/x-java-source", "text/x-java"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./java.749dd323"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "javascript",
    extensions: [".js", ".es6", ".jsx", ".mjs", ".cjs"],
    firstLine: "^#!.*\\bnode",
    filenames: ["jakefile"],
    aliases: ["JavaScript", "javascript", "js"],
    mimetypes: ["text/javascript"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./javascript.00c827f5"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "julia",
    extensions: [".jl"],
    aliases: ["julia", "Julia"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./julia.f3a3a737"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "kotlin",
    extensions: [".kt", ".kts"],
    aliases: ["Kotlin", "kotlin"],
    mimetypes: ["text/x-kotlin-source", "text/x-kotlin"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./kotlin.714c9a98"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "less",
    extensions: [".less"],
    aliases: ["Less", "less"],
    mimetypes: ["text/x-less", "text/less"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./less.cca4cf46"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "lexon",
    extensions: [".lex"],
    aliases: ["Lexon"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./lexon.7430c8cd"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "lua",
    extensions: [".lua"],
    aliases: ["Lua", "lua"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./lua.b9f48055"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "liquid",
    extensions: [".liquid", ".html.liquid"],
    aliases: ["Liquid", "liquid"],
    mimetypes: ["application/liquid"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./liquid.a6046bb2"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "m3",
    extensions: [".m3", ".i3", ".mg", ".ig"],
    aliases: ["Modula-3", "Modula3", "modula3", "m3"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./m3.54394d23"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "markdown",
    extensions: [".md", ".markdown", ".mdown", ".mkdn", ".mkd", ".mdwn", ".mdtxt", ".mdtext"],
    aliases: ["Markdown", "markdown"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./markdown.d9a6aaa6"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "mdx",
    extensions: [".mdx"],
    aliases: ["MDX", "mdx"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./mdx.4d70389f"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "mips",
    extensions: [".s"],
    aliases: ["MIPS", "MIPS-V"],
    mimetypes: ["text/x-mips", "text/mips", "text/plaintext"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./mips.2ca1cc0e"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "msdax",
    extensions: [".dax", ".msdax"],
    aliases: ["DAX", "MSDAX"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./msdax.6b83e523"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "mysql",
    extensions: [],
    aliases: ["MySQL", "mysql"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./mysql.0c968318"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "objective-c",
    extensions: [".m"],
    aliases: ["Objective-C"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./objective-c.c23cbcfe"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "pascal",
    extensions: [".pas", ".p", ".pp"],
    aliases: ["Pascal", "pas"],
    mimetypes: ["text/x-pascal-source", "text/x-pascal"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./pascal.d682edd0"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "pascaligo",
    extensions: [".ligo"],
    aliases: ["Pascaligo", "ligo"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./pascaligo.4cda72e2"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "perl",
    extensions: [".pl", ".pm"],
    aliases: ["Perl", "pl"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./perl.6c0a5fd2"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "pgsql",
    extensions: [],
    aliases: ["PostgreSQL", "postgres", "pg", "postgre"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./pgsql.6d0b0345"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "php",
    extensions: [".php", ".php4", ".php5", ".phtml", ".ctp"],
    aliases: ["PHP", "php"],
    mimetypes: ["application/x-php"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./php.fa1fc595"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "pla",
    extensions: [".pla"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./pla.ecedb2fa"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "postiats",
    extensions: [".dats", ".sats", ".hats"],
    aliases: ["ATS", "ATS/Postiats"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./postiats.4f91d904"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "powerquery",
    extensions: [".pq", ".pqm"],
    aliases: ["PQ", "M", "Power Query", "Power Query M"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./powerquery.79d430a4"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "powershell",
    extensions: [".ps1", ".psm1", ".psd1"],
    aliases: ["PowerShell", "powershell", "ps", "ps1"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./powershell.87bc4ad0"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "proto",
    extensions: [".proto"],
    aliases: ["protobuf", "Protocol Buffers"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./protobuf.13ce105a"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "pug",
    extensions: [".jade", ".pug"],
    aliases: ["Pug", "Jade", "jade"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./pug.a06f9ff4"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "python",
    extensions: [".py", ".rpy", ".pyw", ".cpy", ".gyp", ".gypi"],
    aliases: ["Python", "py"],
    firstLine: "^#!/.*\\bpython[0-9.-]*\\b",
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./python.5153d5cc"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "qsharp",
    extensions: [".qs"],
    aliases: ["Q#", "qsharp"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./qsharp.5334b526"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "r",
    extensions: [".r", ".rhistory", ".rmd", ".rprofile", ".rt"],
    aliases: ["R", "r"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./r.71f62956"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "razor",
    extensions: [".cshtml"],
    aliases: ["Razor", "razor"],
    mimetypes: ["text/x-cshtml"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./razor.e138c602"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "redis",
    extensions: [".redis"],
    aliases: ["redis"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./redis.53af986e"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "redshift",
    extensions: [],
    aliases: ["Redshift", "redshift"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./redshift.d166bd80"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "restructuredtext",
    extensions: [".rst"],
    aliases: ["reStructuredText", "restructuredtext"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./restructuredtext.da8d5482"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "ruby",
    extensions: [".rb", ".rbx", ".rjs", ".gemspec", ".pp"],
    filenames: ["rakefile", "Gemfile"],
    aliases: ["Ruby", "rb"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./ruby.ea1f567c"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "rust",
    extensions: [".rs", ".rlib"],
    aliases: ["Rust", "rust"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./rust.fb821eb7"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "sb",
    extensions: [".sb"],
    aliases: ["Small Basic", "sb"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./sb.de090154"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "scala",
    extensions: [".scala", ".sc", ".sbt"],
    aliases: ["Scala", "scala", "SBT", "Sbt", "sbt", "Dotty", "dotty"],
    mimetypes: ["text/x-scala-source", "text/x-scala", "text/x-sbt", "text/x-dotty"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./scala.872b817c"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "scheme",
    extensions: [".scm", ".ss", ".sch", ".rkt"],
    aliases: ["scheme", "Scheme"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./scheme.5d100872"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "scss",
    extensions: [".scss"],
    aliases: ["Sass", "sass", "scss"],
    mimetypes: ["text/x-scss", "text/scss"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./scss.005cca6c"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "shell",
    extensions: [".sh", ".bash"],
    aliases: ["Shell", "sh"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./shell.9fdf397b"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "sol",
    extensions: [".sol"],
    aliases: ["sol", "solidity", "Solidity"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./solidity.a0c1d17d"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "aes",
    extensions: [".aes"],
    aliases: ["aes", "sophia", "Sophia"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./sophia.19fb93b0"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "sparql",
    extensions: [".rq"],
    aliases: ["sparql", "SPARQL"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./sparql.650fdcd2"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "sql",
    extensions: [".sql"],
    aliases: ["SQL"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./sql.0a440540"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "st",
    extensions: [".st", ".iecst", ".iecplc", ".lc3lib", ".TcPOU", ".TcDUT", ".TcGVL", ".TcIO"],
    aliases: ["StructuredText", "scl", "stl"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./st.589fd1fd"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "swift",
    aliases: ["Swift", "swift"],
    extensions: [".swift"],
    mimetypes: ["text/swift"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./swift.52175693"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "systemverilog",
    extensions: [".sv", ".svh"],
    aliases: ["SV", "sv", "SystemVerilog", "systemverilog"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./systemverilog.54750c8c"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "verilog",
    extensions: [".v", ".vh"],
    aliases: ["V", "v", "Verilog", "verilog"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./systemverilog.54750c8c"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "tcl",
    extensions: [".tcl"],
    aliases: ["tcl", "Tcl", "tcltk", "TclTk", "tcl/tk", "Tcl/Tk"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./tcl.ffa31061"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "twig",
    extensions: [".twig"],
    aliases: ["Twig", "twig"],
    mimetypes: ["text/x-twig"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./twig.23fe457e"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "typescript",
    extensions: [".ts", ".tsx", ".cts", ".mts"],
    aliases: ["TypeScript", "ts", "typescript"],
    mimetypes: ["text/typescript"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./typescript.21e6b24c"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "typespec",
    extensions: [".tsp"],
    aliases: ["TypeSpec"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./typespec.6ed77a41"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "vb",
    extensions: [".vb"],
    aliases: ["Visual Basic", "vb"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./vb.1cd5c18f"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "wgsl",
    extensions: [".wgsl"],
    aliases: ["WebGPU Shading Language", "WGSL", "wgsl"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./wgsl.1d597471"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "xml",
    extensions: [
      ".xml",
      ".xsd",
      ".dtd",
      ".ascx",
      ".csproj",
      ".config",
      ".props",
      ".targets",
      ".wxi",
      ".wxl",
      ".wxs",
      ".xaml",
      ".svg",
      ".svgz",
      ".opf",
      ".xslt",
      ".xsl"
    ],
    firstLine: "(\\<\\?xml.*)|(\\<svg)|(\\<\\!doctype\\s+svg)",
    aliases: ["XML", "xml"],
    mimetypes: ["text/xml", "application/xml", "application/xaml+xml", "application/xml-dtd"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./xml.97580f17"], resolve, reject));
      }
    }
  });
  registerLanguage({
    id: "yaml",
    extensions: [".yaml", ".yml"],
    aliases: ["YAML", "yaml", "YML", "yml"],
    mimetypes: ["application/x-yaml", "text/x-yaml"],
    loader: () => {
      {
        return new Promise((resolve, reject) => require2(["./yaml.4437b505"], resolve, reject));
      }
    }
  });
});
