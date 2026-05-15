use rustc_middle::ty::{Ty, TyCtxt};
use rustc_infer::InferCtxt;

pub struct TraitEngine<'tcx> {
    _marker: std::marker::PhantomData<&'tcx ()>,
}

impl<'tcx> TraitEngine<'tcx> {
    pub fn new(_infcx: &InferCtxt<'tcx>) -> Self {
        TraitEngine {
            _marker: std::marker::PhantomData,
        }
    }
    
    pub fn is_copy(&self, _ty: Ty<'tcx>) -> bool {
        unimplemented!()
    }
    
    pub fn is_sized(&self, _ty: Ty<'tcx>) -> bool {
        unimplemented!()
    }
}

pub fn is_copy_raw(_tcx: TyCtxt, _ty: Ty) -> bool {
    unimplemented!()
}
