import type { Stats } from '@/utils/types';
import initWasmModule from '../wasm/pkg/line_pulse_wasm_bg.wasm?init';
// @ts-ignore wasm-bindgen does not generate a declaration file for this helper module.
import * as wasmBindings from '../wasm/pkg/line_pulse_wasm_bg.js';

interface WasmLanguageStats {
  name: string;
  color: string;
  files: number;
  code: number;
  comments: number;
  blanks: number;
}

interface WasmAnalysisResult {
  files: number;
  total_code: number;
  total_comments: number;
  total_blanks: number;
  languages: WasmLanguageStats[];
}

interface WasmExports extends WebAssembly.Exports {
  __wbindgen_start: () => void;
}

interface WasmAnalyzer {
  add_file: (path: string, content: string) => void;
  finalize: () => string;
  free: () => void;
}

interface WasmAnalyzerCtor {
  new (): WasmAnalyzer;
}

interface WasmBindings {
  Analyzer: WasmAnalyzerCtor;
  __wbg_set_wasm: (wasm: WasmExports) => void;
}

const { Analyzer, __wbg_set_wasm } = wasmBindings as WasmBindings;

let wasmReady: Promise<void> | null = null;

async function ensureWasmReady(): Promise<void> {
  if (wasmReady) return wasmReady;

  // Forward every export of the bindings module as the import object. This
  // keeps us robust against wasm-bindgen adding new `__wbg_*` helpers
  // (e.g. `__wbindgen_throw`) when we expose new APIs from Rust.
  wasmReady = initWasmModule({
    './line_pulse_wasm_bg.js': wasmBindings as unknown as WebAssembly.ModuleImports,
  })
    .then((instance) => {
      const wasm = instance.exports as WasmExports;
      __wbg_set_wasm(wasm);
      wasm.__wbindgen_start();
    })
    .catch((err: unknown) => {
      wasmReady = null;
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`WASM initialization failed: ${message}`);
    });

  return wasmReady;
}

export type AnalyzeProgressCallback = (processed: number, total: number) => void;

// Throttle interval for progress callbacks. Mirrors the download progress
// throttling so we don't flood the message port for huge repos.
const PROGRESS_INTERVAL_MS = 100;

/**
 * Analyse a `path -> content` map by streaming each file into the WASM
 * `Analyzer` one at a time. This avoids `JSON.stringify`-ing every file
 * content into a single string (which trips V8's ~512 MiB string cap on
 * large monorepos) and lets us report per-file progress.
 */
export async function analyzeWithWasm(
  files: Record<string, string>,
  onProgress?: AnalyzeProgressCallback,
): Promise<Stats> {
  await ensureWasmReady();

  const analyzer = new Analyzer();
  let resultJson: string;
  try {
    const paths = Object.keys(files);
    const total = paths.length;
    let lastReport = 0;

    for (let i = 0; i < total; i++) {
      const path = paths[i];
      analyzer.add_file(path, files[path]);

      if (onProgress) {
        const now = Date.now();
        if (now - lastReport >= PROGRESS_INTERVAL_MS) {
          lastReport = now;
          onProgress(i + 1, total);
        }
      }
    }
    onProgress?.(total, total);

    // `finalize` consumes the analyzer (wasm-bindgen takes `self`), so on the
    // happy path the underlying memory is already freed once it returns.
    resultJson = analyzer.finalize();
  } catch (err) {
    // On the error path the analyzer is still alive — release it explicitly.
    try { analyzer.free(); } catch { /* noop */ }
    throw err;
  }

  const result: WasmAnalysisResult = JSON.parse(resultJson);
  return {
    files: result.files,
    totalCode: result.total_code,
    totalComments: result.total_comments,
    totalBlanks: result.total_blanks,
    totalLines: result.total_code + result.total_comments + result.total_blanks,
    languages: result.languages.map((l) => ({
      name: l.name,
      color: l.color,
      files: l.files,
      code: l.code,
      comments: l.comments,
      blanks: l.blanks,
      lines: l.code + l.comments + l.blanks,
    })),
  };
}
