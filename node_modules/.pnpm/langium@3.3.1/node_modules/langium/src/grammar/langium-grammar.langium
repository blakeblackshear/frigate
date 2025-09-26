// ******************************************************************************
// Copyright 2021 TypeFox GmbH
// This program and the accompanying materials are made available under the
// terms of the MIT License, which is available in the project root.
// *****************************************************************************

grammar LangiumGrammar

entry Grammar:
    (
        isDeclared?='grammar' name=ID ('with' usedGrammars+=[Grammar:ID] (',' usedGrammars+=[Grammar:ID])*)?
        (definesHiddenTokens?='hidden' '(' (hiddenTokens+=[AbstractRule:ID] (',' hiddenTokens+=[AbstractRule:ID])*)? ')')?
    )?
    imports+=GrammarImport*
    (rules+=AbstractRule | interfaces+=Interface | types+=Type)+;

Interface:
    'interface' name=ID
    ('extends' superTypes+=[AbstractType:ID] (',' superTypes+=[AbstractType:ID])*)?
    '{' 
        attributes+=TypeAttribute* 
    '}'
';'?;

TypeAttribute:
    name=FeatureName (isOptional?='?')? ':' type=TypeDefinition ('=' defaultValue=ValueLiteral)? ';'?;

ValueLiteral:
    StringLiteral | NumberLiteral | BooleanLiteral | ArrayLiteral;

StringLiteral:
    value=STRING;
NumberLiteral:
    value=NUMBER;
BooleanLiteral:
    true?='true' | 'false';
ArrayLiteral:
    '[' (elements+=ValueLiteral (',' elements+=ValueLiteral)*)? ']';

TypeDefinition: UnionType;

UnionType infers TypeDefinition:
    ArrayType ({infer UnionType.types+=current} ('|' types+=ArrayType)+)?;

ArrayType infers TypeDefinition:
    ReferenceType ({infer ArrayType.elementType=current} '[' ']')? ;

ReferenceType infers TypeDefinition:
    SimpleType |
    {infer ReferenceType} '@' referenceType=SimpleType;

SimpleType infers TypeDefinition:
    '(' TypeDefinition ')' |
    {infer SimpleType} (typeRef=[AbstractType:ID] | primitiveType=PrimitiveType | stringType=STRING);

PrimitiveType returns string:
    'string' | 'number' | 'boolean' | 'Date' | 'bigint';

type AbstractType = Interface | Type | ParserRule | InferredType;

Type:
    'type' name=ID '=' type=TypeDefinition ';'?;

AbstractRule:
    ParserRule | TerminalRule;

GrammarImport:
    'import' path=STRING ';'?;

ParserRule:
    (entry?='entry' | fragment?='fragment')?
    RuleNameAndParams
    (wildcard?='*' | ('returns' (returnType=[AbstractType:ID] | dataType=PrimitiveType)) | inferredType=InferredType<false>)?
    (definesHiddenTokens?='hidden' '(' (hiddenTokens+=[AbstractRule:ID] (',' hiddenTokens+=[AbstractRule:ID])*)? ')')? ':'
    definition=Alternatives ';';

InferredType<imperative>:
    (<imperative> 'infer' | <!imperative> 'infers') name=ID;

fragment RuleNameAndParams:
    name=ID ('<' (parameters+=Parameter (',' parameters+=Parameter)*)? '>')?;

Parameter:
    name=ID;

Alternatives infers AbstractElement:
    ConditionalBranch ({infer Alternatives.elements+=current} ('|' elements+=ConditionalBranch)+)?;

ConditionalBranch infers AbstractElement:
    UnorderedGroup
    | {infer Group} '<' guardCondition=Disjunction '>' (elements+=AbstractToken)+;

UnorderedGroup infers AbstractElement:
    Group ({infer UnorderedGroup.elements+=current} ('&' elements+=Group)+)?;

Group infers AbstractElement:
    AbstractToken ({infer Group.elements+=current} elements+=AbstractToken+)?;

AbstractToken infers AbstractElement:
    AbstractTokenWithCardinality |
    Action;

AbstractTokenWithCardinality infers AbstractElement:
    (Assignment | AbstractTerminal) cardinality=('?'|'*'|'+')?;

Action infers AbstractElement:
    {infer Action} '{' (type=[AbstractType:ID] | inferredType=InferredType<true>) ('.' feature=FeatureName operator=('='|'+=') 'current')? '}';

