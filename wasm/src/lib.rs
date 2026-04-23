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
        // Major languages
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
        ("C#", "#178600"),
        ("Scala", "#c22d40"),
        ("Dart", "#00B4AB"),
        ("R", "#198CE7"),
        ("Julia", "#A270BA"),
        ("Objective-C", "#438EFF"),
        ("Objective-C++", "#6866fb"),

        // Web & frontend
        ("Vue", "#41b883"),
        ("Svelte", "#ff3e00"),
        ("Astro", "#ff5a03"),
        ("HTML", "#e34c26"),
        ("CSS", "#563d7c"),
        ("SCSS", "#C6538C"),
        ("SASS", "#A53B70"),
        ("LESS", "#1d365d"),
        ("Stylus", "#ff6347"),
        ("PostCSS", "#dc3a0c"),
        ("Pug", "#A86454"),
        ("Haml", "#ece2a9"),
        ("EJS", "#B4AB72"),
        ("Handlebars", "#f1572c"),
        ("Mustache", "#724B0B"),
        ("Blade", "#F7523F"),
        ("Liquid", "#71B41D"),
        ("Smarty", "#B3DE2B"),
        ("Jinja", "#B71325"),
        ("Twig", "#c1d026"),
        ("Razor", "#512be4"),

        // Systems & low-level
        ("CUDA", "#3A4E3A"),
        ("Assembly", "#6E4C13"),
        ("D", "#ba595e"),
        ("Zig", "#EC915C"),
        ("Nim", "#FFC200"),
        ("Crystal", "#000100"),
        ("V", "#4F87C4"),
        ("Odin", "#60AFFE"),
        ("C3", "#EC8B31"),
        ("HolyC", "#666666"),
        ("Ada", "#02f88c"),
        ("Pascal", "#B0C682"),
        ("Fortran", "#4d41b1"),
        ("COBOL", "#005CA5"),

        // Functional
        ("Haskell", "#5e5086"),
        ("Elixir", "#6e4a7e"),
        ("Erlang", "#B83998"),
        ("Clojure", "#db5855"),
        ("OCaml", "#3be133"),
        ("F#", "#b845fc"),
        ("Elm", "#60B5BC"),
        ("PureScript", "#1D222D"),
        ("ReasonML", "#dd4b39"),
        ("Standard ML", "#dc566d"),
        ("Common Lisp", "#3fb68b"),
        ("Scheme", "#1D4C73"),
        ("Racket", "#3c5caa"),
        ("Fennel", "#fff3d7"),
        ("Idris", "#b30000"),
        ("Agda", "#315665"),
        ("Lean", "#000000"),
        ("Koka", "#5682c4"),
        ("Gleam", "#ffaff3"),
        ("Roc", "#7c38f5"),

        // Scripting
        ("Lua", "#000080"),
        ("Perl", "#0298c3"),
        ("Raku", "#0000fb"),
        ("Tcl", "#e4cc98"),
        ("Shell", "#89e051"),
        ("PowerShell", "#012456"),
        ("Batch", "#C1F12E"),
        ("Nushell", "#3aa675"),
        ("AWK", "#c30e9b"),
        ("Groovy", "#4298B8"),

        // GPU / Shaders
        ("GLSL", "#5686a5"),
        ("HLSL", "#aace60"),
        ("WGSL", "#1a5e9a"),
        ("Metal", "#a78649"),
        ("ShaderLab", "#222c37"),
        ("OpenCL", "#ed2939"),

        // Data science & numeric
        ("Cython", "#fedf5b"),
        ("Mojo", "#ff4c1a"),
        ("Stan", "#b2011d"),
        ("Wolfram", "#dd1100"),
        ("Nextflow", "#3ac486"),
        ("Snakemake", "#419179"),
        ("APL", "#5A8164"),

        // Blockchain & smart contracts
        ("Solidity", "#AA6746"),
        ("Move", "#4D4D4D"),
        ("Tact", "#2e2e2e"),
        ("Cairo", "#D4A373"),

        // Game dev
        ("GDScript", "#355570"),
        ("GML", "#71b417"),
        ("Processing", "#0096D8"),
        ("Ren'Py", "#ff7f7f"),

        // Hardware description
        ("Verilog", "#b2b7f8"),
        ("SystemVerilog", "#DAE1C2"),
        ("VHDL", "#adb2cb"),
        ("DeviceTree", "#555555"),

        // Config & build
        ("Makefile", "#427819"),
        ("CMake", "#DA3434"),
        ("Ninja", "#8DCC65"),
        ("Gradle", "#02303a"),
        ("Bazel", "#89D42D"),
        ("Just", "#384d54"),
        ("Terraform", "#5C4EE5"),
        ("Bicep", "#519aba"),
        ("Dockerfile", "#384d54"),
        ("Vagrant", "#1868F2"),
        ("Nginx", "#009639"),
        ("Nix", "#7e7eff"),
        ("Dhall", "#dfafff"),

        // Other
        ("GraphQL", "#e10098"),
        ("protobuf", "#418B9E"),
        ("Caddyfile", "#5F7D58"),
        ("Vim script", "#199F4B"),
        ("Emacs Lisp", "#064e8b"),
        ("AutoHotkey", "#6594b9"),
        ("AutoIt", "#1C3552"),
        ("NSIS", "#5C4EE5"),
        ("Inno Setup", "#2648BD"),
        ("PRQL", "#da6a22"),
        ("Jenkins", "#D24939"),
        ("LaTeX", "#3D6117"),
        ("Typst", "#239dad"),
        ("ABAP", "#E8274B"),
        ("ActionScript", "#882B0F"),
        ("Arduino C++", "#bd79d1"),
        ("ATS", "#1ac620"),
        ("Ballerina", "#FF5000"),
        ("Ceylon", "#dfa535"),
        ("Chapel", "#8dc63f"),
        ("CodeQL", "#140f46"),
        ("CoffeeScript", "#244776"),
        ("CUE", "#5886E1"),
        ("Forth", "#341708"),
        ("Futhark", "#5f021f"),
        ("Gherkin", "#5B2063"),
        ("Haxe", "#df7900"),
        ("Janet", "#0886a5"),
        ("Jsonnet", "#0064bd"),
        ("LiveScript", "#499886"),
        ("MoonBit", "#4e49a0"),
        ("MoonScript", "#ff6800"),
        ("Pony", "#d4cb7e"),
        ("Prolog", "#74283c"),
        ("QML", "#44a51c"),
        ("ReScript", "#ed5051"),
        ("Slint", "#2379F4"),
        ("Vala", "#a56de2"),
        ("VBScript", "#15dcdc"),
        ("Visual Basic", "#945db7"),
        ("WebAssembly", "#04133b"),
        ("Xtend", "#24255d"),
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
        "js" | "mjs" | "cjs" => Some("JavaScript"),
        "jsx" => Some("JavaScript"),
        "ts" | "mts" | "cts" => Some("TypeScript"),
        "tsx" => Some("TypeScript"),
        "vue" => Some("Vue"),
        "svelte" => Some("Svelte"),
        "astro" => Some("Astro"),
        "coffee" | "cjsx" => Some("CoffeeScript"),
        "ls" => Some("LiveScript"),

        // Python family
        "py" | "pyw" | "pyi" => Some("Python"),
        "pyx" | "pxd" | "pxi" => Some("Cython"),
        "mojo" => Some("Mojo"),

        // Rust
        "rs" => Some("Rust"),

        // Go
        "go" => Some("Go"),

        // Java family
        "java" => Some("Java"),
        "kt" | "kts" => Some("Kotlin"),
        "scala" | "sc" => Some("Scala"),
        "groovy" | "grt" | "gtpl" | "gvy" => Some("Groovy"),
        "gradle" => Some("Gradle"),
        "xtend" => Some("Xtend"),

        // C family
        "c" | "ec" | "pgc" => Some("C"),
        "h" => Some("C"),
        "cpp" | "cc" | "cxx" | "c++" | "pcc" | "tpp" => Some("C++"),
        "hpp" | "hxx" | "hh" | "inl" | "ipp" => Some("C++"),
        "cs" | "csx" => Some("C#"),
        "m" => Some("Objective-C"),
        "mm" => Some("Objective-C++"),
        "cu" => Some("CUDA"),
        "d" => Some("D"),
        "c3" => Some("C3"),

        // Web markup & style
        "html" | "htm" | "xhtml" => Some("HTML"),
        "css" => Some("CSS"),
        "pcss" | "sss" => Some("PostCSS"),
        "scss" => Some("SCSS"),
        "sass" => Some("SASS"),
        "less" => Some("LESS"),
        "styl" => Some("Stylus"),

        // Shell & scripting
        "sh" | "bash" | "zsh" | "fish" | "ksh" | "csh" => Some("Shell"),
        "ps1" | "psm1" | "psd1" => Some("PowerShell"),
        "bat" | "btm" | "cmd" => Some("Batch"),
        "nu" => Some("Nushell"),
        "awk" => Some("AWK"),

        // Database & query
        "sql" | "pgsql" => Some("SQL"),
        "prql" => Some("PRQL"),
        "graphql" | "gql" => Some("GraphQL"),
        "ql" | "qll" => Some("CodeQL"),

        // Documentation (code-like)
        "tex" | "sty" | "latex" | "ltx" => Some("LaTeX"),
        "typ" => Some("Typst"),

        // DevOps & infrastructure
        "tf" | "hcl" | "tfvars" => Some("Terraform"),
        "bicep" => Some("Bicep"),
        "nginx" => Some("Nginx"),
        "nix" => Some("Nix"),
        "dhall" => Some("Dhall"),

        // Build tools
        "mk" | "mak" => Some("Makefile"),
        "cmake" => Some("CMake"),
        "ninja" => Some("Ninja"),
        "bzl" | "bazel" => Some("Bazel"),
        "just" => Some("Just"),

        // Ruby
        "rb" | "rake" | "gemspec" => Some("Ruby"),
        "erb" | "rhtml" => Some("Ruby"),

        // PHP & templates
        "php" => Some("PHP"),
        "twig" => Some("Twig"),

        // Perl family
        "pl" | "pm" => Some("Perl"),
        "raku" | "rakumod" | "rakutest" | "p6" | "pl6" | "pm6" => Some("Raku"),

        // Lua family
        "lua" | "luau" => Some("Lua"),
        "moon" => Some("MoonScript"),
        "fnl" => Some("Fennel"),

        // Tcl
        "tcl" | "tk" => Some("Tcl"),

        // R
        "r" => Some("R"),

        // Julia
        "jl" => Some("Julia"),

        // Functional languages
        "hs" | "lhs" => Some("Haskell"),
        "ex" | "exs" => Some("Elixir"),
        "erl" | "hrl" => Some("Erlang"),
        "clj" | "cljs" | "cljc" | "edn" => Some("Clojure"),
        "ml" | "mli" => Some("OCaml"),
        "fs" | "fsi" | "fsx" | "fsscript" => Some("F#"),
        "elm" => Some("Elm"),
        "purs" => Some("PureScript"),
        "re" | "rei" => Some("ReasonML"),
        "res" | "resi" => Some("ReScript"),
        "sml" => Some("Standard ML"),
        "gleam" => Some("Gleam"),
        "roc" => Some("Roc"),
        "kk" => Some("Koka"),

        // Lisp family
        "lisp" | "lsp" | "asd" => Some("Common Lisp"),
        "scm" | "ss" => Some("Scheme"),
        "rkt" | "scrbl" => Some("Racket"),
        "el" | "elc" => Some("Emacs Lisp"),
        "hy" => Some("Common Lisp"),

        // Modern / emerging
        "dart" => Some("Dart"),
        "zig" => Some("Zig"),
        "nim" => Some("Nim"),
        "cr" => Some("Crystal"),
        "v" | "vv" => Some("V"),
        "swift" => Some("Swift"),
        "sol" => Some("Solidity"),
        "move" => Some("Move"),
        "tact" => Some("Tact"),
        "cairo" => Some("Cairo"),
        "odin" => Some("Odin"),
        "mbt" | "mbti" => Some("MoonBit"),
        "bal" => Some("Ballerina"),
        "chpl" => Some("Chapel"),
        "ceylon" => Some("Ceylon"),
        "pony" => Some("Pony"),

        // GPU & shader languages
        "glsl" | "vert" | "tesc" | "tese" | "geom" | "frag" | "comp"
        | "mesh" | "task" | "rgen" | "rint" | "rahit" | "rchit" | "rmiss" | "rcall" => Some("GLSL"),
        "hlsl" | "fx" | "fxsub" => Some("HLSL"),
        "wgsl" => Some("WGSL"),
        "metal" => Some("Metal"),
        "shader" | "cginc" => Some("ShaderLab"),
        "cl" | "ocl" => Some("OpenCL"),
        "slint" => Some("Slint"),

        // Hardware description
        "sv" | "svh" => Some("SystemVerilog"),
        "vg" | "vh" => Some("Verilog"),
        "vhd" | "vhdl" => Some("VHDL"),
        "dts" | "dtsi" => Some("DeviceTree"),

        // Classic / legacy
        "ada" | "adb" | "ads" => Some("Ada"),
        "f" | "for" | "ftn" | "f77" | "pfo" => Some("Fortran"),
        "f03" | "f08" | "f90" | "f95" | "fpp" => Some("Fortran"),
        "cob" | "cbl" | "cobol" | "cpy" => Some("COBOL"),
        "pas" => Some("Pascal"),
        "abap" => Some("ABAP"),
        "pro" => Some("Prolog"),
        "4th" | "forth" | "frt" | "fth" => Some("Forth"),
        "vb" => Some("Visual Basic"),
        "vbs" => Some("VBScript"),
        "apl" | "aplf" | "apls" => Some("APL"),
        "agda" => Some("Agda"),
        "idr" | "lidr" => Some("Idris"),
        "lean" | "hlean" => Some("Lean"),

        // Proof assistants / academic
        "dats" | "hats" | "sats" => Some("ATS"),

        // Scientific / data
        "stan" => Some("Stan"),
        "nf" | "nextflow" => Some("Nextflow"),
        "smk" => Some("Snakemake"),
        "wl" | "nb" => Some("Wolfram"),

        // Game dev
        "gd" => Some("GDScript"),
        "gml" => Some("GML"),
        "pde" => Some("Processing"),
        "rpy" => Some("Ren'Py"),
        "ino" => Some("Arduino C++"),

        // Configuration languages
        "jsonnet" | "libsonnet" => Some("Jsonnet"),
        "cue" => Some("CUE"),
        "qml" => Some("QML"),

        // Template engines
        "liquid" => Some("Liquid"),
        "smarty" | "tpl" => Some("Smarty"),
        "jinja" | "jinja2" | "j2" => Some("Jinja"),
        "handlebars" | "hbs" => Some("Handlebars"),
        "mustache" => Some("Mustache"),
        "ejs" => Some("EJS"),
        "pug" | "jade" => Some("Pug"),
        "cshtml" | "razor" => Some("Razor"),
        "haml" => Some("Haml"),

        // Other
        "asm" => Some("Assembly"),
        "s" => Some("Assembly"),
        "as" => Some("ActionScript"),
        "hx" => Some("Haxe"),
        "janet" => Some("Janet"),
        "vala" => Some("Vala"),
        "feature" => Some("Gherkin"),
        "fut" => Some("Futhark"),
        "wat" | "wast" => Some("WebAssembly"),
        "vim" | "vimrc" => Some("Vim script"),
        "ahk" => Some("AutoHotkey"),
        "au3" => Some("AutoIt"),
        "nsis" => Some("NSIS"),
        "iss" => Some("Inno Setup"),
        "proto" | "protobuf" => Some("protobuf"),
        "caddyfile" => Some("Caddyfile"),

        // Non-code: data, config, prose, generated -> skip
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
        "justfile" => Some("Just"),
        "snakefile" => Some("Snakemake"),
        // Non-code filenames -> skip
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
    fn test_new_languages() {
        assert_eq!(detect_language("kernel.cu"), Some("CUDA"));
        assert_eq!(detect_language("main.gleam"), Some("Gleam"));
        assert_eq!(detect_language("shader.glsl"), Some("GLSL"));
        assert_eq!(detect_language("shader.hlsl"), Some("HLSL"));
        assert_eq!(detect_language("shader.wgsl"), Some("WGSL"));
        assert_eq!(detect_language("main.zig"), Some("Zig"));
        assert_eq!(detect_language("main.odin"), Some("Odin"));
        assert_eq!(detect_language("module.sv"), Some("SystemVerilog"));
        assert_eq!(detect_language("design.vhd"), Some("VHDL"));
        assert_eq!(detect_language("main.ada"), Some("Ada"));
        assert_eq!(detect_language("main.f90"), Some("Fortran"));
        assert_eq!(detect_language("main.cob"), Some("COBOL"));
        assert_eq!(detect_language("prog.d"), Some("D"));
        assert_eq!(detect_language("app.mm"), Some("Objective-C++"));
        assert_eq!(detect_language("lib.rkt"), Some("Racket"));
        assert_eq!(detect_language("lib.pyx"), Some("Cython"));
        assert_eq!(detect_language("main.mojo"), Some("Mojo"));
        assert_eq!(detect_language("justfile"), Some("Just"));
        assert_eq!(detect_language("page.astro"), Some("Astro"));
        assert_eq!(detect_language("view.cshtml"), Some("Razor"));
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
