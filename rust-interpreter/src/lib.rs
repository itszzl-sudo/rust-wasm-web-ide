use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterpretResult {
    pub output: String,
    pub error: Option<String>,
    pub execution_time: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    // Keywords
    Fn,
    Let,
    If,
    Else,
    While,
    For,
    In,
    Loop,
    Return,
    Mut,
    True,
    False,
    Struct,
    Enum,
    Match,
    Impl,
    Self_,
    
    // Types
    Identifier(String),
    Number(f64),
    StringLiteral(String),
    
    // Operators
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    Equal,
    EqualEqual,
    BangEqual,
    Less,
    LessEqual,
    Greater,
    GreaterEqual,
    AndAnd,
    OrOr,
    Bang,
    DoubleColon,
    
    // Delimiters
    LeftParen,
    RightParen,
    LeftBrace,
    RightBrace,
    LeftBracket,
    RightBracket,
    Comma,
    Semicolon,
    Colon,
    Arrow,
    DotDot,
    Dot,
    FatArrow,
    
    // WebAssembly keywords
    Pub,
    Use,
    Mod,
    Crate,
    Extern,
    Static,
    Const,
    Ref,
    Unsafe,
    Async,
    Await,
    Dyn,
    Trait,
    Where,
    Type,
    
    // Special
    Println,
    Eof,
}

#[derive(Debug, Clone)]
pub enum Expr {
    Number(f64),
    StringLiteral(String),
    Bool(bool),
    Identifier(String),
    Binary {
        left: Box<Expr>,
        op: Token,
        right: Box<Expr>,
    },
    Unary {
        op: Token,
        expr: Box<Expr>,
    },
    Call {
        name: String,
        args: Vec<Expr>,
    },
    Println(Vec<Expr>),
    StructLiteral {
        name: String,
        fields: Vec<(String, Expr)>,
    },
    FieldAccess {
        object: Box<Expr>,
        field: String,
    },
    EnumVariant {
        enum_name: String,
        variant: String,
        data: Option<Box<Expr>>,
    },
    Match {
        value: Box<Expr>,
        arms: Vec<MatchArm>,
    },
}

#[derive(Debug, Clone)]
pub struct MatchArm {
    pub pattern: Pattern,
    pub body: Vec<Stmt>,
}

#[derive(Debug, Clone)]
pub enum Pattern {
    Wildcard,
    Identifier(String),
    Number(f64),
    StringLiteral(String),
    Bool(bool),
    EnumVariant {
        enum_name: String,
        variant: String,
        inner: Option<Box<Pattern>>,
    },
}

#[derive(Debug, Clone)]
pub enum Stmt {
    Let {
        name: String,
        mutable: bool,
        init: Option<Expr>,
    },
    Expr(Expr),
    If {
        condition: Expr,
        then_branch: Vec<Stmt>,
        else_branch: Option<Vec<Stmt>>,
    },
    While {
        condition: Expr,
        body: Vec<Stmt>,
    },
    For {
        var: String,
        start: Expr,
        end: Expr,
        body: Vec<Stmt>,
    },
    Fn {
        name: String,
        params: Vec<String>,
        body: Vec<Stmt>,
    },
    Return(Option<Expr>),
    StructDef {
        name: String,
        fields: Vec<String>,
    },
    EnumDef {
        name: String,
        variants: Vec<(String, bool)>,
    },
    ImplBlock {
        type_name: String,
        methods: Vec<Stmt>,
    },
    Use {
        path: String,
    },
    Mod {
        name: String,
        content: Option<Vec<Stmt>>,
    },
    Extern {
        abi: String,
        items: Vec<Stmt>,
    },
    TraitDef {
        name: String,
        methods: Vec<(String, Vec<String>)>,
    },
    Const {
        name: String,
        value: Expr,
    },
    Static {
        name: String,
        mutable: bool,
        value: Expr,
    },
    TypeAlias {
        name: String,
        target: String,
    },
}

pub struct Lexer {
    input: Vec<char>,
    pos: usize,
}

impl Lexer {
    pub fn new(input: &str) -> Self {
        Lexer {
            input: input.chars().collect(),
            pos: 0,
        }
    }

    fn peek(&self) -> Option<char> {
        self.input.get(self.pos).copied()
    }

    fn advance(&mut self) -> Option<char> {
        let ch = self.peek();
        self.pos += 1;
        ch
    }

    fn skip_whitespace(&mut self) {
        while let Some(ch) = self.peek() {
            if ch.is_whitespace() {
                self.advance();
            } else {
                break;
            }
        }
    }

    fn skip_comment(&mut self) {
        if self.peek() == Some('/') && self.input.get(self.pos + 1) == Some(&'/') {
            while let Some(ch) = self.peek() {
                if ch == '\n' {
                    break;
                }
                self.advance();
            }
        }
    }

    fn read_string(&mut self) -> Result<String, String> {
        self.advance(); // skip opening quote
        let mut s = String::new();
        while let Some(ch) = self.peek() {
            if ch == '"' {
                self.advance();
                return Ok(s);
            }
            if ch == '\\' {
                self.advance();
                if let Some(escaped) = self.advance() {
                    match escaped {
                        'n' => s.push('\n'),
                        't' => s.push('\t'),
                        'r' => s.push('\r'),
                        '"' => s.push('"'),
                        '\\' => s.push('\\'),
                        _ => s.push(escaped),
                    }
                }
            } else {
                s.push(ch);
                self.advance();
            }
        }
        Err("Unterminated string".to_string())
    }

