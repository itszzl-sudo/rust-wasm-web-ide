class m{module;functionIndex=0;localVars=new Map;constructor(){this.module={types:[],imports:[],functions:[],exports:[],data:[]}}convert(t){return this.module={types:[],imports:[],functions:[],exports:[],data:[]},this.functionIndex=0,this.addDefaultImports(),this.parseRustCode(t),this.generateWAT()}addDefaultImports(){this.module.imports.push('(import "env" "memory" (memory 1))','(import "env" "log" (func $log (param i32 i32)))')}parseRustCode(t){const s=t.split(`
`);for(let n=0;n<s.length;n++)s[n].trim().startsWith("fn ")&&this.parseFunction(s,n)}parseFunction(t,s){const n=t[s].trim(),o=n.match(/fn\s+(\w+)\s*\(([^)]*)\)/);if(!o)return s;const i=o[1],e=this.parseParams(o[2]);let r=[],a=0,c=s,h=!1;for(;c<t.length;){const l=t[c];if(l.includes("{")&&(h=!0,a+=(l.match(/{/g)||[]).length),l.includes("}")&&(a-=(l.match(/}/g)||[]).length),h&&(r.push(l),a===0))break;c++}const u=this.convertFunction(i,e,r);return this.module.functions.push(u),(i==="main"||n.includes("#[wasm_bindgen]"))&&this.module.exports.push(`(export "${i}" (func $${i}))`),c}parseParams(t){return t.trim()?t.split(",").map(s=>s.trim().split(":")[0].trim()).filter(s=>s&&s!=="self"):[]}convertFunction(t,s,n){this.localVars=new Map;let o=s.length,i=`(func $${t}`;s.forEach((c,h)=>{i+=` (param $${c} i32)`,this.localVars.set(c,h)}),i+=` (result i32)
`;const e=n.slice(1,-1),r=[];for(const c of e){const h=c.trim();if(h.startsWith("let ")){const u=h.match(/let\s+(mut\s+)?(\w+)\s*=/);if(u){const l=u[2];this.localVars.has(l)||(this.localVars.set(l,o++),r.push(l))}}}for(const c of r)i+=`    (local $${c} i32)
`;const a=this.convertBody(e,o);return i+=a,i+=`
    i32.const 0
  )`,i}convertBody(t,s){let n="";for(const o of t){const i=o.trim();if(i.startsWith("let ")){const e=i.match(/let\s+(mut\s+)?(\w+)\s*=\s*(.+);/);if(e){const r=e[2],a=e[3];n+=this.convertExpression(a),n+=`    local.set $${r}
`}}else if(i.startsWith("println!"))n+=this.convertPrintln(i);else if(i.startsWith("return ")){const e=i.match(/return\s+(.+);/);e&&(n+=this.convertExpression(e[1]))}else if(i.includes(" = ")&&!i.startsWith("let")){const e=i.match(/(\w+)\s*=\s*(.+);/);if(e){const r=e[1],a=e[2];n+=this.convertExpression(a),n+=`    local.set $${r}
`}}else i&&!i.startsWith("//")&&!i.startsWith("#[")&&(n+=this.convertExpression(i))}return n}convertExpression(t){if(t=t.trim(),/^\d+$/.test(t))return`    i32.const ${t}
`;if(t==="true")return`    i32.const 1
`;if(t==="false")return`    i32.const 0
`;if(t.startsWith('"')&&t.endsWith('"')){const s=t.slice(1,-1),n=this.module.data.length*20;return this.module.data.push(`(data (i32.const ${n}) "${s}\\00")`),`    i32.const ${n}
    i32.const ${s.length}
`}if(this.localVars.has(t))return`    local.get $${t}
`;if(t.includes("(")&&t.includes(")")){const s=t.match(/(\w+)\s*\(([^)]*)\)/);if(s){const n=s[1],o=s[2].split(",").map(e=>e.trim()).filter(e=>e);let i="";return o.forEach(e=>{i+=this.convertExpression(e)}),i+=`    call $${n}
`,i}}if(t.includes("+")){const[s,n]=t.split("+").map(o=>o.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.add
`}if(t.includes("-")&&!t.startsWith("-")){const[s,n]=t.split("-").map(o=>o.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.sub
`}if(t.includes("*")){const[s,n]=t.split("*").map(o=>o.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.mul
`}if(t.includes("/")){const[s,n]=t.split("/").map(o=>o.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.div_s
`}return`    i32.const 0
`}convertPrintln(t){const s=t.match(/println!\s*\(\s*"([^"]*)"\s*(?:,\s*(.+))?\s*\)/);if(s){const n=s[1],o=s[2]?s[2].split(",").map(r=>r.trim()):[],i=this.module.data.length*100;this.module.data.push(`(data (i32.const ${i}) "${n}\\00")`);let e="";return e+=`    i32.const ${i}
`,e+=`    i32.const ${n.length}
`,o.forEach(r=>{e+=this.convertExpression(r)}),e+=`    call $log
`,o.forEach(()=>{e+=`    drop
`}),e}return""}generateWAT(){let t=`(module
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
`})),t+=")",t}}const d=new m;export{m as RustToWAT,d as rustToWAT};
