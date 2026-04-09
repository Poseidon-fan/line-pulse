# Line Pulse

A browser extension that analyzes GitHub repositories and shows code line statistics.

## Features

- One-click code line analysis on any GitHub repository
- Language breakdown with color-coded statistics
- Fast and private - all analysis runs locally in your browser
- Supports dark/light mode

## Development

### Prerequisites

- [Rust](https://rust-lang.org/tools/install/)
- [Bun](https://bun.com/)

### Build

```bash
# Install WASM toolchain (first time only)
cargo install wasm-pack

# Build WASM module
wasm-pack build ./wasm --target web

# Install dependencies
bun install

# Run in dev mode
bun run dev
```

### Build for production

```bash
bun run build
```

## Tech Stack

- **Frontend**: Vue 3 + TypeScript
- **Analysis Engine**: Rust (WASM)
- **Build Tool**: WXT