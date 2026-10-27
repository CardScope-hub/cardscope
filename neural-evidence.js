// Keep detected text positions: footer/rules text must not become a card title.
globalThis.CardNeuralEvidence={fromResult(game,result){
 const lines=(result.texts||[]).map(x=>{const points=x.box||[],xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {text:String(x.text||''),confidence:100*(x.mean??x.score??0),left:Math.min(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}}).filter(x=>x.text.trim()&&Number.isFinite(x.top));
 const useful=lines.filter(x=>x.confidence>=45&&x.text.trim().length>=3),top=Math.min(...useful.map(x=>x.top)),bottom=Math.max(...useful.map(x=>x.bottom)),span=Math.max(1,bottom-top);
 const evidence={names:[],numbers:[],full:lines.map(x=>x.text).join('\n'),engine:'PaddleOCR PP-OCRv4'};
 if(!useful.length)return evidence;
 for(const line of lines){const y=((line.top+line.bottom)/2-top)/span;const title=game==='mlp-eternal'?true:['weiss','weiss-jp'].includes(game)?y>=.55:game==='onepiece'?y>=.64:game==='riftbound'?y>=.24&&y<=.73:y<=.27;if(title)evidence.names.push(line);if(y>=.65)evidence.numbers.push(line)}
 return evidence;
}};
