import type { Stats, LanguageStats } from '@/utils/types';
import initWasmModule from '../wasm/pkg/line_pulse_wasm_bg.wasm?init';
import {
  analyze_code,
  __wbg_set_wasm,
  __wbindgen_init_externref_table,
} from '../wasm/pkg/line_pulse_wasm_bg.js';

interface WasmAnalysisResult {
  total: number;
  files: number;
  languages: LanguageStats[];
}

interface WasmInstance {
  exports: WebAssembly.Exports & {
    __wbindgen_start: () => void;
  };
}

let wasmReady: Promise<void> | null = null;

async function ensureWasmReady(): Promise<void> {
  if (wasmReady) return wasmReady;

  wasmReady = initWasmModule({
    './line_pulse_wasm_bg.js': {
      __wbindgen_init_externref_table,
    },
  })
    .then((instance: WasmInstance) => {
      const wasm = instance.exports;
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
    total: result.total,
    files: result.files,
    languages: result.languages.map((l) => ({
      name: l.name,
      lines: l.lines,
      color: l.color,
    })),
  };
}