    fn read_number(&mut self) -> f64 {
        let mut s = String::new();
        while let Some(ch) = self.peek() {
            if ch.is_ascii_digit() || ch == '.' {
                s.push(ch);
                self.advance();
            } else {
                break;
            }
        }
        s.parse().unwrap_or(0.0)
    }

    fn read_identifier(&mut self) -> String {
        let mut s = String::new();
        while let Some(ch) = self.peek() {
            if ch.is_alphanumeric() || ch == '_' {
                s.push(ch);
                self.advance();
            } else {
                break;
            }
        }
        s
    }

    pub fn next_token(&mut self) -> Result<Token, String> {
        self.skip_whitespace();
        self.skip_comment();
        self.skip_whitespace();

        match self.peek() {
            None => Ok(Token::Eof),
            Some(ch) => match ch {
                '"' => {
                    let s = self.read_string()?;
                    Ok(Token::StringLiteral(s))
                }
                '0'..='9' => {
                    let n = self.read_number();
                    Ok(Token::Number(n))
                }
                'a'..='z' | 'A'..='Z' | '_' => {
                    let id = self.read_identifier();
                    match id.as_str() {
                        "fn" => Ok(Token::Fn),
                        "let" => Ok(Token::Let),
                        "if" => Ok(Token::If),
                        "else" => Ok(Token::Else),
                        "while" => Ok(Token::While),
                        "for" => Ok(Token::For),
                        "in" => Ok(Token::In),
                        "loop" => Ok(Token::Loop),
                        "return" => Ok(Token::Return),
                        "mut" => Ok(Token::Mut),
                        "true" => Ok(Token::True),
                        "false" => Ok(Token::False),
                        "struct" => Ok(Token::Struct),
                        "enum" => Ok(Token::Enum),
                        "match" => Ok(Token::Match),
                        "impl" => Ok(Token::Impl),
                        "Self" => Ok(Token::Self_),
                        "println" => Ok(Token::Println),
                        "pub" => Ok(Token::Pub),
                        "use" => Ok(Token::Use),
                        "mod" => Ok(Token::Mod),
                        "crate" => Ok(Token::Crate),
                        "extern" => Ok(Token::Extern),
                        "static" => Ok(Token::Static),
                        "const" => Ok(Token::Const),
                        "ref" => Ok(Token::Ref),
                        "unsafe" => Ok(Token::Unsafe),
                        "async" => Ok(Token::Async),
                        "await" => Ok(Token::Await),
                        "dyn" => Ok(Token::Dyn),
                        "trait" => Ok(Token::Trait),
                        "where" => Ok(Token::Where),
                        "type" => Ok(Token::Type),
                        _ => Ok(Token::Identifier(id)),
                    }
                }
                '+' => { self.advance(); Ok(Token::Plus) }
                '-' => {
                    self.advance();
                    if self.peek() == Some('>') {
                        self.advance();
                        Ok(Token::Arrow)
                    } else {
                        Ok(Token::Minus)
                    }
                }
                '*' => { self.advance(); Ok(Token::Star) }
                '/' => { self.advance(); Ok(Token::Slash) }
                '%' => { self.advance(); Ok(Token::Percent) }
                '!' => {
                    self.advance();
                    if self.peek() == Some('=') {
                        self.advance();
                        Ok(Token::BangEqual)
                    } else {
                        Ok(Token::Bang)
                    }
                }
                '<' => {
                    self.advance();
                    if self.peek() == Some('=') {
                        self.advance();
                        Ok(Token::LessEqual)
                    } else {
                        Ok(Token::Less)
                    }
                }
                '>' => {
                    self.advance();
                    if self.peek() == Some('=') {
                        self.advance();
                        Ok(Token::GreaterEqual)
                    } else {
                        Ok(Token::Greater)
                    }
                }
                '&' => {
                    self.advance();
                    if self.peek() == Some('&') {
                        self.advance();
                        Ok(Token::AndAnd)
                    } else {
                        Err("Expected '&&'".to_string())
                    }
                }
                '|' => {
                    self.advance();
                    if self.peek() == Some('|') {
                        self.advance();
                        Ok(Token::OrOr)
                    } else {
                        Err("Expected '||'".to_string())
                    }
                }
                '(' => { self.advance(); Ok(Token::LeftParen) }
                ')' => { self.advance(); Ok(Token::RightParen) }
                '{' => { self.advance(); Ok(Token::LeftBrace) }
                '}' => { self.advance(); Ok(Token::RightBrace) }
                '[' => { self.advance(); Ok(Token::LeftBracket) }
                ']' => { self.advance(); Ok(Token::RightBracket) }
                ',' => { self.advance(); Ok(Token::Comma) }
                ';' => { self.advance(); Ok(Token::Semicolon) }
                ':' => {
                    self.advance();
                    if self.peek() == Some(':') {
                        self.advance();
                        Ok(Token::DoubleColon)
                    } else {
                        Ok(Token::Colon)
                    }
                }
                '.' => {
                    self.advance();
                    if self.peek() == Some('.') {
                        self.advance();
                        Ok(Token::DotDot)
                    } else {
                        Ok(Token::Dot)
                    }
                }
                '=' => {
                    self.advance();
                    if self.peek() == Some('>') {
                        self.advance();
                        Ok(Token::FatArrow)
                    } else if self.peek() == Some('=') {
                        self.advance();
                        Ok(Token::EqualEqual)
                    } else {
                        Ok(Token::Equal)
                    }
                }
                _ => Err(format!("Unexpected character: {}", ch)),
            },
        }
    }
}

pub struct Parser {
    lexer: Lexer,
    current: Token,
}

impl Parser {
    pub fn new(input: &str) -> Result<Self, String> {
        let mut lexer = Lexer::new(input);
        let current = lexer.next_token()?;
        Ok(Parser { lexer, current })
    }

