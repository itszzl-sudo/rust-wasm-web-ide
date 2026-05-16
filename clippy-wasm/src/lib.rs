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
        // 已有 10 个
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
        
        // 新增 30 个
        self.check_needless_return(code);
        self.check_redundant_closure_call(code);
        self.check_cmp_null(code);
        self.check_zero_divided_by_zero(code);
        self.check_let_and_return(code);
        self.check_redundant_clone(code);
        self.check_needless_borrow(code);
        self.check_empty_loop(code);
        self.check_match_same_arms(code);
        self.check_vec_init_then_push(code);
        self.check_string_to_string(code);
        self.check_inefficient_to_string(code);
        self.check_expect_used(code);
        self.check_panic_used(code);
        self.check_todo_used(code);
        self.check_unimplemented_used(code);
        self.check_println_empty(code);
        self.check_format_in_format_args(code);
        self.check_redundant_field_names(code);
        self.check_redundant_static_lifetimes(code);
        self.check_used_underscore_binding(code);
        self.check_ptr_arg(code);
        self.check_too_many_arguments(code);
        self.check_fn_params_excessive_bools(code);
        self.check_similar_names(code);
        self.check_misrefactored_assign_op(code);
        self.check_almost_swapped(code);
        self.check_transmute_int_to_char(code);
        self.check_transmute_bytes_to_str(code);
        self.check_default_trait_access(code);
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
    
    // 11. needless_return
    fn check_needless_return(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.trim().starts_with("return ") {
                let trimmed = line.trim();
                if trimmed.ends_with(";") {
                    self.warnings.push(LintWarning {
                        name: "needless_return".to_string(),
                        message: "unneeded `return` statement".to_string(),
                        line: i + 1,
                        column: line.find("return").unwrap_or(0),
                        severity: "warn".to_string(),
                    });
                }
            }
        }
    }
    
    // 12. redundant_closure_call
    fn check_redundant_closure_call(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("|| ") && line.contains("()") {
                self.warnings.push(LintWarning {
                    name: "redundant_closure_call".to_string(),
                    message: "try not to call a closure in the expression where it is created".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 13. cmp_null
    fn check_cmp_null(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("== std::ptr::null()") || line.contains("== std::ptr::null_mut()") {
                self.warnings.push(LintWarning {
                    name: "cmp_null".to_string(),
                    message: "comparing with null is more clearly expressed by `.is_null()`".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 14. zero_divided_by_zero
    fn check_zero_divided_by_zero(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("0.0 / 0.0") || line.contains("0.0/0.0") {
                self.warnings.push(LintWarning {
                    name: "zero_divided_by_zero".to_string(),
                    message: "division of 0.0 by 0.0 will always result in NaN".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 15. let_and_return
    fn check_let_and_return(&mut self, code: &str) {
        let lines: Vec<&str> = code.lines().collect();
        for i in 0..lines.len().saturating_sub(1) {
            let line = lines[i].trim();
            if line.starts_with("let result = ") || line.starts_with("let res = ") {
                if lines[i + 1].contains("result") || lines[i + 1].contains("res") {
                    if lines[i + 1].trim().starts_with("return") {
                        self.warnings.push(LintWarning {
                            name: "let_and_return".to_string(),
                            message: "returning the result of a `let` binding".to_string(),
                            line: i + 1,
                            column: 0,
                            severity: "warn".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // 16. redundant_clone
    fn check_redundant_clone(&mut self, code: &str) {
        let lines: Vec<&str> = code.lines().collect();
        for i in 0..lines.len().saturating_sub(1) {
            if lines[i].contains(".clone()") && lines[i + 1].contains(".clone()") {
                self.warnings.push(LintWarning {
                    name: "redundant_clone".to_string(),
                    message: "redundant clone".to_string(),
                    line: i + 2,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 17. needless_borrow
    fn check_needless_borrow(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("&&") {
                let pos = line.find("&&").unwrap_or(0);
                if pos > 0 {
                    let before = &line[..pos];
                    if before.ends_with("=") || before.ends_with("(") {
                        self.warnings.push(LintWarning {
                            name: "needless_borrow".to_string(),
                            message: "the borrowed expression implements the required traits".to_string(),
                            line: i + 1,
                            column: pos,
                            severity: "warn".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // 18. empty_loop
    fn check_empty_loop(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.trim() == "loop {}" || line.contains("loop { }") {
                self.warnings.push(LintWarning {
                    name: "empty_loop".to_string(),
                    message: "empty `loop {}` wastes CPU cycles".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 19. match_same_arms
    fn check_match_same_arms(&mut self, code: &str) {
        let lines: Vec<&str> = code.lines().collect();
        for i in 0..lines.len() {
            if lines[i].contains("match ") {
                let match_block: Vec<&str> = lines.iter().skip(i).take(20).copied().collect();
                let bodies: Vec<&str> = match_block.iter()
                    .filter(|l| l.contains("=>"))
                    .copied()
                    .collect();
                
                for j in 0..bodies.len().saturating_sub(1) {
                    if bodies[j].split("=>").nth(1) == bodies[j + 1].split("=>").nth(1) {
                        self.warnings.push(LintWarning {
                            name: "match_same_arms".to_string(),
                            message: "match arms have same body".to_string(),
                            line: i + 1,
                            column: 0,
                            severity: "warn".to_string(),
                        });
                        break;
                    }
                }
            }
        }
    }
    
    // 20. vec_init_then_push
    fn check_vec_init_then_push(&mut self, code: &str) {
        let lines: Vec<&str> = code.lines().collect();
        for i in 0..lines.len().saturating_sub(1) {
            if lines[i].contains("Vec::new()") || lines[i].contains("vec![]") {
                let next_lines: Vec<&str> = lines.iter().skip(i + 1).take(10).copied().collect();
                let push_count = next_lines.iter().filter(|l| l.contains(".push(")).count();
                if push_count >= 3 {
                    self.warnings.push(LintWarning {
                        name: "vec_init_then_push".to_string(),
                        message: "calling `push` immediately after creating a new `Vec`".to_string(),
                        line: i + 1,
                        column: 0,
                        severity: "warn".to_string(),
                    });
                }
            }
        }
    }
    
    // 21. string_to_string
    fn check_string_to_string(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains(".to_string()") && line.contains("String") {
                self.warnings.push(LintWarning {
                    name: "string_to_string".to_string(),
                    message: "calling `to_string()` on a `String`".to_string(),
                    line: i + 1,
                    column: line.find(".to_string()").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 22. inefficient_to_string
    fn check_inefficient_to_string(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("\"") && line.contains(".to_string()") {
                self.warnings.push(LintWarning {
                    name: "inefficient_to_string".to_string(),
                    message: "calling `to_string()` on a string literal".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 23. expect_used
    fn check_expect_used(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains(".expect(") {
                self.warnings.push(LintWarning {
                    name: "expect_used".to_string(),
                    message: "use of `expect` followed by a function call".to_string(),
                    line: i + 1,
                    column: line.find(".expect(").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 24. panic_used
    fn check_panic_used(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("panic!(") {
                self.warnings.push(LintWarning {
                    name: "panic".to_string(),
                    message: "usage of `panic!`".to_string(),
                    line: i + 1,
                    column: line.find("panic!(").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 25. todo_used
    fn check_todo_used(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("todo!(") {
                self.warnings.push(LintWarning {
                    name: "todo".to_string(),
                    message: "`todo!` should not be present in production code".to_string(),
                    line: i + 1,
                    column: line.find("todo!(").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 26. unimplemented_used
    fn check_unimplemented_used(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("unimplemented!(") {
                self.warnings.push(LintWarning {
                    name: "unimplemented".to_string(),
                    message: "`unimplemented!` should not be present in production code".to_string(),
                    line: i + 1,
                    column: line.find("unimplemented!(").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 27. println_empty
    fn check_println_empty(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("println!()") || line.contains("println!(\"\")") {
                self.warnings.push(LintWarning {
                    name: "println_empty".to_string(),
                    message: "remove empty `println!`".to_string(),
                    line: i + 1,
                    column: line.find("println!").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 28. format_in_format_args
    fn check_format_in_format_args(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("println!(\"{}\", format!(") || 
               line.contains("format!(\"{}\", format!(") {
                self.warnings.push(LintWarning {
                    name: "format_in_format_args".to_string(),
                    message: "`format!` in `println!`/`format!` args".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 29. redundant_field_names
    fn check_redundant_field_names(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains(": ") {
                let parts: Vec<&str> = line.split(": ").collect();
                if parts.len() >= 2 {
                    let before = parts[0].trim().split_whitespace().last().unwrap_or("");
                    let after = parts[1].trim().split(|c: char| !c.is_alphanumeric()).next().unwrap_or("");
                    if before == after {
                        self.warnings.push(LintWarning {
                            name: "redundant_field_names".to_string(),
                            message: "redundant field names in struct initialization".to_string(),
                            line: i + 1,
                            column: 0,
                            severity: "warn".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // 30. redundant_static_lifetimes
    fn check_redundant_static_lifetimes(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("'static") && line.contains("&'static") {
                self.warnings.push(LintWarning {
                    name: "redundant_static_lifetimes".to_string(),
                    message: "explicit `'static` lifetime in static or const".to_string(),
                    line: i + 1,
                    column: line.find("'static").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 31. used_underscore_binding
    fn check_used_underscore_binding(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("_:") || line.contains("_ :") {
                self.warnings.push(LintWarning {
                    name: "used_underscore_binding".to_string(),
                    message: "used binding which is prefixed with an underscore".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 32. ptr_arg
    fn check_ptr_arg(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("&Vec<") || line.contains("&String") {
                self.warnings.push(LintWarning {
                    name: "ptr_arg".to_string(),
                    message: "using a reference to `Vec` or `String` as an argument".to_string(),
                    line: i + 1,
                    column: 0,
                    severity: "warn".to_string(),
                });
            }
        }
    }
    
    // 33. too_many_arguments
    fn check_too_many_arguments(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.starts_with("fn ") || line.starts_with("pub fn ") {
                if let Some(start) = line.find('(') {
                    if let Some(end) = line.find(')') {
                        let params = &line[start + 1..end];
                        let count = params.split(',').filter(|p| !p.trim().is_empty()).count();
                        if count > 7 {
                            self.warnings.push(LintWarning {
                                name: "too_many_arguments".to_string(),
                                message: format!("too many arguments ({}), use a struct instead", count),
                                line: i + 1,
                                column: start,
                                severity: "warn".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }
    
    // 34. fn_params_excessive_bools
    fn check_fn_params_excessive_bools(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("fn ") {
                let bool_count = line.matches("bool").count();
                if bool_count > 3 {
                    self.warnings.push(LintWarning {
                        name: "fn_params_excessive_bools".to_string(),
                        message: format!("function has {} bool parameters, use an enum instead", bool_count),
                        line: i + 1,
                        column: 0,
                        severity: "warn".to_string(),
                    });
                }
            }
        }
    }
    
    // 35. similar_names
    fn check_similar_names(&mut self, code: &str) {
        let mut names: Vec<&str> = Vec::new();
        for line in code.lines() {
            if line.contains("let ") {
                if let Some(start) = line.find("let ") {
                    let rest = &line[start + 4..];
                    if let Some(end) = rest.find('=') {
                        let name = rest[..end].trim();
                        if !name.starts_with('_') && name.len() > 1 {
                            names.push(name);
                        }
                    }
                }
            }
        }
        
        for i in 0..names.len().saturating_sub(1) {
            for j in i + 1..names.len() {
                if names[i].len() > 3 && names[j].len() > 3 {
                    if names[i].chars().take(3).eq(names[j].chars().take(3)) {
                        self.warnings.push(LintWarning {
                            name: "similar_names".to_string(),
                            message: format!("similar variable names: `{}` and `{}`", names[i], names[j]),
                            line: 0,
                            column: 0,
                            severity: "warn".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // 36. misrefactored_assign_op
    fn check_misrefactored_assign_op(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains(" = ") && line.contains("+ ") {
                let parts: Vec<&str> = line.split(" = ").collect();
                if parts.len() == 2 {
                    if parts[1].trim().starts_with(parts[0].trim()) {
                        self.warnings.push(LintWarning {
                            name: "misrefactored_assign_op".to_string(),
                            message: "variable appears on both sides of assignment operation".to_string(),
                            line: i + 1,
                            column: 0,
                            severity: "warn".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // 37. almost_swapped
    fn check_almost_swapped(&mut self, code: &str) {
        let lines: Vec<&str> = code.lines().collect();
        for i in 0..lines.len().saturating_sub(1) {
            let line1 = lines[i].trim();
            let line2 = lines[i + 1].trim();
            
            if line1.contains(" = ") && line2.contains(" = ") {
                let parts1: Vec<&str> = line1.split(" = ").collect();
                let parts2: Vec<&str> = line2.split(" = ").collect();
                
                if parts1.len() == 2 && parts2.len() == 2 {
                    if parts1[0].trim() == parts2[1].trim().trim_end_matches(';') &&
                       parts2[0].trim() == parts1[1].trim().trim_end_matches(';') {
                        self.warnings.push(LintWarning {
                            name: "almost_swapped".to_string(),
                            message: "this looks like you are swapping variables".to_string(),
                            line: i + 1,
                            column: 0,
                            severity: "warn".to_string(),
                        });
                    }
                }
            }
        }
    }
    
    // 38. transmute_int_to_char
    fn check_transmute_int_to_char(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("std::mem::transmute") {
                if line.contains("char") {
                    self.warnings.push(LintWarning {
                        name: "transmute_int_to_char".to_string(),
                        message: "`transmute` from `int` to `char` is not safe".to_string(),
                        line: i + 1,
                        column: 0,
                        severity: "warn".to_string(),
                    });
                }
            }
        }
    }
    
    // 39. transmute_bytes_to_str
    fn check_transmute_bytes_to_str(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("std::mem::transmute") {
                if line.contains("&str") || line.contains("str") {
                    self.warnings.push(LintWarning {
                        name: "transmute_bytes_to_str".to_string(),
                        message: "`transmute` from bytes to `str` is not safe".to_string(),
                        line: i + 1,
                        column: 0,
                        severity: "warn".to_string(),
                    });
                }
            }
        }
    }
    
    // 40. default_trait_access
    fn check_default_trait_access(&mut self, code: &str) {
        for (i, line) in code.lines().enumerate() {
            if line.contains("Default::default()") {
                self.warnings.push(LintWarning {
                    name: "default_trait_access".to_string(),
                    message: "calling `Default::default()` directly is not idiomatic".to_string(),
                    line: i + 1,
                    column: line.find("Default::default()").unwrap_or(0),
                    severity: "warn".to_string(),
                });
            }
        }
    }
}

#[wasm_bindgen]
pub fn check_clippy(code: &str) -> JsValue {
    let mut checker = ClippyChecker::new();
    checker.check(code)
}
