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

interface WasmBindings {
  analyze_code: (filesJson: string) => string;
  __wbg_set_wasm: (wasm: WasmExports) => void;
  __wbindgen_init_externref_table: () => void;
}

const {
  analyze_code,
  __wbg_set_wasm,
  __wbindgen_init_externref_table,
} = wasmBindings as WasmBindings;

let wasmReady: Promise<void> | null = null;

async function ensureWasmReady(): Promise<void> {
  if (wasmReady) return wasmReady;

  wasmReady = initWasmModule({
    './line_pulse_wasm_bg.js': {
      __wbindgen_init_externref_table,
    },
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

export async function analyzeWithWasm(files: Record<string, string>): Promise<Stats> {
  await ensureWasmReady();
  const result: WasmAnalysisResult = JSON.parse(analyze_code(JSON.stringify(files)));
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
