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
        ("GraphQL", "#e10098"),
        ("Elm", "#60B5BC"),
        ("PureScript", "#1D222D"),
        ("ReasonML", "#dd4b39"),
        ("LaTeX", "#3D6117"),
        ("Assembly", "#6E4C13"),
        ("Makefile", "#427819"),
        ("CMake", "#DA3434"),
        ("Ninja", "#8DCC65"),
        ("Gradle", "#02303a"),
        ("Terraform", "#5C4EE5"),
        ("Vagrant", "#1868F2"),
        ("protobuf", "#418B9E"),
        ("Caddyfile", "#5F7D58"),
        ("Nginx", "#009639"),
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
        ("Scheme", "#1D4C73"),
        ("Julia", "#A270BA"),
        ("Pascal", "#B0C682"),
        ("Objective-C", "#438EFF"),
        ("Zig", "#EC915C"),
        ("Nim", "#FFC200"),
        ("Crystal", "#000100"),
        ("V", "#4F87C4"),
        ("Solidity", "#AA6746"),
        ("Move", "#4D4D4D"),
        ("PRQL", "#da6a22"),
        ("Jenkins", "#D24939"),
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
        let lang = match detect_language(filename) {
            Some(l) => l,
            None => continue,
        };
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

fn detect_language(filename: &str) -> Option<&'static str> {
    // Try filename-based detection first (for files like Dockerfile, Makefile, etc.)
    let basename = filename.rsplit('/').next().unwrap_or(filename);
    if let Some(lang) = detect_by_filename(basename) {
        return Some(lang);
    }

    // Handle compound extensions (e.g., "foo.d.ts", "bar.blade.php")
    if filename.ends_with(".d.ts") {
        return Some("TypeScript");
    }
    if filename.ends_with(".blade.php") {
        return Some("Blade");
    }

    // Fall back to simple extension
    let ext = filename.rsplit('.').next().unwrap_or("");
    match ext {
        // JavaScript family
        "js" | "mjs" | "cjs" | "jsx" => Some("JavaScript"),
        "ts" | "tsx" | "mts" | "cts" => Some("TypeScript"),
        "vue" => Some("Vue"),
        "svelte" => Some("Svelte"),

        // Python
        "py" | "pyw" | "pyx" | "pyi" => Some("Python"),

        // Rust
        "rs" => Some("Rust"),

        // Go
        "go" => Some("Go"),

        // Java family
        "java" => Some("Java"),
        "kt" | "kts" => Some("Kotlin"),
        "scala" | "sc" => Some("Scala"),
        "groovy" => Some("Groovy"),
        "gradle" => Some("Gradle"),

        // C family
        "c" | "h" => Some("C"),
        "cpp" | "cc" | "cxx" | "hpp" | "hxx" | "hh" => Some("C++"),
        "cs" => Some("C#"),
        "m" | "mm" => Some("Objective-C"),

        // Web
        "html" | "htm" | "xhtml" => Some("HTML"),
        "css" | "pcss" | "postcss" => Some("CSS"),
        "scss" => Some("SCSS"),
        "sass" => Some("SASS"),
        "less" => Some("LESS"),

        // Shell
        "sh" | "bash" | "zsh" | "fish" | "ksh" => Some("Shell"),
        "ps1" | "psm1" => Some("PowerShell"),
        "bat" | "cmd" => Some("Batch"),

        // Database
        "sql" | "pgsql" => Some("SQL"),
        "prql" => Some("PRQL"),

        // Documentation (code-like)
        "tex" | "latex" | "ltx" => Some("LaTeX"),

        // DevOps
        "tf" | "hcl" => Some("Terraform"),
        "nginx" => Some("Nginx"),

        // Build tools
        "mk" => Some("Makefile"),
        "cmake" => Some("CMake"),
        "ninja" => Some("Ninja"),

        // Scripting
        "rb" | "erb" | "rake" | "gemspec" => Some("Ruby"),
        "php" => Some("PHP"),
        "pl" | "pm" | "pod" => Some("Perl"),
        "lua" => Some("Lua"),
        "tcl" | "tk" => Some("Tcl"),
        "r" | "rdata" | "rds" => Some("R"),
        "jl" => Some("Julia"),

        // Functional
        "hs" | "lhs" => Some("Haskell"),
        "ex" | "exs" => Some("Elixir"),
        "erl" | "hrl" => Some("Erlang"),
        "clj" | "cljs" | "cljc" | "edn" => Some("Clojure"),
        "ml" | "mli" => Some("OCaml"),
        "fs" | "fsx" | "fsi" => Some("F#"),

        // Modern
        "dart" => Some("Dart"),
        "elm" => Some("Elm"),
        "purs" => Some("PureScript"),
        "re" | "rei" => Some("ReasonML"),
        "zig" => Some("Zig"),
        "nim" => Some("Nim"),
        "cr" => Some("Crystal"),
        "v" | "vv" => Some("V"),
        "sol" => Some("Solidity"),
        "move" => Some("Move"),
        "swift" => Some("Swift"),

        // Other programming
        "asm" | "s" => Some("Assembly"),
        "pas" | "pp" => Some("Pascal"),
        "lisp" | "scm" | "ss" | "rkt" => Some("Scheme"),
        "vim" | "vimrc" => Some("Vim script"),
        "el" | "elc" => Some("Emacs Lisp"),
        "ahk" => Some("AutoHotkey"),
        "au3" => Some("AutoIt"),
        "nsis" => Some("NSIS"),
        "iss" => Some("Inno Setup"),
        "liquid" => Some("Liquid"),
        "smarty" | "tpl" => Some("Smarty"),
        "jinja" | "jinja2" => Some("Jinja"),
        "handlebars" | "hbs" => Some("Handlebars"),
        "mustache" => Some("Mustache"),
        "ejs" => Some("EJS"),
        "pug" | "jade" => Some("Pug"),

        // Query & schema
        "graphql" | "gql" => Some("GraphQL"),
        "proto" | "protobuf" => Some("protobuf"),
        "caddyfile" => Some("Caddyfile"),

        // Non-code: data, config, prose, generated → skip
        // json, yaml, yml, toml, xml, xsl, xslt, svg,
        // ini, cfg, conf, properties, md, markdown, mdown,
        // txt, text, lock, and all unrecognized extensions
        _ => None,
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
        "gemfile" | "rakefile" => Some("Ruby"),
        "vagrantfile" => Some("Vagrant"),
        // Non-code filenames → skip
        // pom.xml, .gitignore, .dockerignore, .editorconfig, .env, etc.
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_language() {
        assert_eq!(detect_language("src/main.rs"), Some("Rust"));
        assert_eq!(detect_language("app.ts"), Some("TypeScript"));
        assert_eq!(detect_language("types.d.ts"), Some("TypeScript"));
        assert_eq!(detect_language("style.css"), Some("CSS"));
        assert_eq!(detect_language("style.scss"), Some("SCSS"));
        assert_eq!(detect_language("Makefile"), Some("Makefile"));
        assert_eq!(detect_language("Dockerfile"), Some("Dockerfile"));
        assert_eq!(detect_language("CMakeLists.txt"), Some("CMake"));
        assert_eq!(detect_language("views/index.blade.php"), Some("Blade"));
    }

    #[test]
    fn test_non_code_files_skipped() {
        assert_eq!(detect_language("package.json"), None);
        assert_eq!(detect_language("config.yaml"), None);
        assert_eq!(detect_language("settings.toml"), None);
        assert_eq!(detect_language("README.md"), None);
        assert_eq!(detect_language("notes.txt"), None);
        assert_eq!(detect_language("bun.lock"), None);
        assert_eq!(detect_language("data.xml"), None);
        assert_eq!(detect_language("icon.svg"), None);
        assert_eq!(detect_language("app.ini"), None);
        assert_eq!(detect_language("unknown.xyz"), None);
    }

    #[test]
    fn test_analyze_code() {
        let files = r#"{"src/main.rs":"fn main() {}\n","src/lib.rs":"pub fn test() {}\n"}"#;
        let result = analyze_code(files);
        assert!(result.contains("Rust"));
    }

    #[test]
    fn test_analyze_code_skips_non_code() {
        let files = r##"{"src/main.rs":"fn main() {}\n","package.json":"{}\n","README.md":"Hello\n"}"##;
        let result = analyze_code(files);
        let parsed: AnalysisResult = serde_json::from_str(&result).unwrap();
        // Only main.rs should be counted
        assert_eq!(parsed.files, 1);
        assert_eq!(parsed.languages.len(), 1);
        assert_eq!(parsed.languages[0].name, "Rust");
    }
}
