//! Map filenames / extensions to a `LangSyntax`. Mirrors the previous
//! `detect_language` function but returns the rich syntax descriptor instead
//! of just a name string.

use crate::syntax::*;

/// Detect a file's language. Returns `None` for files that should be skipped
/// entirely (data, config, prose, generated artifacts, lockfiles, …).
pub fn detect(filename: &str) -> Option<&'static LangSyntax> {
    let basename = filename.rsplit('/').next().unwrap_or(filename);

    if let Some(s) = detect_by_filename(basename) {
        return Some(s);
    }

    // Compound extensions.
    if filename.ends_with(".d.ts") {
        return Some(&TYPESCRIPT);
    }
    if filename.ends_with(".blade.php") {
        return Some(&BLADE);
    }

    let ext = filename.rsplit('.').next().unwrap_or("");
    detect_by_extension(ext)
}

fn detect_by_filename(basename: &str) -> Option<&'static LangSyntax> {
    let lower_owned = basename.to_lowercase();
    let lower = lower_owned.as_str();
    Some(match lower {
        "makefile" | "gnumakefile" | "kbuild" => &MAKEFILE,
        "dockerfile" => &DOCKERFILE,
        "jenkinsfile" => &JENKINS,
        "cmakelists.txt" => &CMAKE,
        "build.gradle" | "build.gradle.kts" => &GRADLE,
        "gemfile" | "rakefile" => &RUBY,
        "vagrantfile" => &VAGRANT,
        "justfile" => &JUST,
        "snakefile" => &SNAKEMAKE,
        _ => return None,
    })
}

