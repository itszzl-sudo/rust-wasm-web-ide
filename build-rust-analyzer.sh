#!/bin/bash

echo "Building rust-analyzer WASM..."

cd rust-analyzer-wasm

cargo build --target wasm32-unknown-unknown --release

wasm-bindgen target/wasm32-unknown-unknown/release/rust_analyzer_wasm.wasm \
  --out-dir ../public/type-checker \
  --target web

echo "rust-analyzer WASM built successfully!"
echo "Output: public/type-checker/"
