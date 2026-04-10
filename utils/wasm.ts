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

async function initWasm(): Promise<WasmExports> {
  if (wasmModule) return wasmModule;

  // Vite resolves this absolute path from the `public/` directory at runtime
  const wasm: WasmExports = await import(/* @vite-ignore */ // @ts-expect-error -- Vite public-dir path, not resolvable by TS
    '/wasm/pkg/line_pulse_wasm.js');
  await wasm.default('/wasm/pkg/line_pulse_wasm_bg.wasm');
  wasmModule = wasm;
  return wasmModule;
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