    fn advance(&mut self) -> Result<Token, String> {
        let prev = self.current.clone();
        self.current = self.lexer.next_token()?;
        Ok(prev)
    }

    fn expect(&mut self, expected: Token) -> Result<(), String> {
        if std::mem::discriminant(&self.current) == std::mem::discriminant(&expected) {
            self.advance()?;
            Ok(())
        } else {
            Err(format!("Expected {:?}, got {:?}", expected, self.current))
        }
    }

    pub fn parse(&mut self) -> Result<Vec<Stmt>, String> {
        let mut statements = Vec::new();
        while self.current != Token::Eof {
            statements.push(self.parse_stmt()?);
        }
        Ok(statements)
    }

    fn parse_stmt(&mut self) -> Result<Stmt, String> {
        match &self.current {
            Token::Let => self.parse_let(),
            Token::Fn => self.parse_fn(),
            Token::If => self.parse_if(),
            Token::While => self.parse_while(),
            Token::For => self.parse_for(),
            Token::Return => {
                self.advance()?;
                if matches!(self.current, Token::Semicolon) {
                    self.advance()?;
                    Ok(Stmt::Return(None))
                } else {
                    let expr = self.parse_expr()?;
                    self.expect(Token::Semicolon)?;
                    Ok(Stmt::Return(Some(expr)))
                }
            }
            Token::Struct => self.parse_struct(),
            Token::Enum => self.parse_enum(),
            Token::Impl => self.parse_impl(),
            Token::Use => self.parse_use(),
            Token::Mod => self.parse_mod(),
            Token::Extern => self.parse_extern(),
            Token::Trait => self.parse_trait(),
            Token::Const => self.parse_const(),
            Token::Static => self.parse_static(),
            Token::Type => self.parse_type_alias(),
            Token::Pub => self.parse_pub(),
            _ => {
                let expr = self.parse_expr()?;
                if matches!(self.current, Token::Semicolon) {
                    self.advance()?;
                }
                Ok(Stmt::Expr(expr))
            }
        }
    }

