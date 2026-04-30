//! Per-language syntax tables (line comments, block comments, string literals).
//!
//! Each `LangSyntax` describes the surface syntax that the line counter needs
//! in order to classify lines into code / comments / blanks. We borrow the
//! representation from `tokei` but trim it to the bare essentials.

#[derive(Debug)]
pub struct LangSyntax {
    pub name: &'static str,
    pub color: &'static str,

    /// Line-comment start tokens, e.g. `["//"]`, `["#"]`, `["--", "//"]`.
    pub line_comments: &'static [&'static str],

    /// Block-comment `(start, end)` pairs, e.g. `[("/*", "*/")]`.
    pub block_comments: &'static [(&'static str, &'static str)],

    /// Block-comment pairs that always nest, regardless of `allows_nested`.
    /// (Haskell `{- -}`, OCaml `(* *)`, etc.)
    pub nested_block_comments: &'static [(&'static str, &'static str)],

    /// Whether *all* block comments in this language nest (e.g. Rust).
    pub allows_nested: bool,

    /// String literals as `(start, end)` pairs. Order matters – longer
    /// delimiters must come first (e.g. `"""` before `"`).
    pub strings: &'static [(&'static str, &'static str)],

    /// Verbatim / raw strings that ignore `\` escapes.
    pub verbatim_strings: &'static [(&'static str, &'static str)],

    /// Files where every non-blank line counts as a comment (literate code,
    /// pure docs). Currently unused but kept for future literate-Haskell etc.
    pub is_literate: bool,
}

impl LangSyntax {
    /// Iterate over every "important" start token — anything that, if found
    /// on a line, forces us to drop into the byte-level slow path.
    pub fn important_starts(&self) -> impl Iterator<Item = &'static str> + '_ {
        self.line_comments
            .iter()
            .copied()
            .chain(self.block_comments.iter().map(|(s, _)| *s))
            .chain(self.nested_block_comments.iter().map(|(s, _)| *s))
            .chain(self.strings.iter().map(|(s, _)| *s))
            .chain(self.verbatim_strings.iter().map(|(s, _)| *s))
    }
}

// ---------------------------------------------------------------------------
// Building blocks reused below. Note: we cannot use `..BASE` struct update in
// const positions reliably across stable rust versions, so each language is
// spelled out fully via macro.
// ---------------------------------------------------------------------------

