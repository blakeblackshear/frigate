import {
  AbstractMermaidTokenBuilder,
  AbstractMermaidValueConverter,
  EmptyFileSystem,
  MermaidGeneratedSharedModule,
  TreemapGeneratedModule,
  __name as __name2,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
  lib_exports
} from "./chunk-JFBLLWPX.mjs";
import {
  __name
} from "./chunk-DLQEHMXD.mjs";

// ../parser/dist/chunks/mermaid-parser.core/chunk-FWNWRKHM.mjs
var TreemapTokenBuilder = class extends AbstractMermaidTokenBuilder {
  static {
    __name(this, "TreemapTokenBuilder");
  }
  static {
    __name2(this, "TreemapTokenBuilder");
  }
  constructor() {
    super(["treemap"]);
  }
};
var classDefRegex = /classDef\s+([A-Z_a-z]\w+)(?:\s+([^\n\r;]*))?;?/;
var TreemapValueConverter = class extends AbstractMermaidValueConverter {
  static {
    __name(this, "TreemapValueConverter");
  }
  static {
    __name2(this, "TreemapValueConverter");
  }
  runCustomConverter(rule, input, _cstNode) {
    if (rule.name === "NUMBER2") {
      return parseFloat(input.replace(/,/g, ""));
    } else if (rule.name === "SEPARATOR") {
      return input.substring(1, input.length - 1);
    } else if (rule.name === "STRING2") {
      return input.substring(1, input.length - 1);
    } else if (rule.name === "INDENTATION") {
      return input.length;
    } else if (rule.name === "ClassDef") {
      if (typeof input !== "string") {
        return input;
      }
      const match = classDefRegex.exec(input);
      if (match) {
        return {
          $type: "ClassDefStatement",
          className: match[1],
          styleText: match[2] || void 0
        };
      }
    }
    return void 0;
  }
};
function registerValidationChecks(services) {
  const validator = services.validation.TreemapValidator;
  const registry = services.validation.ValidationRegistry;
  if (registry) {
    const checks = {
      Treemap: validator.checkSingleRoot.bind(validator)
      // Remove unused validation for TreemapRow
    };
    registry.register(checks, validator);
  }
}
__name(registerValidationChecks, "registerValidationChecks");
__name2(registerValidationChecks, "registerValidationChecks");
var TreemapValidator = class {
  static {
    __name(this, "TreemapValidator");
  }
  static {
    __name2(this, "TreemapValidator");
  }
  /**
   * Validates that a treemap has only one root node.
   * A root node is defined as a node that has no indentation.
   */
  checkSingleRoot(doc, accept) {
    let rootNodeIndentation;
    for (const row of doc.TreemapRows) {
      if (!row.item) {
        continue;
      }
      if (rootNodeIndentation === void 0 && // Check if this is a root node (no indentation)
      row.indent === void 0) {
        rootNodeIndentation = 0;
      } else if (row.indent === void 0) {
        accept("error", "Multiple root nodes are not allowed in a treemap.", {
          node: row,
          property: "item"
        });
      } else if (rootNodeIndentation !== void 0 && rootNodeIndentation >= parseInt(row.indent, 10)) {
        accept("error", "Multiple root nodes are not allowed in a treemap.", {
          node: row,
          property: "item"
        });
      }
    }
  }
};
var TreemapModule = {
  parser: {
    TokenBuilder: /* @__PURE__ */ __name2(() => new TreemapTokenBuilder(), "TokenBuilder"),
    ValueConverter: /* @__PURE__ */ __name2(() => new TreemapValueConverter(), "ValueConverter")
  },
  validation: {
    TreemapValidator: /* @__PURE__ */ __name2(() => new TreemapValidator(), "TreemapValidator")
  }
};
function createTreemapServices(context = EmptyFileSystem) {
  const shared = inject(
    createDefaultSharedCoreModule(context),
    MermaidGeneratedSharedModule
  );
  const Treemap = inject(
    createDefaultCoreModule({ shared }),
    TreemapGeneratedModule,
    TreemapModule
  );
  shared.ServiceRegistry.register(Treemap);
  registerValidationChecks(Treemap);
  return { shared, Treemap };
}
__name(createTreemapServices, "createTreemapServices");
__name2(createTreemapServices, "createTreemapServices");

export {
  TreemapModule,
  createTreemapServices
};