    fn parse_struct(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected struct name".to_string()),
        };
        self.advance()?;
        self.expect(Token::LeftBrace)?;
        let mut fields = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            if let Token::Identifier(f) = &self.current {
                fields.push(f.clone());
                self.advance()?;
                if matches!(self.current, Token::Comma) {
                    self.advance()?;
                } else if !matches!(self.current, Token::RightBrace) {
                    return Err("Expected ',' or '}' in struct fields".to_string());
                }
            } else {
                break;
            }
        }
        self.expect(Token::RightBrace)?;
        Ok(Stmt::StructDef { name, fields })
    }

    fn parse_enum(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected enum name".to_string()),
        };
        self.advance()?;
        self.expect(Token::LeftBrace)?;
        let mut variants = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            if let Token::Identifier(v) = &self.current {
                let variant_name = v.clone();
                self.advance()?;
                let has_data = if matches!(self.current, Token::LeftParen) {
                    self.advance()?;
                    self.expect(Token::RightParen)?;
                    true
                } else {
                    false
                };
                variants.push((variant_name, has_data));
                if matches!(self.current, Token::Comma) {
                    self.advance()?;
                } else if !matches!(self.current, Token::RightBrace) {
                    return Err("Expected ',' or '}' in enum variants".to_string());
                }
            } else {
                break;
            }
        }
        self.expect(Token::RightBrace)?;
        Ok(Stmt::EnumDef { name, variants })
    }

    fn parse_impl(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let type_name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected type name after impl".to_string()),
        };
        self.advance()?;
        self.expect(Token::LeftBrace)?;
        let mut methods = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            methods.push(self.parse_stmt()?);
        }
        self.expect(Token::RightBrace)?;
        Ok(Stmt::ImplBlock { type_name, methods })
    }

    fn parse_use(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let mut path = String::new();
        while !matches!(self.current, Token::Semicolon) {
            match &self.current {
                Token::Identifier(s) => path.push_str(s),
                Token::DoubleColon => path.push_str("::"),
                Token::Star => path.push('*'),
                Token::LeftBrace => path.push('{'),
                Token::RightBrace => path.push('}'),
                Token::Comma => path.push(','),
                _ => break,
            }
            self.advance()?;
        }
        self.expect(Token::Semicolon)?;
        Ok(Stmt::Use { path })
    }

    fn parse_mod(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected module name".to_string()),
        };
        self.advance()?;
        
        let content = if matches!(self.current, Token::LeftBrace) {
            self.advance()?;
            let mut stmts = Vec::new();
            while !matches!(self.current, Token::RightBrace) {
                stmts.push(self.parse_stmt()?);
            }
            self.expect(Token::RightBrace)?;
            Some(stmts)
        } else {
            self.expect(Token::Semicolon)?;
            None
        };
        
        Ok(Stmt::Mod { name, content })
    }

    fn parse_extern(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let abi = match &self.current {
            Token::StringLiteral(s) => s.clone(),
            Token::Identifier(s) => s.clone(),
            _ => return Err("Expected abi name".to_string()),
        };
        self.advance()?;
        self.expect(Token::LeftBrace)?;
        let mut items = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            items.push(self.parse_stmt()?);
        }
        self.expect(Token::RightBrace)?;
        Ok(Stmt::Extern { abi, items })
    }

    fn parse_trait(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected trait name".to_string()),
        };
        self.advance()?;
        self.expect(Token::LeftBrace)?;
        let mut methods = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            if matches!(self.current, Token::Fn) {
                self.advance()?;
                let method_name = match &self.current {
                    Token::Identifier(n) => n.clone(),
                    _ => return Err("Expected method name".to_string()),
                };
                self.advance()?;
                self.expect(Token::LeftParen)?;
                let mut params = Vec::new();
                while !matches!(self.current, Token::RightParen) {
                    if let Token::Identifier(p) = &self.current {
                        params.push(p.clone());
                        self.advance()?;
                        if matches!(self.current, Token::Comma) {
                            self.advance()?;
                        }
                    } else {
                        break;
                    }
                }
                self.expect(Token::RightParen)?;
                methods.push((method_name, params));
                if matches!(self.current, Token::Semicolon) {
                    self.advance()?;
                }
            } else {
                break;
            }
        }
        self.expect(Token::RightBrace)?;
        Ok(Stmt::TraitDef { name, methods })
    }

    fn parse_const(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected const name".to_string()),
        };
        self.advance()?;
        if matches!(self.current, Token::Colon) {
            self.advance()?;
            while !matches!(self.current, Token::Equal) {
                self.advance()?;
            }
        }
        self.expect(Token::Equal)?;
        let value = self.parse_expr()?;
        self.expect(Token::Semicolon)?;
        Ok(Stmt::Const { name, value })
    }

    fn parse_static(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let mutable = if matches!(self.current, Token::Mut) {
            self.advance()?;
            true
        } else {
            false
        };
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected static name".to_string()),
        };
        self.advance()?;
        if matches!(self.current, Token::Colon) {
            self.advance()?;
            while !matches!(self.current, Token::Equal) {
                self.advance()?;
            }
        }
        self.expect(Token::Equal)?;
        let value = self.parse_expr()?;
        self.expect(Token::Semicolon)?;
        Ok(Stmt::Static { name, mutable, value })
    }

    fn parse_type_alias(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected type name".to_string()),
        };
        self.advance()?;
        self.expect(Token::Equal)?;
        let mut target = String::new();
        while !matches!(self.current, Token::Semicolon) {
            match &self.current {
                Token::Identifier(s) => target.push_str(s),
                Token::DoubleColon => target.push_str("::"),
                Token::LeftBracket => target.push('['),
                Token::RightBracket => target.push(']'),
                Token::LeftParen => target.push('('),
                Token::RightParen => target.push(')'),
                Token::Comma => target.push(','),
                _ => break,
            }
            self.advance()?;
        }
        self.expect(Token::Semicolon)?;
        Ok(Stmt::TypeAlias { name, target })
    }

    fn parse_pub(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        if matches!(self.current, Token::Fn) {
            self.parse_fn()
        } else if matches!(self.current, Token::Struct) {
            self.parse_struct()
        } else if matches!(self.current, Token::Enum) {
            self.parse_enum()
        } else if matches!(self.current, Token::Mod) {
            self.parse_mod()
        } else if matches!(self.current, Token::Const) {
            self.parse_const()
        } else if matches!(self.current, Token::Static) {
            self.parse_static()
        } else if matches!(self.current, Token::Trait) {
            self.parse_trait()
        } else if matches!(self.current, Token::Type) {
            self.parse_type_alias()
        } else if matches!(self.current, Token::Use) {
            self.parse_use()
        } else {
            Err(format!("Expected item after pub, got {:?}", self.current))
        }
    }

    fn parse_let(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let mutable = if matches!(self.current, Token::Mut) {
            self.advance()?;
            true
        } else {
            false
        };
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected identifier after let".to_string()),
        };
        self.advance()?;
        let init = if matches!(self.current, Token::Equal) {
            self.advance()?;
            Some(self.parse_expr()?)
        } else {
            None
        };
        self.expect(Token::Semicolon)?;
        Ok(Stmt::Let { name, mutable, init })
    }

    fn parse_fn(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let name = match &self.current {
            Token::Identifier(n) => n.clone(),
            _ => return Err("Expected function name".to_string()),
        };
        self.advance()?;
        self.expect(Token::LeftParen)?;
        let mut params = Vec::new();
        while !matches!(self.current, Token::RightParen) {
            if let Token::Identifier(p) = &self.current {
                params.push(p.clone());
                self.advance()?;
                if matches!(self.current, Token::Comma) {
                    self.advance()?;
                }
            } else {
                break;
            }
        }
        self.expect(Token::RightParen)?;
        self.expect(Token::LeftBrace)?;
        let mut body = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            body.push(self.parse_stmt()?);
        }
        self.expect(Token::RightBrace)?;
        Ok(Stmt::Fn { name, params, body })
    }

    fn parse_if(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let condition = self.parse_expr()?;
        self.expect(Token::LeftBrace)?;
        let mut then_branch = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            then_branch.push(self.parse_stmt()?);
        }
        self.expect(Token::RightBrace)?;
        let else_branch = if matches!(self.current, Token::Else) {
            self.advance()?;
            self.expect(Token::LeftBrace)?;
            let mut else_stmts = Vec::new();
            while !matches!(self.current, Token::RightBrace) {
                else_stmts.push(self.parse_stmt()?);
            }
            self.expect(Token::RightBrace)?;
            Some(else_stmts)
        } else {
            None
        };
        Ok(Stmt::If { condition, then_branch, else_branch })
    }

    fn parse_while(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let condition = self.parse_expr()?;
        self.expect(Token::LeftBrace)?;
        let mut body = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            body.push(self.parse_stmt()?);
        }
        self.expect(Token::RightBrace)?;
        Ok(Stmt::While { condition, body })
    }

    fn parse_for(&mut self) -> Result<Stmt, String> {
        self.advance()?;
        let var = match &self.current {
            Token::Identifier(v) => v.clone(),
            _ => return Err("Expected variable in for loop".to_string()),
        };
        self.advance()?;
        self.expect(Token::In)?;
        let start = self.parse_expr()?;
        self.expect(Token::DotDot)?;
        let end = self.parse_expr()?;
        self.expect(Token::LeftBrace)?;
        let mut body = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            body.push(self.parse_stmt()?);
        }
        self.expect(Token::RightBrace)?;
        Ok(Stmt::For { var, start, end, body })
    }

    fn parse_expr(&mut self) -> Result<Expr, String> {
        self.parse_comparison()
    }

    fn parse_comparison(&mut self) -> Result<Expr, String> {
        let mut expr = self.parse_addition()?;
        while matches!(self.current, Token::EqualEqual | Token::BangEqual | Token::Less | Token::LessEqual | Token::Greater | Token::GreaterEqual) {
            let op = self.advance()?;
            let right = self.parse_addition()?;
            expr = Expr::Binary { left: Box::new(expr), op, right: Box::new(right) };
        }
        Ok(expr)
    }

    fn parse_addition(&mut self) -> Result<Expr, String> {
        let mut expr = self.parse_multiplication()?;
        while matches!(self.current, Token::Plus | Token::Minus) {
            let op = self.advance()?;
            let right = self.parse_multiplication()?;
            expr = Expr::Binary { left: Box::new(expr), op, right: Box::new(right) };
        }
        Ok(expr)
    }

    fn parse_multiplication(&mut self) -> Result<Expr, String> {
        let mut expr = self.parse_unary()?;
        while matches!(self.current, Token::Star | Token::Slash | Token::Percent) {
            let op = self.advance()?;
            let right = self.parse_unary()?;
            expr = Expr::Binary { left: Box::new(expr), op, right: Box::new(right) };
        }
        Ok(expr)
    }

    fn parse_unary(&mut self) -> Result<Expr, String> {
        if matches!(self.current, Token::Bang | Token::Minus) {
            let op = self.advance()?;
            let expr = self.parse_unary()?;
            Ok(Expr::Unary { op, expr: Box::new(expr) })
        } else {
            self.parse_call()
        }
    }

    fn parse_call(&mut self) -> Result<Expr, String> {
        if matches!(self.current, Token::Println) {
            self.advance()?;
            self.expect(Token::Bang)?;
            self.expect(Token::LeftParen)?;
            let mut args = Vec::new();
            while !matches!(self.current, Token::RightParen) {
                args.push(self.parse_expr()?);
                if matches!(self.current, Token::Comma) {
                    self.advance()?;
                }
            }
            self.expect(Token::RightParen)?;
            return Ok(Expr::Println(args));
        }

        if matches!(self.current, Token::Match) {
            return self.parse_match();
        }

        let expr = self.parse_primary()?;
        let mut expr = expr;
        
        loop {
            if matches!(self.current, Token::LeftParen) {
                if let Expr::Identifier(name) = expr {
                    self.advance()?;
                    let mut args = Vec::new();
                    while !matches!(self.current, Token::RightParen) {
                        args.push(self.parse_expr()?);
                        if matches!(self.current, Token::Comma) {
                            self.advance()?;
                        }
                    }
                    self.expect(Token::RightParen)?;
                    expr = Expr::Call { name, args };
                } else {
                    break;
                }
            } else if matches!(self.current, Token::Dot) {
                self.advance()?;
                let field = match &self.current {
                    Token::Identifier(f) => f.clone(),
                    _ => return Err("Expected field name after '.'".to_string()),
                };
                self.advance()?;
                expr = Expr::FieldAccess {
                    object: Box::new(expr),
                    field,
                };
            } else {
                break;
            }
        }
        Ok(expr)
    }

    fn parse_match(&mut self) -> Result<Expr, String> {
        self.advance()?;
        let value = Box::new(self.parse_expr()?);
        self.expect(Token::LeftBrace)?;
        let mut arms = Vec::new();
        while !matches!(self.current, Token::RightBrace) {
            let pattern = self.parse_pattern()?;
            self.expect(Token::FatArrow)?;
            let mut body = Vec::new();
            if matches!(self.current, Token::LeftBrace) {
                self.advance()?;
                while !matches!(self.current, Token::RightBrace) {
                    body.push(self.parse_stmt()?);
                }
                self.expect(Token::RightBrace)?;
            } else {
                body.push(Stmt::Expr(self.parse_expr()?));
                if matches!(self.current, Token::Comma) {
                    self.advance()?;
                }
            }
            arms.push(MatchArm { pattern, body });
            if matches!(self.current, Token::Comma) {
                self.advance()?;
            }
        }
        self.expect(Token::RightBrace)?;
        Ok(Expr::Match { value, arms })
    }

    fn parse_pattern(&mut self) -> Result<Pattern, String> {
        match &self.current {
            Token::Identifier(name) if name == "_" => {
                self.advance()?;
                Ok(Pattern::Wildcard)
            }
            Token::Identifier(name) => {
                let name = name.clone();
                self.advance()?;
                if matches!(self.current, Token::DoubleColon) {
                    self.advance()?;
                    let variant = match &self.current {
                        Token::Identifier(v) => v.clone(),
                        _ => return Err("Expected variant name after '::'".to_string()),
                    };
                    self.advance()?;
                    let inner = if matches!(self.current, Token::LeftParen) {
                        self.advance()?;
                        let inner = Box::new(self.parse_pattern()?);
                        self.expect(Token::RightParen)?;
                        Some(inner)
                    } else {
                        None
                    };
                    Ok(Pattern::EnumVariant {
                        enum_name: name,
                        variant,
                        inner,
                    })
                } else {
                    Ok(Pattern::Identifier(name))
                }
            }
            Token::Number(n) => {
                let n = *n;
                self.advance()?;
                Ok(Pattern::Number(n))
            }
            Token::StringLiteral(s) => {
                let s = s.clone();
                self.advance()?;
                Ok(Pattern::StringLiteral(s))
            }
            Token::True => {
                self.advance()?;
                Ok(Pattern::Bool(true))
            }
            Token::False => {
                self.advance()?;
                Ok(Pattern::Bool(false))
            }
            _ => Err(format!("Unexpected pattern: {:?}", self.current)),
        }
    }

    fn parse_primary(&mut self) -> Result<Expr, String> {
        match &self.current {
            Token::Number(n) => {
                let n = *n;
                self.advance()?;
                Ok(Expr::Number(n))
            }
            Token::StringLiteral(s) => {
                let s = s.clone();
                self.advance()?;
                Ok(Expr::StringLiteral(s))
            }
            Token::True => {
                self.advance()?;
                Ok(Expr::Bool(true))
            }
            Token::False => {
                self.advance()?;
                Ok(Expr::Bool(false))
            }
            Token::Identifier(name) => {
                let name = name.clone();
                self.advance()?;
                if matches!(self.current, Token::DoubleColon) {
                    self.advance()?;
                    let variant = match &self.current {
                        Token::Identifier(v) => v.clone(),
                        _ => return Err("Expected variant name after '::'".to_string()),
                    };
                    self.advance()?;
                    let data = if matches!(self.current, Token::LeftParen) {
                        self.advance()?;
                        let inner = Box::new(self.parse_expr()?);
                        self.expect(Token::RightParen)?;
                        Some(inner)
                    } else {
                        None
                    };
                    Ok(Expr::EnumVariant {
                        enum_name: name,
                        variant,
                        data,
                    })
                } else if matches!(self.current, Token::LeftBrace) {
                    self.advance()?;
                    let mut fields = Vec::new();
                    while !matches!(self.current, Token::RightBrace) {
                        let field = match &self.current {
                            Token::Identifier(f) => f.clone(),
                            _ => return Err("Expected field name".to_string()),
                        };
                        self.advance()?;
                        self.expect(Token::Colon)?;
                        let value = self.parse_expr()?;
                        fields.push((field, value));
                        if matches!(self.current, Token::Comma) {
                            self.advance()?;
                        }
                    }
                    self.expect(Token::RightBrace)?;
                    Ok(Expr::StructLiteral { name, fields })
                } else {
                    Ok(Expr::Identifier(name))
                }
            }
            Token::LeftParen => {
                self.advance()?;
                let expr = self.parse_expr()?;
                self.expect(Token::RightParen)?;
                Ok(expr)
            }
            _ => Err(format!("Unexpected token in expression: {:?}", self.current)),
        }
    }
}