fn detect_by_extension(ext: &str) -> Option<&'static LangSyntax> {
    Some(match ext {
        // JavaScript family
        "js" | "mjs" | "cjs" | "jsx" => &JAVASCRIPT,
        "ts" | "mts" | "cts" | "tsx" => &TYPESCRIPT,
        "vue" => &VUE,
        "svelte" => &SVELTE,
        "astro" => &ASTRO,
        "coffee" | "cjsx" => &COFFEE,
        "ls" => &LIVESCRIPT,
        "ets" => &ARKTS,

        // Python family
        "py" | "pyw" | "pyi" => &PYTHON,
        "pyx" | "pxd" | "pxi" => &CYTHON,
        "mojo" => &MOJO,

        // Rust
        "rs" => &RUST,

        // Go
        "go" => &GO,

        // Java family
        "java" => &JAVA,
        "kt" | "kts" => &KOTLIN,
        "scala" | "sc" => &SCALA,
        "groovy" | "grt" | "gtpl" | "gvy" => &GROOVY,
        "gradle" => &GRADLE,
        "xtend" => &XTEND,

        // C family
        "c" | "ec" | "pgc" | "h" => &C,
        "cpp" | "cc" | "cxx" | "c++" | "pcc" | "tpp" | "hpp" | "hxx" | "hh" | "inl" | "ipp" => &CPP,
        "cs" | "csx" => &CSHARP,
        "m" => &OBJC,
        "mm" => &OBJCPP,
        "cu" => &CUDA,
        "d" => &D,
        "c3" => &C3,

        // Web markup & style
        "html" | "htm" | "xhtml" => &HTML,
        "css" => &CSS,
        "pcss" | "sss" => &POSTCSS,
        "scss" => &SCSS,
        "sass" => &SASS,
        "less" => &LESS,
        "styl" => &STYLUS,

        // Shell & scripting
        "sh" | "bash" | "zsh" | "fish" | "ksh" | "csh" => &SHELL,
        "ps1" | "psm1" | "psd1" => &POWERSHELL,
        "bat" | "btm" | "cmd" => &BATCH,
        "nu" => &NUSHELL,
        "awk" => &AWK,

        // Database & query
        "sql" | "pgsql" => &SQL_LANG,
        "prql" => &PRQL,
        "graphql" | "gql" => &GRAPHQL,
        "ql" | "qll" => &CODEQL,

        // Documentation (code-like)
        "tex" | "sty" | "latex" | "ltx" => &LATEX,
        "typ" => &TYPST,

        // DevOps & infrastructure
        "tf" | "hcl" | "tfvars" => &TERRAFORM,
        "bicep" => &BICEP,
        "nginx" => &NGINX,
        "nix" => &NIX,
        "dhall" => &DHALL,

        // Build tools
        "mk" | "mak" => &MAKEFILE,
        "cmake" => &CMAKE,
        "ninja" => &NINJA,
        "bzl" | "bazel" => &BAZEL,
        "just" => &JUST,

        // Ruby
        "rb" | "rake" | "gemspec" | "erb" | "rhtml" => &RUBY,

        // PHP & templates
        "php" => &PHP,
        "twig" => &TWIG,

        // Perl family
        "pl" | "pm" => &PERL,
        "raku" | "rakumod" | "rakutest" | "p6" | "pl6" | "pm6" => &RAKU,

        // Lua family
        "lua" | "luau" => &LUA,
        "moon" => &MOONSCRIPT,
        "fnl" => &FENNEL,

        // Tcl
        "tcl" | "tk" => &TCL,

        // R
        "r" => &R_LANG,

        // Julia
        "jl" => &JULIA,

        // Functional languages
        "hs" | "lhs" => &HASKELL,
        "ex" | "exs" => &ELIXIR,
        "erl" | "hrl" => &ERLANG,
        "clj" | "cljs" | "cljc" | "edn" => &CLOJURE,
        "ml" | "mli" => &OCAML,
        "fs" | "fsi" | "fsx" | "fsscript" => &FSHARP,
        "elm" => &ELM,
        "purs" => &PURESCRIPT,
        "re" | "rei" => &REASONML,
        "res" | "resi" => &RESCRIPT,
        "sml" => &STANDARD_ML,
        "gleam" => &GLEAM,
        "roc" => &ROC,
        "kk" => &KOKA,

        // Lisp family
        "lisp" | "lsp" | "asd" => &COMMON_LISP,
        "scm" | "ss" => &SCHEME,
        "rkt" | "scrbl" => &RACKET,
        "el" | "elc" => &EMACS_LISP,
        "hy" => &COMMON_LISP,

        // Modern / emerging
        "dart" => &DART,
        "zig" => &ZIG,
        "nim" => &NIM,
        "cr" => &CRYSTAL,
        "v" | "vv" => &V,
        "swift" => &SWIFT,
        "sol" => &SOLIDITY,
        "move" => &MOVE,
        "tact" => &TACT,
        "cairo" => &CAIRO,
        "odin" => &ODIN,
        "mbt" | "mbti" => &MOONBIT,
        "bal" => &BALLERINA,
        "chpl" => &CHAPEL,
        "ceylon" => &CEYLON,
        "pony" => &PONY,

        // GPU & shader languages
        "glsl" | "vert" | "tesc" | "tese" | "geom" | "frag" | "comp" | "mesh" | "task" | "rgen"
        | "rint" | "rahit" | "rchit" | "rmiss" | "rcall" => &GLSL,
        "hlsl" | "fx" | "fxsub" => &HLSL,
        "wgsl" => &WGSL,
        "metal" => &METAL,
        "shader" | "cginc" => &SHADERLAB,
        "cl" | "ocl" => &OPENCL,
        "slint" => &SLINT,

        // Hardware description
        "sv" | "svh" => &SYSTEM_VERILOG,
        "vg" | "vh" => &VERILOG,
        "vhd" | "vhdl" => &VHDL,
        "dts" | "dtsi" => &DEVICETREE,

        // Classic / legacy
        "ada" | "adb" | "ads" => &ADA,
        "f" | "for" | "ftn" | "f77" | "pfo" | "f03" | "f08" | "f90" | "f95" | "fpp" => &FORTRAN,
        "cob" | "cbl" | "cobol" | "cpy" => &COBOL,
        "pas" => &PASCAL,
        "abap" => &ABAP,
        "pro" => &PROLOG,
        "4th" | "forth" | "frt" | "fth" => &FORTH,
        "vb" => &VISUAL_BASIC,
        "vbs" => &VBSCRIPT,
        "apl" | "aplf" | "apls" => &APL,
        "agda" => &AGDA,
        "idr" | "lidr" => &IDRIS,
        "lean" | "hlean" => &LEAN,

        // Proof assistants / academic
        "dats" | "hats" | "sats" => &ATS,

        // Scientific / data
        "stan" => &STAN,
        "nf" | "nextflow" => &NEXTFLOW,
        "smk" => &SNAKEMAKE,
        "wl" | "nb" => &WOLFRAM,

        // Game dev
        "gd" => &GDSCRIPT,
        "gml" => &GML_LANG,
        "pde" => &PROCESSING,
        "rpy" => &RENPY,
        "ino" => &ARDUINO,

        // Configuration languages
        "jsonnet" | "libsonnet" => &JSONNET,
        "cue" => &CUE,
        "qml" => &QML,

        // Template engines
        "liquid" => &LIQUID,
        "smarty" | "tpl" => &SMARTY,
        "jinja" | "jinja2" | "j2" => &JINJA,
        "handlebars" | "hbs" => &HANDLEBARS,
        "mustache" => &MUSTACHE,
        "ejs" => &EJS,
        "pug" | "jade" => &PUG,
        "cshtml" | "razor" => &RAZOR,
        "haml" => &HAML,

        // Other
        "asm" | "s" => &ASSEMBLY,
        "as" => &ACTIONSCRIPT,
        "hx" => &HAXE,
        "janet" => &JANET,
        "vala" => &VALA,
        "feature" => &GHERKIN,
        "fut" => &FUTHARK,
        "wat" | "wast" => &WEBASSEMBLY,
        "vim" | "vimrc" => &VIM_SCRIPT,
        "ahk" => &AUTOHOTKEY,
        "au3" => &AUTOIT,
        "nsis" => &NSIS,
        "iss" => &INNO_SETUP,
        "proto" | "protobuf" => &PROTOBUF,
        "caddyfile" => &CADDYFILE,

        // Non-code: data, config, prose, generated -> skip
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_common() {
        assert_eq!(detect("src/main.rs").map(|s| s.name), Some("Rust"));
        assert_eq!(detect("app.ts").map(|s| s.name), Some("TypeScript"));
        assert_eq!(detect("types.d.ts").map(|s| s.name), Some("TypeScript"));
        assert_eq!(detect("Makefile").map(|s| s.name), Some("Makefile"));
        assert_eq!(detect("Dockerfile").map(|s| s.name), Some("Dockerfile"));
        assert_eq!(
            detect("views/index.blade.php").map(|s| s.name),
            Some("Blade")
        );
    }

    #[test]
    fn skip_non_code() {
        assert!(detect("README.md").is_none());
        assert!(detect("package.json").is_none());
        assert!(detect("config.yaml").is_none());
        assert!(detect("bun.lock").is_none());
        assert!(detect("data.xml").is_none());
        assert!(detect("icon.svg").is_none());
        assert!(detect("unknown.xyz").is_none());
    }
}
