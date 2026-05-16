use ra_syntax::SourceFile;

#[salsa::query_group(SourceDatabaseStorage)]
pub trait SourceDatabase {
    #[salsa::input]
    fn file_text(&self, file_id: FileId) -> String;
    
    fn parse(&self, file_id: FileId) -> SourceFile;
}

fn parse(db: &dyn SourceDatabase, file_id: FileId) -> SourceFile {
    let text = db.file_text(file_id);
    SourceFile::parse(&text)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct FileId(pub u32);

#[salsa::query_group(AnalysisDatabaseStorage)]
pub trait AnalysisDatabase: SourceDatabase {
    fn infer(&self, file_id: FileId) -> InferenceResult;
}

fn infer(db: &dyn AnalysisDatabase, file_id: FileId) -> InferenceResult {
    let source = db.parse(file_id);
    infer_source(&source)
}

fn infer_source(source: &SourceFile) -> InferenceResult {
    InferenceResult {
        type_of_expr: Default::default(),
        diagnostics: Vec::new(),
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InferenceResult {
    pub type_of_expr: std::collections::HashMap<u32, String>,
    pub diagnostics: Vec<Diagnostic>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Diagnostic {
    pub message: String,
    pub severity: Severity,
    pub range: (u32, u32),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Error,
    Warning,
    Info,
}
