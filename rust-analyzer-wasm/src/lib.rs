use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use ra_syntax::{SourceFile, TextSize};
use ra_ide::{Analysis, Diagnostic, CompletionItem, HoverInfo, Severity};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(msg: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format!($($t)*)))
}

#[derive(Serialize, Deserialize)]
pub struct JsDiagnostic {
    pub message: String,
    pub severity: String,
    pub line: u32,
    pub column: u32,
    pub end_line: u32,
    pub end_column: u32,
}

#[derive(Serialize, Deserialize)]
pub struct JsCompletion {
    pub label: String,
    pub kind: String,
    pub detail: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct JsHover {
    pub contents: String,
    pub range: Option<JsRange>,
}

#[derive(Serialize, Deserialize)]
pub struct JsRange {
    pub start_line: u32,
    pub start_column: u32,
    pub end_line: u32,
    pub end_column: u32,
}

#[wasm_bindgen]
pub struct RustAnalyzer {
    source: Option<SourceFile>,
}

#[wasm_bindgen]
impl RustAnalyzer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_log!("RustAnalyzer WASM initialized");
        RustAnalyzer { source: None }
    }
    
    #[wasm_bindgen]
    pub fn parse(&mut self, code: &str) {
        self.source = Some(SourceFile::parse(code));
    }
    
    #[wasm_bindgen]
    pub fn check(&self, code: &str) -> JsValue {
        let analysis = Analysis::from_text(code);
        let diagnostics = analysis.diagnostics();
        
        let js_diags: Vec<JsDiagnostic> = diagnostics
            .iter()
            .map(|d| JsDiagnostic {
                message: d.message.clone(),
                severity: match d.severity {
                    Severity::Error => "error",
                    Severity::Warning => "warning",
                    Severity::Info => "info",
                }.to_string(),
                line: d.range.0 / 100 + 1,
                column: d.range.0 % 100,
                end_line: d.range.1 / 100 + 1,
                end_column: d.range.1 % 100,
            })
            .collect();
        
        serde_wasm_bindgen::to_value(&js_diags).unwrap()
    }
    
    #[wasm_bindgen]
    pub fn complete(&self, code: &str, line: u32, column: u32) -> JsValue {
        let analysis = Analysis::from_text(code);
        
        let mut offset = 0u32;
        for (i, l) in code.lines().enumerate() {
            if i as u32 == line - 1 {
                offset += column;
                break;
            }
            offset += l.len() as u32 + 1;
        }
        
        let completions = analysis.completions(TextSize(offset));
        
        let js_completions: Vec<JsCompletion> = completions
            .iter()
            .map(|c| JsCompletion {
                label: c.label.clone(),
                kind: match c.kind {
                    ra_ide::CompletionKind::Function => "function",
                    ra_ide::CompletionKind::Struct => "struct",
                    ra_ide::CompletionKind::Enum => "enum",
                    ra_ide::CompletionKind::Trait => "trait",
                    ra_ide::CompletionKind::Module => "module",
                    ra_ide::CompletionKind::Variable => "variable",
                    ra_ide::CompletionKind::Keyword => "keyword",
                    ra_ide::CompletionKind::Type => "type",
                }.to_string(),
                detail: c.detail.clone(),
            })
            .collect();
        
        serde_wasm_bindgen::to_value(&js_completions).unwrap()
    }
    
    #[wasm_bindgen]
    pub fn hover(&self, code: &str, line: u32, column: u32) -> JsValue {
        let analysis = Analysis::from_text(code);
        
        let mut offset = 0u32;
        for (i, l) in code.lines().enumerate() {
            if i as u32 == line - 1 {
                offset += column;
                break;
            }
            offset += l.len() as u32 + 1;
        }
        
        match analysis.hover(TextSize(offset)) {
            Some(info) => {
                let js_hover = JsHover {
                    contents: info.contents,
                    range: info.range.map(|(s, e)| JsRange {
                        start_line: s / 100 + 1,
                        start_column: s % 100,
                        end_line: e / 100 + 1,
                        end_column: e % 100,
                    }),
                };
                serde_wasm_bindgen::to_value(&js_hover).unwrap()
            }
            None => JsValue::NULL,
        }
    }
    
    #[wasm_bindgen]
    pub fn goto_definition(&self, code: &str, line: u32, column: u32) -> JsValue {
        JsValue::NULL
    }
    
    #[wasm_bindgen]
    pub fn find_references(&self, code: &str, line: u32, column: u32) -> JsValue {
        let arr = Vec::<JsValue>::new();
        serde_wasm_bindgen::to_value(&arr).unwrap()
    }
}

#[wasm_bindgen]
pub fn check_types(code: &str) -> JsValue {
    let analyzer = RustAnalyzer::new();
    analyzer.check(code)
}

#[wasm_bindgen]
pub fn get_completions(code: &str, line: u32, column: u32) -> JsValue {
    let analyzer = RustAnalyzer::new();
    analyzer.complete(code, line, column)
}

#[wasm_bindgen]
pub fn get_hover(code: &str, line: u32, column: u32) -> JsValue {
    let analyzer = RustAnalyzer::new();
    analyzer.hover(code, line, column)
}
