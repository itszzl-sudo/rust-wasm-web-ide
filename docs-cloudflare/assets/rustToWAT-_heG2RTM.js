class p{module;functionIndex=0;localVars=new Map;constructor(){this.module={types:[],imports:[],functions:[],exports:[],data:[]}}convert(t){return this.module={types:[],imports:[],functions:[],exports:[],data:[]},this.functionIndex=0,this.addDefaultImports(),this.parseRustCode(t),this.generateWAT()}addDefaultImports(){this.module.imports.push('(import "env" "memory" (memory 1))','(import "env" "log" (func $log (param i32 i32)))')}parseRustCode(t){const s=t.split(`
`);for(let n=0;n<s.length;n++)s[n].trim().startsWith("fn ")&&this.parseFunction(s,n)}parseFunction(t,s){const n=t[s].trim(),e=n.match(/fn\s+(\w+)\s*\(([^)]*)\)/);if(!e)return s;const i=e[1],o=this.parseParams(e[2]);let r=0,h=s,a=!1,l=0;for(;h<t.length;){const f=t[h];if(f.includes("{")&&(a||(l=h),a=!0,r+=(f.match(/{/g)||[]).length),f.includes("}")&&(r-=(f.match(/}/g)||[]).length),a&&r===0)break;h++}const u=t.slice(l,h+1),c=this.convertFunction(i,o,u);return this.module.functions.push(c),(i==="main"||n.includes("#[wasm_bindgen]"))&&this.module.exports.push(`(export "${i}" (func $${i}))`),h}parseParams(t){return t.trim()?t.split(",").map(s=>s.trim().split(":")[0].trim()).filter(s=>s&&s!=="self"):[]}convertFunction(t,s,n){this.localVars=new Map;let e=s.length;s.forEach((a,l)=>{this.localVars.set(a,l)});const i=n.join(`
`);this.collectLocals(i,e);let o=`(func $${t}`;s.forEach((a,l)=>{o+=` (param $${a} i32)`}),o+=` (result i32)
`;const r=Array.from(this.localVars.entries()).filter(([a,l])=>l>=s.length).sort((a,l)=>a[1]-l[1]);for(const[a,l]of r)o+=`    (local $${a} i32)
`;const h=this.convertBody(n.slice(1,-1));return o+=h,o+=`
    i32.const 0
  )`,o}collectLocals(t,s){const n=t.matchAll(/let\s+(mut\s+)?(\w+)\s*=/g);let e=s;for(const o of n){const r=o[2];this.localVars.has(r)||this.localVars.set(r,e++)}const i=t.matchAll(/for\s+(\w+)\s+in/g);for(const o of i){const r=o[1];this.localVars.has(r)||this.localVars.set(r,e++)}return e}convertBody(t){let s="",n=0;for(;n<t.length;){const e=t[n].trim();if(e.startsWith("let ")){const i=e.match(/let\s+(mut\s+)?(\w+)\s*=\s*(.+);/);if(i){const o=i[2],r=i[3];s+=this.convertExpression(r),s+=`    local.set $${o}
`}}else if(e.startsWith("println!"))s+=this.convertPrintln(e);else if(e.startsWith("for ")){const i=this.convertForLoop(t,n);s+=i.wat,n=i.endIndex}else if(e.startsWith("if ")){const i=this.convertIfElse(t,n);s+=i.wat,n=i.endIndex}else if(e.startsWith("while ")){const i=this.convertWhileLoop(t,n);s+=i.wat,n=i.endIndex}else if(e.startsWith("return ")){const i=e.match(/return\s+(.+);/);i&&(s+=this.convertExpression(i[1]))}else if(e.includes(" = ")&&!e.startsWith("let")&&e.endsWith(";")){const i=e.match(/(\w+)\s*=\s*(.+);/);if(i){const o=i[1],r=i[2];s+=this.convertExpression(r),s+=`    local.set $${o}
`}}else e&&!e.startsWith("//")&&!e.startsWith("#[")&&!e.startsWith("}")&&(e.includes("{")||(s+=this.convertExpression(e)));n++}return s}convertForLoop(t,s){const e=t[s].trim().match(/for\s+(\w+)\s+in\s+(\d+)\.\.(\d+)\s*\{/);if(!e)return{wat:"",endIndex:s};const i=e[1],o=parseInt(e[2]),r=parseInt(e[3]);let h=0,a=s,l=!1;for(;a<t.length;){const f=t[a];if(f.includes("{")&&(l=!0,h+=(f.match(/{/g)||[]).length),f.includes("}")&&(h-=(f.match(/}/g)||[]).length),l&&h===0)break;a++}const u=t.slice(s+1,a);let c="";return c+=`    i32.const ${o}
`,c+=`    local.set $${i}
`,c+=`    (block $for_end_${s}
`,c+=`      (loop $for_start_${s}
`,c+=`        local.get $${i}
`,c+=`        i32.const ${r}
`,c+=`        i32.ge_s
`,c+=`        br_if $for_end_${s}
`,c+=this.convertBody(u),c+=`        local.get $${i}
`,c+=`        i32.const 1
`,c+=`        i32.add
`,c+=`        local.set $${i}
`,c+=`        br $for_start_${s}
`,c+=`      )
`,c+=`    )
`,{wat:c,endIndex:a}}convertIfElse(t,s){const e=t[s].trim().match(/if\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:s};const i=e[1];let o=0,r=s,h=!1;for(;r<t.length;){const f=t[r];if(f.includes("{")&&(h=!0,o+=(f.match(/{/g)||[]).length),f.includes("}")&&(o-=(f.match(/}/g)||[]).length),h&&o===0)break;r++}const a=t.slice(s+1,r);let l=[],u=r;if(r+1<t.length){const f=t[r+1].trim();if(f==="else {"||f.startsWith("} else {")){let m=r+1;for(o=0,h=!1;m<t.length;){const d=t[m];if(d.includes("{")&&(h=!0,o+=(d.match(/{/g)||[]).length),d.includes("}")&&(o-=(d.match(/}/g)||[]).length),h&&o===0)break;m++}l=t.slice(r+2,m),u=m}}let c="";return c+=this.convertExpression(i),c+=`    (if
`,c+=`      (then
`,c+=this.convertBody(a),c+=`      )
`,l.length>0&&(c+=`      (else
`,c+=this.convertBody(l),c+=`      )
`),c+=`    )
`,{wat:c,endIndex:u}}convertWhileLoop(t,s){const e=t[s].trim().match(/while\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:s};const i=e[1];let o=0,r=s,h=!1;for(;r<t.length;){const u=t[r];if(u.includes("{")&&(h=!0,o+=(u.match(/{/g)||[]).length),u.includes("}")&&(o-=(u.match(/}/g)||[]).length),h&&o===0)break;r++}const a=t.slice(s+1,r);let l="";return l+=`    (block $while_end_${s}
`,l+=`      (loop $while_start_${s}
`,l+=this.convertExpression(i),l+=`        i32.eqz
`,l+=`        br_if $while_end_${s}
`,l+=this.convertBody(a),l+=`        br $while_start_${s}
`,l+=`      )
`,l+=`    )
`,{wat:l,endIndex:r}}convertExpression(t){if(t=t.trim(),!t)return"";if(/^\d+$/.test(t))return`    i32.const ${t}
`;if(t==="true")return`    i32.const 1
`;if(t==="false")return`    i32.const 0
`;if(t.startsWith('"')&&t.endsWith('"')){const s=t.slice(1,-1),n=this.module.data.length*20;return this.module.data.push(`(data (i32.const ${n}) "${s}\\00")`),`    i32.const ${n}
    i32.const ${s.length}
`}if(this.localVars.has(t))return`    local.get $${t}
`;if(t.includes("(")&&t.includes(")")){const s=t.match(/(\w+)\s*\(([^)]*)\)/);if(s){const n=s[1],e=s[2].split(",").map(o=>o.trim()).filter(o=>o);let i="";return e.forEach(o=>{i+=this.convertExpression(o)}),i+=`    call $${n}
`,i}}if(t.includes("<")&&!t.includes("<<")){const[s,n]=t.split("<").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.lt_s
`}if(t.includes(">")&&!t.includes(">>")&&!t.includes("->")){const[s,n]=t.split(">").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.gt_s
`}if(t.includes("==")){const[s,n]=t.split("==").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.eq
`}if(t.includes("!=")){const[s,n]=t.split("!=").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.ne
`}if(t.includes("<=")){const[s,n]=t.split("<=").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.le_s
`}if(t.includes(">=")){const[s,n]=t.split(">=").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.ge_s
`}if(t.includes("+")){const[s,n]=t.split("+").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.add
`}if(t.includes("-")&&!t.startsWith("-")){const[s,n]=t.split("-").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.sub
`}if(t.includes("*")){const[s,n]=t.split("*").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.mul
`}if(t.includes("/")){const[s,n]=t.split("/").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.div_s
`}return`    i32.const 0
`}convertPrintln(t){const s=t.match(/println!\s*\(\s*"([^"]*)"\s*(?:,\s*(.+))?\s*\)/);if(s){const n=s[1],e=s[2]?s[2].split(",").map(r=>r.trim()):[],i=this.module.data.length*100;this.module.data.push(`(data (i32.const ${i}) "${n}\\00")`);let o="";return o+=`    i32.const ${i}
`,o+=`    i32.const ${n.length}
`,e.forEach(r=>{o+=this.convertExpression(r)}),o+=`    call $log
`,e.forEach(()=>{o+=`    drop
`}),o}return""}generateWAT(){let t=`(module
`;return this.module.imports.forEach(s=>{t+=`  ${s}
`}),this.module.types.length>0&&(t+=`
  ;; Types
`,this.module.types.forEach(s=>{t+=`  ${s}
`})),this.module.functions.length>0&&(t+=`
  ;; Functions
`,this.module.functions.forEach(s=>{t+=`  ${s}
`})),this.module.exports.length>0&&(t+=`
  ;; Exports
`,this.module.exports.forEach(s=>{t+=`  ${s}
`})),this.module.data.length>0&&(t+=`
  ;; Data
`,this.module.data.forEach(s=>{t+=`  ${s}
`})),t+=")",t}}function $(g){return new p().convert(g)}export{p as RustToWAT,$ as rustToWat};
