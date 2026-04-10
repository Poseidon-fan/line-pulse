import type { Stats } from '@/utils/types';

interface WasmExports {
  analyze_code(filesJson: string): string;
}

let wasmModule: WasmExports | null = null;

async function initWasm(): Promise<WasmExports> {
  if (wasmModule) return wasmModule;

  const wasm: any = await import(/* @vite-ignore */ '/wasm/pkg/line_pulse_wasm.js');
  await wasm.default('/wasm/pkg/line_pulse_wasm_bg.wasm');
  wasmModule = { analyze_code: wasm.analyze_code };
  return wasmModule;
}

export async function analyzeWithWasm(files: Record<string, string>): Promise<Stats> {
  const mod = await initWasm();
  const result = JSON.parse(mod.analyze_code(JSON.stringify(files)));
  return {
    total: result.total,
    files: result.files,
    languages: result.languages.map((l: any) => ({
      name: l.name,
      lines: l.lines,
      color: l.color,
    })),
  };
}
