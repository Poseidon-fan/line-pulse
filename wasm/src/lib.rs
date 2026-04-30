//! Line Pulse WASM analysis core.
//!
//! Public surface (called from JS): [`analyze_code`] takes a JSON-encoded
//! `{path: contents}` map and returns a JSON-encoded [`AnalysisResult`].

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

    // Aggregate per language by name (the same display name may come from
    // multiple `LangSyntax` entries — currently rare, but future-proof).
    struct Acc {
        color: &'static str,
        files: usize,
        counts: LineCounts,
    }
    let mut by_lang: HashMap<&'static str, Acc> = HashMap::new();
    let mut total = LineCounts::default();
    let mut file_count = 0usize;

    for (path, content) in &files {
        let Some(syntax) = detect(path) else {
            continue;
        };

        let counts = Counter::count_file(syntax, content.as_bytes());
        // Skip files with no recognised content (e.g. fully empty).
        if counts.code == 0 && counts.comments == 0 && counts.blanks == 0 {
            continue;
        }

        let entry = by_lang.entry(syntax.name).or_insert_with(|| Acc {
            color: syntax.color,
            files: 0,
            counts: LineCounts::default(),
        });
        entry.files += 1;
        entry.counts.add(&counts);

        total.add(&counts);
        file_count += 1;
    }

    let mut languages: Vec<LanguageStats> = by_lang
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

    // Primary sort by code lines so that documentation-heavy languages don't
    // overshadow real source. Tie-break by total lines.
    languages.sort_by(|a, b| {
        b.code.cmp(&a.code).then_with(|| {
            (b.code + b.comments + b.blanks).cmp(&(a.code + a.comments + a.blanks))
        })
    });

    serde_json::to_string(&AnalysisResult {
        files: file_count,
        total_code: total.code,
        total_comments: total.comments,
        total_blanks: total.blanks,
        languages,
    })
    .unwrap_or_else(|_| "{}".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(serde::Deserialize)]
    struct TestResult {
        files: usize,
        total_code: usize,
        total_comments: usize,
        total_blanks: usize,
        languages: Vec<TestLang>,
    }
    #[derive(serde::Deserialize)]
    #[allow(dead_code)]
    struct TestLang {
        name: String,
        files: usize,
        code: usize,
        comments: usize,
        blanks: usize,
    }

    #[test]
    fn analyze_mixed_repo() {
        let files = serde_json::json!({
            "src/main.rs": "// hi\nfn main() {\n    let x = 1;\n}\n",
            "src/lib.py": "# top\ndef f():\n    pass\n",
            "package.json": "{\n  \"name\": \"x\"\n}\n",
            "README.md": "# hi\n",
        })
        .to_string();

        let raw = analyze_code(&files);
        let r: TestResult = serde_json::from_str(&raw).unwrap();

        assert_eq!(r.files, 2);
        assert_eq!(r.languages.len(), 2);

        let rust = r.languages.iter().find(|l| l.name == "Rust").unwrap();
        assert_eq!(rust.files, 1);
        assert_eq!(rust.code, 3);
        assert_eq!(rust.comments, 1);

        let py = r.languages.iter().find(|l| l.name == "Python").unwrap();
        assert_eq!(py.code, 2);
        assert_eq!(py.comments, 1);

        assert_eq!(r.total_code, 5);
        assert_eq!(r.total_comments, 2);
        assert_eq!(r.total_blanks, 0);
    }
}
