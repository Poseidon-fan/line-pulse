import type { Stats, LanguageStats } from '@/utils/types';

interface WasmExports {
  default(wasmUrl: string): Promise<void>;
  analyze_code(filesJson: string): string;
}

interface WasmAnalysisResult {
  total: number;
  files: number;
  languages: LanguageStats[];
}

let wasmModule: WasmExports | null = null;
let wasmInitError: Error | null = null;

async function initWasm(): Promise<WasmExports> {
  if (wasmModule) return wasmModule;
  if (wasmInitError) throw wasmInitError;

  try {
    const wasm: WasmExports = await import(/* @vite-ignore */ // @ts-expect-error -- Vite public-dir path, not resolvable by TS
      '/wasm/pkg/line_pulse_wasm.js');
    await wasm.default('/wasm/pkg/line_pulse_wasm_bg.wasm');
    wasmModule = wasm;
    return wasmModule;
  } catch (err) {
    wasmInitError = err instanceof Error ? err : new Error('WASM initialization failed');
    throw wasmInitError;
  }
}

export async function analyzeWithWasm(files: Record<string, string>): Promise<Stats> {
  const mod = await initWasm();
  const result: WasmAnalysisResult = JSON.parse(mod.analyze_code(JSON.stringify(files)));
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