#[derive(Debug, Clone)]
pub enum Value {
    Number(f64),
    String(String),
    Bool(bool),
    Nil,
    Struct {
        name: String,
        fields: HashMap<String, Value>,
    },
    EnumVariant {
        enum_name: String,
        variant: String,
        data: Option<Box<Value>>,
    },
}

impl Value {
    fn to_string(&self) -> String {
        match self {
            Value::Number(n) => format!("{}", n),
            Value::String(s) => s.clone(),
            Value::Bool(b) => format!("{}", b),
            Value::Nil => "nil".to_string(),
            Value::Struct { name, fields } => {
                let fields_str: Vec<String> = fields
                    .iter()
                    .map(|(k, v)| format!("{}: {}", k, v.to_string()))
                    .collect();
                format!("{} {{ {} }}", name, fields_str.join(", "))
            }
            Value::EnumVariant { enum_name, variant, data } => {
                match data {
                    Some(d) => format!("{}::{}({})", enum_name, variant, d.to_string()),
                    None => format!("{}::{}", enum_name, variant),
                }
            }
        }
    }
}

pub struct Interpreter {
    globals: HashMap<String, Value>,
    output: String,
    structs: HashMap<String, Vec<String>>,
    enums: HashMap<String, Vec<(String, bool)>>,
    functions: HashMap<String, (Vec<String>, Vec<Stmt>)>,
}

