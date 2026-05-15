use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct LintWarning {
    pub name: String,
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub severity: String,
}

#[wasm_bindgen]
pub struct ClippyChecker {
    warnings: Vec<LintWarning>,
}

#[wasm_bindgen]
impl ClippyChecker {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        ClippyChecker {
            warnings: Vec::new(),
        }
    }
    
    #[wasm_bindgen]
    pub fn check(&mut self, code: &str) -> JsValue {
        self.warnings.clear();
        self.run_clippy_lints(code);
        serde_wasm_bindgen::to_value(&self.warnings).unwrap()
    }
    
    fn run_clippy_lints(&mut self, code: &str) {
        self.check_unnecessary_clone(code);
        self.check_map_identity(code);
        self.check_single_match(code);
        self.check_unnecessary_if(code);
        self.check_eq_op(code);
        self.check_double_neg(code);
        self.check_absurd_comparison(code);
        self.check_unused_unit(code);
        self.check_redundant_pattern(code);
        self.check_unused_self(code);
    }
    
    fn check_unnecessary_clone(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains(".clone()") {
                if line.contains("i32") || line.contains("bool") || line.contains("char") {
                    self.warnings.push(LintWarning {
                        name: "clone_on_copy".to_string(),
                        message: "using `.clone()` on a Copy type is unnecessary".to_string(),
                        line: i + 1,
                        column: line.find(".clone()").unwrap_or(0),
                        severity: "warn".to_string(),
                    });
                }
            }
        }
    }
    
    fn check_map_identity(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains(".map(|x| x)") || line.contains(".map(|x|x)") {
                self.warnings.push(LintWarning {
                    name: "map_identity".to_string(),
                    message: "using `.map(|x| x)` is redundant".to_string(),
                    line: i + 1,
                    column: line.find(".map").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    fn check_single_match(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.trim().starts_with("match") {
                let rest = code.lines().skip(i).take(10).collect::<Vec<_>>();
                let match_block = rest.join("\n");
                
                let arm_count = match_block.matches("=>").count();
                if arm_count == 1 && !match_block.contains('_') {
                    self.warnings.push(LintWarning {
                        name: "single_match".to_string(),
                        message: "single match arm can be replaced with if let".to_string(),
                        line: i + 1,
                        column: 0,
                        severity: "warn".to_string(),
                    });
                }
            }
        }
    }
    
    fn check_unnecessary_if(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("if true {") {
                self.warnings.push(LintWarning {
                    name: "needless_bool".to_string(),
                    message: "if true { ... } can be replaced with { ... }".to_string(),
                    line: i + 1,
                    column: line.find("if true").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
            if line.contains("if false {") {
                self.warnings.push(LintWarning {
                    name: "needless_bool".to_string(),
                    message: "if false { ... } is never executed".to_string(),
                    line: i + 1,
                    column: line.find("if false").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    fn check_eq_op(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if let Some(pos) = line.find("==") {
                let parts: Vec<&str> = line.split("==").collect();
                if parts.len() == 2 {
                    let left = parts[0].trim();
                    let right = parts[1].trim().trim_end_matches(';');
                    if left == right {
                        self.warnings.push(LintWarning {
                            name: "eq_op".to_string(),
                            message: format!("equal expressions left and right of `==`"),
                            line: i + 1,
                            column: pos,
                            severity: "warn".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    fn check_double_neg(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("!!") {
                self.warnings.push(LintWarning {
                    name: "double_neg".to_string(),
                    message: "`--x` can be replaced with `x`".to_string(),
                    line: i + 1,
                    column: line.find("!!").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    fn check_absurd_comparison(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains(".len() < 0") || line.contains(".len() <= 0") {
                self.warnings.push(LintWarning {
                    name: "absurd_comparison".to_string(),
                    message: "length comparison with 0 is always false".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "error".to_string(),
                });
            }
        }
    }
    
    fn check_unused_unit(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.trim() == "()" && i > 0 {
                self.warnings.push(LintWarning {
                    name: "unused_unit".to_string(),
                    message: "unecessary unit type `()`".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    fn check_redundant_pattern(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("let (_,") || line.contains("(_, _)") {
                self.warnings.push(LintWarning {
                    name: "redundant_pattern".to_string(),
                    message: "redundant pattern matching".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    fn check_unused_self(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("&self") && !line.contains("self.") {
                let next_lines: Vec<&str> = code.lines().skip(i + 1).take(20).collect();
                let has_self_usage = next_lines.iter().any(|l| l.contains("self."));
                if !has_self_usage {
                    self.warnings.push(LintWarning {
                        name: "unused_self".to_string(),
                        message: "method doesn't use `self`".to_string(),
                        line: i + 1,
                        column: line.find("&self").unwrap_or(0),
                        severity: "warn".to_string(),
                    });
                }
            }
        }
    }
}

#[wasm_bindgen]
pub fn check_clippy(code: &str) -> JsValue {
    let mut checker = ClippyChecker::new();
    checker.check(code)
}
