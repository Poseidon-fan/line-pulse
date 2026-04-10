use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone)]
pub struct LanguageStats {
    pub name: String,
    pub lines: usize,
    pub color: String,
}

#[derive(Serialize, Deserialize)]
pub struct AnalysisResult {
    pub total: usize,
    pub files: usize,
    pub languages: Vec<LanguageStats>,
}

static COLORS: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
    HashMap::from([
        ("JavaScript", "#f1e05a"),
        ("TypeScript", "#3178c6"),
        ("Python", "#3572A5"),
        ("Rust", "#dea584"),
        ("Go", "#00ADD8"),
        ("Java", "#b07219"),
        ("C++", "#f34b7d"),
        ("C", "#555555"),
        ("Ruby", "#701516"),
        ("PHP", "#4F5D95"),
        ("Swift", "#F05138"),
        ("Kotlin", "#A97BFF"),
        ("Vue", "#41b883"),
        ("Svelte", "#ff3e00"),
        ("HTML", "#e34c26"),
        ("CSS", "#563d7c"),
        ("SCSS", "#C6538C"),
        ("SASS", "#A53B70"),
        ("LESS", "#1d365d"),
        ("Shell", "#89e051"),
        ("JSON", "#292929"),
        ("Markdown", "#083fa1"),
        ("YAML", "#cb171e"),
        ("SQL", "#e38c00"),
        ("Dockerfile", "#384d54"),
        ("C#", "#178600"),
        ("Scala", "#c22d40"),
        ("Groovy", "#4298B8"),
        ("Haskell", "#5e5086"),
        ("Elixir", "#6e4a7e"),
        ("Erlang", "#B83998"),
        ("Clojure", "#db5855"),
        ("OCaml", "#3be133"),
        ("F#", "#b845fc"),
        ("Dart", "#00B4AB"),
        ("R", "#198CE7"),
        ("Lua", "#000080"),
        ("Perl", "#0298c3"),
        ("Tcl", "#e4cc98"),
        ("HAML", "#ECE2CE"),
        ("GraphQL", "#e10098"),
        ("Elm", "#60B5BC"),
        ("PureScript", "#1D222D"),
        ("ReasonML", "#dd4b39"),
        ("TeX", "#3D6117"),
        ("LaTeX", "#3D6117"),
        ("Assembly", "#6E4C13"),
        ("Makefile", "#427819"),
        ("CMake", "#DA3434"),
        ("Ninja", "#8DCC65"),
        ("Gradle", "#02303a"),
        ("Maven", "#C71A36"),
        ("SBT", "#0029B3"),
        ("Nix", "#7E7EFF"),
        ("Terraform", "#5C4EE5"),
        ("Vagrant", "#1868F2"),
        ("INI", "#E6E6E6"),
        ("TOML", "#9C4121"),
        ("XML", "#0060AC"),
        ("SVG", "#FFB13B"),
        ("protobuf", "#418B9E"),
        ("Caddyfile", "#5F7D58"),
        ("Nginx", "#009639"),
        ("Apache", "#D22128"),
        ("Vim script", "#199F4B"),
        ("Emacs Lisp", "#064e8b"),
        ("PowerShell", "#012456"),
        ("Batch", "#C1F12E"),
        ("AutoHotkey", "#6594b9"),
        ("AutoIt", "#1C3552"),
        ("NSIS", "#5C4EE5"),
        ("Inno Setup", "#2648BD"),
        ("Blade", "#F7523F"),
        ("Liquid", "#71B41D"),
        ("Smarty", "#B3DE2B"),
        ("Jinja", "#B71325"),
        ("Handlebars", "#f1572c"),
        ("Mustache", "#724B0B"),
        ("EJS", "#B4AB72"),
        ("Pug", "#A86454"),
        ("Racket", "#3C5C8D"),
        ("Scheme", "#1D4C73"),
        ("Common Lisp", "#3FB68B"),
        ("Julia", "#A270BA"),
        ("Fortran", "#4D4D4D"),
        ("Pascal", "#B0C682"),
        ("Delphi", "#EEE4C4"),
        ("Objective-C", "#438EFF"),
        ("Zig", "#EC915C"),
        ("Nim", "#FFC200"),
        ("Crystal", "#000100"),
        ("V", "#4F87C4"),
        ("Solidity", "#AA6746"),
        ("Move", "#4D4D4D"),
        ("PRQL", "#da6a22"),
        ("Other", "#cccccc"),
    ])
});