impl Interpreter {
    pub fn new() -> Self {
        Interpreter {
            globals: HashMap::new(),
            output: String::new(),
            structs: HashMap::new(),
            enums: HashMap::new(),
            functions: HashMap::new(),
        }
    }

    pub fn interpret(&mut self, statements: &[Stmt]) -> Result<(), String> {
        for stmt in statements {
            self.execute_stmt(stmt)?;
        }
        Ok(())
    }

    fn execute_stmt(&mut self, stmt: &Stmt) -> Result<(), String> {
        match stmt {
            Stmt::Let { name, mutable: _, init } => {
                let value = if let Some(init) = init {
                    self.evaluate(init)?
                } else {
                    Value::Nil
                };
                self.globals.insert(name.clone(), value);
            }
            Stmt::Expr(expr) => {
                self.evaluate(expr)?;
            }
            Stmt::If { condition, then_branch, else_branch } => {
                let cond = self.evaluate(condition)?;
                if let Value::Bool(true) = cond {
                    for stmt in then_branch {
                        self.execute_stmt(stmt)?;
                    }
                } else if let Some(else_stmts) = else_branch {
                    for stmt in else_stmts {
                        self.execute_stmt(stmt)?;
                    }
                }
            }
            Stmt::While { condition, body } => {
                loop {
                    let cond = self.evaluate(condition)?;
                    if let Value::Bool(true) = cond {
                        for stmt in body {
                            self.execute_stmt(stmt)?;
                        }
                    } else {
                        break;
                    }
                }
            }
            Stmt::For { var, start, end, body } => {
                let start_val = self.evaluate(start)?;
                let end_val = self.evaluate(end)?;
                if let (Value::Number(s), Value::Number(e)) = (start_val, end_val) {
                    for i in s as i64..e as i64 {
                        self.globals.insert(var.clone(), Value::Number(i as f64));
                        for stmt in body {
                            self.execute_stmt(stmt)?;
                        }
                    }
                }
            }
            Stmt::Fn { name, params, body } => {
                self.functions.insert(name.clone(), (params.clone(), body.clone()));
            }
            Stmt::Return(_) => {}
            Stmt::StructDef { name, fields } => {
                self.structs.insert(name.clone(), fields.clone());
            }
            Stmt::EnumDef { name, variants } => {
                self.enums.insert(name.clone(), variants.clone());
            }
            Stmt::ImplBlock { type_name: _, methods } => {
                for method in methods {
                    if let Stmt::Fn { name, params, body } = method {
                        self.functions.insert(name.clone(), (params.clone(), body.clone()));
                    }
                }
            }
            Stmt::Use { .. } => {}
            Stmt::Mod { .. } => {}
            Stmt::Extern { .. } => {}
            Stmt::TraitDef { .. } => {}
            Stmt::Const { name, value } => {
                let val = self.evaluate(value)?;
                self.globals.insert(name.clone(), val);
            }
            Stmt::Static { name, mutable: _, value } => {
                let val = self.evaluate(value)?;
                self.globals.insert(name.clone(), val);
            }
            Stmt::TypeAlias { .. } => {}
        }
        Ok(())
    }

