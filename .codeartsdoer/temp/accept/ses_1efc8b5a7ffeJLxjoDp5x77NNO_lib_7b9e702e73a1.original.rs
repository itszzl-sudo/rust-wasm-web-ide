use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterpretResult {
    pub output: String,
    pub error: Option<String>,
    pub execution_time: f64,
}

#[derive(Debug, Clone)]
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
                        "println" => Ok(Token::Println),
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
                '=' => {
                    self.advance();
                    if self.peek() == Some('=') {
                        self.advance();
                        Ok(Token::EqualEqual)
                    } else {
                        Ok(Token::Equal)
                    }
                }
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
                ':' => { self.advance(); Ok(Token::Colon) }
                '.' => {
                    self.advance();
                    if self.peek() == Some('.') {
                        self.advance();
                        Ok(Token::DotDot)
                    } else {
                        Err("Expected '..'".to_string())
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
            _ => {
                let expr = self.parse_expr()?;
                if matches!(self.current, Token::Semicolon) {
                    self.advance()?;
                }
                Ok(Stmt::Expr(expr))
            }
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

        let expr = self.parse_primary()?;
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
                return Ok(Expr::Call { name, args });
            }
        }
        Ok(expr)
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
                Ok(Expr::Identifier(name))
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
}

impl Value {
    fn to_string(&self) -> String {
        match self {
            Value::Number(n) => format!("{}", n),
            Value::String(s) => s.clone(),
            Value::Bool(b) => format!("{}", b),
            Value::Nil => "nil".to_string(),
        }
    }
}

pub struct Interpreter {
    globals: HashMap<String, Value>,
    output: String,
}

impl Interpreter {
    pub fn new() -> Self {
        Interpreter {
            globals: HashMap::new(),
            output: String::new(),
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
                self.globals.insert(name.clone(), Value::Nil);
            }
            Stmt::Return(_) => {}
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
                let _arg_values: Vec<Value> = args.iter().map(|a| self.evaluate(a)).collect::<Result<Vec<_>, _>>()?;
                Err(format!("Undefined function: {}", name))
            }
            Expr::Println(args) => {
                let values: Vec<Value> = args.iter().map(|a| self.evaluate(a)).collect::<Result<Vec<_>, _>>()?;
                let output = values.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(" ");
                self.output.push_str(&output);
                self.output.push('\n');
                Ok(Value::Nil)
            }
        }
    }

    pub fn get_output(&self) -> String {
        self.output.clone()
    }
}

#[wasm_bindgen]
pub fn interpret_rust_code(code: &str) -> InterpretResult {
    let start = std::time::Instant::now();
    
    let mut parser = match Parser::new(code) {
        Ok(p) => p,
        Err(e) => {
            return InterpretResult {
                output: String::new(),
                error: Some(format!("Parse error: {}", e)),
                execution_time: 0.0,
            }
        }
    };
    
    let statements = match parser.parse() {
        Ok(s) => s,
        Err(e) => {
            return InterpretResult {
                output: String::new(),
                error: Some(format!("Parse error: {}", e)),
                execution_time: 0.0,
            }
        }
    };
    
    let mut interpreter = Interpreter::new();
    match interpreter.interpret(&statements) {
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
    }
}

#[wasm_bindgen]
pub fn format_rust_code(code: &str) -> String {
    code.to_string()
}
