class m{module;functionIndex=0;localVars=new Map;constructor(){this.module={types:[],imports:[],functions:[],exports:[],data:[]}}convert(t){return this.module={types:[],imports:[],functions:[],exports:[],data:[]},this.functionIndex=0,this.addDefaultImports(),this.parseRustCode(t),this.generateWAT()}addDefaultImports(){this.module.imports.push('(import "env" "memory" (memory 1))','(import "env" "log" (func $log (param i32 i32)))')}parseRustCode(t){const s=t.split(`
`);for(let n=0;n<s.length;n++)s[n].trim().startsWith("fn ")&&this.parseFunction(s,n)}parseFunction(t,s){const n=t[s].trim(),e=n.match(/fn\s+(\w+)\s*\(([^)]*)\)/);if(!e)return s;const i=e[1],o=this.parseParams(e[2]);let r=[],c=0,l=s,h=!1;for(;l<t.length;){const a=t[l];if(a.includes("{")&&(h=!0,c+=(a.match(/{/g)||[]).length),a.includes("}")&&(c-=(a.match(/}/g)||[]).length),h&&(r.push(a),c===0))break;l++}const u=this.convertFunction(i,o,r);return this.module.functions.push(u),(i==="main"||n.includes("#[wasm_bindgen]"))&&this.module.exports.push(`(export "${i}" (func $${i}))`),l}parseParams(t){return t.trim()?t.split(",").map(s=>s.trim().split(":")[0].trim()).filter(s=>s&&s!=="self"):[]}convertFunction(t,s,n){this.localVars=new Map;let e=s.length,i=`(func $${t}`;s.forEach((c,l)=>{i+=` (param $${c} i32)`,this.localVars.set(c,l)}),i+=` (result i32)
`;const o=n.slice(1,-1),r=this.convertBody(o,e);return i+=r,i+=`
    i32.const 0
  )`,i}convertBody(t,s){let n="";for(const e of t){const i=e.trim();if(i.startsWith("let ")){const o=i.match(/let\s+(mut\s+)?(\w+)\s*=\s*(.+);/);if(o){const r=o[2],c=o[3];this.localVars.set(r,s++),n+=`    (local $${r} i32)
`,n+=this.convertExpression(c),n+=`    local.set $${r}
`}}else if(i.startsWith("println!"))n+=this.convertPrintln(i);else if(i.startsWith("return ")){const o=i.match(/return\s+(.+);/);o&&(n+=this.convertExpression(o[1]))}else if(i.includes(" = ")&&!i.startsWith("let")){const o=i.match(/(\w+)\s*=\s*(.+);/);if(o){const r=o[1],c=o[2];n+=this.convertExpression(c),n+=`    local.set $${r}
`}}else i&&!i.startsWith("//")&&!i.startsWith("#[")&&(n+=this.convertExpression(i))}return n}convertExpression(t){if(t=t.trim(),/^\d+$/.test(t))return`    i32.const ${t}
`;if(t==="true")return`    i32.const 1
`;if(t==="false")return`    i32.const 0
`;if(t.startsWith('"')&&t.endsWith('"')){const s=t.slice(1,-1),n=this.module.data.length*20;return this.module.data.push(`(data (i32.const ${n}) "${s}\\00")`),`    i32.const ${n}
    i32.const ${s.length}
`}if(this.localVars.has(t))return`    local.get $${t}
`;if(t.includes("(")&&t.includes(")")){const s=t.match(/(\w+)\s*\(([^)]*)\)/);if(s){const n=s[1],e=s[2].split(",").map(o=>o.trim()).filter(o=>o);let i="";return e.forEach(o=>{i+=this.convertExpression(o)}),i+=`    call $${n}
`,i}}if(t.includes("+")){const[s,n]=t.split("+").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.add
`}if(t.includes("-")&&!t.startsWith("-")){const[s,n]=t.split("-").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.sub
`}if(t.includes("*")){const[s,n]=t.split("*").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.mul
`}if(t.includes("/")){const[s,n]=t.split("/").map(e=>e.trim());return this.convertExpression(s)+this.convertExpression(n)+`    i32.div_s
`}return`    i32.const 0
`}convertPrintln(t){const s=t.match(/println!\s*\(\s*"([^"]*)"\s*(?:,\s*(.+))?\s*\)/);if(s){s[1];const n=s[2]?s[2].split(",").map(i=>i.trim()):[];let e="";return n.forEach(i=>{e+=this.convertExpression(i)}),e+=`    call $log
`,e}return""}generateWAT(){let t=`(module
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
