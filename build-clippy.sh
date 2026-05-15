#!/bin/bash

echo "Building Clippy WASM..."

cd clippy-wasm

cargo build --target wasm32-unknown-unknown --release

wasm-bindgen target/wasm32-unknown-unknown/release/clippy_wasm.wasm \
  --out-dir ../public/clippy \
  --target web

echo "Clippy WASM built successfully!"
echo "Output: public/clippy/"