#[wasm_bindgen]
pub fn analyze_code(files_json: &str) -> String {
    let files: HashMap<String, String> = match serde_json::from_str(files_json) {
        Ok(f) => f,
        Err(_) => return serde_json::to_string(&AnalysisResult {
            total: 0,
            files: 0,
            languages: vec![],
        }).unwrap(),
    };

    let mut language_stats: HashMap<String, usize> = HashMap::new();
    let mut total_lines = 0;
    let mut file_count = 0;

    for (filename, content) in &files {
        let lang = detect_language(filename);
        let line_count = content.lines().count();
        total_lines += line_count;
        file_count += 1;
        *language_stats.entry(lang.to_string()).or_insert(0) += line_count;
    }

    let mut languages: Vec<LanguageStats> = language_stats
        .into_iter()
        .map(|(name, lines)| LanguageStats {
            color: COLORS.get(name.as_str()).unwrap_or(&"#cccccc").to_string(),
            name,
            lines,
        })
        .collect();

    languages.sort_by(|a, b| b.lines.cmp(&a.lines));

    serde_json::to_string(&AnalysisResult {
        total: total_lines,
        files: file_count,
        languages,
    }).unwrap_or_else(|_| "{}".to_string())
}

fn detect_language(filename: &str) -> &'static str {
    // Try filename-based detection first (for files like Dockerfile, Makefile, etc.)
    let basename = filename.rsplit('/').next().unwrap_or(filename);
    if let Some(lang) = detect_by_filename(basename) {
        return lang;
    }

    // Handle compound extensions (e.g., "foo.d.ts", "bar.blade.php")
    if filename.ends_with(".d.ts") {
        return "TypeScript";
    }
    if filename.ends_with(".blade.php") {
        return "Blade";
    }

    // Fall back to simple extension
    let ext = filename.rsplit('.').next().unwrap_or("");
    match ext {
        // JavaScript family
        "js" | "mjs" | "cjs" | "jsx" => "JavaScript",
        "ts" | "tsx" | "mts" | "cts" => "TypeScript",
        "vue" => "Vue",
        "svelte" => "Svelte",

        // Python
        "py" | "pyw" | "pyx" | "pyi" => "Python",

        // Rust
        "rs" => "Rust",

        // Go
        "go" => "Go",

        // Java family
        "java" => "Java",
        "kt" | "kts" => "Kotlin",
        "scala" | "sc" => "Scala",
        "groovy" => "Groovy",
        "gradle" => "Gradle",

        // C family
        "c" | "h" => "C",
        "cpp" | "cc" | "cxx" | "hpp" | "hxx" | "hh" => "C++",
        "cs" => "C#",
        "m" | "mm" => "Objective-C",

        // Web
        "html" | "htm" | "xhtml" => "HTML",
        "css" | "pcss" | "postcss" => "CSS",
        "scss" => "SCSS",
        "sass" => "SASS",
        "less" => "LESS",
        "xml" | "xsl" | "xslt" => "XML",
        "svg" => "SVG",

        // Shell
        "sh" | "bash" | "zsh" | "fish" | "ksh" => "Shell",
        "ps1" | "psm1" => "PowerShell",
        "bat" | "cmd" => "Batch",

        // Data formats
        "json" => "JSON",
        "yaml" | "yml" => "YAML",
        "toml" => "TOML",
        "ini" | "cfg" | "conf" | "properties" => "INI",

        // Database
        "sql" | "pgsql" => "SQL",
        "prql" => "PRQL",

        // Documentation
        "md" | "markdown" | "mdown" => "Markdown",
        "tex" | "latex" | "ltx" => "LaTeX",

        // DevOps
        "tf" | "hcl" => "Terraform",
        "nginx" => "Nginx",

        // Build tools
        "mk" => "Makefile",
        "cmake" => "CMake",
        "ninja" => "Ninja",

        // Scripting
        "rb" | "erb" | "rake" | "gemspec" => "Ruby",
        "php" => "PHP",
        "pl" | "pm" | "pod" => "Perl",
        "lua" => "Lua",
        "tcl" | "tk" => "Tcl",
        "r" | "rdata" | "rds" => "R",
        "jl" => "Julia",

        // Functional
        "hs" | "lhs" => "Haskell",
        "ex" | "exs" => "Elixir",
        "erl" | "hrl" => "Erlang",
        "clj" | "cljs" | "cljc" | "edn" => "Clojure",
        "ml" | "mli" => "OCaml",
        "fs" | "fsx" | "fsi" => "F#",

        // Modern
        "dart" => "Dart",
        "elm" => "Elm",
        "purs" => "PureScript",
        "re" | "rei" => "ReasonML",
        "zig" => "Zig",
        "nim" => "Nim",
        "cr" => "Crystal",
        "v" | "vv" => "V",
        "sol" => "Solidity",
        "move" => "Move",
        "swift" => "Swift",

        // Other
        "asm" | "s" => "Assembly",
        "pas" | "pp" => "Pascal",
        "lisp" | "scm" | "ss" | "rkt" => "Scheme",
        "vim" | "vimrc" => "Vim script",
        "el" | "elc" => "Emacs Lisp",
        "ahk" => "AutoHotkey",
        "au3" => "AutoIt",
        "nsis" => "NSIS",
        "iss" => "Inno Setup",
        "liquid" => "Liquid",
        "smarty" | "tpl" => "Smarty",
        "jinja" | "jinja2" => "Jinja",
        "handlebars" | "hbs" => "Handlebars",
        "mustache" => "Mustache",
        "ejs" => "EJS",
        "pug" | "jade" => "Pug",

        // Config & misc
        "graphql" | "gql" => "GraphQL",
        "proto" | "protobuf" => "protobuf",
        "caddyfile" => "Caddyfile",
        "lock" => "Lock",
        "txt" | "text" => "Text",

        _ => "Other",
    }
}

