class ${module;functionIndex=0;localVars=new Map;structDefs=new Map;enumDefs=new Map;memoryOffset=0;heapPointer=1024;constructor(){this.module={types:[],imports:[],functions:[],exports:[],data:[]}}convert(s){return this.module={types:[],imports:[],functions:[],exports:[],data:[]},this.functionIndex=0,this.structDefs=new Map,this.enumDefs=new Map,this.memoryOffset=0,this.heapPointer=1024,this.addDefaultImports(),this.parseDefinitions(s),this.parseRustCode(s),this.generateWAT()}parseDefinitions(s){const t=s.split(`
`);for(let n=0;n<t.length;n++){const e=t[n].trim();e.startsWith("struct ")?this.parseStruct(t,n):e.startsWith("enum ")&&this.parseEnum(t,n)}}parseStruct(s,t){const e=s[t].trim().match(/struct\s+(\w+)\s*\{?/);if(!e)return t;const i=e[1],o=[];let c=0,r=t+1;for(;r<s.length;){const a=s[r].trim();if(a==="}"||a.startsWith("}"))break;if(a.startsWith("//")||!a){r++;continue}const l=a.match(/(\w+)\s*:\s*(\w+)/);l&&(o.push({name:l[1],type:l[2],offset:c}),c+=4),r++}return this.structDefs.set(i,{name:i,fields:o,size:c}),r}parseEnum(s,t){const e=s[t].trim().match(/enum\s+(\w+)\s*\{?/);if(!e)return t;const i=e[1],o=[];let c=0,r=t+1;for(;r<s.length;){const a=s[r].trim();if(a==="}"||a.startsWith("}"))break;if(a.startsWith("//")||!a){r++;continue}const l=a.match(/(\w+)(?:\(([^)]+)\))?,?/);l&&o.push({name:l[1],discriminant:c++,hasData:!!l[2],dataType:l[2]?.trim()}),r++}return this.enumDefs.set(i,{name:i,variants:o}),r}addDefaultImports(){this.module.imports.push('(import "env" "memory" (memory 1))','(import "env" "log" (func $log (param i32 i32)))')}parseRustCode(s){const t=s.split(`
`);for(let n=0;n<t.length;n++){const e=t[n].trim();e.startsWith("fn ")?this.parseFunction(t,n):e.startsWith("impl ")&&this.parseImpl(t,n)}}parseImpl(s,t){const e=s[t].trim().match(/impl\s+(?:(\w+)\s+for\s+)?(\w+)\s*\{?/);if(!e)return t;e[1];const i=e[2];let o=0,c=t,r=!1;for(;c<s.length;){const l=s[c];if(l.includes("{")&&(r=!0,o+=(l.match(/{/g)||[]).length),l.includes("}")&&(o-=(l.match(/}/g)||[]).length),r&&o===0)break;c++}const a=s.slice(t+1,c);for(const l of a){const d=l.trim();if(d.startsWith("fn ")){const h=d.match(/fn\s+(\w+)\s*\(([^)]*)\)/);if(h){const u=h[1];h[2],this.module.functions.push(`  ;; Method ${i}.${u}
`)}}}return c}parseFunction(s,t){const n=s[t].trim(),e=n.match(/fn\s+(\w+)\s*\(([^)]*)\)/);if(!e)return t;const i=e[1],o=this.parseParams(e[2]);let c=0,r=t,a=!1,l=0;for(;r<s.length;){const u=s[r];if(u.includes("{")&&(a||(l=r),a=!0,c+=(u.match(/{/g)||[]).length),u.includes("}")&&(c-=(u.match(/}/g)||[]).length),a&&c===0)break;r++}const d=s.slice(l,r+1),h=this.convertFunction(i,o,d);return this.module.functions.push(h),(i==="main"||n.includes("#[wasm_bindgen]"))&&this.module.exports.push(`(export "${i}" (func $${i}))`),r}parseParams(s){return s.trim()?s.split(",").map(t=>t.trim().split(":")[0].trim()).filter(t=>t&&t!=="self"):[]}convertFunction(s,t,n){this.localVars=new Map;let e=t.length;t.forEach((a,l)=>{this.localVars.set(a,l)});const i=n.join(`
`);this.collectLocals(i,e);let o=`(func $${s}`;t.forEach((a,l)=>{o+=` (param $${a} i32)`}),o+=` (result i32)
`;const c=Array.from(this.localVars.entries()).filter(([a,l])=>l>=t.length).sort((a,l)=>a[1]-l[1]);for(const[a,l]of c)o+=`    (local $${a} i32)
`;const r=this.convertBody(n.slice(1,-1));return o+=r,o+=`
    i32.const 0
  )`,o}collectLocals(s,t){const n=s.matchAll(/let\s+(mut\s+)?(\w+)\s*=/g);let e=t;for(const o of n){const c=o[2];this.localVars.has(c)||this.localVars.set(c,e++)}const i=s.matchAll(/for\s+(\w+)\s+in/g);for(const o of i){const c=o[1];this.localVars.has(c)||this.localVars.set(c,e++)}return e}convertBody(s){let t="",n=0;for(;n<s.length;){const e=s[n].trim();if(e.startsWith("let ")){const i=e.match(/let\s+(mut\s+)?(\w+)\s*=\s*(.+);/);if(i){const o=i[2],c=i[3];t+=this.convertExpression(c),t+=`    local.set $${o}
`}}else if(e.startsWith("println!"))t+=this.convertPrintln(e);else if(e.startsWith("panic!"))t+=this.convertPanic(e);else if(e.startsWith("match ")){const i=this.convertMatch(s,n);t+=i.wat,n=i.endIndex}else if(e.startsWith("for ")){const i=this.convertForLoop(s,n);t+=i.wat,n=i.endIndex}else if(e.startsWith("if ")){const i=this.convertIfElse(s,n);t+=i.wat,n=i.endIndex}else if(e.startsWith("while ")){const i=this.convertWhileLoop(s,n);t+=i.wat,n=i.endIndex}else if(e==="loop {"){const i=this.convertLoop(s,n);t+=i.wat,n=i.endIndex}else if(e.startsWith("if let ")){const i=this.convertIfLet(s,n);t+=i.wat,n=i.endIndex}else if(e.startsWith("while let ")){const i=this.convertWhileLet(s,n);t+=i.wat,n=i.endIndex}else if(e.startsWith("return ")){const i=e.match(/return\s+(.+);/);i&&(t+=this.convertExpression(i[1]))}else if(e.includes(" = ")&&!e.startsWith("let")&&e.endsWith(";")){const i=e.match(/(\w+)\s*=\s*(.+);/);if(i){const o=i[1],c=i[2];t+=this.convertExpression(c),t+=`    local.set $${o}
`}}else e.match(/^\w+\s*(\+=|-=|\*=|\/=|%=&)/)?t+=this.convertCompoundAssignment(e):e==="break;"?t+=`    br $for_end_${startIndex}
`:e==="continue;"?t+=`    br $for_start_${startIndex}
`:e&&!e.startsWith("//")&&!e.startsWith("#[")&&!e.startsWith("}")&&(e.includes("{")||(t+=this.convertExpression(e)));n++}return t}convertCompoundAssignment(s){const t=s.match(/(\w+)\s*(\+=|-=|\*=|\/=|%=)\s*(.+);/);if(!t)return"";const n=t[1],e=t[2],i=t[3];let o="";switch(o+=`    local.get $${n}
`,o+=this.convertExpression(i),e){case"+=":o+=`    i32.add
`;break;case"-=":o+=`    i32.sub
`;break;case"*=":o+=`    i32.mul
`;break;case"/=":o+=`    i32.div_s
`;break;case"%=":o+=`    i32.rem_s
`;break}return o+=`    local.set $${n}
`,o}convertMatch(s,t){const e=s[t].trim().match(/match\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const i=e[1];let o=0,c=t,r=!1;for(;c<s.length;){const g=s[c];if(g.includes("{")&&(r=!0,o+=(g.match(/{/g)||[]).length),g.includes("}")&&(o-=(g.match(/}/g)||[]).length),r&&o===0)break;c++}const a=s.slice(t+1,c),l=[];let d="",h=[],u=0,f=!1;for(const g of a){const p=g.trim();p.endsWith("=>")&&!f?(d=p.replace(/\s*=>\s*$/,"").trim(),f=!0,u=0):f&&(p==="{"?u++:p==="}"?(u--,u===0&&(l.push({pattern:d,body:h}),h=[],f=!1)):p.endsWith(",")&&u===0?(h.push(p.replace(/,\s*$/,"")),l.push({pattern:d,body:h}),h=[],f=!1):h.push(p))}let m="";m+=this.convertExpression(i);for(let g=0;g<l.length;g++){const p=l[g];p.pattern==="_"?m+=this.convertBody(p.body):(m+=`    i32.const ${p.pattern}
`,m+=`    i32.eq
`,m+=`    (if
`,m+=`      (then
`,m+=this.convertBody(p.body),m+=`      )
`,m+=`    )
`)}return{wat:m,endIndex:c}}convertForLoop(s,t){const e=s[t].trim().match(/for\s+(\w+)\s+in\s+(\d+)\.\.(\d+)\s*\{/);if(!e)return{wat:"",endIndex:t};const i=e[1],o=parseInt(e[2]),c=parseInt(e[3]);let r=0,a=t,l=!1;for(;a<s.length;){const u=s[a];if(u.includes("{")&&(l=!0,r+=(u.match(/{/g)||[]).length),u.includes("}")&&(r-=(u.match(/}/g)||[]).length),l&&r===0)break;a++}const d=s.slice(t+1,a);let h="";return h+=`    i32.const ${o}
`,h+=`    local.set $${i}
`,h+=`    (block $for_end_${t}
`,h+=`      (loop $for_start_${t}
`,h+=`        local.get $${i}
`,h+=`        i32.const ${c}
`,h+=`        i32.ge_s
`,h+=`        br_if $for_end_${t}
`,h+=this.convertBody(d),h+=`        local.get $${i}
`,h+=`        i32.const 1
`,h+=`        i32.add
`,h+=`        local.set $${i}
`,h+=`        br $for_start_${t}
`,h+=`      )
`,h+=`    )
`,{wat:h,endIndex:a}}convertIfElse(s,t){const e=s[t].trim().match(/if\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const i=e[1];let o=0,c=t,r=!1;for(;c<s.length;){const u=s[c];if(u.includes("{")&&(r=!0,o+=(u.match(/{/g)||[]).length),u.includes("}")&&(o-=(u.match(/}/g)||[]).length),r&&o===0)break;c++}const a=s.slice(t+1,c);let l=[],d=c;if(c+1<s.length){const u=s[c+1].trim();if(u==="else {"||u.startsWith("} else {")){let f=c+1;for(o=0,r=!1;f<s.length;){const m=s[f];if(m.includes("{")&&(r=!0,o+=(m.match(/{/g)||[]).length),m.includes("}")&&(o-=(m.match(/}/g)||[]).length),r&&o===0)break;f++}l=s.slice(c+2,f),d=f}}let h="";return h+=this.convertExpression(i),h+=`    (if
`,h+=`      (then
`,h+=this.convertBody(a),h+=`      )
`,l.length>0&&(h+=`      (else
`,h+=this.convertBody(l),h+=`      )
`),h+=`    )
`,{wat:h,endIndex:d}}convertWhileLoop(s,t){const e=s[t].trim().match(/while\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const i=e[1];let o=0,c=t,r=!1;for(;c<s.length;){const d=s[c];if(d.includes("{")&&(r=!0,o+=(d.match(/{/g)||[]).length),d.includes("}")&&(o-=(d.match(/}/g)||[]).length),r&&o===0)break;c++}const a=s.slice(t+1,c);let l="";return l+=`    (block $while_end_${t}
`,l+=`      (loop $while_start_${t}
`,l+=this.convertExpression(i),l+=`        i32.eqz
`,l+=`        br_if $while_end_${t}
`,l+=this.convertBody(a),l+=`        br $while_start_${t}
`,l+=`      )
`,l+=`    )
`,{wat:l,endIndex:c}}convertExpression(s){if(s=s.trim(),!s)return"";if(/^\d+$/.test(s))return`    i32.const ${s}
`;if(s==="true")return`    i32.const 1
`;if(s==="false")return`    i32.const 0
`;if(s.startsWith('"')&&s.endsWith('"')){const t=s.slice(1,-1),n=this.module.data.length*20;return this.module.data.push(`(data (i32.const ${n}) "${t}\\00")`),`    i32.const ${n}
    i32.const ${t.length}
`}if(this.localVars.has(s))return`    local.get $${s}
`;if(s.includes(".")&&!s.includes("..")){const t=s.split(".");if(t.length===2){const[n,e]=t;this.localVars.get(n);for(const[i,o]of this.structDefs.entries()){const c=o.fields.find(r=>r.name===e);if(c){let r="";return r+=`    local.get $${n}
`,r+=`    i32.const ${c.offset}
`,r+=`    i32.add
`,r+=`    i32.load
`,r}}if(/^\d+$/.test(e)){const i=parseInt(e);let o="";return o+=`    local.get $${n}
`,o+=`    i32.const ${i*4}
`,o+=`    i32.add
`,o+=`    i32.load
`,o}}}if(s.includes("::")){const t=s.match(/(\w+)::(\w+)(?:\(([^)]+)\))?/);if(t){const n=t[1],e=t[2],i=t[3],o=this.enumDefs.get(n);if(o){const c=o.variants.find(r=>r.name===e);if(c){let r="";return r+=`    i32.const ${c.discriminant}
`,i&&(r+=this.convertExpression(i)),r}}}}if(s.includes("(")&&s.includes(")")){const t=s.match(/(\w+)\s*\(([^)]*)\)/);if(t){const n=t[1],e=t[2].split(",").map(o=>o.trim()).filter(o=>o);let i="";return e.forEach(o=>{i+=this.convertExpression(o)}),i+=`    call $${n}
`,i}}if(s.includes(".")&&s.includes("(")&&s.includes(")")&&!s.includes("..")){const t=s.match(/(\w+)\.(\w+)\s*\(([^)]*)\)/);if(t){const n=t[1],e=t[2],i=t[3].split(",").map(c=>c.trim()).filter(c=>c);let o="";return o+=this.convertExpression(n),i.forEach(c=>{o+=this.convertExpression(c)}),o+=`    call $${n}_${e}
`,o}}if(s.includes("<")&&!s.includes("<<")){const[t,n]=s.split("<").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.lt_s
`}if(s.includes(">")&&!s.includes(">>")&&!s.includes("->")){const[t,n]=s.split(">").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.gt_s
`}if(s.includes("==")){const[t,n]=s.split("==").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.eq
`}if(s.includes("!=")){const[t,n]=s.split("!=").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.ne
`}if(s.includes("<=")){const[t,n]=s.split("<=").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.le_s
`}if(s.includes(">=")){const[t,n]=s.split(">=").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.ge_s
`}if(s.includes("&&")){const[t,n]=s.split("&&").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.and
`}if(s.includes("||")){const[t,n]=s.split("||").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.or
`}if(s.startsWith("!")&&!s.startsWith("!=")){const t=s.slice(1).trim();return this.convertExpression(t)+`    i32.eqz
`}if(s.includes("&")&&!s.includes("&&")){const[t,n]=s.split("&").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.and
`}if(s.includes("|")&&!s.includes("||")){const[t,n]=s.split("|").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.or
`}if(s.includes("^")){const[t,n]=s.split("^").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.xor
`}if(s.includes("<<")){const[t,n]=s.split("<<").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.shl
`}if(s.includes(">>")){const[t,n]=s.split(">>").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.shr_s
`}if(s.includes("%")){const[t,n]=s.split("%").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.rem_s
`}if(s.startsWith("-")){const t=s.slice(1).trim();return`    i32.const 0
`+this.convertExpression(t)+`    i32.sub
`}if(s.includes("+")){const[t,n]=s.split("+").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.add
`}if(s.includes("-")&&!s.startsWith("-")){const[t,n]=s.split("-").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.sub
`}if(s.includes("*")){const[t,n]=s.split("*").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.mul
`}if(s.includes("/")){const[t,n]=s.split("/").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(n)+`    i32.div_s
`}return`    i32.const 0
`}convertPrintln(s){const t=s.match(/println!\s*\(\s*"([^"]*)"\s*(?:,\s*(.+))?\s*\)/);if(t){const n=t[1],e=t[2]?t[2].split(",").map(c=>c.trim()):[],i=this.module.data.length*100;this.module.data.push(`(data (i32.const ${i}) "${n}\\00")`);let o="";return o+=`    i32.const ${i}
`,o+=`    i32.const ${n.length}
`,e.forEach(c=>{o+=this.convertExpression(c)}),o+=`    call $log
`,e.forEach(()=>{o+=`    drop
`}),o}return""}convertPanic(s){const t=s.match(/panic!\s*\(\s*"([^"]*)"\s*\)/);if(t){const n=t[1],e=this.module.data.length*100;this.module.data.push(`(data (i32.const ${e}) "PANIC: ${n}\\00")`);let i="";return i+=`    i32.const ${e}
`,i+=`    i32.const ${n.length+8}
`,i+=`    call $log
`,i+=`    unreachable
`,i}return`    unreachable
`}convertLoop(s,t){let n=0,e=t,i=!1;for(;e<s.length;){const r=s[e];if(r.includes("{")&&(i=!0,n+=(r.match(/{/g)||[]).length),r.includes("}")&&(n-=(r.match(/}/g)||[]).length),i&&n===0)break;e++}const o=s.slice(t+1,e);let c="";return c+=`    (block $loop_end_${t}
`,c+=`      (loop $loop_start_${t}
`,c+=this.convertBody(o),c+=`        br $loop_start_${t}
`,c+=`      )
`,c+=`    )
`,{wat:c,endIndex:e}}convertIfLet(s,t){const e=s[t].trim().match(/if let\s+(\w+)::(\w+)\s*=\s*(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const i=e[1],o=e[2],c=e[3];let r=0,a=t,l=!1;for(;a<s.length;){const m=s[a];if(m.includes("{")&&(l=!0,r+=(m.match(/{/g)||[]).length),m.includes("}")&&(r-=(m.match(/}/g)||[]).length),l&&r===0)break;a++}const d=s.slice(t+1,a),h=this.enumDefs.get(i);if(!h)return{wat:"",endIndex:a};const u=h.variants.find(m=>m.name===o);if(!u)return{wat:"",endIndex:a};let f="";return f+=this.convertExpression(c),f+=`    i32.const ${u.discriminant}
`,f+=`    i32.eq
`,f+=`    (if
`,f+=`      (then
`,f+=this.convertBody(d),f+=`      )
`,f+=`    )
`,{wat:f,endIndex:a}}convertWhileLet(s,t){const e=s[t].trim().match(/while let\s+(\w+)::(\w+)\s*=\s*(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const i=e[1],o=e[2],c=e[3];let r=0,a=t,l=!1;for(;a<s.length;){const m=s[a];if(m.includes("{")&&(l=!0,r+=(m.match(/{/g)||[]).length),m.includes("}")&&(r-=(m.match(/}/g)||[]).length),l&&r===0)break;a++}const d=s.slice(t+1,a),h=this.enumDefs.get(i);if(!h)return{wat:"",endIndex:a};const u=h.variants.find(m=>m.name===o);if(!u)return{wat:"",endIndex:a};let f="";return f+=`    (block $while_let_end_${t}
`,f+=`      (loop $while_let_start_${t}
`,f+=this.convertExpression(c),f+=`        i32.const ${u.discriminant}
`,f+=`        i32.eq
`,f+=`        i32.eqz
`,f+=`        br_if $while_let_end_${t}
`,f+=this.convertBody(d),f+=`        br $while_let_start_${t}
`,f+=`      )
`,f+=`    )
`,{wat:f,endIndex:a}}generateWAT(){let s=`(module
`;return this.module.imports.forEach(t=>{s+=`  ${t}
`}),this.module.types.length>0&&(s+=`
  ;; Types
`,this.module.types.forEach(t=>{s+=`  ${t}
`})),this.module.functions.length>0&&(s+=`
  ;; Functions
`,this.module.functions.forEach(t=>{s+=`  ${t}
`})),this.module.exports.length>0&&(s+=`
  ;; Exports
`,this.module.exports.forEach(t=>{s+=`  ${t}
`})),this.module.data.length>0&&(s+=`
  ;; Data
`,this.module.data.forEach(t=>{s+=`  ${t}
`})),s+=")",s}}function w(v){return new $().convert(v)}export{$ as RustToWAT,w as rustToWat};
