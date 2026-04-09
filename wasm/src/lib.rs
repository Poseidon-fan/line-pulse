use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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

    let colors: HashMap<&str, &str> = [
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
        ("HTML", "#e34c26"),
        ("CSS", "#563d7c"),
        ("Shell", "#89e051"),
        ("JSON", "#292929"),
        ("Markdown", "#083fa1"),
        ("YAML", "#cb171e"),
        ("SQL", "#e38c00"),
        ("Dockerfile", "#384d54"),
        ("C#", "#178600"),
        ("Scala", "#c22d40"),
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
        ("HAML", "#ECE2CE"),
        ("SASS", "#A53B70"),
        ("SCSS", "#C6538C"),
        ("LESS", "#1d365d"),
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
        ("gRPC", "#418B9E"),
        ("Caddyfile", "#5F7D58"),
        ("Nginx", "#009639"),
        ("Apache", "#D22128"),
        ("Vim script", "#199F4B"),
        ("Emacs Lisp", "#064e8b"),
        ("Vim script", "#199F4B"),
        ("PowerShell", "#012456"),
        ("Batch", "#C1F12E"),
        ("AutoHotkey", "#6594b9"),
        ("NSIS", "#5C4EE5"),
        ("Inno Setup", "#2648BD"),
        ("WiX", "#0C4A33"),
        ("Blade", "#F7523F"),
        ("Liquid", "#71B41D"),
        ("Smarty", "#B3DE2B"),
        ("Jinja", "#B71325"),
        ("Handlebars", "#f1572c"),
        ("Mustache", "#724B0B"),
        ("EJS", "#B4AB72"),
        ("Pug", "#A86454"),
        ("Jade", "#00A8A8"),
        ("Racket", "#3C5C8D"),
        ("Scheme", "#1D4C73"),
        ("Common Lisp", "#3FB68B"),
        ("Julia", "#A270BA"),
        ("Fortran", "#4D4D4D"),
        ("Pascal", "#B0C682"),
        ("Delphi", "#EEE4C4"),
        ("Objective-C", "#438EFF"),
        ("Objective-C++", "#686E4E"),
        ("Zig", "#EC915C"),
        ("Nim", "#FFC200"),
        ("Crystal", "#000100"),
        ("V", "#4F87C4"),
        ("Solidity", "#AA6746"),
        ("Move", "#4D4D4D"),
        ("Other", "#cccccc"),
    ].iter().cloned().collect();

    for (filename, content) in &files {
        let ext = filename.split('.').last().unwrap_or("");
        let lang = detect_language(filename, ext);

        let line_count = content.lines().count();
        total_lines += line_count;
        file_count += 1;

        *language_stats.entry(lang.to_string()).or_insert(0) += line_count;
    }

    let mut languages: Vec<LanguageStats> = language_stats
        .into_iter()
        .map(|(name, lines)| LanguageStats {
            name: name.clone(),
            lines,
            color: colors.get(name.as_str()).unwrap_or(&"#cccccc").to_string(),
        })
        .collect();

    languages.sort_by(|a, b| b.lines.cmp(&a.lines));

    let result = AnalysisResult {
        total: total_lines,
        files: file_count,
        languages,
    };

    serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
}

