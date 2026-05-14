class ${module;functionIndex=0;localVars=new Map;structDefs=new Map;enumDefs=new Map;memoryOffset=0;heapPointer=1024;constructor(){this.module={types:[],imports:[],functions:[],exports:[],data:[]}}convert(s){return this.module={types:[],imports:[],functions:[],exports:[],data:[]},this.functionIndex=0,this.structDefs=new Map,this.enumDefs=new Map,this.memoryOffset=0,this.heapPointer=1024,this.addDefaultImports(),this.parseDefinitions(s),this.parseRustCode(s),this.generateWAT()}parseDefinitions(s){const t=s.split(`
`);for(let i=0;i<t.length;i++){const e=t[i].trim();e.startsWith("struct ")?this.parseStruct(t,i):e.startsWith("enum ")&&this.parseEnum(t,i)}}parseStruct(s,t){const e=s[t].trim().match(/struct\s+(\w+)\s*\{?/);if(!e)return t;const o=e[1],n=[];let r=0,c=t+1;for(;c<s.length;){const h=s[c].trim();if(h==="}"||h.startsWith("}"))break;if(h.startsWith("//")||!h){c++;continue}const l=h.match(/(\w+)\s*:\s*(\w+)/);l&&(n.push({name:l[1],type:l[2],offset:r}),r+=4),c++}return this.structDefs.set(o,{name:o,fields:n,size:r}),c}parseEnum(s,t){const e=s[t].trim().match(/enum\s+(\w+)\s*\{?/);if(!e)return t;const o=e[1],n=[];let r=0,c=t+1;for(;c<s.length;){const h=s[c].trim();if(h==="}"||h.startsWith("}"))break;if(h.startsWith("//")||!h){c++;continue}const l=h.match(/(\w+)(?:\(([^)]+)\))?,?/);l&&n.push({name:l[1],discriminant:r++,hasData:!!l[2],dataType:l[2]?.trim()}),c++}return this.enumDefs.set(o,{name:o,variants:n}),c}addDefaultImports(){this.module.imports.push('(import "env" "memory" (memory 1))','(import "env" "log" (func $log (param i32 i32)))')}parseRustCode(s){const t=s.split(`
`);for(let i=0;i<t.length;i++)t[i].trim().startsWith("fn ")&&this.parseFunction(t,i)}parseFunction(s,t){const i=s[t].trim(),e=i.match(/fn\s+(\w+)\s*\(([^)]*)\)/);if(!e)return t;const o=e[1],n=this.parseParams(e[2]);let r=0,c=t,h=!1,l=0;for(;c<s.length;){const f=s[c];if(f.includes("{")&&(h||(l=c),h=!0,r+=(f.match(/{/g)||[]).length),f.includes("}")&&(r-=(f.match(/}/g)||[]).length),h&&r===0)break;c++}const u=s.slice(l,c+1),a=this.convertFunction(o,n,u);return this.module.functions.push(a),(o==="main"||i.includes("#[wasm_bindgen]"))&&this.module.exports.push(`(export "${o}" (func $${o}))`),c}parseParams(s){return s.trim()?s.split(",").map(t=>t.trim().split(":")[0].trim()).filter(t=>t&&t!=="self"):[]}convertFunction(s,t,i){this.localVars=new Map;let e=t.length;t.forEach((h,l)=>{this.localVars.set(h,l)});const o=i.join(`
`);this.collectLocals(o,e);let n=`(func $${s}`;t.forEach((h,l)=>{n+=` (param $${h} i32)`}),n+=` (result i32)
`;const r=Array.from(this.localVars.entries()).filter(([h,l])=>l>=t.length).sort((h,l)=>h[1]-l[1]);for(const[h,l]of r)n+=`    (local $${h} i32)
`;const c=this.convertBody(i.slice(1,-1));return n+=c,n+=`
    i32.const 0
  )`,n}collectLocals(s,t){const i=s.matchAll(/let\s+(mut\s+)?(\w+)\s*=/g);let e=t;for(const n of i){const r=n[2];this.localVars.has(r)||this.localVars.set(r,e++)}const o=s.matchAll(/for\s+(\w+)\s+in/g);for(const n of o){const r=n[1];this.localVars.has(r)||this.localVars.set(r,e++)}return e}convertBody(s){let t="",i=0;for(;i<s.length;){const e=s[i].trim();if(e.startsWith("let ")){const o=e.match(/let\s+(mut\s+)?(\w+)\s*=\s*(.+);/);if(o){const n=o[2],r=o[3];t+=this.convertExpression(r),t+=`    local.set $${n}
`}}else if(e.startsWith("println!"))t+=this.convertPrintln(e);else if(e.startsWith("match ")){const o=this.convertMatch(s,i);t+=o.wat,i=o.endIndex}else if(e.startsWith("for ")){const o=this.convertForLoop(s,i);t+=o.wat,i=o.endIndex}else if(e.startsWith("if ")){const o=this.convertIfElse(s,i);t+=o.wat,i=o.endIndex}else if(e.startsWith("while ")){const o=this.convertWhileLoop(s,i);t+=o.wat,i=o.endIndex}else if(e.startsWith("return ")){const o=e.match(/return\s+(.+);/);o&&(t+=this.convertExpression(o[1]))}else if(e.includes(" = ")&&!e.startsWith("let")&&e.endsWith(";")){const o=e.match(/(\w+)\s*=\s*(.+);/);if(o){const n=o[1],r=o[2];t+=this.convertExpression(r),t+=`    local.set $${n}
`}}else e.match(/^\w+\s*(\+=|-=|\*=|\/=|%=&)/)?t+=this.convertCompoundAssignment(e):e==="break;"?t+=`    br $for_end_${startIndex}
`:e==="continue;"?t+=`    br $for_start_${startIndex}
`:e&&!e.startsWith("//")&&!e.startsWith("#[")&&!e.startsWith("}")&&(e.includes("{")||(t+=this.convertExpression(e)));i++}return t}convertCompoundAssignment(s){const t=s.match(/(\w+)\s*(\+=|-=|\*=|\/=|%=)\s*(.+);/);if(!t)return"";const i=t[1],e=t[2],o=t[3];let n="";switch(n+=`    local.get $${i}
`,n+=this.convertExpression(o),e){case"+=":n+=`    i32.add
`;break;case"-=":n+=`    i32.sub
`;break;case"*=":n+=`    i32.mul
`;break;case"/=":n+=`    i32.div_s
`;break;case"%=":n+=`    i32.rem_s
`;break}return n+=`    local.set $${i}
`,n}convertMatch(s,t){const e=s[t].trim().match(/match\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const o=e[1];let n=0,r=t,c=!1;for(;r<s.length;){const v=s[r];if(v.includes("{")&&(c=!0,n+=(v.match(/{/g)||[]).length),v.includes("}")&&(n-=(v.match(/}/g)||[]).length),c&&n===0)break;r++}const h=s.slice(t+1,r),l=[];let u="",a=[],f=0,p=!1;for(const v of h){const d=v.trim();d.endsWith("=>")&&!p?(u=d.replace(/\s*=>\s*$/,"").trim(),p=!0,f=0):p&&(d==="{"?f++:d==="}"?(f--,f===0&&(l.push({pattern:u,body:a}),a=[],p=!1)):d.endsWith(",")&&f===0?(a.push(d.replace(/,\s*$/,"")),l.push({pattern:u,body:a}),a=[],p=!1):a.push(d))}let m="";m+=this.convertExpression(o);for(let v=0;v<l.length;v++){const d=l[v];d.pattern==="_"?m+=this.convertBody(d.body):(m+=`    i32.const ${d.pattern}
`,m+=`    i32.eq
`,m+=`    (if
`,m+=`      (then
`,m+=this.convertBody(d.body),m+=`      )
`,m+=`    )
`)}return{wat:m,endIndex:r}}convertForLoop(s,t){const e=s[t].trim().match(/for\s+(\w+)\s+in\s+(\d+)\.\.(\d+)\s*\{/);if(!e)return{wat:"",endIndex:t};const o=e[1],n=parseInt(e[2]),r=parseInt(e[3]);let c=0,h=t,l=!1;for(;h<s.length;){const f=s[h];if(f.includes("{")&&(l=!0,c+=(f.match(/{/g)||[]).length),f.includes("}")&&(c-=(f.match(/}/g)||[]).length),l&&c===0)break;h++}const u=s.slice(t+1,h);let a="";return a+=`    i32.const ${n}
`,a+=`    local.set $${o}
`,a+=`    (block $for_end_${t}
`,a+=`      (loop $for_start_${t}
`,a+=`        local.get $${o}
`,a+=`        i32.const ${r}
`,a+=`        i32.ge_s
`,a+=`        br_if $for_end_${t}
`,a+=this.convertBody(u),a+=`        local.get $${o}
`,a+=`        i32.const 1
`,a+=`        i32.add
`,a+=`        local.set $${o}
`,a+=`        br $for_start_${t}
`,a+=`      )
`,a+=`    )
`,{wat:a,endIndex:h}}convertIfElse(s,t){const e=s[t].trim().match(/if\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const o=e[1];let n=0,r=t,c=!1;for(;r<s.length;){const f=s[r];if(f.includes("{")&&(c=!0,n+=(f.match(/{/g)||[]).length),f.includes("}")&&(n-=(f.match(/}/g)||[]).length),c&&n===0)break;r++}const h=s.slice(t+1,r);let l=[],u=r;if(r+1<s.length){const f=s[r+1].trim();if(f==="else {"||f.startsWith("} else {")){let p=r+1;for(n=0,c=!1;p<s.length;){const m=s[p];if(m.includes("{")&&(c=!0,n+=(m.match(/{/g)||[]).length),m.includes("}")&&(n-=(m.match(/}/g)||[]).length),c&&n===0)break;p++}l=s.slice(r+2,p),u=p}}let a="";return a+=this.convertExpression(o),a+=`    (if
`,a+=`      (then
`,a+=this.convertBody(h),a+=`      )
`,l.length>0&&(a+=`      (else
`,a+=this.convertBody(l),a+=`      )
`),a+=`    )
`,{wat:a,endIndex:u}}convertWhileLoop(s,t){const e=s[t].trim().match(/while\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const o=e[1];let n=0,r=t,c=!1;for(;r<s.length;){const u=s[r];if(u.includes("{")&&(c=!0,n+=(u.match(/{/g)||[]).length),u.includes("}")&&(n-=(u.match(/}/g)||[]).length),c&&n===0)break;r++}const h=s.slice(t+1,r);let l="";return l+=`    (block $while_end_${t}
`,l+=`      (loop $while_start_${t}
`,l+=this.convertExpression(o),l+=`        i32.eqz
`,l+=`        br_if $while_end_${t}
`,l+=this.convertBody(h),l+=`        br $while_start_${t}
`,l+=`      )
`,l+=`    )
`,{wat:l,endIndex:r}}convertExpression(s){if(s=s.trim(),!s)return"";if(/^\d+$/.test(s))return`    i32.const ${s}
`;if(s==="true")return`    i32.const 1
`;if(s==="false")return`    i32.const 0
`;if(s.startsWith('"')&&s.endsWith('"')){const t=s.slice(1,-1),i=this.module.data.length*20;return this.module.data.push(`(data (i32.const ${i}) "${t}\\00")`),`    i32.const ${i}
    i32.const ${t.length}
`}if(this.localVars.has(s))return`    local.get $${s}
`;if(s.includes(".")&&!s.includes("..")){const t=s.split(".");if(t.length===2){const[i,e]=t;this.localVars.get(i);for(const[o,n]of this.structDefs.entries()){const r=n.fields.find(c=>c.name===e);if(r){let c="";return c+=`    local.get $${i}
`,c+=`    i32.const ${r.offset}
`,c+=`    i32.add
`,c+=`    i32.load
`,c}}if(/^\d+$/.test(e)){const o=parseInt(e);let n="";return n+=`    local.get $${i}
`,n+=`    i32.const ${o*4}
`,n+=`    i32.add
`,n+=`    i32.load
`,n}}}if(s.includes("::")){const t=s.match(/(\w+)::(\w+)(?:\(([^)]+)\))?/);if(t){const i=t[1],e=t[2],o=t[3],n=this.enumDefs.get(i);if(n){const r=n.variants.find(c=>c.name===e);if(r){let c="";return c+=`    i32.const ${r.discriminant}
`,o&&(c+=this.convertExpression(o)),c}}}}if(s.includes("(")&&s.includes(")")){const t=s.match(/(\w+)\s*\(([^)]*)\)/);if(t){const i=t[1],e=t[2].split(",").map(n=>n.trim()).filter(n=>n);let o="";return e.forEach(n=>{o+=this.convertExpression(n)}),o+=`    call $${i}
`,o}}if(s.includes("<")&&!s.includes("<<")){const[t,i]=s.split("<").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.lt_s
`}if(s.includes(">")&&!s.includes(">>")&&!s.includes("->")){const[t,i]=s.split(">").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.gt_s
`}if(s.includes("==")){const[t,i]=s.split("==").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.eq
`}if(s.includes("!=")){const[t,i]=s.split("!=").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.ne
`}if(s.includes("<=")){const[t,i]=s.split("<=").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.le_s
`}if(s.includes(">=")){const[t,i]=s.split(">=").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.ge_s
`}if(s.includes("&&")){const[t,i]=s.split("&&").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.and
`}if(s.includes("||")){const[t,i]=s.split("||").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.or
`}if(s.startsWith("!")&&!s.startsWith("!=")){const t=s.slice(1).trim();return this.convertExpression(t)+`    i32.eqz
`}if(s.includes("&")&&!s.includes("&&")){const[t,i]=s.split("&").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.and
`}if(s.includes("|")&&!s.includes("||")){const[t,i]=s.split("|").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.or
`}if(s.includes("^")){const[t,i]=s.split("^").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.xor
`}if(s.includes("<<")){const[t,i]=s.split("<<").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.shl
`}if(s.includes(">>")){const[t,i]=s.split(">>").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.shr_s
`}if(s.includes("%")){const[t,i]=s.split("%").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.rem_s
`}if(s.startsWith("-")){const t=s.slice(1).trim();return`    i32.const 0
`+this.convertExpression(t)+`    i32.sub
`}if(s.includes("+")){const[t,i]=s.split("+").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.add
`}if(s.includes("-")&&!s.startsWith("-")){const[t,i]=s.split("-").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.sub
`}if(s.includes("*")){const[t,i]=s.split("*").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.mul
`}if(s.includes("/")){const[t,i]=s.split("/").map(e=>e.trim());return this.convertExpression(t)+this.convertExpression(i)+`    i32.div_s
`}return`    i32.const 0
`}convertPrintln(s){const t=s.match(/println!\s*\(\s*"([^"]*)"\s*(?:,\s*(.+))?\s*\)/);if(t){const i=t[1],e=t[2]?t[2].split(",").map(r=>r.trim()):[],o=this.module.data.length*100;this.module.data.push(`(data (i32.const ${o}) "${i}\\00")`);let n="";return n+=`    i32.const ${o}
`,n+=`    i32.const ${i.length}
`,e.forEach(r=>{n+=this.convertExpression(r)}),n+=`    call $log
`,e.forEach(()=>{n+=`    drop
`}),n}return""}generateWAT(){let s=`(module
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
`})),s+=")",s}}function E(g){return new $().convert(g)}export{$ as RustToWAT,E as rustToWat};
