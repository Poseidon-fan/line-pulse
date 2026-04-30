//! Line counter state machine: classifies each line into code / comments /
//! blanks. Mirrors the algorithm in tokei's `SyntaxCounter` but slimmed down
//! for the WASM use case (single-threaded, no embedded language detection,
//! no encoding sniffing — input is already UTF-8 decoded JS strings).

use crate::syntax::LangSyntax;

#[derive(Debug, Default, Clone, Copy)]
pub struct LineCounts {
    pub code: usize,
    pub comments: usize,
    pub blanks: usize,
}

impl LineCounts {
    pub fn add(&mut self, other: &LineCounts) {
        self.code += other.code;
        self.comments += other.comments;
        self.blanks += other.blanks;
    }
}

/// Streaming line counter for a single file.
pub struct Counter<'a> {
    syntax: &'a LangSyntax,
    /// Currently inside a string literal? Stores the closing delimiter.
    quote_end: Option<&'static str>,
    /// Whether the current quote is verbatim (skip `\` escapes).
    quote_verbatim: bool,
    /// Stack of pending block-comment closers. Always represents *open*
    /// comments — block-style `/* */` only pushes one entry; nested-style
    /// `/+ +/` (D) or `{- -}` (Haskell) can stack arbitrarily.
    block_stack: Vec<&'static str>,
}

impl<'a> Counter<'a> {
    pub fn new(syntax: &'a LangSyntax) -> Self {
        Self {
            syntax,
            quote_end: None,
            quote_verbatim: false,
            block_stack: Vec::new(),
        }
    }

    fn in_plain_mode(&self) -> bool {
        self.quote_end.is_none() && self.block_stack.is_empty()
    }

    /// Count a whole file. Splits on `\n`, trims `\r`.
    pub fn count_file(syntax: &'a LangSyntax, src: &[u8]) -> LineCounts {
        let mut counter = Self::new(syntax);
        let mut counts = LineCounts::default();

        let mut start = 0;
        while start < src.len() {
            let nl = src[start..]
                .iter()
                .position(|&b| b == b'\n')
                .map(|p| start + p);

            let line_end = nl.unwrap_or(src.len());
            let mut trimmed_end = line_end;
            if trimmed_end > start && src[trimmed_end - 1] == b'\r' {
                trimmed_end -= 1;
            }

            counter.count_line(&src[start..trimmed_end], &mut counts);

            match nl {
                Some(p) => start = p + 1,
                None => break,
            }
        }

        counts
    }

    /// Classify a single line (without trailing newline / carriage return).
    fn count_line(&mut self, line: &[u8], counts: &mut LineCounts) {
        let trimmed = trim_ascii(line);

        // -------- Fast path (plain mode) --------
        if self.in_plain_mode() {
            if trimmed.is_empty() {
                counts.blanks += 1;
                return;
            }
            if !line_has_important_syntax(trimmed, self.syntax) {
                if self.syntax.is_literate
                    || starts_with_any(trimmed, self.syntax.line_comments)
                {
                    counts.comments += 1;
                } else {
                    counts.code += 1;
                }
                return;
            }
        }

        // -------- Slow path (byte scan) --------
        let started_in_block = !self.block_stack.is_empty();
        let started_in_quote = self.quote_end.is_some();
        let line_is_only_block_close = self.scan(trimmed);

        if trimmed.is_empty() {
            counts.blanks += 1;
            return;
        }

        // Classification mirrors tokei's `line_is_comment`.
        if self.syntax.is_literate {
            counts.comments += 1;
        } else if started_in_quote {
            // A line that started inside a (non-doc) string literal counts as
            // code unless the entire trimmed line was only string body.
            counts.code += 1;
        } else if started_in_block {
            counts.comments += 1;
        } else if line_is_only_block_close {
            counts.comments += 1;
        } else if whole_line_is_comment(trimmed, self.syntax) {
            counts.comments += 1;
        } else {
            counts.code += 1;
        }
    }

