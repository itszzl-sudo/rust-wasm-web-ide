class ${module;functionIndex=0;localVars=new Map;constructor(){this.module={types:[],imports:[],functions:[],exports:[],data:[]}}convert(s){return this.module={types:[],imports:[],functions:[],exports:[],data:[]},this.functionIndex=0,this.addDefaultImports(),this.parseRustCode(s),this.generateWAT()}addDefaultImports(){this.module.imports.push('(import "env" "memory" (memory 1))','(import "env" "log" (func $log (param i32 i32)))')}parseRustCode(s){const t=s.split(`
`);for(let n=0;n<t.length;n++)t[n].trim().startsWith("fn ")&&this.parseFunction(t,n)}parseFunction(s,t){const n=s[t].trim(),e=n.match(/fn\s+(\w+)\s*\(([^)]*)\)/);if(!e)return t;const o=e[1],i=this.parseParams(e[2]);let r=0,a=t,h=!1,l=0;for(;a<s.length;){const f=s[a];if(f.includes("{")&&(h||(l=a),h=!0,r+=(f.match(/{/g)||[]).length),f.includes("}")&&(r-=(f.match(/}/g)||[]).length),h&&r===0)break;a++}const u=s.slice(l,a+1),c=this.convertFunction(o,i,u);return this.module.functions.push(c),(o==="main"||n.includes("#[wasm_bindgen]"))&&this.module.exports.push(`(export "${o}" (func $${o}))`),a}parseParams(s){return s.trim()?s.split(",").map(t=>t.trim().split(":")[0].trim()).filter(t=>t&&t!=="self"):[]}convertFunction(s,t,n){this.localVars=new Map;let e=t.length;t.forEach((h,l)=>{this.localVars.set(h,l)});const o=n.join(`
`);this.collectLocals(o,e);let i=`(func $${s}`;t.forEach((h,l)=>{i+=` (param $${h} i32)`}),i+=` (result i32)
`;const r=Array.from(this.localVars.entries()).filter(([h,l])=>l>=t.length).sort((h,l)=>h[1]-l[1]);for(const[h,l]of r)i+=`    (local $${h} i32)
`;const a=this.convertBody(n.slice(1,-1));return i+=a,i+=`
    i32.const 0
  )`,i}collectLocals(s,t){const n=s.matchAll(/let\s+(mut\s+)?(\w+)\s*=/g);let e=t;for(const i of n){const r=i[2];this.localVars.has(r)||this.localVars.set(r,e++)}const o=s.matchAll(/for\s+(\w+)\s+in/g);for(const i of o){const r=i[1];this.localVars.has(r)||this.localVars.set(r,e++)}return e}convertBody(s){let t="",n=0;for(;n<s.length;){const e=s[n].trim();if(e.startsWith("let ")){const o=e.match(/let\s+(mut\s+)?(\w+)\s*=\s*(.+);/);if(o){const i=o[2],r=o[3];t+=this.convertExpression(r),t+=`    local.set $${i}
`}}else if(e.startsWith("println!"))t+=this.convertPrintln(e);else if(e.startsWith("match ")){const o=this.convertMatch(s,n);t+=o.wat,n=o.endIndex}else if(e.startsWith("for ")){const o=this.convertForLoop(s,n);t+=o.wat,n=o.endIndex}else if(e.startsWith("if ")){const o=this.convertIfElse(s,n);t+=o.wat,n=o.endIndex}else if(e.startsWith("while ")){const o=this.convertWhileLoop(s,n);t+=o.wat,n=o.endIndex}else if(e.startsWith("return ")){const o=e.match(/return\s+(.+);/);o&&(t+=this.convertExpression(o[1]))}else if(e.includes(" = ")&&!e.startsWith("let")&&e.endsWith(";")){const o=e.match(/(\w+)\s*=\s*(.+);/);if(o){const i=o[1],r=o[2];t+=this.convertExpression(r),t+=`    local.set $${i}
`}}else e.match(/^\w+\s*(\+=|-=|\*=|\/=|%=&)/)?t+=this.convertCompoundAssignment(e):e==="break;"?t+=`    br $for_end_${startIndex}
`:e==="continue;"?t+=`    br $for_start_${startIndex}
`:e&&!e.startsWith("//")&&!e.startsWith("#[")&&!e.startsWith("}")&&(e.includes("{")||(t+=this.convertExpression(e)));n++}return t}convertCompoundAssignment(s){const t=s.match(/(\w+)\s*(\+=|-=|\*=|\/=|%=)\s*(.+);/);if(!t)return"";const n=t[1],e=t[2],o=t[3];let i="";switch(i+=`    local.get $${n}
`,i+=this.convertExpression(o),e){case"+=":i+=`    i32.add
`;break;case"-=":i+=`    i32.sub
`;break;case"*=":i+=`    i32.mul
`;break;case"/=":i+=`    i32.div_s
`;break;case"%=":i+=`    i32.rem_s
`;break}return i+=`    local.set $${n}
`,i}convertMatch(s,t){const e=s[t].trim().match(/match\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const o=e[1];let i=0,r=t,a=!1;for(;r<s.length;){const v=s[r];if(v.includes("{")&&(a=!0,i+=(v.match(/{/g)||[]).length),v.includes("}")&&(i-=(v.match(/}/g)||[]).length),a&&i===0)break;r++}const h=s.slice(t+1,r),l=[];let u="",c=[],f=0,p=!1;for(const v of h){const d=v.trim();d.endsWith("=>")&&!p?(u=d.replace(/\s*=>\s*$/,"").trim(),p=!0,f=0):p&&(d==="{"?f++:d==="}"?(f--,f===0&&(l.push({pattern:u,body:c}),c=[],p=!1)):d.endsWith(",")&&f===0?(c.push(d.replace(/,\s*$/,"")),l.push({pattern:u,body:c}),c=[],p=!1):c.push(d))}let m="";m+=this.convertExpression(o);for(let v=0;v<l.length;v++){const d=l[v];d.pattern==="_"?m+=this.convertBody(d.body):(m+=`    i32.const ${d.pattern}
`,m+=`    i32.eq
`,m+=`    (if
`,m+=`      (then
`,m+=this.convertBody(d.body),m+=`      )
`,m+=`    )
`)}return{wat:m,endIndex:r}}convertForLoop(s,t){const e=s[t].trim().match(/for\s+(\w+)\s+in\s+(\d+)\.\.(\d+)\s*\{/);if(!e)return{wat:"",endIndex:t};const o=e[1],i=parseInt(e[2]),r=parseInt(e[3]);let a=0,h=t,l=!1;for(;h<s.length;){const f=s[h];if(f.includes("{")&&(l=!0,a+=(f.match(/{/g)||[]).length),f.includes("}")&&(a-=(f.match(/}/g)||[]).length),l&&a===0)break;h++}const u=s.slice(t+1,h);let c="";return c+=`    i32.const ${i}
`,c+=`    local.set $${o}
`,c+=`    (block $for_end_${t}
`,c+=`      (loop $for_start_${t}
`,c+=`        local.get $${o}
`,c+=`        i32.const ${r}
`,c+=`        i32.ge_s
`,c+=`        br_if $for_end_${t}
`,c+=this.convertBody(u),c+=`        local.get $${o}
`,c+=`        i32.const 1
`,c+=`        i32.add
`,c+=`        local.set $${o}
`,c+=`        br $for_start_${t}
`,c+=`      )
`,c+=`    )
`,{wat:c,endIndex:h}}convertIfElse(s,t){const e=s[t].trim().match(/if\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const o=e[1];let i=0,r=t,a=!1;for(;r<s.length;){const f=s[r];if(f.includes("{")&&(a=!0,i+=(f.match(/{/g)||[]).length),f.includes("}")&&(i-=(f.match(/}/g)||[]).length),a&&i===0)break;r++}const h=s.slice(t+1,r);let l=[],u=r;if(r+1<s.length){const f=s[r+1].trim();if(f==="else {"||f.startsWith("} else {")){let p=r+1;for(i=0,a=!1;p<s.length;){const m=s[p];if(m.includes("{")&&(a=!0,i+=(m.match(/{/g)||[]).length),m.includes("}")&&(i-=(m.match(/}/g)||[]).length),a&&i===0)break;p++}l=s.slice(r+2,p),u=p}}let c="";return c+=this.convertExpression(o),c+=`    (if
`,c+=`      (then
`,c+=this.convertBody(h),c+=`      )
`,l.length>0&&(c+=`      (else
`,c+=this.convertBody(l),c+=`      )
`),c+=`    )
`,{wat:c,endIndex:u}}convertWhileLoop(s,t){const e=s[t].trim().match(/while\s+(.+)\s*\{/);if(!e)return{wat:"",endIndex:t};const o=e[1];let i=0,r=t,a=!1;for(;r<s.length;){const u=s[r];if(u.includes("{")&&(a=!0,i+=(u.match(/{/g)||[]).length),u.includes("}")&&(i-=(u.match(/}/g)||[]).length),a&&i===0)break;r++}const h=s.slice(t+1,r);let l="";return l+=`    (block $while_end_${t}
`,l+=`      (loop $while_start_${t}
`,l+=this.convertExpression(o),l+=`        i32.eqz
`,l+=`        br_if $while_end_${t}
`,l+=this.convertBody(h),l+=`        br $while_start_${t}
`,l+=`      )
`,l+=`    )
`,{wat:l,endIndex:r}}convertExpression(s){if(s=s.trim(),!s)return"";if(/^\d+$/.test(s))return`    i32.const ${s}
`;if(s==="true")return`    i32.const 1
`;if(s==="false")return`    i32.const 0
`;if(s.startsWith('"')&&s.endsWith('"')){const t=s.slice(1,-1),n=this.module.data.length*20;return this.module.data.push(`(data (i32.const ${n}) "${t}\\00")`),`    i32.const ${n}
    i32.const ${t.length}
`}if(this.localVars.has(s))return`    local.get $${s}
`;if(s.includes("(")&&s.includes(")")){const t=s.match(/(\w+)\s*\(([^)]*)\)/);if(t){const n=t[1],e=t[2].split(",").map(i=>i.trim()).filter(i=>i);let o="";return e.forEach(i=>{o+=this.convertExpression(i)}),o+=`    call $${n}
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
`}convertPrintln(s){const t=s.match(/println!\s*\(\s*"([^"]*)"\s*(?:,\s*(.+))?\s*\)/);if(t){const n=t[1],e=t[2]?t[2].split(",").map(r=>r.trim()):[],o=this.module.data.length*100;this.module.data.push(`(data (i32.const ${o}) "${n}\\00")`);let i="";return i+=`    i32.const ${o}
`,i+=`    i32.const ${n.length}
`,e.forEach(r=>{i+=this.convertExpression(r)}),i+=`    call $log
`,e.forEach(()=>{i+=`    drop
`}),i}return""}generateWAT(){let s=`(module
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
