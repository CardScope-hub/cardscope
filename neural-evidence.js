// Use image coordinates, not the extent of whatever text happened to be readable.
globalThis.CardNeuralEvidence=(()=>{
 function linesFrom(result){return (result.texts||[]).map(x=>{const points=x.box||[],xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {text:String(x.text||''),confidence:100*(x.mean??x.score??0),left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}}).filter(x=>x.text.trim()&&Number.isFinite(x.top))}
 function group(lines){const rows=[];for(const line of [...lines].sort((a,b)=>a.top-b.top||a.left-b.left)){const cy=(line.top+line.bottom)/2,h=line.bottom-line.top;const row=rows.find(r=>Math.abs(r.cy-cy)<Math.max(5,Math.min(r.h,h)*.6));if(row){row.lines.push(line);row.cy=(row.cy*(row.lines.length-1)+cy)/row.lines.length}else rows.push({cy,h,lines:[line]})}return rows.sort((a,b)=>a.cy-b.cy).map(r=>({text:r.lines.sort((a,b)=>a.left-b.left).map(l=>l.text).join(' '),confidence:Math.min(...r.lines.map(l=>l.confidence)),source:'positioned-row'}))}
 function fromResult(game,result){const lines=linesFrom(result),height=result.height||Math.max(1,...lines.map(x=>x.bottom)),names=[],numbers=[];
  for(const line of lines){const y=(line.top+line.bottom)/2/height;const title=['weiss','weiss-jp'].includes(game)?y>=.58&&y<=.91:game==='onepiece'?y>=.72&&y<=.94:game==='riftbound'?y>=.32&&y<=.76:y<=.26;if(title)names.push(line);if(y>=.78)numbers.push(line)}
  return {names:group(names),numbers:group(numbers),full:group(lines).map(x=>x.text).join('\n'),engine:'PaddleOCR PP-OCRv4'};
 }
 function crop(result){return group(linesFrom(result))}
 function fromTesseract(game,data,width,height){
  const lines=data.blocks?.flatMap(b=>b.paragraphs?.flatMap(p=>p.lines||[])||[])||data.lines||[];
  return fromResult(game,{width,height,texts:lines.map(l=>({text:l.text,mean:(l.confidence||0)/100,box:[[l.bbox.x0,l.bbox.y0],[l.bbox.x1,l.bbox.y0],[l.bbox.x1,l.bbox.y1],[l.bbox.x0,l.bbox.y1]]}))});
 }
 return Object.freeze({fromResult,fromTesseract,crop,group});
})();
