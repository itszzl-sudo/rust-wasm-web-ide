use rustc_middle::ty::{Ty, TyCtxt, TyKind};

pub trait TyExt<'tcx>: Sized {
    fn is_copy_modulo_regions(self, tcx: TyCtxt<'tcx>) -> bool;
}

impl<'tcx> TyExt<'tcx> for Ty<'tcx> {
    fn is_copy_modulo_regions(self, _tcx: TyCtxt<'tcx>) -> bool {
        unimplemented!()
    }
}
