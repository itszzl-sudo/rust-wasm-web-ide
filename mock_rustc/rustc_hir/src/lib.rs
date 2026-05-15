use rustc_span::{Span, Symbol};

pub mod hir {
    use rustc_span::{Span, Symbol};
    
    pub struct HirId {
        pub owner: DefId,
        pub local_id: ItemLocalId,
    }
    
    pub type ItemLocalId = u32;
    
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
    pub struct DefId {
        pub krate: CrateNum,
        pub index: DefIndex,
    }
    
    pub type CrateNum = u32;
    pub type DefIndex = u32;
    
    pub struct Item<'hir> {
        pub ident: Ident,
        pub kind: ItemKind<'hir>,
        pub span: Span,
    }
    
    pub enum ItemKind<'hir> {
        Fn(&'hir FnDecl<'hir>, FnHeader),
        Struct(&'hir VariantData<'hir>),
        Enum(EnumDef<'hir>),
        Mod(&'hir Mod<'hir>),
        Trait(TraitItemRef),
        Impl(ImplItemRef),
        Use(Path<'hir>, UseKind),
        _Other,
    }
    
    pub struct Ident {
        pub name: Symbol,
        pub span: Span,
    }
    
    pub struct FnDecl<'hir> {
        pub inputs: &'hir [Ty<'hir>],
        pub output: FnRetTy<'hir>,
    }
    
    pub enum FnRetTy<'hir> {
        Return(&'hir Ty<'hir>),
        DefaultReturn(Span),
    }
    
    pub struct Ty<'hir> {
        pub kind: TyKind<'hir>,
        pub span: Span,
    }
    
    pub enum TyKind<'hir> {
        Path(QPath<'hir>),
        Ref(&'hir Ty<'hir>, Mutability),
        Slice(&'hir Ty<'hir>),
        Array(&'hir Ty<'hir>, AnonConst),
        Tuple(&'hir [Ty<'hir>]),
        BareFn(&'hir FnDecl<'hir>),
        Infer,
        _Other,
    }
    
    #[derive(Clone, Copy)]
    pub enum Mutability {
        Mut,
        Not,
    }
    
    pub struct QPath<'hir> {
        pub resolved: Res,
        pub segments: &'hir [PathSegment<'hir>],
    }
    
    #[derive(Clone, Copy)]
    pub enum Res {
        Def(DefKind, DefId),
        Err,
    }
    
    #[derive(Clone, Copy)]
    pub enum DefKind {
        Fn,
        Struct,
        Enum,
        Trait,
        Mod,
        AssocFn,
        _Other,
    }
    
    pub struct PathSegment<'hir> {
        pub ident: Ident,
        pub args: Option<&'hir GenericArgs<'hir>>,
    }
    
    pub struct GenericArgs<'hir> {
        pub args: &'hir [GenericArg<'hir>],
    }
    
    pub enum GenericArg<'hir> {
        Type(&'hir Ty<'hir>),
        _Other,
    }
    
    pub struct FnHeader {
        pub unsafety: Unsafe,
        pub constness: Const,
        pub asyncness: IsAsync,
    }
    
    #[derive(Clone, Copy)]
    pub enum Unsafe {
        Yes,
        No,
    }
    
    #[derive(Clone, Copy)]
    pub enum Const {
        Yes,
        No,
    }
    
    #[derive(Clone, Copy)]
    pub enum IsAsync {
        Async,
        NotAsync,
    }
    
    pub struct VariantData<'hir> {
        pub fields: &'hir [FieldDef<'hir>],
    }
    
    pub struct FieldDef<'hir> {
        pub ident: Ident,
        pub ty: &'hir Ty<'hir>,
        pub span: Span,
    }
    
    pub struct EnumDef<'hir> {
        pub variants: &'hir [Variant<'hir>],
    }
    
    pub struct Variant<'hir> {
        pub ident: Ident,
        pub data: VariantData<'hir>,
    }
    
    pub struct Mod<'hir> {
        pub item_ids: &'hir [ItemId],
    }
    
    pub type ItemId = ItemLocalId;
    
    pub struct TraitItemRef {
        pub id: TraitItemId,
    }
    
    pub type TraitItemId = ItemLocalId;
    
    pub struct ImplItemRef {
        pub id: ImplItemId,
    }
    
    pub type ImplItemId = ItemLocalId;
    
    pub struct Path<'hir> {
        pub segments: &'hir [PathSegment<'hir>],
    }
    
    #[derive(Clone, Copy)]
    pub enum UseKind {
        Single,
        Glob,
        List,
    }
    
    pub struct AnonConst {
        pub hir_id: HirId,
    }
    
    pub struct Expr<'hir> {
        pub kind: ExprKind<'hir>,
        pub span: Span,
    }
    
    pub enum ExprKind<'hir> {
        Lit(&'hir Lit),
        Binary(BinOp, &'hir Expr<'hir>, &'hir Expr<'hir>),
        Unary(UnOp, &'hir Expr<'hir>),
        Call(&'hir Expr<'hir>, &'hir [Expr<'hir>]),
        MethodCall(&'hir PathSegment<'hir>, &'hir [Expr<'hir>], Span),
        Field(&'hir Expr<'hir>, Ident),
        Index(&'hir Expr<'hir>, &'hir Expr<'hir>),
        Path(QPath<'hir>),
        AddrOf(Mutability, &'hir Expr<'hir>),
        Block(&'hir Block<'hir>),
        If(&'hir Expr<'hir>, &'hir Block<'hir>, Option<&'hir Expr<'hir>>),
        Match(&'hir Expr<'hir>, &'hir [Arm<'hir>]),
        Loop(&'hir Block<'hir>),
        Closure(Closure<'hir>),
        Cast(&'hir Expr<'hir>, &'hir Ty<'hir>),
        _Other,
    }
    
    pub struct Lit {
        pub node: LitKind,
        pub span: Span,
    }
    
    #[derive(Clone, Copy)]
    pub enum LitKind {
        Int(u128, LitIntType),
        Float(f64),
        Str(Symbol),
        Char(char),
        Bool(bool),
        Err,
    }
    
    #[derive(Clone, Copy)]
    pub enum LitIntType {
        Signed(IntTy),
        Unsigned(UintTy),
        Unsuffixed,
    }
    
    #[derive(Clone, Copy)]
    pub enum IntTy {
        Isize,
        I8,
        I16,
        I32,
        I64,
        I128,
    }
    
    #[derive(Clone, Copy)]
    pub enum UintTy {
        Usize,
        U8,
        U16,
        U32,
        U64,
        U128,
    }
    
    #[derive(Clone, Copy)]
    pub enum BinOp {
        Add,
        Sub,
        Mul,
        Div,
        Rem,
        And,
        Or,
        BitXor,
        BitAnd,
        BitOr,
        Shl,
        Shr,
        Eq,
        Lt,
        Le,
        Ne,
        Ge,
        Gt,
    }
    
    #[derive(Clone, Copy)]
    pub enum UnOp {
        Deref,
        Not,
        Neg,
    }
    
    pub struct Block<'hir> {
        pub stmts: &'hir [Stmt<'hir>],
        pub expr: Option<&'hir Expr<'hir>>,
    }
    
    pub struct Stmt<'hir> {
        pub kind: StmtKind<'hir>,
    }
    
    pub enum StmtKind<'hir> {
        Local(&'hir Local<'hir>),
        Expr(&'hir Expr<'hir>),
        Semi(&'hir Expr<'hir>),
        Item(ItemId),
    }
    
    pub struct Local<'hir> {
        pub pat: &'hir Pat<'hir>,
        pub init: Option<&'hir Expr<'hir>>,
        pub ty: Option<&'hir Ty<'hir>>,
    }
    
    pub struct Pat<'hir> {
        pub kind: PatKind<'hir>,
        pub span: Span,
    }
    
    pub enum PatKind<'hir> {
        Wild,
        Binding(BindingMode, HirId, Ident, Option<&'hir Pat<'hir>>),
        Struct(QPath<'hir>, &'hir [PatField<'hir>]),
        Tuple(&'hir [Pat<'hir>]),
        TupleStruct(QPath<'hir>, &'hir [Pat<'hir>]),
        Or(&'hir [Pat<'hir>]),
        Path(QPath<'hir>),
        Lit(&'hir Expr<'hir>),
        Range(Option<&'hir Expr<'hir>>, Option<&'hir Expr<'hir>>, RangeEnd),
        Slice(&'hir [Pat<'hir>]),
        _Other,
    }
    
    #[derive(Clone, Copy)]
    pub enum BindingMode {
        ByValue,
        ByRef(Mutability),
    }
    
    pub struct PatField<'hir> {
        pub ident: Ident,
        pub pat: &'hir Pat<'hir>,
    }
    
    #[derive(Clone, Copy)]
    pub enum RangeEnd {
        Included,
        Excluded,
    }
    
    pub struct Arm<'hir> {
        pub pat: &'hir Pat<'hir>,
        pub guard: Option<&'hir Expr<'hir>>,
        pub body: &'hir Expr<'hir>,
    }
    
    pub struct Closure<'hir> {
        pub fn_decl: &'hir FnDecl<'hir>,
        pub body: &'hir Expr<'hir>,
    }
}

pub use hir::*;