    fn evaluate(&mut self, expr: &Expr) -> Result<Value, String> {
        match expr {
            Expr::Number(n) => Ok(Value::Number(*n)),
            Expr::StringLiteral(s) => Ok(Value::String(s.clone())),
            Expr::Bool(b) => Ok(Value::Bool(*b)),
            Expr::Identifier(name) => {
                self.globals.get(name).cloned().ok_or_else(|| format!("Undefined variable: {}", name))
            }
            Expr::Binary { left, op, right } => {
                let left_val = self.evaluate(left)?;
                let right_val = self.evaluate(right)?;
                match op {
                    Token::Plus => {
                        match (&left_val, &right_val) {
                            (Value::Number(a), Value::Number(b)) => Ok(Value::Number(a + b)),
                            (Value::String(a), Value::String(b)) => Ok(Value::String(format!("{}{}", a, b))),
                            _ => Err("Invalid operands for +".to_string()),
                        }
                    }
                    Token::Minus => {
                        if let (Value::Number(a), Value::Number(b)) = (&left_val, &right_val) {
                            Ok(Value::Number(a - b))
                        } else {
                            Err("Invalid operands for -".to_string())
                        }
                    }
                    Token::Star => {
                        if let (Value::Number(a), Value::Number(b)) = (&left_val, &right_val) {
                            Ok(Value::Number(a * b))
                        } else {
                            Err("Invalid operands for *".to_string())
                        }
                    }
                    Token::Slash => {
                        if let (Value::Number(a), Value::Number(b)) = (&left_val, &right_val) {
                            Ok(Value::Number(a / b))
                        } else {
                            Err("Invalid operands for /".to_string())
                        }
                    }
                    Token::Percent => {
                        if let (Value::Number(a), Value::Number(b)) = (&left_val, &right_val) {
                            Ok(Value::Number(a % b))
                        } else {
                            Err("Invalid operands for %".to_string())
                        }
                    }
                    Token::EqualEqual => Ok(Value::Bool(left_val.to_string() == right_val.to_string())),
                    Token::BangEqual => Ok(Value::Bool(left_val.to_string() != right_val.to_string())),
                    Token::Less => {
                        if let (Value::Number(a), Value::Number(b)) = (&left_val, &right_val) {
                            Ok(Value::Bool(a < b))
                        } else {
                            Err("Invalid operands for <".to_string())
                        }
                    }
                    Token::LessEqual => {
                        if let (Value::Number(a), Value::Number(b)) = (&left_val, &right_val) {
                            Ok(Value::Bool(a <= b))
                        } else {
                            Err("Invalid operands for <=".to_string())
                        }
                    }
                    Token::Greater => {
                        if let (Value::Number(a), Value::Number(b)) = (&left_val, &right_val) {
                            Ok(Value::Bool(a > b))
                        } else {
                            Err("Invalid operands for >".to_string())
                        }
                    }
                    Token::GreaterEqual => {
                        if let (Value::Number(a), Value::Number(b)) = (&left_val, &right_val) {
                            Ok(Value::Bool(a >= b))
                        } else {
                            Err("Invalid operands for >=".to_string())
                        }
                    }
                    Token::AndAnd => {
                        if let (Value::Bool(a), Value::Bool(b)) = (&left_val, &right_val) {
                            Ok(Value::Bool(*a && *b))
                        } else {
                            Err("Invalid operands for &&".to_string())
                        }
                    }
                    Token::OrOr => {
                        if let (Value::Bool(a), Value::Bool(b)) = (&left_val, &right_val) {
                            Ok(Value::Bool(*a || *b))
                        } else {
                            Err("Invalid operands for ||".to_string())
                        }
                    }
                    _ => Err(format!("Unsupported binary operator: {:?}", op)),
                }
            }
            Expr::Unary { op, expr } => {
                let val = self.evaluate(expr)?;
                match op {
                    Token::Minus => {
                        if let Value::Number(n) = val {
                            Ok(Value::Number(-n))
                        } else {
                            Err("Invalid operand for -".to_string())
                        }
                    }
                    Token::Bang => {
                        if let Value::Bool(b) = val {
                            Ok(Value::Bool(!b))
                        } else {
                            Err("Invalid operand for !".to_string())
                        }
                    }
                    _ => Err(format!("Unsupported unary operator: {:?}", op)),
                }
            }
            Expr::Call { name, args } => {
                let arg_values: Vec<Value> = args.iter().map(|a| self.evaluate(a)).collect::<Result<Vec<_>, _>>()?;
                if let Some((params, body)) = self.functions.get(name).cloned() {
                    let old_globals = self.globals.clone();
                    for (param, arg_val) in params.iter().zip(arg_values.iter()) {
                        self.globals.insert(param.clone(), arg_val.clone());
                    }
                    let mut result = Value::Nil;
                    for stmt in &body {
                        if let Stmt::Return(Some(expr)) = stmt {
                            result = self.evaluate(expr)?;
                            break;
                        } else {
                            self.execute_stmt(stmt)?;
                        }
                    }
                    self.globals = old_globals;
                    Ok(result)
                } else {
                    Err(format!("Undefined function: {}", name))
                }
            }
            Expr::Println(args) => {
                let values: Vec<Value> = args.iter().map(|a| self.evaluate(a)).collect::<Result<Vec<_>, _>>()?;
                let output = values.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(" ");
                self.output.push_str(&output);
                self.output.push('\n');
                Ok(Value::Nil)
            }
            Expr::StructLiteral { name, fields } => {
                let mut field_values = HashMap::new();
                for (field_name, field_expr) in fields {
                    let value = self.evaluate(field_expr)?;
                    field_values.insert(field_name.clone(), value);
                }
                Ok(Value::Struct {
                    name: name.clone(),
                    fields: field_values,
                })
            }
            Expr::FieldAccess { object, field } => {
                let obj_val = self.evaluate(object)?;
                if let Value::Struct { fields, .. } = obj_val {
                    fields.get(field).cloned()
                        .ok_or_else(|| format!("No such field: {}", field))
                } else {
                    Err("Field access on non-struct value".to_string())
                }
            }
            Expr::EnumVariant { enum_name, variant, data } => {
                let data_val = if let Some(d) = data {
                    Some(Box::new(self.evaluate(d)?))
                } else {
                    None
                };
                Ok(Value::EnumVariant {
                    enum_name: enum_name.clone(),
                    variant: variant.clone(),
                    data: data_val,
                })
            }
            Expr::Match { value, arms } => {
                let val = self.evaluate(value)?;
                for arm in arms {
                    if self.match_pattern(&arm.pattern, &val)? {
                        let mut result = Value::Nil;
                        for stmt in &arm.body {
                            if let Stmt::Return(Some(expr)) = stmt {
                                result = self.evaluate(expr)?;
                            } else if let Stmt::Expr(expr) = stmt {
                                result = self.evaluate(expr)?;
                            } else {
                                self.execute_stmt(stmt)?;
                            }
                        }
                        return Ok(result);
                    }
                }
                Err("No matching pattern".to_string())
            }
        }
    }

