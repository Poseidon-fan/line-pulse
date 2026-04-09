# WXT + Vue 3

This template should help get you started developing with Vue 3 in WXT.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

## Build
1. Install [Rust](https://rust-lang.org/tools/install/) and [bun](https://bun.com/) on your device.
2. Build wasm:
    ```bash
    cargo install wasm-pack
    wasm-pack build wasm --target web
    ```
3. Install npm dependencies: 
    ```bash
    bun install
    ```
4. Run in dev mode:
    ```bash
    bun run dev
    ```

