// Geometry only: find the four outer edges of a nearly framed card and flatten it.
// No OCR, model download or network request is involved in alignment.
globalThis.CardWeissFrame=(()=>{
 const M=Math;
 const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 function solve(a){for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(M.abs(a[j][i])>M.abs(a[pivot][i]))pivot=j;if(M.abs(a[pivot][i])<1e-9)return null;[a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];for(let k=i;k<9;k++)a[i][k]/=d;for(let j=0;j<8;j++)if(j!==i){const f=a[j][i];for(let k=i;k<9;k++)a[j][k]-=f*a[i][k];}}return a.map(r=>r[8]);}
 function homography(points,w,h){const a=[];for(let i=0;i<4;i++){const [u,v]=[[0,0],[w-1,0],[w-1,h-1],[0,h-1]][i],[x,y]=points[i];a.push([u,v,1,0,0,0,-x*u,-x*v,x],[0,0,0,u,v,1,-y*u,-y*v,y]);}return solve(a);}
 function warp(image,points,maxSide=1900){const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,dist=(a,b)=>M.hypot(a[0]-b[0],a[1]-b[1]);let w=(dist(points[0],points[1])+dist(points[2],points[3]))/2,h=(dist(points[0],points[3])+dist(points[1],points[2]))/2;const scale=M.min(1,maxSide/M.max(w,h));w=M.max(1,M.round(w*scale));h=M.max(1,M.round(h*scale));const matrix=homography(points,w,h);if(!matrix)return image;const source=canvas(iw,ih),ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,iw,ih).data,out=canvas(w,h),dest=out.getContext('2d'),buffer=dest.createImageData(w,h),data=buffer.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const den=matrix[6]*x+matrix[7]*y+1,px=M.max(0,M.min(iw-1,(matrix[0]*x+matrix[1]*y+matrix[2])/den)),py=M.max(0,M.min(ih-1,(matrix[3]*x+matrix[4]*y+matrix[5])/den)),x0=M.floor(px),y0=M.floor(py),x1=M.min(iw-1,x0+1),y1=M.min(ih-1,y0+1),fx=px-x0,fy=py-y0,di=(y*w+x)*4;for(let k=0;k<3;k++)data[di+k]=(1-fy)*((1-fx)*pixels[(y0*iw+x0)*4+k]+fx*pixels[(y0*iw+x1)*4+k])+fy*((1-fx)*pixels[(y1*iw+x0)*4+k]+fx*pixels[(y1*iw+x1)*4+k]);data[di+3]=255;}
  dest.putImageData(buffer,0,0);return out;
 }
 function detect(image){const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;if(!iw||!ih)return null;const scale=M.min(1,500/M.max(iw,ih)),w=M.round(iw*scale),h=M.round(ih*scale),small=canvas(w,h),ctx=small.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);const p=ctx.getImageData(0,0,w,h).data,gray=new Float32Array(w*h);for(let i=0;i<gray.length;i++)gray[i]=.299*p[i*4]+.587*p[i*4+1]+.114*p[i*4+2];
  const edge=(vertical,far)=>{const extent=vertical?w:h,along=vertical?h:w;const candidates=[];for(let deg=-12;deg<=12;deg+=1.5){const slope=M.tan(deg*M.PI/180);for(let at=M.max(3,M.floor(extent*(far?.72:.015)));at<=M.min(extent-4,M.ceil(extent*(far?.985:.28)));at+=1){let sum=0,count=0,strong=0;for(let t=M.floor(along*.17);t<along*.83;t+=3){const n=M.round(at+slope*(t-along/2));if(n<3||n>=extent-3)continue;const index=vertical?t*w+n:n*w+t,step=vertical?1:w;const g=M.abs((gray[index+step]+gray[index+2*step]+gray[index+3*step])-(gray[index-step]+gray[index-2*step]+gray[index-3*step]))/3;sum+=M.min(g,100);strong+=g>18;count++;}const score=sum/M.max(1,count);if(count>10&&strong/count>.45)candidates.push({at,slope,score,support:strong/count});}}candidates.sort((a,b)=>b.score-a.score);const peaks=[];for(const r of candidates)if(!peaks.some(p=>M.abs(p.at-r.at)<extent*.025)){peaks.push(r);if(peaks.length===5)break;}return peaks;};
  const sides=[edge(true,false),edge(true,true),edge(false,false),edge(false,true)];if(sides.some(s=>!s.length))return null;
  const corner=(v,horizontal)=>{const a=v.at-v.slope*h/2,b=horizontal.at-horizontal.slope*w/2,x=(a+v.slope*b)/(1-v.slope*horizontal.slope);return [x,b+horizontal.slope*x];},distance=(a,b)=>M.hypot(a[0]-b[0],a[1]-b[1]),target=iw>ih?88/63:63/88;
  const quads=[];
  for(const left of sides[0])for(const right of sides[1])for(const top of sides[2])for(const bottom of sides[3]){
   const points=[corner(left,top),corner(right,top),corner(right,bottom),corner(left,bottom)];if(points.some(([x,y])=>x<0||y<0||x>w||y>h))continue;
   const cw=(distance(points[0],points[1])+distance(points[2],points[3]))/2,ch=(distance(points[0],points[3])+distance(points[1],points[2]))/2,ratio=cw/ch,aspectError=M.abs(M.log(ratio/target));
   const area=M.abs(points.reduce((s,p,i)=>s+p[0]*points[(i+1)%4][1]-points[(i+1)%4][0]*p[1],0))/2/(w*h),score=M.min(left.score,right.score,top.score,bottom.score),angle=M.max(...[left,right,top,bottom].map(e=>M.abs(e.slope)));
   if(aspectError>.10||area<.48||score<14)continue;
   // Prefer the outer rectangle; a bright title band is not a card boundary.
   const quality=area*120+M.min(score,70)*.20-aspectError*160;
   quads.push({points,score,area,angle,quality});
  }
  const background=quad=>{let count=0;const total=[0,0,0],squares=[0,0,0];for(let y=2;y<h-2;y+=9)for(let x=2;x<w-2;x+=9){let inside=true;for(let i=0;i<4;i++){const a=quad.points[i],b=quad.points[(i+1)%4];if((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0])<0){inside=false;break;}}if(inside)continue;const at=(y*w+x)*4;for(let k=0;k<3;k++){total[k]+=p[at+k];squares[k]+=p[at+k]**2;}count++;}return count>20&&M.max(...total.map((sum,i)=>M.sqrt(M.max(0,squares[i]/count-(sum/count)**2))))<40;};
  // On an even tabletop, an actual edge has background immediately outside
  // it. Penalize inner foil/name borders that otherwise resemble a card edge.
  const border=[];for(let t=.08;t<.95;t+=.08)for(const [x,y] of [[2,M.round(h*t)],[w-3,M.round(h*t)],[M.round(w*t),2],[M.round(w*t),h-3]])border.push([p[(y*w+x)*4],p[(y*w+x)*4+1],p[(y*w+x)*4+2]]);
  const bg=[0,1,2].map(k=>border.reduce((s,v)=>s+v[k],0)/border.length),flat=M.max(...bg.map((avg,k)=>M.sqrt(border.reduce((s,v)=>s+(v[k]-avg)**2,0)/border.length)))<25;
  if(flat)for(const quad of quads){let error=0,count=0;for(let side=0;side<4;side++){const a=quad.points[side],b=quad.points[(side+1)%4],len=distance(a,b),nx=(b[1]-a[1])/len,ny=-(b[0]-a[0])/len;for(let t=.12;t<.9;t+=.08){const x=M.round(a[0]+(b[0]-a[0])*t+nx*4),y=M.round(a[1]+(b[1]-a[1])*t+ny*4);if(x<0||y<0||x>=w||y>=h)continue;for(let k=0;k<3;k++)error+=M.min(80,M.abs(p[(y*w+x)*4+k]-bg[k]));count+=3;}}quad.quality-=error/M.max(1,count)*2;}
  const best=quads.sort((a,b)=>b.quality-a.quality).slice(0,12).find(background);
  if(!best||best.area>.88&&best.angle<.025)return null;
  return {corners:best.points.map(([x,y])=>[x/scale,y/scale]),score:best.score,area:best.area};
 }
 function prepare(image){const found=detect(image);return found?{image:warp(image,found.corners),aligned:true,...found}:{image,aligned:false};}
 // Select the sharpest footer in a short camera burst. Artwork sharpness
 // alone says little about whether the tiny printed identifier is legible.
 function quality(image){const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,w=M.min(1000,iw),h=M.max(3,M.round(ih*.25*w/iw)),sample=canvas(w,h),ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,ih*.74,iw,ih*.25,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h).data,g=new Float32Array(w*h);let brightness=0,clipped=0;for(let i=0;i<g.length;i++){g[i]=.299*pixels[i*4]+.587*pixels[i*4+1]+.114*pixels[i*4+2];brightness+=g[i];clipped+=g[i]>248;}let energy=0,count=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const at=y*w+x,v=4*g[at]-g[at-1]-g[at+1]-g[at-w]-g[at+w];energy+=v*v;count++;}return energy/M.max(1,count)*M.min(1,brightness/g.length/65)*M.max(.15,1-clipped/g.length);}
 return Object.freeze({detect,warp,prepare,homography,quality});
})();
