# Chevrotain Allstar

This is a lookahead plugin package for the [Chevrotain parser library](https://chevrotain.io/).
It implements the [ALL(*) lookahead algorithm](https://www.antlr.org/papers/allstar-techreport.pdf) introduced for ANTLR4.
The algorithm features unbounded lookahead, compared to the normal LL(*k*) behavior of Chevrotain.

## Usage

When creating your parser, pass an instance of the `LLStarLookaheadStrategy` to the `lookaheadStrategy` property of the base parser constructor options.

```ts
import { LLStarLookaheadStrategy } from "chevrotain-allstar";

class Parser extends EmbeddedActionsParser {
    constructor() {
        super(tokens, {
            lookaheadStrategy: new LLStarLookaheadStrategy()
        });
        this.performSelfAnalysis()
    }
}
```
