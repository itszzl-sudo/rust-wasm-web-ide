use rustc_middle::ty::{Ty, TyCtxt, TyKind};

pub struct InferCtxt<'tcx> {
    pub tcx: TyCtxt<'tcx>,
}

impl<'tcx> InferCtxt<'tcx> {
    pub fn new(tcx: TyCtxt<'tcx>) -> Self {
        InferCtxt { tcx }
    }
    
    pub fn typeck_results(self) -> TypeckResults<'tcx> {
        unimplemented!()
    }
}

pub struct TypeckResults<'tcx> {
    _marker: std::marker::PhantomData<&'tcx ()>,
}
