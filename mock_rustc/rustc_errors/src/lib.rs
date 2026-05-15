use rustc_span::Span;

pub struct DiagnosticBuilder;

impl DiagnosticBuilder {
    pub fn emit(self) {
        unimplemented!()
    }
    
    pub fn span_note(self, _span: Span, _msg: &str) -> Self {
        self
    }
    
    pub fn span_label(self, _span: Span, _msg: &str) -> Self {
        self
    }
}

pub struct Diagnostic;

impl Diagnostic {
    pub fn new() -> Self {
        Diagnostic
    }
}

pub struct ErrorGuaranteed;

pub fn struct_err(_msg: &str) -> DiagnosticBuilder {
    unimplemented!()
}

pub fn struct_warn(_msg: &str) -> DiagnosticBuilder {
    unimplemented!()
}
