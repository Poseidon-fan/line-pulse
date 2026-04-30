//! Line Pulse WASM analysis core.
//!
//! Public surface (called from JS):
//!
//! * [`Analyzer`] — stateful, incremental API. JS calls `add_file` for every
//!   file and then `finalize` once at the end. This is how the extension
//!   normally drives analysis: it avoids the V8 max-string-length limit
//!   (~512 MiB) that you would otherwise hit by `JSON.stringify`-ing every
//!   file content into a single blob, and it lets the UI report per-file
//!   progress.
//! * [`analyze_code`] — convenience wrapper that takes a JSON-encoded
//!   `{path: contents}` map and returns a JSON-encoded [`AnalysisResult`].
//!   Kept for the unit tests and small one-shot use cases.

mod counter;
mod detect;
mod syntax;

use std::collections::HashMap;

use serde::Serialize;
use wasm_bindgen::prelude::*;

use crate::counter::{Counter, LineCounts};
use crate::detect::detect;

#[derive(Serialize, Default)]
struct LanguageStats {
    name: String,
    color: String,
    files: usize,
    code: usize,
    comments: usize,
    blanks: usize,
}

#[derive(Serialize)]
struct AnalysisResult {
    files: usize,
    total_code: usize,
    total_comments: usize,
    total_blanks: usize,
    languages: Vec<LanguageStats>,
}

/// Per-language accumulator. `color` and the map key are `&'static str` because
/// they always come from the static `LangSyntax` tables in `syntax.rs`.
struct Acc {
    color: &'static str,
    files: usize,
    counts: LineCounts,
}

#[wasm_bindgen]
pub struct Analyzer {
    by_lang: HashMap<&'static str, Acc>,
    total: LineCounts,
    file_count: usize,
}

#[wasm_bindgen]
impl Analyzer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            by_lang: HashMap::new(),
            total: LineCounts::default(),
            file_count: 0,
        }
    }

    /// Process a single file. Safe to call millions of times — content is
    /// consumed line-by-line and dropped at the end of the call.
    pub fn add_file(&mut self, path: &str, content: &str) {
        let Some(syntax) = detect(path) else {
            return;
        };

        let counts = Counter::count_file(syntax, content.as_bytes());
        // Skip files with no recognised content (e.g. fully empty).
        if counts.code == 0 && counts.comments == 0 && counts.blanks == 0 {
            return;
        }

        let entry = self.by_lang.entry(syntax.name).or_insert_with(|| Acc {
            color: syntax.color,
            files: 0,
            counts: LineCounts::default(),
        });
        entry.files += 1;
        entry.counts.add(&counts);

        self.total.add(&counts);
        self.file_count += 1;
    }

    /// Drain accumulated state into a JSON-encoded [`AnalysisResult`]. The
    /// `Analyzer` is consumed so callers can't accidentally keep using it.
    pub fn finalize(self) -> String {
        let mut languages: Vec<LanguageStats> = self
            .by_lang
            .into_iter()
            .map(|(name, acc)| LanguageStats {
                name: name.to_string(),
                color: acc.color.to_string(),
                files: acc.files,
                code: acc.counts.code,
                comments: acc.counts.comments,
                blanks: acc.counts.blanks,
            })
            .collect();

        // Primary sort by code lines so that documentation-heavy languages
        // don't overshadow real source. Tie-break by total lines.
        languages.sort_by(|a, b| {
            b.code.cmp(&a.code).then_with(|| {
                (b.code + b.comments + b.blanks).cmp(&(a.code + a.comments + a.blanks))
            })
        });

        serde_json::to_string(&AnalysisResult {
            files: self.file_count,
            total_code: self.total.code,
            total_comments: self.total.comments,
            total_blanks: self.total.blanks,
            languages,
        })
        .unwrap_or_else(|_| "{}".to_string())
    }
}

impl Default for Analyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
pub fn analyze_code(files_json: &str) -> String {
    let files: HashMap<String, String> = match serde_json::from_str(files_json) {
        Ok(f) => f,
        Err(_) => {
            return serde_json::to_string(&AnalysisResult {
                files: 0,
                total_code: 0,
                total_comments: 0,
                total_blanks: 0,
                languages: vec![],
            })
            .unwrap();
        }
    };

    let mut analyzer = Analyzer::new();
    for (path, content) in &files {
        analyzer.add_file(path, content);
    }
    analyzer.finalize()
}
