export type CodeSampleLanguage = "C" | "C#" | "C++" | "CoffeeScript" | "CSS" | "Dart" | "DM" | "Elixir" | "Go" | "Groovy" | "HTML" | "Java" | "JavaScript" | "Kotlin" | "Objective-C" | "OCaml" | "Perl" | "PHP" | "PowerShell" | "Python" | "R" | "Ruby" | "Rust" | "Scala" | "Shell" | "Swift" | "TypeScript";
export interface Language {
    highlight: string;
    language: string;
    codeSampleLanguage: CodeSampleLanguage;
    logoClass: string;
    variant: string;
    variants: string[];
    options?: {
        [key: string]: boolean;
    };
    sample?: string;
    samples?: string[];
    samplesSources?: string[];
    samplesLabels?: string[];
}
export interface CodeSample {
    source: string;
    lang: CodeSampleLanguage;
    label?: string;
}
