use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use syn::{parse_file, visit::Visit, ItemFn, ItemStruct, ItemEnum, Expr, Pat};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diagnostic {
    pub severity: String,
    pub message: String,
    pub line: usize,
    pub column: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeCheckResult {
    pub diagnostics: Vec<Diagnostic>,
    pub symbols: Vec<SymbolInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolInfo {
    pub name: String,
    pub kind: String,
    pub line: usize,
}

#[wasm_bindgen]
pub fn check_types(code: &str) -> JsValue {
    let mut result = TypeCheckResult {
        diagnostics: Vec::new(),
        symbols: Vec::new(),
    };
    
    match parse_file(code) {
        Ok(syntax) => {
            let mut visitor = TypeChecker::new();
            visitor.visit_file(&syntax);
            
            result.diagnostics = visitor.diagnostics;
            result.symbols = visitor.symbols;
        }
        Err(e) => {
            result.diagnostics.push(Diagnostic {
                severity: "error".to_string(),
                message: format!("Syntax error: {}", e),
                line: 1,
                column: 1,
            });
        }
    }
    
    serde_wasm_bindgen::to_value(&result).unwrap()
}

struct TypeChecker {
    diagnostics: Vec<Diagnostic>,
    symbols: Vec<SymbolInfo>,
    scopes: Vec<HashMap<String, String>>,
    current_line: usize,
}

impl TypeChecker {
    fn new() -> Self {
        Self {
            diagnostics: Vec::new(),
            symbols: Vec::new(),
            scopes: vec![HashMap::new()],
            current_line: 1,
        }
    }
    
    fn add_diagnostic(&mut self, severity: &str, message: &str, line: usize, column: usize) {
        self.diagnostics.push(Diagnostic {
            severity: severity.to_string(),
            message: message.to_string(),
            line,
            column,
        });
    }
    
    fn add_symbol(&mut self, name: &str, kind: &str, line: usize) {
        self.symbols.push(SymbolInfo {
            name: name.to_string(),
            kind: kind.to_string(),
            line,
        });
    }
}

impl<'ast> Visit<'ast> for TypeChecker {
    fn visit_item_fn(&mut self, f: &'ast ItemFn) {
        let name = f.sig.ident.to_string();
        let line = self.current_line;
        
        self.add_symbol(&name, "function", line);
        
        for input in &f.sig.inputs {
            if let syn::FnArg::Typed(pat_type) = input {
                if let Pat::Ident(pat_ident) = &*pat_type.pat {
                    let param_name = pat_ident.ident.to_string();
                    self.add_symbol(&param_name, "parameter", line);
                }
            }
        }
        
        syn::visit::visit_item_fn(self, f);
    }
    
    fn visit_item_struct(&mut self, s: &'ast ItemStruct) {
        let name = s.ident.to_string();
        let line = self.current_line;
        
        self.add_symbol(&name, "struct", line);
        
        for field in &s.fields {
            if let Some(ident) = &field.ident {
                let field_name = ident.to_string();
                self.add_symbol(&field_name, "field", line);
            }
        }
        
        syn::visit::visit_item_struct(self, s);
    }
    
    fn visit_item_enum(&mut self, e: &'ast ItemEnum) {
        let name = e.ident.to_string();
        let line = self.current_line;
        
        self.add_symbol(&name, "enum", line);
        
        for variant in &e.variants {
            let variant_name = variant.ident.to_string();
            self.add_symbol(&variant_name, "variant", line);
        }
        
        syn::visit::visit_item_enum(self, e);
    }
}

#[wasm_bindgen]
pub fn get_completions(_code: &str, _line: usize, _column: usize) -> JsValue {
    let completions = vec![
        CompletionItem {
            label: "fn".to_string(),
            kind: "keyword".to_string(),
            insert_text: "fn ${1:name}(${2:params}) {\n    ${3}\n}".to_string(),
        },
        CompletionItem {
            label: "let".to_string(),
            kind: "keyword".to_string(),
            insert_text: "let ${1:name} = ${2:value};".to_string(),
        },
        CompletionItem {
            label: "if".to_string(),
            kind: "keyword".to_string(),
            insert_text: "if ${1:condition} {\n    ${2}\n}".to_string(),
        },
        CompletionItem {
            label: "match".to_string(),
            kind: "keyword".to_string(),
            insert_text: "match ${1:value} {\n    ${2} => ${3},\n}".to_string(),
        },
        CompletionItem {
            label: "struct".to_string(),
            kind: "keyword".to_string(),
            insert_text: "struct ${1:Name} {\n    ${2}\n}".to_string(),
        },
        CompletionItem {
            label: "enum".to_string(),
            kind: "keyword".to_string(),
            insert_text: "enum ${1:Name} {\n    ${2},\n}".to_string(),
        },
        CompletionItem {
            label: "impl".to_string(),
            kind: "keyword".to_string(),
            insert_text: "impl ${1:Type} {\n    ${2}\n}".to_string(),
        },
    ];
    
    serde_wasm_bindgen::to_value(&completions).unwrap()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionItem {
    pub label: String,
    pub kind: String,
    pub insert_text: String,
}