    /// Walk the line byte-by-byte, advancing the comment/string state.
    /// Returns `true` if the line opened a fresh block comment that hadn't
    /// been opened yet *and* contains nothing but whitespace + that comment
    /// (i.e. "/* hello */" or just "/*"); used so a single-line `/* ... */`
    /// counts as a comment.
    fn scan(&mut self, line: &[u8]) -> bool {
        let mut saw_only_comment = false;
        let mut saw_anything_else = false;

        let mut i = 0;
        while i < line.len() {
            // 1. End of current quote / comment first.
            if let Some(skip) = self.try_end_quote(&line[i..]) {
                i += skip;
                continue;
            }
            if self.quote_end.is_some() {
                i += 1;
                continue;
            }
            if let Some(skip) = self.try_end_block_comment(&line[i..]) {
                i += skip;
                saw_only_comment = true;
                continue;
            }
            if !self.block_stack.is_empty() {
                i += 1;
                continue;
            }

            // 2. Plain mode — try to enter quote / comment.
            if let Some(skip) = self.try_start_quote(&line[i..]) {
                i += skip;
                saw_anything_else = true;
                continue;
            }
            if let Some(skip) = self.try_start_block_comment(&line[i..]) {
                i += skip;
                saw_only_comment = true;
                continue;
            }
            if self.try_start_line_comment(&line[i..]) {
                // Rest of line is a single-line comment. If we hadn't seen
                // anything else, the line as a whole is a pure comment.
                if !saw_anything_else {
                    saw_only_comment = true;
                }
                return saw_only_comment && !saw_anything_else;
            }

            // 3. Whitespace doesn't disqualify "comment-only" status.
            if !line[i].is_ascii_whitespace() {
                saw_anything_else = true;
            }
            i += 1;
        }

        saw_only_comment && !saw_anything_else
    }

    fn try_end_quote(&mut self, w: &[u8]) -> Option<usize> {
        let end = self.quote_end?;
        if w.starts_with(end.as_bytes()) {
            self.quote_end = None;
            self.quote_verbatim = false;
            return Some(end.len());
        }
        if !self.quote_verbatim && w.starts_with(b"\\\\") {
            return Some(2);
        }
        if !self.quote_verbatim && w.len() >= 2 && w[0] == b'\\' {
            // Skip `\<anything>` so that `\"` doesn't close the string.
            return Some(2);
        }
        None
    }

    fn try_start_quote(&mut self, w: &[u8]) -> Option<usize> {
        for &(start, end) in self.syntax.verbatim_strings {
            if w.starts_with(start.as_bytes()) {
                self.quote_end = Some(end);
                self.quote_verbatim = true;
                return Some(start.len());
            }
        }
        for &(start, end) in self.syntax.strings {
            if w.starts_with(start.as_bytes()) {
                self.quote_end = Some(end);
                self.quote_verbatim = false;
                return Some(start.len());
            }
        }
        None
    }

    fn try_end_block_comment(&mut self, w: &[u8]) -> Option<usize> {
        let last = *self.block_stack.last()?;
        if w.starts_with(last.as_bytes()) {
            self.block_stack.pop();
            return Some(last.len());
        }
        None
    }

    fn try_start_block_comment(&mut self, w: &[u8]) -> Option<usize> {
        // Always-nesting flavours first.
        for &(start, end) in self.syntax.nested_block_comments {
            if w.starts_with(start.as_bytes()) {
                self.block_stack.push(end);
                return Some(start.len());
            }
        }
        for &(start, end) in self.syntax.block_comments {
            if w.starts_with(start.as_bytes()) {
                if self.block_stack.is_empty() || self.syntax.allows_nested {
                    self.block_stack.push(end);
                }
                return Some(start.len());
            }
        }
        None
    }