macro_rules! lang {
    (
        $name:literal, $color:literal
        $(, line: $line:expr)?
        $(, block: $block:expr)?
        $(, nested_block: $nested:expr)?
        $(, allows_nested: $an:expr)?
        $(, strings: $strings:expr)?
        $(, verbatim: $verbatim:expr)?
        $(, literate: $lit:expr)?
        $(,)?
    ) => {
        LangSyntax {
            name: $name,
            color: $color,
            line_comments: { #[allow(unused_mut, unused_assignments)] let mut x: &'static [&'static str] = &[]; $(x = &$line;)? x },
            block_comments: { #[allow(unused_mut, unused_assignments)] let mut x: &'static [(&'static str, &'static str)] = &[]; $(x = &$block;)? x },
            nested_block_comments: { #[allow(unused_mut, unused_assignments)] let mut x: &'static [(&'static str, &'static str)] = &[]; $(x = &$nested;)? x },
            allows_nested: { #[allow(unused_mut, unused_assignments)] let mut x = false; $(x = $an;)? x },
            strings: { #[allow(unused_mut, unused_assignments)] let mut x: &'static [(&'static str, &'static str)] = &[]; $(x = &$strings;)? x },
            verbatim_strings: { #[allow(unused_mut, unused_assignments)] let mut x: &'static [(&'static str, &'static str)] = &[]; $(x = &$verbatim;)? x },
            is_literate: { #[allow(unused_mut, unused_assignments)] let mut x = false; $(x = $lit;)? x },
        }
    };
}

// String preset re-used by most curly-brace languages.
const DQ: &[(&str, &str)] = &[("\"", "\"")];
const DQ_SQ: &[(&str, &str)] = &[("\"", "\""), ("'", "'")];
const DQ_SQ_BT: &[(&str, &str)] = &[("\"", "\""), ("'", "'"), ("`", "`")];
const C_BLOCK: &[(&str, &str)] = &[("/*", "*/")];
const SLASH_LINE: &[&str] = &["//"];
const HASH_LINE: &[&str] = &["#"];
const DASH_LINE: &[&str] = &["--"];
const SEMI_LINE: &[&str] = &[";"];
const PERCENT_LINE: &[&str] = &["%"];

// ---------------------------------------------------------------------------
// Curly-brace / C-family languages. All share `// + /* */ + "..." + '...'`.
// We only deviate when a language has special features (Rust nested comments,
// Swift nested comments, raw strings, template literals, etc.).
// ---------------------------------------------------------------------------

pub const JAVASCRIPT: LangSyntax = lang!(
    "JavaScript", "#f1e05a",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ_BT,
);
pub const TYPESCRIPT: LangSyntax = lang!(
    "TypeScript", "#3178c6",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ_BT,
);
pub const VUE: LangSyntax = lang!(
    "Vue", "#41b883",
    line: SLASH_LINE, block: [("/*", "*/"), ("<!--", "-->")], strings: DQ_SQ_BT,
);
pub const SVELTE: LangSyntax = lang!(
    "Svelte", "#ff3e00",
    line: SLASH_LINE, block: [("/*", "*/"), ("<!--", "-->")], strings: DQ_SQ_BT,
);
pub const ASTRO: LangSyntax = lang!(
    "Astro", "#ff5a03",
    line: SLASH_LINE, block: [("/*", "*/"), ("<!--", "-->")], strings: DQ_SQ_BT,
);
pub const COFFEE: LangSyntax = lang!(
    "CoffeeScript", "#244776",
    line: HASH_LINE, block: [("###", "###")], strings: DQ_SQ_BT,
);
pub const LIVESCRIPT: LangSyntax = lang!(
    "LiveScript", "#499886",
    line: HASH_LINE, block: [("###", "###")], strings: DQ_SQ_BT,
);

pub const RUST: LangSyntax = lang!(
    "Rust", "#dea584",
    line: SLASH_LINE, block: C_BLOCK, allows_nested: true,
    strings: [("\"", "\"")],
    verbatim: [("r\"", "\"")],
);

pub const C: LangSyntax = lang!(
    "C", "#555555",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const CPP: LangSyntax = lang!(
    "C++", "#f34b7d",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const CSHARP: LangSyntax = lang!(
    "C#", "#178600",
    line: SLASH_LINE, block: C_BLOCK,
    strings: [("\"", "\""), ("'", "'")],
    verbatim: [("@\"", "\"")],
);
pub const JAVA: LangSyntax = lang!(
    "Java", "#b07219",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const KOTLIN: LangSyntax = lang!(
    "Kotlin", "#A97BFF",
    line: SLASH_LINE, block: C_BLOCK, allows_nested: true, strings: DQ_SQ,
);
pub const SCALA: LangSyntax = lang!(
    "Scala", "#c22d40",
    line: SLASH_LINE, block: C_BLOCK, allows_nested: true, strings: DQ_SQ,
);
pub const GO: LangSyntax = lang!(
    "Go", "#00ADD8",
    line: SLASH_LINE, block: C_BLOCK,
    strings: [("\"", "\""), ("'", "'")],
    verbatim: [("`", "`")],
);
pub const SWIFT: LangSyntax = lang!(
    "Swift", "#F05138",
    line: SLASH_LINE, block: C_BLOCK, allows_nested: true, strings: DQ,
);
pub const DART: LangSyntax = lang!(
    "Dart", "#00B4AB",
    line: SLASH_LINE, block: C_BLOCK,
    strings: [("\"", "\""), ("'", "'")],
);
pub const GROOVY: LangSyntax = lang!(
    "Groovy", "#4298B8",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const GRADLE: LangSyntax = lang!(
    "Gradle", "#02303a",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const PHP: LangSyntax = lang!(
    "PHP", "#4F5D95",
    line: ["//", "#"], block: C_BLOCK, strings: DQ_SQ,
);
pub const ACTIONSCRIPT: LangSyntax = lang!(
    "ActionScript", "#882B0F",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const SOLIDITY: LangSyntax = lang!(
    "Solidity", "#AA6746",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const MOVE: LangSyntax = lang!(
    "Move", "#4D4D4D",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const TACT: LangSyntax = lang!(
    "Tact", "#2e2e2e",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const CAIRO: LangSyntax = lang!(
    "Cairo", "#D4A373",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const ZIG: LangSyntax = lang!(
    "Zig", "#EC915C",
    line: SLASH_LINE, strings: DQ,
);
pub const D: LangSyntax = lang!(
    "D", "#ba595e",
    line: SLASH_LINE,
    block: [("/*", "*/")],
    nested_block: [("/+", "+/")],
    strings: DQ_SQ_BT,
    verbatim: [("r\"", "\"")],
);
pub const V: LangSyntax = lang!(
    "V", "#4F87C4",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ_BT,
);
pub const NIM: LangSyntax = lang!(
    "Nim", "#FFC200",
    line: HASH_LINE,
    nested_block: [("#[", "]#")],
    strings: DQ,
);
pub const CRYSTAL: LangSyntax = lang!(
    "Crystal", "#000100",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const VERILOG: LangSyntax = lang!(
    "Verilog", "#b2b7f8",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const SYSTEM_VERILOG: LangSyntax = lang!(
    "SystemVerilog", "#DAE1C2",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const VHDL: LangSyntax = lang!(
    "VHDL", "#adb2cb",
    line: DASH_LINE, strings: DQ,
);
pub const OBJC: LangSyntax = lang!(
    "Objective-C", "#438EFF",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const OBJCPP: LangSyntax = lang!(
    "Objective-C++", "#6866fb",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const CUDA: LangSyntax = lang!(
    "CUDA", "#3A4E3A",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const ARDUINO: LangSyntax = lang!(
    "Arduino C++", "#bd79d1",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const HAXE: LangSyntax = lang!(
    "Haxe", "#df7900",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const RESCRIPT: LangSyntax = lang!(
    "ReScript", "#ed5051",
    line: SLASH_LINE,
    nested_block: [("/*", "*/")],
    strings: DQ,
);
pub const REASONML: LangSyntax = lang!(
    "ReasonML", "#dd4b39",
    line: SLASH_LINE,
    nested_block: [("/*", "*/")],
    strings: DQ,
);
pub const VALA: LangSyntax = lang!(
    "Vala", "#a56de2",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const CEYLON: LangSyntax = lang!(
    "Ceylon", "#dfa535",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const CHAPEL: LangSyntax = lang!(
    "Chapel", "#8dc63f",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const PONY: LangSyntax = lang!(
    "Pony", "#d4cb7e",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const BALLERINA: LangSyntax = lang!(
    "Ballerina", "#FF5000",
    line: SLASH_LINE, strings: DQ,
);
pub const C3: LangSyntax = lang!(
    "C3", "#EC8B31",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const ODIN: LangSyntax = lang!(
    "Odin", "#60AFFE",
    line: SLASH_LINE, block: C_BLOCK, allows_nested: true, strings: DQ,
);
pub const ROC: LangSyntax = lang!(
    "Roc", "#7c38f5",
    line: HASH_LINE, strings: DQ,
);
pub const KOKA: LangSyntax = lang!(
    "Koka", "#5682c4",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const ATS: LangSyntax = lang!(
    "ATS", "#1ac620",
    line: SLASH_LINE,
    nested_block: [("(*", "*)")],
    strings: DQ,
);
pub const MOONBIT: LangSyntax = lang!(
    "MoonBit", "#4e49a0",
    line: SLASH_LINE, strings: DQ,
);
pub const SLINT: LangSyntax = lang!(
    "Slint", "#2379F4",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const QML: LangSyntax = lang!(
    "QML", "#44a51c",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const STYLUS: LangSyntax = lang!(
    "Stylus", "#ff6347",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const LESS: LangSyntax = lang!(
    "LESS", "#1d365d",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const SCSS: LangSyntax = lang!(
    "SCSS", "#C6538C",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const SASS: LangSyntax = lang!(
    "SASS", "#A53B70",
    line: SLASH_LINE, strings: DQ_SQ,
);
pub const CSS: LangSyntax = lang!(
    "CSS", "#563d7c",
    block: C_BLOCK, strings: DQ_SQ,
);
pub const POSTCSS: LangSyntax = lang!(
    "PostCSS", "#dc3a0c",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const JSONNET: LangSyntax = lang!(
    "Jsonnet", "#0064bd",
    line: ["//", "#"], block: C_BLOCK, strings: DQ_SQ,
);
pub const CUE: LangSyntax = lang!(
    "CUE", "#5886E1",
    line: SLASH_LINE, strings: DQ,
);
pub const BICEP: LangSyntax = lang!(
    "Bicep", "#519aba",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const CODEQL: LangSyntax = lang!(
    "CodeQL", "#140f46",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const GRAPHQL: LangSyntax = lang!(
    "GraphQL", "#e10098",
    line: HASH_LINE, strings: DQ,
);
pub const OPENCL: LangSyntax = lang!(
    "OpenCL", "#ed2939",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const GLSL: LangSyntax = lang!(
    "GLSL", "#5686a5",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const HLSL: LangSyntax = lang!(
    "HLSL", "#aace60",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const WGSL: LangSyntax = lang!(
    "WGSL", "#1a5e9a",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const METAL: LangSyntax = lang!(
    "Metal", "#a78649",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const SHADERLAB: LangSyntax = lang!(
    "ShaderLab", "#222c37",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const ARKTS: LangSyntax = lang!(
    "Ark TypeScript", "#3178c6",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ_BT,
);
pub const PROTOBUF: LangSyntax = lang!(
    "protobuf", "#418B9E",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const TYPST: LangSyntax = lang!(
    "Typst", "#239dad",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);

// ---------------------------------------------------------------------------
// Hash-comment family
// ---------------------------------------------------------------------------
pub const PYTHON: LangSyntax = lang!(
    "Python", "#3572A5",
    line: HASH_LINE,
    strings: [("\"\"\"", "\"\"\""), ("'''", "'''"), ("\"", "\""), ("'", "'")],
);
pub const CYTHON: LangSyntax = lang!(
    "Cython", "#fedf5b",
    line: HASH_LINE,
    strings: [("\"\"\"", "\"\"\""), ("'''", "'''"), ("\"", "\""), ("'", "'")],
);
pub const MOJO: LangSyntax = lang!(
    "Mojo", "#ff4c1a",
    line: HASH_LINE,
    strings: [("\"\"\"", "\"\"\""), ("'''", "'''"), ("\"", "\""), ("'", "'")],
);
pub const RUBY: LangSyntax = lang!(
    "Ruby", "#701516",
    line: HASH_LINE,
    block: [("=begin", "=end")],
    strings: DQ_SQ,
);
pub const SHELL: LangSyntax = lang!(
    "Shell", "#89e051",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const PERL: LangSyntax = lang!(
    "Perl", "#0298c3",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const RAKU: LangSyntax = lang!(
    "Raku", "#0000fb",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const R_LANG: LangSyntax = lang!(
    "R", "#198CE7",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const JULIA: LangSyntax = lang!(
    "Julia", "#A270BA",
    line: HASH_LINE,
    nested_block: [("#=", "=#")],
    strings: [("\"\"\"", "\"\"\""), ("\"", "\"")],
);
pub const TCL: LangSyntax = lang!(
    "Tcl", "#e4cc98",
    line: HASH_LINE, strings: DQ,
);
pub const NUSHELL: LangSyntax = lang!(
    "Nushell", "#3aa675",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const POWERSHELL: LangSyntax = lang!(
    "PowerShell", "#012456",
    line: HASH_LINE,
    block: [("<#", "#>")],
    strings: DQ_SQ,
);
pub const AWK: LangSyntax = lang!(
    "AWK", "#c30e9b",
    line: HASH_LINE, strings: DQ,
);
pub const MAKEFILE: LangSyntax = lang!(
    "Makefile", "#427819",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const DOCKERFILE: LangSyntax = lang!(
    "Dockerfile", "#384d54",
    line: HASH_LINE, strings: DQ,
);
pub const TERRAFORM: LangSyntax = lang!(
    "Terraform", "#5C4EE5",
    line: ["#", "//"], block: C_BLOCK, strings: DQ,
);
pub const NIX: LangSyntax = lang!(
    "Nix", "#7e7eff",
    line: HASH_LINE, block: [("/*", "*/")], strings: DQ,
);
pub const DHALL: LangSyntax = lang!(
    "Dhall", "#dfafff",
    line: DASH_LINE, nested_block: [("{-", "-}")], strings: DQ,
);
pub const CMAKE: LangSyntax = lang!(
    "CMake", "#DA3434",
    line: HASH_LINE, strings: DQ,
);
pub const NINJA: LangSyntax = lang!(
    "Ninja", "#8DCC65",
    line: HASH_LINE,
);
pub const SNAKEMAKE: LangSyntax = lang!(
    "Snakemake", "#419179",
    line: HASH_LINE,
    strings: [("\"\"\"", "\"\"\""), ("'''", "'''"), ("\"", "\""), ("'", "'")],
);
pub const NEXTFLOW: LangSyntax = lang!(
    "Nextflow", "#3ac486",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const STAN: LangSyntax = lang!(
    "Stan", "#b2011d",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const GDSCRIPT: LangSyntax = lang!(
    "GDScript", "#355570",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const GML_LANG: LangSyntax = lang!(
    "GML", "#71b417",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const PROCESSING: LangSyntax = lang!(
    "Processing", "#0096D8",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const RENPY: LangSyntax = lang!(
    "Ren'Py", "#ff7f7f",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const PRQL: LangSyntax = lang!(
    "PRQL", "#da6a22",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const CADDYFILE: LangSyntax = lang!(
    "Caddyfile", "#5F7D58",
    line: HASH_LINE,
);
pub const JUST: LangSyntax = lang!(
    "Just", "#384d54",
    line: HASH_LINE,
);
pub const BAZEL: LangSyntax = lang!(
    "Bazel", "#89D42D",
    line: HASH_LINE,
    strings: [("\"\"\"", "\"\"\""), ("'''", "'''"), ("\"", "\""), ("'", "'")],
);
pub const NGINX: LangSyntax = lang!(
    "Nginx", "#009639",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const VAGRANT: LangSyntax = lang!(
    "Vagrant", "#1868F2",
    line: HASH_LINE, strings: DQ_SQ,
);
pub const JENKINS: LangSyntax = lang!(
    "Jenkins", "#D24939",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);

// ---------------------------------------------------------------------------
// Lua / Haskell-family / SQL / Ada (-- line, with various block styles)
// ---------------------------------------------------------------------------
pub const LUA: LangSyntax = lang!(
    "Lua", "#000080",
    line: DASH_LINE,
    block: [("--[[", "]]")],
    strings: DQ_SQ,
);
pub const MOONSCRIPT: LangSyntax = lang!(
    "MoonScript", "#ff6800",
    line: DASH_LINE, strings: DQ_SQ,
);
pub const FENNEL: LangSyntax = lang!(
    "Fennel", "#fff3d7",
    line: SEMI_LINE, strings: DQ,
);
pub const HASKELL: LangSyntax = lang!(
    "Haskell", "#5e5086",
    line: DASH_LINE,
    nested_block: [("{-", "-}")],
    strings: DQ,
);
pub const AGDA: LangSyntax = lang!(
    "Agda", "#315665",
    line: DASH_LINE,
    nested_block: [("{-", "-}")],
    strings: DQ,
);
pub const IDRIS: LangSyntax = lang!(
    "Idris", "#b30000",
    line: DASH_LINE,
    nested_block: [("{-", "-}")],
    strings: DQ,
);
pub const ELM: LangSyntax = lang!(
    "Elm", "#60B5BC",
    line: DASH_LINE,
    nested_block: [("{-", "-}")],
    strings: DQ,
);
pub const PURESCRIPT: LangSyntax = lang!(
    "PureScript", "#1D222D",
    line: DASH_LINE,
    nested_block: [("{-", "-}")],
    strings: DQ,
);
pub const LEAN: LangSyntax = lang!(
    "Lean", "#000000",
    line: DASH_LINE,
    nested_block: [("/-", "-/")],
    strings: DQ,
);
pub const GLEAM: LangSyntax = lang!(
    "Gleam", "#ffaff3",
    line: SLASH_LINE, strings: DQ,
);
pub const SQL_LANG: LangSyntax = lang!(
    "SQL", "#e38c00",
    line: DASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const ADA: LangSyntax = lang!(
    "Ada", "#02f88c",
    line: DASH_LINE, strings: DQ,
);

// ---------------------------------------------------------------------------
// ML family (* *) nested
// ---------------------------------------------------------------------------
pub const OCAML: LangSyntax = lang!(
    "OCaml", "#3be133",
    nested_block: [("(*", "*)")],
    strings: DQ,
);
pub const STANDARD_ML: LangSyntax = lang!(
    "Standard ML", "#dc566d",
    nested_block: [("(*", "*)")],
    strings: DQ,
);
pub const FSHARP: LangSyntax = lang!(
    "F#", "#b845fc",
    line: SLASH_LINE,
    nested_block: [("(*", "*)")],
    strings: DQ,
);
pub const WOLFRAM: LangSyntax = lang!(
    "Wolfram", "#dd1100",
    nested_block: [("(*", "*)")],
    strings: DQ,
);

// ---------------------------------------------------------------------------
// Lisp family (;)
// ---------------------------------------------------------------------------
pub const COMMON_LISP: LangSyntax = lang!(
    "Common Lisp", "#3fb68b",
    line: SEMI_LINE, nested_block: [("#|", "|#")], strings: DQ,
);
pub const SCHEME: LangSyntax = lang!(
    "Scheme", "#1D4C73",
    line: SEMI_LINE, nested_block: [("#|", "|#")], strings: DQ,
);
pub const RACKET: LangSyntax = lang!(
    "Racket", "#3c5caa",
    line: SEMI_LINE, nested_block: [("#|", "|#")], strings: DQ,
);
pub const CLOJURE: LangSyntax = lang!(
    "Clojure", "#db5855",
    line: SEMI_LINE, strings: DQ,
);
pub const JANET: LangSyntax = lang!(
    "Janet", "#0886a5",
    line: HASH_LINE, strings: DQ,
);
pub const EMACS_LISP: LangSyntax = lang!(
    "Emacs Lisp", "#064e8b",
    line: SEMI_LINE, strings: DQ,
);

// ---------------------------------------------------------------------------
// Erlang / Elixir / Prolog (%)
// ---------------------------------------------------------------------------
pub const ELIXIR: LangSyntax = lang!(
    "Elixir", "#6e4a7e",
    line: HASH_LINE,
    strings: [("\"\"\"", "\"\"\""), ("\"", "\"")],
);
pub const ERLANG: LangSyntax = lang!(
    "Erlang", "#B83998",
    line: PERCENT_LINE, strings: DQ,
);
pub const PROLOG: LangSyntax = lang!(
    "Prolog", "#74283c",
    line: PERCENT_LINE, block: C_BLOCK, strings: DQ_SQ,
);
pub const FORTH: LangSyntax = lang!(
    "Forth", "#341708",
    line: ["\\"], strings: [("\"", "\"")],
);

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------
pub const HTML: LangSyntax = lang!(
    "HTML", "#e34c26",
    block: [("<!--", "-->")], strings: DQ_SQ,
);
pub const PUG: LangSyntax = lang!(
    "Pug", "#A86454",
    line: ["//-", "//"], strings: DQ_SQ,
);
pub const HAML: LangSyntax = lang!(
    "Haml", "#ece2a9",
    line: ["-#"], strings: DQ_SQ,
);
pub const EJS: LangSyntax = lang!(
    "EJS", "#B4AB72",
    block: [("<%--", "--%>"), ("<!--", "-->")], strings: DQ_SQ,
);
pub const HANDLEBARS: LangSyntax = lang!(
    "Handlebars", "#f1572c",
    block: [("{{!--", "--}}"), ("{{!", "}}")], strings: DQ_SQ,
);
pub const MUSTACHE: LangSyntax = lang!(
    "Mustache", "#724B0B",
    block: [("{{!", "}}")], strings: DQ_SQ,
);
pub const BLADE: LangSyntax = lang!(
    "Blade", "#F7523F",
    block: [("{{--", "--}}"), ("<!--", "-->")], strings: DQ_SQ,
);
pub const LIQUID: LangSyntax = lang!(
    "Liquid", "#71B41D",
    block: [("{% comment %}", "{% endcomment %}"), ("<!--", "-->")], strings: DQ_SQ,
);
pub const SMARTY: LangSyntax = lang!(
    "Smarty", "#B3DE2B",
    block: [("{*", "*}")], strings: DQ_SQ,
);
pub const JINJA: LangSyntax = lang!(
    "Jinja", "#B71325",
    block: [("{#", "#}"), ("<!--", "-->")], strings: DQ_SQ,
);
pub const TWIG: LangSyntax = lang!(
    "Twig", "#c1d026",
    block: [("{#", "#}"), ("<!--", "-->")], strings: DQ_SQ,
);
pub const RAZOR: LangSyntax = lang!(
    "Razor", "#512be4",
    block: [("@*", "*@"), ("<!--", "-->")], strings: DQ_SQ,
);

pub const LATEX: LangSyntax = lang!(
    "LaTeX", "#3D6117",
    line: PERCENT_LINE,
);
pub const APL: LangSyntax = lang!(
    "APL", "#5A8164",
    line: ["⍝"], strings: [("'", "'")],
);

pub const VIM_SCRIPT: LangSyntax = lang!(
    "Vim script", "#199F4B",
    line: ["\""],
);
pub const VISUAL_BASIC: LangSyntax = lang!(
    "Visual Basic", "#945db7",
    line: ["'"], strings: DQ,
);
pub const VBSCRIPT: LangSyntax = lang!(
    "VBScript", "#15dcdc",
    line: ["'", "REM"], strings: DQ,
);
pub const ABAP: LangSyntax = lang!(
    "ABAP", "#E8274B",
    line: ["*", "\""], strings: DQ_SQ,
);
pub const ASSEMBLY: LangSyntax = lang!(
    "Assembly", "#6E4C13",
    line: SEMI_LINE, strings: DQ_SQ,
);
pub const FORTRAN: LangSyntax = lang!(
    "Fortran", "#4d41b1",
    line: ["!"], strings: DQ_SQ,
);
pub const COBOL: LangSyntax = lang!(
    "COBOL", "#005CA5",
    line: ["*"], strings: DQ_SQ,
);
pub const PASCAL: LangSyntax = lang!(
    "Pascal", "#B0C682",
    line: SLASH_LINE, block: [("{", "}"), ("(*", "*)")], strings: [("'", "'")],
);
pub const AUTOHOTKEY: LangSyntax = lang!(
    "AutoHotkey", "#6594b9",
    line: SEMI_LINE, block: C_BLOCK, strings: DQ,
);
pub const AUTOIT: LangSyntax = lang!(
    "AutoIt", "#1C3552",
    line: SEMI_LINE, strings: DQ,
);
pub const NSIS: LangSyntax = lang!(
    "NSIS", "#5C4EE5",
    line: [";", "#"], strings: DQ_SQ,
);
pub const INNO_SETUP: LangSyntax = lang!(
    "Inno Setup", "#2648BD",
    line: SEMI_LINE, strings: DQ_SQ,
);
pub const WEBASSEMBLY: LangSyntax = lang!(
    "WebAssembly", "#04133b",
    line: [";;"], block: [("(;", ";)")], strings: DQ,
);
pub const BATCH: LangSyntax = lang!(
    "Batch", "#C1F12E",
    line: ["::", "REM"],
);
pub const DEVICETREE: LangSyntax = lang!(
    "DeviceTree", "#555555",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ,
);
pub const GHERKIN: LangSyntax = lang!(
    "Gherkin", "#5B2063",
    line: HASH_LINE,
);
pub const FUTHARK: LangSyntax = lang!(
    "Futhark", "#5f021f",
    line: DASH_LINE, strings: DQ,
);
pub const XTEND: LangSyntax = lang!(
    "Xtend", "#24255d",
    line: SLASH_LINE, block: C_BLOCK, strings: DQ_SQ,
);