AbstractTerminal infers AbstractElement:
    Keyword |
    RuleCall |
    ParenthesizedElement |
    PredicatedKeyword |
    PredicatedRuleCall |
    PredicatedGroup |
    EndOfFile
    ;

EndOfFile: 
    {infer EndOfFile} 'EOF';

Keyword:
    value=STRING;

RuleCall:
    rule=[AbstractRule:ID] ('<' arguments+=NamedArgument (',' arguments+=NamedArgument)* '>')?;

NamedArgument:
    ( parameter=[Parameter:ID] calledByName?='=')?
    ( value=Disjunction );

Disjunction infers Condition:
    Conjunction ({infer Disjunction.left=current} '|' right=Conjunction)*;

Conjunction infers Condition:
    Negation ({infer Conjunction.left=current} '&' right=Negation)*;

Negation infers Condition:
    Atom | {infer Negation} '!' value=Negation;

Atom infers Condition:
    ParameterReference | ParenthesizedCondition | BooleanLiteral;

ParenthesizedCondition infers Condition:
    '(' Disjunction ')';

ParameterReference:
    parameter=[Parameter:ID];

PredicatedKeyword infers Keyword:
    ('=>' | '->') value=STRING;

PredicatedRuleCall infers RuleCall:
    ('=>' | '->') rule=[AbstractRule:ID] ('<' arguments+=NamedArgument (',' arguments+=NamedArgument)* '>')?;

Assignment infers AbstractElement:
    {infer Assignment} ('=>' | '->')? feature=FeatureName operator=('+='|'='|'?=') terminal=AssignableTerminal;

AssignableTerminal infers AbstractElement:
    Keyword | RuleCall | ParenthesizedAssignableElement | CrossReference;

ParenthesizedAssignableElement infers AbstractElement:
    '(' AssignableAlternatives ')';

AssignableAlternatives infers AbstractElement:
    AssignableTerminal ({infer Alternatives.elements+=current} ('|' elements+=AssignableTerminal)+)?;

CrossReference infers AbstractElement:
    {infer CrossReference} '[' type=[AbstractType] ((deprecatedSyntax?='|' | ':') terminal=CrossReferenceableTerminal )? ']';

CrossReferenceableTerminal infers AbstractElement:
    Keyword | RuleCall;

ParenthesizedElement infers AbstractElement:
    '(' Alternatives ')';

PredicatedGroup infers Group:
    ('=>' | '->') '(' elements+=Alternatives ')';

ReturnType:
    name=(PrimitiveType | ID);

TerminalRule:
    hidden?='hidden'? 'terminal' (fragment?='fragment' name=ID | name=ID ('returns' type=ReturnType)?) ':'
        definition=TerminalAlternatives
    ';';

TerminalAlternatives infers AbstractElement:
    TerminalGroup ({infer TerminalAlternatives.elements+=current} '|' elements+=TerminalGroup)*;

TerminalGroup infers AbstractElement:
    TerminalToken ({infer TerminalGroup.elements+=current} elements+=TerminalToken+)?;

TerminalToken infers AbstractElement:
    TerminalTokenElement cardinality=('?'|'*'|'+')?;

TerminalTokenElement infers AbstractElement:
    CharacterRange | TerminalRuleCall | ParenthesizedTerminalElement | NegatedToken | UntilToken | RegexToken | Wildcard;

ParenthesizedTerminalElement infers AbstractElement:
    '(' (lookahead=('?='|'?!'|'?<='|'?<!'))? TerminalAlternatives ')';

TerminalRuleCall infers AbstractElement:
    {infer TerminalRuleCall} rule=[TerminalRule:ID];

NegatedToken infers AbstractElement:
    {infer NegatedToken} '!' terminal=TerminalTokenElement;

UntilToken infers AbstractElement:
    {infer UntilToken} '->' terminal=TerminalTokenElement;

RegexToken infers AbstractElement:
    {infer RegexToken} regex=RegexLiteral;

Wildcard infers AbstractElement:
    {infer Wildcard} '.';

CharacterRange infers AbstractElement:
    {infer CharacterRange} left=Keyword ('..' right=Keyword)?;

FeatureName returns string:
    'current' | 'entry' | 'extends' | 'false' | 'fragment' | 'grammar' | 'hidden' | 'import' | 'interface' | 'returns' | 'terminal' | 'true' | 'type' | 'infer' | 'infers' | 'with' | PrimitiveType | ID;

terminal ID: /\^?[_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal NUMBER returns number: /NaN|-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?|Infinity)/;
terminal RegexLiteral returns string: /\/(?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\/[a-z]*/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