    fn try_start_line_comment(&self, w: &[u8]) -> bool {
        starts_with_any(w, self.syntax.line_comments)
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn trim_ascii(s: &[u8]) -> &[u8] {
    let mut start = 0;
    let mut end = s.len();
    while start < end && s[start].is_ascii_whitespace() {
        start += 1;
    }
    while end > start && s[end - 1].is_ascii_whitespace() {
        end -= 1;
    }
    &s[start..end]
}

fn starts_with_any(haystack: &[u8], needles: &[&'static str]) -> bool {
    needles.iter().any(|n| haystack.starts_with(n.as_bytes()))
}

fn line_has_important_syntax(line: &[u8], syntax: &LangSyntax) -> bool {
    for needle in syntax.important_starts() {
        let nb = needle.as_bytes();
        if nb.is_empty() || line.len() < nb.len() {
            continue;
        }
        if line.windows(nb.len()).any(|w| w == nb) {
            return true;
        }
    }
    false
}

fn whole_line_is_comment(trimmed: &[u8], syntax: &LangSyntax) -> bool {
    if starts_with_any(trimmed, syntax.line_comments) {
        return true;
    }
    let all_blocks = syntax
        .block_comments
        .iter()
        .chain(syntax.nested_block_comments.iter());
    for (s, e) in all_blocks {
        let sb = s.as_bytes();
        let eb = e.as_bytes();
        if trimmed.len() >= sb.len() + eb.len()
            && trimmed.starts_with(sb)
            && trimmed.ends_with(eb)
        {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::syntax::*;

    fn count(syntax: &LangSyntax, src: &str) -> (usize, usize, usize) {
        let c = Counter::count_file(syntax, src.as_bytes());
        (c.code, c.comments, c.blanks)
    }

    #[test]
    fn rust_basic() {
        let src = "// hello\n\
                   fn main() {\n\
                   \n\
                   /* block\n\
                      comment */\n\
                   let x = 1; // trailing\n\
                   }\n";
        let (code, comments, blanks) = count(&RUST, src);
        assert_eq!(blanks, 1);
        assert_eq!(comments, 3); // `//` + 2 lines of /* */
        assert_eq!(code, 3); // fn main() { , let x = 1; , }
    }

    #[test]
    fn rust_nested_block_comment() {
        let src = "/* outer /* inner */ still outer */\nlet x = 1;\n";
        let (code, comments, _) = count(&RUST, src);
        assert_eq!(code, 1);
        assert_eq!(comments, 1);
    }

    #[test]
    fn python_basic() {
        let src = "# top\n\
                   def f():\n\
                       pass  # trailing\n\
                   \n\
                   x = 1\n";
        let (code, comments, blanks) = count(&PYTHON, src);
        assert_eq!(comments, 1);
        assert_eq!(blanks, 1);
        assert_eq!(code, 3);
    }

    #[test]
    fn python_triple_quote_string_treated_as_code() {
        let src = "\"\"\"docstring\nspans lines\"\"\"\nx = 1\n";
        let (code, _, _) = count(&PYTHON, src);
        // Two string-body lines are code, plus `x = 1`.
        assert_eq!(code, 3);
    }

    #[test]
    fn javascript_string_with_escaped_quote() {
        let src = "const s = \"hi \\\"there\\\"\"; // c\nconst y = 1;\n";
        let (code, comments, _) = count(&JAVASCRIPT, src);
        assert_eq!(code, 2);
        assert_eq!(comments, 0); // `// c` is trailing, line still counted as code
    }

    #[test]
    fn c_block_comment_single_line() {
        let src = "/* one liner */\nint x;\n";
        let (code, comments, _) = count(&C, src);
        assert_eq!(comments, 1);
        assert_eq!(code, 1);
    }

    #[test]
    fn js_block_spanning_lines() {
        let src = "/*\n hi\n*/\nlet x = 1;\n";
        let (code, comments, _) = count(&JAVASCRIPT, src);
        assert_eq!(comments, 3);
        assert_eq!(code, 1);
    }
}