    fn match_pattern(&mut self, pattern: &Pattern, value: &Value) -> Result<bool, String> {
        match (pattern, value) {
            (Pattern::Wildcard, _) => Ok(true),
            (Pattern::Identifier(name), val) => {
                self.globals.insert(name.clone(), val.clone());
                Ok(true)
            }
            (Pattern::Number(p), Value::Number(v)) => Ok(p == v),
            (Pattern::StringLiteral(p), Value::String(v)) => Ok(p == v),
            (Pattern::Bool(p), Value::Bool(v)) => Ok(p == v),
            (
                Pattern::EnumVariant { enum_name: pen, variant: pv, inner: pi },
                Value::EnumVariant { enum_name: ven, variant: vv, data: vd },
            ) => {
                if pen == ven && pv == vv {
                    match (pi, vd) {
                        (None, None) => Ok(true),
                        (Some(inner_pattern), Some(inner_value)) => {
                            self.match_pattern(inner_pattern, inner_value)
                        }
                        _ => Ok(false),
                    }
                } else {
                    Ok(false)
                }
            }
            _ => Ok(false),
        }
    }

    pub fn get_output(&self) -> String {
        self.output.clone()
    }
}

#[wasm_bindgen]
pub fn interpret_rust_code(code: &str) -> JsValue {
    let start = std::time::Instant::now();
    
    let mut parser = match Parser::new(code) {
        Ok(p) => p,
        Err(e) => {
            let result = InterpretResult {
                output: String::new(),
                error: Some(format!("Parse error: {}", e)),
                execution_time: 0.0,
            };
            return serde_wasm_bindgen::to_value(&result).unwrap();
        }
    };
    
    let statements = match parser.parse() {
        Ok(s) => s,
        Err(e) => {
            let result = InterpretResult {
                output: String::new(),
                error: Some(format!("Parse error: {}", e)),
                execution_time: 0.0,
            };
            return serde_wasm_bindgen::to_value(&result).unwrap();
        }
    };
    
    let mut interpreter = Interpreter::new();
    let result = match interpreter.interpret(&statements) {
        Ok(_) => InterpretResult {
            output: interpreter.get_output(),
            error: None,
            execution_time: start.elapsed().as_millis() as f64,
        },
        Err(e) => InterpretResult {
            output: interpreter.get_output(),
            error: Some(format!("Runtime error: {}", e)),
            execution_time: start.elapsed().as_millis() as f64,
        },
    };
    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[wasm_bindgen]
pub fn format_rust_code(code: &str) -> String {
    code.to_string()
}
