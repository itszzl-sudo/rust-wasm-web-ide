use rustc_span::Span;
use rustc_errors::DiagnosticBuilder;
use rustc_session::Session;
use rustc_hir::HirId;
use rustc_middle::ty::TyCtxt;

pub trait LintPass {
    fn name(&self) -> &'static str;
}

pub struct LateLintPass;

impl LateLintPass {
    pub fn check_expr(&mut self, _cx: &LateContext, _expr: &rustc_hir::Expr) {
        unimplemented!()
    }
    
    pub fn check_stmt(&mut self, _cx: &LateContext, _stmt: &rustc_hir::Stmt) {
        unimplemented!()
    }
    
    pub fn check_item(&mut self, _cx: &LateContext, _item: &rustc_hir::Item) {
        unimplemented!()
    }
}

pub struct LateContext<'tcx> {
    pub tcx: TyCtxt<'tcx>,
    pub sess: &'tcx Session,
}

impl<'tcx> LateContext<'tcx> {
    pub fn new(tcx: TyCtxt<'tcx>, sess: &'tcx Session) -> Self {
        LateContext { tcx, sess }
    }
}

pub fn emit_lint(
    _sess: &Session,
    _msg: &str,
    _span: Span,
) -> DiagnosticBuilder {
    unimplemented!()
}

pub struct Lint {
    pub name: &'static str,
    pub level: Level,
    pub desc: &'static str,
}

#[derive(Clone, Copy)]
pub enum Level {
    Allow,
    Warn,
    Deny,
    Forbid,
}

#[macro_export]
macro_rules! declare_lint {
    ($name:ident, $level:expr, $desc:expr) => {
        pub static $name: $crate::Lint = $crate::Lint {
            name: stringify!($name),
            level: $level,
            desc: $desc,
        };
    };
}

#[macro_export]
macro_rules! declare_lint_pass {
    ($name:ident => [$($lint:expr),*]) => {
        pub struct $name;
        
        impl $crate::LintPass for $name {
            fn name(&self) -> &'static str {
                stringify!($name)
            }
        }
    };
}
