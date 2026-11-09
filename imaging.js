// Camera/OCR helpers. Original color pixels are retained; enhancement is OCR-only.
function pixelQuality(data,width,height){const gray=new Float32Array(width*height);let total=0,bright=0,count=0;for(let i=0;i<gray.length;i++)gray[i]=.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2];let energy=0;for(let y=1;y<height-1;y++){if(y>height*.22&&y<height*.84)continue;for(let x=1;x<width-1;x++){const i=y*width+x,v=gray[i],lap=4*v-gray[i-1]-gray[i+1]-gray[i-width]-gray[i+width];energy+=lap*lap;total+=v;bright+=v>248?1:0;count++}}return {sharpness:count?energy/count:0,brightness:count?total/count:0,clipped:count?bright/count:0}}
function canvasQuality(canvas){const sample=document.createElement('canvas');sample.width=210;sample.height=294;const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,210,294);return pixelQuality(ctx.getImageData(0,0,210,294).data,210,294)}
function qualityScore(q){return q.sharpness*Math.min(1,q.brightness/65)*Math.max(.15,1-q.clipped)}
function enhancedRegion(image,region,enhance=false,targetWidth=1800){const sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;const [x,y,w,h]=region,scale=Math.min(4,targetWidth/(sourceWidth*w)),padding=24,sw=Math.max(1,Math.round(sourceWidth*w*scale)),sh=Math.max(1,Math.round(sourceHeight*h*scale));const canvas=document.createElement('canvas');canvas.width=sw+padding*2;canvas.height=sh+padding*2;const ctx=canvas.getContext('2d',{willReadFrequently:enhance});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,sourceWidth*x,sourceHeight*y,sourceWidth*w,sourceHeight*h,padding,padding,sw,sh);if(enhance){const pixels=ctx.getImageData(padding,padding,sw,sh),hist=new Uint32Array(256);for(let i=0;i<pixels.data.length;i+=4){const v=Math.round(.299*pixels.data[i]+.587*pixels.data[i+1]+.114*pixels.data[i+2]);pixels.data[i]=v;hist[v]++}const n=sw*sh;let low=0,high=255,median=128,sum=0;for(let v=0;v<256;v++){sum+=hist[v];if(sum>=n*.01){low=v;break}}sum=0;for(let v=255;v>=0;v--){sum+=hist[v];if(sum>=n*.01){high=v;break}}sum=0;for(let v=0;v<256;v++){sum+=hist[v];if(sum>=n*.5){median=v;break}}for(let i=0;i<pixels.data.length;i+=4){let v=Math.max(0,Math.min(255,Math.round((pixels.data[i]-low)*255/Math.max(40,high-low))));if(median<110)v=255-v;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v}ctx.putImageData(pixels,padding,padding)}return canvas}

// Conservative live-frame gate. White card borders alone do not block scanning.
globalThis.CardScanQuality=(()=>{
 function inspect(image){
  const w=96,h=Math.max(48,Math.round(w*(image.height||image.naturalHeight)/(image.width||image.naturalWidth))),c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data,q=pixelQuality(data,w,h),pixels=new Float32Array(w*h);let mean=0;
  for(let i=0;i<pixels.length;i++){pixels[i]=data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114;mean+=pixels[i];}mean/=pixels.length;
  const hint=q.brightness<24?'Dodaj światło — tekst karty jest zbyt ciemny.':q.brightness>245&&q.sharpness<40?'Zmień kąt karty, aby usunąć odblask.':q.sharpness<8?'Zbliż kartę i poczekaj, aż aparat ustawi ostrość.':'';
  return {...q,pixels,mean,hint};
 }
 function difference(a,b){if(!a||!b||a.pixels.length!==b.pixels.length)return Infinity;let sum=0;for(let i=0;i<a.pixels.length;i++)sum+=Math.abs((a.pixels[i]-a.mean)-(b.pixels[i]-b.mean));return sum/a.pixels.length;}
 return Object.freeze({inspect,difference});
})();
