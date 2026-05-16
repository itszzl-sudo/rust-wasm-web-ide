use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SourceFile {
    text: String,
    tree: SyntaxNode,
}

impl SourceFile {
    pub fn parse(text: &str) -> Self {
        let tree = parse_text(text);
        SourceFile {
            text: text.to_string(),
            tree,
        }
    }
    
    pub fn syntax(&self) -> &SyntaxNode {
        &self.tree
    }
    
    pub fn text(&self) -> &str {
        &self.text
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SyntaxNode {
    kind: SyntaxKind,
    children: Vec<SyntaxNode>,
    text_range: TextRange,
}

impl SyntaxNode {
    pub fn kind(&self) -> SyntaxKind {
        self.kind
    }
    
    pub fn children(&self) -> impl Iterator<Item = &SyntaxNode> {
        self.children.iter()
    }
    
    pub fn text_range(&self) -> TextRange {
        self.text_range
    }
    
    pub fn ancestors(&self) -> impl Iterator<Item = &SyntaxNode> {
        std::iter::once(self)
    }
    
    pub fn parent(&self) -> Option<&SyntaxNode> {
        None
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SyntaxKind {
    SOURCE_FILE,
    FN,
    FN_DEF,
    STRUCT_DEF,
    ENUM_DEF,
    IMPL_BLOCK,
    TRAIT_DEF,
    MODULE,
    USE_ITEM,
    LET_STMT,
    EXPR_STMT,
    NAME,
    NAME_REF,
    PATH,
    PATH_SEGMENT,
    TYPE_PARAM_LIST,
    TYPE_ARG_LIST,
    PARAM_LIST,
    ARG_LIST,
    RECORD_FIELD_LIST,
    VARIANT_LIST,
    MATCH_ARM_LIST,
    BLOCK_EXPR,
    RETURN_EXPR,
    IF_EXPR,
    WHILE_EXPR,
    FOR_EXPR,
    LOOP_EXPR,
    MATCH_EXPR,
    CALL_EXPR,
    METHOD_CALL_EXPR,
    FIELD_EXPR,
    INDEX_EXPR,
    REF_EXPR,
    PREFIX_EXPR,
    RANGE_EXPR,
    BIN_EXPR,
    LITERAL,
    STRING_LITERAL,
    NUMBER_LITERAL,
    CHAR_LITERAL,
    BOOL_LITERAL,
    PAREN_EXPR,
    TUPLE_EXPR,
    ARRAY_EXPR,
    RECORD_EXPR,
    CLOSURE_EXPR,
    AWAIT_EXPR,
    TRY_EXPR,
    CAST_EXPR,
    MACRO_CALL,
    MACRO_DEF,
    ATTR,
    VISIBILITY,
    MUT_KW,
    CONST_KW,
    STATIC_KW,
    ASYNC_KW,
    UNSAFE_KW,
    PUB_KW,
    FN_KW,
    STRUCT_KW,
    ENUM_KW,
    IMPL_KW,
    TRAIT_KW,
    MOD_KW,
    USE_KW,
    LET_KW,
    IF_KW,
    ELSE_KW,
    WHILE_KW,
    FOR_KW,
    LOOP_KW,
    MATCH_KW,
    RETURN_KW,
    AWAIT_KW,
    IDENT,
    WHITESPACE,
    COMMENT,
    ERROR,
    EOF,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TextRange {
    pub start: TextSize,
    pub end: TextSize,
}

impl TextRange {
    pub fn new(start: TextSize, end: TextSize) -> Self {
        TextRange { start, end }
    }
    
    pub fn len(&self) -> TextSize {
        TextSize(self.end.0 - self.start.0)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct TextSize(pub u32);

fn parse_text(text: &str) -> SyntaxNode {
    let mut children = Vec::new();
    let mut pos = 0u32;
    
    for line in text.lines() {
        let line_start = pos;
        pos += line.len() as u32 + 1;
        
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("//") {
            continue;
        }
        
        let kind = if trimmed.starts_with("fn ") {
            SyntaxKind::FN_DEF
        } else if trimmed.starts_with("struct ") {
            SyntaxKind::STRUCT_DEF
        } else if trimmed.starts_with("enum ") {
            SyntaxKind::ENUM_DEF
        } else if trimmed.starts_with("impl ") {
            SyntaxKind::IMPL_BLOCK
        } else if trimmed.starts_with("trait ") {
            SyntaxKind::TRAIT_DEF
        } else if trimmed.starts_with("mod ") {
            SyntaxKind::MODULE
        } else if trimmed.starts_with("use ") {
            SyntaxKind::USE_ITEM
        } else if trimmed.starts_with("let ") {
            SyntaxKind::LET_STMT
        } else if trimmed.starts_with("if ") {
            SyntaxKind::IF_EXPR
        } else if trimmed.starts_with("while ") {
            SyntaxKind::WHILE_EXPR
        } else if trimmed.starts_with("for ") {
            SyntaxKind::FOR_EXPR
        } else if trimmed.starts_with("loop ") {
            SyntaxKind::LOOP_EXPR
        } else if trimmed.starts_with("match ") {
            SyntaxKind::MATCH_EXPR
        } else if trimmed.starts_with("return") {
            SyntaxKind::RETURN_EXPR
        } else if trimmed.starts_with("async ") {
            SyntaxKind::FN_DEF
        } else if trimmed.contains('(') && trimmed.contains(')') {
            if trimmed.contains('.') {
                SyntaxKind::METHOD_CALL_EXPR
            } else {
                SyntaxKind::CALL_EXPR
            }
        } else if trimmed.contains("::") {
            SyntaxKind::PATH
        } else {
            SyntaxKind::EXPR_STMT
        };
        
        children.push(SyntaxNode {
            kind,
            children: Vec::new(),
            text_range: TextRange::new(
                TextSize(line_start),
                TextSize(pos - 1),
            ),
        });
    }
    
    SyntaxNode {
        kind: SyntaxKind::SOURCE_FILE,
        children,
        text_range: TextRange::new(TextSize(0), TextSize(pos)),
    }
}

pub struct Parse<T> {
    green: T,
    errors: Vec<ParseError>,
}

impl<T> Parse<T> {
    pub fn tree(&self) -> &T {
        &self.green
    }
    
    pub fn errors(&self) -> &[ParseError] {
        &self.errors
    }
}

#[derive(Debug)]
pub struct ParseError {
    pub message: String,
    pub range: TextRange,
}

pub fn parse(source: &str) -> Parse<SourceFile> {
    let file = SourceFile::parse(source);
    Parse {
        green: file,
        errors: Vec::new(),
    }
}
