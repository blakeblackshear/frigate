/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { createToken, EmbeddedActionsParser, EOF, IToken, TokenType } from "chevrotain"
import { LLStarLookaheadStrategy } from "./all-star-lookahead"

describe("ATN Simulator", () => {
    describe("LL(*) lookahead", () => {
        const A = createToken({ name: "A", pattern: "a" })
        const B = createToken({ name: "B", pattern: "b" })

        class UnboundedLookaheadParser extends EmbeddedActionsParser {
            constructor() {
                super([A, B], {
                    lookaheadStrategy: new LLStarLookaheadStrategy()
                })
                this.performSelfAnalysis()
            }

            LongRule = this.RULE("LongRule", () => {
                return this.OR([
                    {
                        ALT: () => {
                            return 0
                        }
                    },
                    {
                        ALT: () => {
                            this.AT_LEAST_ONE1(() => this.CONSUME1(A))
                            return 1
                        }
                    },
                    {
                        ALT: () => {
                            this.AT_LEAST_ONE2(() => this.CONSUME2(A))
                            this.CONSUME(B)
                            return 2
                        }
                    }
                ])
            })
        }

        it("Should pick longest alternative instead of first #1", () => {
            const parser = new UnboundedLookaheadParser()
            parser.input = [
                createRegularToken(A),
                createRegularToken(A),
                createRegularToken(A)
            ]
            const result = parser.LongRule()
            expect(result).toBe(1);
        })

        it("Should pick longest alternative instead of first #2", () => {
            const parser = new UnboundedLookaheadParser()
            parser.input = [
                createRegularToken(A),
                createRegularToken(A),
                createRegularToken(B)
            ]
            const result = parser.LongRule()
            expect(result).toBe(2);
        })

        it("Should pick shortest fitting alternative", () => {
            const parser = new UnboundedLookaheadParser()
            parser.input = []
            const result = parser.LongRule()
            expect(result).toBe(0);
        })
    })

    describe("Ambiguity Detection", () => {
        const A = createToken({ name: "A" })
        const B = createToken({ name: "B" })

        class AmbigiousParser extends EmbeddedActionsParser {
            ambiguityReports: string[] = []

            constructor() {
                super([A, B], {
                    lookaheadStrategy: new LLStarLookaheadStrategy({
                        logging: (message) => this.ambiguityReports.push(message)
                    })
                });
                this.performSelfAnalysis()
            }

            OptionRule = this.RULE("OptionRule", () => {
                let usedOption = false
                this.OPTION(() => {
                    this.AT_LEAST_ONE1(() => this.CONSUME1(A))
                    usedOption = true
                })
                this.AT_LEAST_ONE2(() => this.CONSUME2(A))
                return usedOption
            })

            AltRule = this.RULE("AltRule", () => {
                return this.OR([
                    {
                        ALT: () => {
                            this.SUBRULE(this.RuleB)
                            return 0
                        }
                    },
                    {
                        ALT: () => {
                            this.SUBRULE(this.RuleC)
                            return 1
                        }
                    }
                ])
            })

            RuleB = this.RULE("RuleB", () => {
                this.MANY(() => this.CONSUME(A))
            })

            RuleC = this.RULE("RuleC", () => {
                this.MANY(() => this.CONSUME(A))
                this.OPTION(() => this.CONSUME(B))
            })

            AltRuleWithEOF = this.RULE("AltRuleWithEOF", () => {
                return this.OR([
                    {
                        ALT: () => {
                            this.SUBRULE1(this.RuleEOF)
                            return 0
                        }
                    },
                    {
                        ALT: () => {
                            this.SUBRULE2(this.RuleEOF)
                            return 1
                        }
                    }
                ])
            })

            RuleEOF = this.RULE("RuleEOF", () => {
                this.MANY1(() => this.CONSUME(A))
                this.CONSUME(EOF)
            })

            AltRuleWithPred = this.RULE("AltRuleWithPred", (pred?: boolean) => {
                return this.OR([
                    {
                        ALT: () => {
                            this.CONSUME1(A)
                            return 0
                        },
                        GATE: () => (pred === undefined ? true : pred)
                    },
                    {
                        ALT: () => {
                            this.CONSUME2(A)
                            return 1
                        },
                        GATE: () => (pred === undefined ? true : !pred)
                    },
                    {
                        ALT: () => {
                            this.CONSUME(B)
                            return 2
                        }
                    }
                ])
            })

            AltWithOption = this.RULE("AltWithOption", () => {
                const intermediate = this.OR([
                    {
                        ALT: () => {
                            this.CONSUME1(A)
                            return 2
                        }
                    },
                    {
                        ALT: () => {
                            this.CONSUME2(B)
                            return 4
                        }
                    }
                ])
                const option = this.OPTION(() => {
                    this.CONSUME3(A);
                    return 1;
                })
                return (option ?? 0) + intermediate;
            })
        }

        it("Should pick option on ambiguity", () => {
            const parser = new AmbigiousParser()
            parser.input = [
                createRegularToken(A),
                createRegularToken(A),
                createRegularToken(A)
            ]
            const result = parser.OptionRule()
            expect(result).toBeTruthy();
            // The rule nests a `AT_LEAST_ONE` inside and outside the OPTION
            // Both productions produce lookahead ambiguities
            expect(parser.ambiguityReports[0]).toMatch("<0, 1> in <OPTION>")
            expect(parser.ambiguityReports[1]).toMatch("<0, 1> in <AT_LEAST_ONE1>")
        })

        it("Should pick first alternative on ambiguity", () => {
            const parser = new AmbigiousParser()
            parser.input = [
                createRegularToken(A),
                createRegularToken(A),
                createRegularToken(A)
            ]
            const result = parser.AltRule()
            expect(result).toBe(0);
            expect(parser.ambiguityReports[0]).toMatch("<0, 1> in <OR>")
        })

        it("Should pick first alternative on EOF ambiguity", () => {
            const parser = new AmbigiousParser()
            parser.input = []
            const result = parser.AltRuleWithEOF()
            expect(result).toBe(0);
            expect(parser.ambiguityReports[0]).toMatch("<0, 1> in <OR>")
        })

        it("Should pick correct alternative on long prefix", () => {
            const parser = new AmbigiousParser()
            parser.input = [
                createRegularToken(A),
                createRegularToken(A),
                createRegularToken(B)
            ]
            const result = parser.AltRule()
            expect(result).toBe(1);
            expect(parser.ambiguityReports).toHaveLength(0);
        })

        it("Should resolve ambiguity using predicate", () => {
            const parser = new AmbigiousParser()
            parser.input = [createRegularToken(A)]
            const resultAutomatic = parser.AltRuleWithPred(undefined)
            // Automatically resolving the ambiguity should return `0`
            expect(resultAutomatic).toBe(0);
            // It should also create an ambiguity report
            expect(parser.ambiguityReports[0]).toMatch("<0, 1> in <OR>")
            parser.ambiguityReports = []
            parser.input = [createRegularToken(A)]
            const resultTrue = parser.AltRuleWithPred(true)
            expect(resultTrue).toBe(0);
            parser.input = [createRegularToken(A)]
            const resultFalse = parser.AltRuleWithPred(false)
            expect(resultFalse).toBe(1),
            expect(parser.ambiguityReports).toHaveLength(0);
        })

        it("Should pick non-ambigious alternative inside of ambigious, predicated alternation", () => {
            const parser = new AmbigiousParser()
            parser.input = [createRegularToken(B)]
            const result = parser.AltRuleWithPred(undefined)
            expect(result).toBe(2);
            expect(parser.ambiguityReports).toHaveLength(0);
        })

        it("Should work with alternatives followed by optional elements", () => {
            const parser = new AmbigiousParser();
            parser.input = [createRegularToken(B), createRegularToken(A)];
            const result = parser.AltWithOption();
            expect(result).toBe(5);
        })
    })
})

function createRegularToken(
    tokType: TokenType,
    image = "",
    startOffset = 1,
    startLine?: number,
    startColumn?: number,
    endOffset?: number,
    endLine?: number,
    endColumn?: number
): IToken {
    return {
        image: image,
        startOffset: startOffset,
        startLine: startLine,
        startColumn: startColumn,
        endOffset: endOffset,
        endLine: endLine,
        endColumn: endColumn,
        tokenTypeIdx: tokType.tokenTypeIdx!,
        tokenType: tokType
    }
}