fn detect_by_filename(basename: &str) -> Option<&'static str> {
    let lower = basename.to_lowercase();
    match lower.as_str() {
        "makefile" | "gnumakefile" | "kbuild" => Some("Makefile"),
        "dockerfile" => Some("Dockerfile"),
        "jenkinsfile" => Some("Jenkins"),
        "cmakelists.txt" => Some("CMake"),
        "build.gradle" | "build.gradle.kts" => Some("Gradle"),
        "pom.xml" => Some("Maven"),
        "gemfile" | "rakefile" => Some("Ruby"),
        "vagrantfile" => Some("Vagrant"),
        ".gitignore" | ".dockerignore" | ".editorconfig" => Some("Config"),
        ".env" | ".env.local" | ".env.example" => Some("Env"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_language() {
        assert_eq!(detect_language("src/main.rs"), "Rust");
        assert_eq!(detect_language("app.ts"), "TypeScript");
        assert_eq!(detect_language("types.d.ts"), "TypeScript");
        assert_eq!(detect_language("style.css"), "CSS");
        assert_eq!(detect_language("style.scss"), "SCSS");
        assert_eq!(detect_language("Makefile"), "Makefile");
        assert_eq!(detect_language("Dockerfile"), "Dockerfile");
        assert_eq!(detect_language("CMakeLists.txt"), "CMake");
        assert_eq!(detect_language("views/index.blade.php"), "Blade");
    }

    #[test]
    fn test_analyze_code() {
        let files = r#"{"src/main.rs":"fn main() {}\n","src/lib.rs":"pub fn test() {}\n"}"#;
        let result = analyze_code(files);
        assert!(result.contains("Rust"));
    }
}
