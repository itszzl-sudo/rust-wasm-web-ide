use rustc_span::Symbol;

pub struct Session;

impl Session {
    pub fn new() -> Self {
        Session
    }
    
    pub fn source_map(&self) -> &rustc_span::source_map::SourceMap {
        unimplemented!()
    }
}

pub struct SessionBuilder;

impl SessionBuilder {
    pub fn new() -> Self {
        SessionBuilder
    }
    
    pub fn build(self) -> Session {
        Session::new()
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Options;

impl Options {
    pub fn new() -> Self {
        Options
    }
}
