use ra_syntax::{SourceFile, SyntaxNode, SyntaxKind, TextSize};
use ra_hir::Definition;

pub struct Analysis {
    source: SourceFile,
}

impl Analysis {
    pub fn new(source: SourceFile) -> Self {
        Analysis { source }
    }
    
    pub fn from_text(text: &str) -> Self {
        Analysis {
            source: SourceFile::parse(text),
        }
    }
    
    pub fn diagnostics(&self) -> Vec<Diagnostic> {
        collect_diagnostics(&self.source)
    }
    
    pub fn completions(&self, position: TextSize) -> Vec<CompletionItem> {
        collect_completions(&self.source, position)
    }
    
    pub fn hover(&self, position: TextSize) -> Option<HoverInfo> {
        compute_hover(&self.source, position)
    }
    
    pub fn goto_definition(&self, position: TextSize) -> Option<Location> {
        find_definition(&self.source, position)
    }
    
    pub fn references(&self, position: TextSize) -> Vec<Location> {
        find_references(&self.source, position)
    }
}

#[derive(Debug, Clone)]
pub struct Diagnostic {
    pub message: String,
    pub severity: Severity,
    pub range: (u32, u32),
}

#[derive(Debug, Clone, Copy)]
pub enum Severity {
    Error,
    Warning,
    Info,
}

#[derive(Debug, Clone)]
pub struct CompletionItem {
    pub label: String,
    pub kind: CompletionKind,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub enum CompletionKind {
    Function,
    Struct,
    Enum,
    Trait,
    Module,
    Variable,
    Keyword,
    Type,
}

#[derive(Debug, Clone)]
pub struct HoverInfo {
    pub contents: String,
    pub range: Option<(u32, u32)>,
}

#[derive(Debug, Clone)]
pub struct Location {
    pub file_id: u32,
    pub range: (u32, u32),
}

fn collect_diagnostics(source: &SourceFile) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    let text = source.text();
    
    for (i, line) in text.lines().enumerate() {
        if line.contains("unimplemented!()") {
            diagnostics.push(Diagnostic {
                message: "unimplemented!() will panic at runtime".to_string(),
                severity: Severity::Warning,
                range: (i as u32 * 100, i as u32 * 100 + line.len() as u32),
            });
        }
        
        if line.contains(".unwrap()") {
            diagnostics.push(Diagnostic {
                message: "calling `.unwrap()` may panic".to_string(),
                severity: Severity::Warning,
                range: (i as u32 * 100, i as u32 * 100 + line.len() as u32),
            });
        }
        
        if line.trim().ends_with('{') && !line.contains('}') {
            let next_lines: Vec<_> = text.lines().skip(i + 1).take(50).collect();
            if !next_lines.iter().any(|l| l.contains('}')) {
                diagnostics.push(Diagnostic {
                    message: "unclosed brace".to_string(),
                    severity: Severity::Error,
                    range: (i as u32 * 100, i as u32 * 100 + line.len() as u32),
                });
            }
        }
    }
    
    diagnostics
}

fn collect_completions(source: &SourceFile, position: TextSize) -> Vec<CompletionItem> {
    let text = source.text();
    let offset = position.0 as usize;
    
    let before_cursor = if offset > 0 { &text[..offset] } else { "" };
    let line_start = before_cursor.rfind('\n').map(|i| i + 1).unwrap_or(0);
    let current_line = &text[line_start..offset.min(text.len())];
    
    let mut items = Vec::new();
    
    if current_line.ends_with('.') {
        items.push(CompletionItem {
            label: "len()".to_string(),
            kind: CompletionKind::Function,
            detail: Some("fn len(&self) -> usize".to_string()),
        });
        items.push(CompletionItem {
            label: "clone()".to_string(),
            kind: CompletionKind::Function,
            detail: Some("fn clone(&self) -> Self".to_string()),
        });
        items.push(CompletionItem {
            label: "iter()".to_string(),
            kind: CompletionKind::Function,
            detail: Some("fn iter(&self) -> Iterator".to_string()),
        });
    } else {
        let keywords = ["fn", "let", "mut", "if", "else", "match", "while", "for", "loop", "return", "struct", "enum", "impl", "trait", "mod", "use", "pub", "async", "await"];
        for kw in keywords {
            items.push(CompletionItem {
                label: kw.to_string(),
                kind: CompletionKind::Keyword,
                detail: None,
            });
        }
        
        let types = ["i32", "i64", "u32", "u64", "f32", "f64", "bool", "char", "str", "String", "Vec", "Option", "Result", "Box", "Rc"];
        for ty in types {
            items.push(CompletionItem {
                label: ty.to_string(),
                kind: CompletionKind::Type,
                detail: None,
            });
        }
    }
    
    items
}

fn compute_hover(source: &SourceFile, position: TextSize) -> Option<HoverInfo> {
    let text = source.text();
    let offset = position.0 as usize;
    
    if offset >= text.len() {
        return None;
    }
    
    let before = &text[..offset];
    let word_start = before.rfind(|c: char| !c.is_alphanumeric() && c != '_')
        .map(|i| i + 1)
        .unwrap_or(0);
    
    let after = &text[offset..];
    let word_end = after.find(|c: char| !c.is_alphanumeric() && c != '_')
        .map(|i| offset + i)
        .unwrap_or(text.len());
    
    let word = &text[word_start..word_end];
    
    if word.is_empty() {
        return None;
    }
    
    let keywords = [
        ("fn", "Keyword: function definition"),
        ("let", "Keyword: variable binding"),
        ("mut", "Keyword: mutable binding"),
        ("if", "Keyword: conditional expression"),
        ("else", "Keyword: else branch"),
        ("match", "Keyword: pattern matching"),
        ("while", "Keyword: while loop"),
        ("for", "Keyword: for loop"),
        ("loop", "Keyword: infinite loop"),
        ("return", "Keyword: return from function"),
        ("struct", "Keyword: struct definition"),
        ("enum", "Keyword: enum definition"),
        ("impl", "Keyword: implementation block"),
        ("trait", "Keyword: trait definition"),
        ("async", "Keyword: async function"),
        ("await", "Keyword: await future"),
    ];
    
    for (kw, desc) in keywords {
        if word == kw {
            return Some(HoverInfo {
                contents: format!("```rust\n{}\n```\n\n{}", kw, desc),
                range: Some((word_start as u32, word_end as u32)),
            });
        }
    }
    
    let types = [
        ("i32", "32-bit signed integer"),
        ("i64", "64-bit signed integer"),
        ("u32", "32-bit unsigned integer"),
        ("u64", "64-bit unsigned integer"),
        ("f32", "32-bit floating point"),
        ("f64", "64-bit floating point"),
        ("bool", "boolean type (true/false)"),
        ("char", "Unicode character"),
        ("str", "string slice (&str)"),
        ("String", "owned heap-allocated string"),
        ("Vec", "growable heap-allocated list"),
        ("Option", "optional value (Some/None)"),
        ("Result", "result type (Ok/Err)"),
        ("Box", "heap-allocated smart pointer"),
        ("Rc", "reference-counted smart pointer"),
    ];
    
    for (ty, desc) in types {
        if word == ty {
            return Some(HoverInfo {
                contents: format!("```rust\n{}\n```\n\n{}", ty, desc),
                range: Some((word_start as u32, word_end as u32)),
            });
        }
    }
    
    None
}

fn find_definition(source: &SourceFile, position: TextSize) -> Option<Location> {
    None
}

fn find_references(source: &SourceFile, position: TextSize) -> Vec<Location> {
    Vec::new()
}
