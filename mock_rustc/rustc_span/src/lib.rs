pub mod symbol {
    pub struct Symbol(pub u32);
    
    impl Symbol {
        pub const fn new(n: u32) -> Self {
            Symbol(n)
        }
        
        pub fn as_str(&self) -> &str {
            unimplemented!()
        }
    }
    
    pub const INVALID: Symbol = Symbol(0);
    pub const EMPTY: Symbol = Symbol(1);
}

pub mod span {
    use super::symbol::Symbol;
    
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
    pub struct Span {
        base_or_index: u32,
    }
    
    impl Span {
        pub const DUMMY: Span = Span { base_or_index: 0 };
        
        pub fn dummy() -> Self {
            Span::DUMMY
        }
        
        pub fn is_dummy(self) -> bool {
            self.base_or_index == 0
        }
    }
    
    #[derive(Clone, Debug)]
    pub struct SpanData {
        pub lo: Span,
        pub hi: Span,
    }
    
    pub struct DUMMY_SP;
}

pub mod source_map {
    pub struct SourceMap;
    
    impl SourceMap {
        pub fn new() -> Self {
            SourceMap
        }
    }
}

pub use symbol::Symbol;
pub use span::Span;