fn detect_language(filename: &str, ext: &str) -> &'static str {
    match ext {
        // JavaScript family
        "js" | "mjs" | "cjs" | "jsx" | "mj" | "cjsx" => "JavaScript",
        "ts" | "tsx" | "mts" | "cts" | "d.ts" => "TypeScript",
        "vue" => "Vue",
        "svelte" => "Svelte",

        // Python
        "py" | "pyw" | "pyx" | "pyi" | "rpy" | "cpython" => "Python",

        // Rust
        "rs" | "rlib" => "Rust",

        // Go
        "go" => "Go",

        // Java family
        "java" => "Java",
        "kt" | "kts" | "ktm" => "Kotlin",
        "scala" | "sc" => "Scala",
        "groovy" => "Groovy",
        "gradle" => "Gradle",

        // C family
        "c" | "h" => "C",
        "cpp" | "cc" | "cxx" | "c++" | "hpp" | "hxx" | "hh" | "h++" => "C++",
        "cs" | "csharp" => "C#",
        "m" | "mm" | "objc" | "objcpp" => "Objective-C",

        // Web
        "html" | "htm" | "xhtml" => "HTML",
        "css" | "scss" | "sass" | "less" | "pcss" | "postcss" => "CSS",
        "xml" | "xsl" | "xslt" => "XML",
        "svg" => "SVG",

        // Shell
        "sh" | "bash" | "zsh" | "fish" | "ksh" | "csh" | "tcsh" | "ps1" | "psm1" => "Shell",
        "bat" | "cmd" | "batch" | "btm" => "Batch",

        // Data formats
        "json" => "JSON",
        "yaml" | "yml" => "YAML",
        "toml" => "TOML",
        "ini" | "cfg" | "conf" | "properties" => "INI",

        // Database
        "sql" | "pgsql" => "SQL",
        "prql" => "PRQL",

        // Documentation
        "md" | "markdown" | "mdown" | "mkd" | "mkdn" => "Markdown",
        "tex" | "latex" | "ltx" => "LaTeX",

        // DevOps
        "dockerfile" | "docker" => "Dockerfile",
        "tf" | "hcl" | "terraform" => "Terraform",
        "vagrantfile" => "Vagrant",
        "nginx" => "Nginx",
        "apache" => "Apache",

        // Build tools
        "makefile" | "gnumakefile" | "mk" => "Makefile",
        "cmake" | "CMakeLists.txt" => "CMake",
        "ninja" => "Ninja",

        // Scripting
        "rb" | "erb" | "rake" | "gemspec" => "Ruby",
        "php" | "php3" | "php4" | "php5" | "php7" | "php8" => "PHP",
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
        "cr" | "crystal" => "Crystal",
        "v" | "vv" => "V",
        "sol" => "Solidity",
        "move" => "Move",

        // Other
        "asm" | "s" | "S" | "inc" => "Assembly",
        "pas" | "pp" => "Pascal",
        "lisp" | "scm" | "ss" | "rkt" => "Scheme",
        "vim" | "vimrc" | "gvimrc" => "Vim script",
        "el" | "elc" => "Emacs Lisp",
        "ahk" | "ahkl" => "AutoHotkey",
        "au3" => "AutoIt",
        "nsis" => "NSIS",
        "iss" => "Inno Setup",
        "blade" | "blade.php" => "Blade",
        "liquid" => "Liquid",
        "smarty" | "tpl" => "Smarty",
        "jinja" | "jinja2" => "Jinja",
        "handlebars" | "hbs" => "Handlebars",
        "mustache" => "Mustache",
        "ejs" | "ect" => "EJS",
        "pug" | "jade" => "Pug",

        // Config & misc
        "graphql" | "gql" => "GraphQL",
        "proto" | "protobuf" => "protobuf",
        "caddyfile" => "Caddyfile",
        "lock" => "Lock",
        "txt" | "text" => "Text",

        _ => detect_by_filename(filename),
    }
}

fn detect_by_filename(filename: &str) -> &'static str {
    let name = filename.to_lowercase();
    match name.as_str() {
        "makefile" | "gnumakefile" | "kbuild" => "Makefile",
        "dockerfile" => "Dockerfile",
        "jenkinsfile" => "Jenkins",
        "cmakelists.txt" => "CMake",
        "build.gradle" | "build.gradle.kts" => "Gradle",
        "pom.xml" => "Maven",
        "package.json" => "JSON",
        "tsconfig.json" => "JSON",
        ".gitignore" | ".dockerignore" | ".editorconfig" => "Config",
        ".env" | ".env.local" | ".env.example" => "Env",
        "gemfile" | "rakefile" => "Ruby",
        "cargo.toml" | "cargo.lock" => "Rust",
        "go.mod" | "go.sum" => "Go",
        "pubspec.yaml" => "Dart",
        "mix.exs" | "mix.lock" => "Elixir",
        "rebar.config" | "rebar.lock" => "Erlang",
        "project.clj" | "deps.edn" => "Clojure",
        "stack.yaml" | "package.yaml" => "Haskell",
        "composer.json" => "PHP",
        "requirements.txt" | "pipfile" | "pyproject.toml" => "Python",
        "package-lock.json" | "yarn.lock" | "pnpm-lock.yaml" => "Lock",
        "vercel.json" | "next.config.js" | "nuxt.config.js" => "Config",
        "webpack.config.js" | "vite.config.ts" | "rollup.config.js" => "Config",
        "babel.config.js" | ".babelrc" => "Config",
        ".eslintrc" | "eslint.config.js" => "Config",
        "tslint.json" | ".prettierrc" => "Config",
        _ => "Other",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_language() {
        assert_eq!(detect_language("main.rs", "rs"), "Rust");
        assert_eq!(detect_language("app.ts", "ts"), "TypeScript");
        assert_eq!(detect_language("style.css", "css"), "CSS");
    }

    #[test]
    fn test_analyze_code() {
        let files = r#"{"src/main.rs":"fn main() {}\n","src/lib.rs":"pub fn test() {}\n"}"#;
        let result = analyze_code(files);
        assert!(result.contains("Rust"));
    }
}