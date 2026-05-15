use rustc_span::{Span, Symbol};
use rustc_hir::{DefId, HirId};

pub mod ty {
    use rustc_span::{Span, Symbol};
    use rustc_hir::{DefId, HirId};
    
    pub struct TyCtxt<'tcx> {
        _marker: std::marker::PhantomData<&'tcx ()>,
    }
    
    impl<'tcx> TyCtxt<'tcx> {
        pub fn new() -> Self {
            TyCtxt {
                _marker: std::marker::PhantomData,
            }
        }
        
        pub fn type_of(self, _def_id: DefId) -> Ty<'tcx> {
            unimplemented!()
        }
        
        pub fn fn_sig(self, _def_id: DefId) -> PolyFnSig<'tcx> {
            unimplemented!()
        }
        
        pub fn is_mutable_raw(self, _def_id: DefId) -> bool {
            unimplemented!()
        }
    }
    
    #[derive(Clone, Copy, Debug)]
    pub struct Ty<'tcx> {
        kind: &'tcx TypeckResults<'tcx>,
    }
    
    impl<'tcx> Ty<'tcx> {
        pub fn kind(self) -> &TyKind<'tcx> {
            unimplemented!()
        }
        
        pub fn is_unit(self) -> bool {
            unimplemented!()
        }
        
        pub fn is_bool(self) -> bool {
            unimplemented!()
        }
        
        pub fn is_char(self) -> bool {
            unimplemented!()
        }
        
        pub fn is_str(self) -> bool {
            unimplemented!()
        }
        
        pub fn is_numeric(self) -> bool {
            unimplemented!()
        }
        
        pub fn is_integral(self) -> bool {
            unimplemented!()
        }
        
        pub fn is_float(self) -> bool {
            unimplemented!()
        }
        
        pub fn is_ptr_sized_integral(self) -> bool {
            unimplemented!()
        }
    }
    
    #[derive(Debug)]
    pub enum TyKind<'tcx> {
        Bool,
        Char,
        Int(IntTy),
        Uint(UintTy),
        Float(FloatTy),
        Str,
        Array(Ty<'tcx>, Const<'tcx>),
        Slice(Ty<'tcx>),
        RawPtr(TypeAndMut<'tcx>),
        Ref(Region<'tcx>, Ty<'tcx>, Mutability),
        FnDef(DefId, &'tcx [GenericArg<'tcx>]),
        FnPtr(PolyFnSig<'tcx>),
        Dynamic(&'tcx [BoundTy], Region<'tcx>),
        Closure(DefId, &'tcx [GenericArg<'tcx>]),
        Tuple(&'tcx [Ty<'tcx>]),
        Adt(AdtDef<'tcx>, &'tcx [GenericArg<'tcx>]),
        Foreign(DefId),
        Param(ParamTy),
        Infer(InferTy),
        Err,
        _Other,
    }
    
    #[derive(Clone, Copy, Debug)]
    pub enum IntTy {
        Isize,
        I8,
        I16,
        I32,
        I64,
        I128,
    }
    
    #[derive(Clone, Copy, Debug)]
    pub enum UintTy {
        Usize,
        U8,
        U16,
        U32,
        U64,
        U128,
    }
    
    #[derive(Clone, Copy, Debug)]
    pub enum FloatTy {
        F32,
        F64,
    }
    
    #[derive(Clone, Copy)]
    pub enum Mutability {
        Mut,
        Not,
    }
    
    pub struct TypeAndMut<'tcx> {
        pub ty: Ty<'tcx>,
        pub mutbl: Mutability,
    }
    
    pub struct Region<'tcx> {
        _marker: std::marker::PhantomData<&'tcx ()>,
    }
    
    pub struct Const<'tcx> {
        _marker: std::marker::PhantomData<&'tcx ()>,
    }
    
    pub struct PolyFnSig<'tcx> {
        _marker: std::marker::PhantomData<&'tcx ()>,
    }
    
    impl<'tcx> PolyFnSig<'tcx> {
        pub fn skip_binder(self) -> FnSig<'tcx> {
            unimplemented!()
        }
    }
    
    #[derive(Debug)]
    pub struct FnSig<'tcx> {
        pub inputs_and_output: &'tcx [Ty<'tcx>],
    }
    
    impl<'tcx> FnSig<'tcx> {
        pub fn inputs(&self) -> &[Ty<'tcx>] {
            &self.inputs_and_output[..self.inputs_and_output.len() - 1]
        }
        
        pub fn output(&self) -> Ty<'tcx> {
            self.inputs_and_output[self.inputs_and_output.len() - 1]
        }
    }
    
    pub struct BoundTy;
    
    pub struct GenericArg<'tcx> {
        _marker: std::marker::PhantomData<&'tcx ()>,
    }
    
    pub struct AdtDef<'tcx> {
        pub did: DefId,
        _marker: std::marker::PhantomData<&'tcx ()>,
    }
    
    pub struct ParamTy {
        pub name: Symbol,
        pub index: u32,
    }
    
    pub enum InferTy {
        IntVar,
        FloatVar,
        FreshIntTy(u32),
        FreshFloatTy(u32),
    }
    
    pub struct TypeckResults<'tcx> {
        _marker: std::marker::PhantomData<&'tcx ()>,
    }
}

pub use ty::*;

pub mod mir {
    use rustc_span::Span;
    use rustc_hir::DefId;
    
    pub struct Body<'tcx> {
        _marker: std::marker::PhantomData<&'tcx ()>,
    }
    
    pub struct BasicBlock;
    
    pub struct Statement;
    
    pub struct Terminator;
    
    pub enum Rvalue {
        Use(Operand),
        Ref(Place),
        _Other,
    }
    
    pub enum Operand {
        Copy(Place),
        Move(Place),
        Constant,
    }
    
    pub struct Place;
}

pub use mir::*;
