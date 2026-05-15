use ra_syntax::{SyntaxNode, SyntaxKind};
use ra_db::FileId;

pub struct HirDatabase;

#[derive(Debug, Clone)]
pub struct Function {
    pub name: String,
    pub params: Vec<String>,
    pub return_type: String,
    pub visibility: Visibility,
}

#[derive(Debug, Clone)]
pub struct Struct {
    pub name: String,
    pub fields: Vec<Field>,
    pub visibility: Visibility,
}

#[derive(Debug, Clone)]
pub struct Field {
    pub name: String,
    pub ty: String,
    pub visibility: Visibility,
}

#[derive(Debug, Clone)]
pub struct Enum {
    pub name: String,
    pub variants: Vec<String>,
    pub visibility: Visibility,
}

#[derive(Debug, Clone, Copy)]
pub enum Visibility {
    Public,
    Private,
}

pub fn collect_definitions(node: &SyntaxNode) -> Vec<Definition> {
    let mut defs = Vec::new();
    
    for child in node.children() {
        match child.kind() {
            SyntaxKind::FN_DEF => {
                defs.push(Definition::Function(Function {
                    name: "unknown".to_string(),
                    params: Vec::new(),
                    return_type: "()".to_string(),
                    visibility: Visibility::Private,
                }));
            }
            SyntaxKind::STRUCT_DEF => {
                defs.push(Definition::Struct(Struct {
                    name: "unknown".to_string(),
                    fields: Vec::new(),
                    visibility: Visibility::Private,
                }));
            }
            SyntaxKind::ENUM_DEF => {
                defs.push(Definition::Enum(Enum {
                    name: "unknown".to_string(),
                    variants: Vec::new(),
                    visibility: Visibility::Private,
                }));
            }
            _ => {}
        }
    }
    
    defs
}

#[derive(Debug, Clone)]
pub enum Definition {
    Function(Function),
    Struct(Struct),
    Enum(Enum),
}
