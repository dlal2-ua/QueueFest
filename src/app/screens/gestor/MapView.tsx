import { useEffect, useState, useRef, useCallback } from 'react';
import { getMapaPuestos } from '../../api';
import { ChevronLeft, RefreshCw, Plus, Minus, X } from 'lucide-react';
import { formatWait } from '../../utils/formatTime';

interface PuestoMapa {
  id: number; nombre: string; tipo: 'barra' | 'foodtruck';
  abierto: boolean; pos_x: number | null; pos_y: number | null;
  pedidos_activos: number; espera_min: number; ingresos_hoy: number;
}
interface Props { festivalId: number; festivalNombre: string; navigate: (v: string) => void; }

/* ── Isometric constants ───────────────────────────────────────────── */
const TW = 40, TH = 20, OX = 230, OY = 80;
function iso(c: number, r: number) { return { x: OX+(c-r)*(TW/2), y: OY+(c+r)*(TH/2) }; }

/* Stand grid — 18×12 map, two zones with corridor gap */
const GRID: [number,number][] = [
  [0,0],[4,0],[0,3],[4,3],[2,1],
  [10,0],[14,0],[10,3],[14,3],[12,1],
];

/* ── Status / color helpers ────────────────────────────────────────── */
type Status = 'free'|'moderate'|'busy'|'closed';
function getStatus(p: PuestoMapa): Status {
  if (!p.abierto) return 'closed';
  if (p.pedidos_activos === 0) return 'free';
  if (p.pedidos_activos <= 10) return 'moderate';
  return 'busy';
}
function statusLabel(s: Status) {
  return s==='free'?'Libre':s==='moderate'?'Moderado':s==='busy'?'Saturado':'Cerrado';
}
function standH(p: PuestoMapa, maxO: number) {
  if (!p.abierto || p.pedidos_activos===0) return 0.4;
  return 0.6+(p.pedidos_activos/maxO)*1.6;
}

const COLORS: Record<Status,{t:string,l:string,r:string,a:string}> = {
  free:     {t:'#4FC78E',l:'#2A9E6A',r:'#38B47E',a:'#27AE60'},
  moderate: {t:'#FFAB00',l:'#C88200',r:'#E69600',a:'#D4A000'},
  busy:     {t:'#E8534A',l:'#B43230',r:'#D2403C',a:'#C0392B'},
  closed:   {t:'#9CA3AF',l:'#6B7280',r:'#808E9C',a:'#777'},
};

const clamp = (v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const lerp2 = (p1:{x:number,y:number},p2:{x:number,y:number},t:number)=>({x:p1.x+(p2.x-p1.x)*t,y:p1.y+(p2.y-p1.y)*t});
function pts(...ps:{x:number,y:number}[]){return ps.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');}

/* ── Food Truck illustration ───────────────────────────────────────── */
function FoodTruck({bx,by,tw,td,hp,c,name,isSel,isBusy,onClick}:{
  bx:number,by:number,tw:number,td:number,hp:number,
  c:{t:string,l:string,r:string,a:string},name:string,isSel:boolean,isBusy:boolean,onClick:()=>void
}) {
  const tN={x:bx+tw/2, y:by-hp};
  const tE={x:bx+tw,   y:by+td/2-hp};
  const tS={x:bx+tw/2, y:by+td-hp};
  const tW={x:bx,      y:by+td/2-hp};
  const bS={x:bx+tw/2, y:by+td};
  const bE={x:bx+tw,   y:by+td/2};
  const bW={x:bx,      y:by+td/2};
  const fp=(sh:number,sv:number)=>{
    const top=lerp2(tW,tS,sh), bot=lerp2(bW,bS,sh);
    return lerp2(top,bot,sv);
  };
  const a1=fp(0.08,0.10), a2=fp(0.82,0.10), a3=fp(0.82,0.26), a4=fp(0.08,0.26);
  const w1=fp(0.12,0.30), w2=fp(0.72,0.30), w3=fp(0.72,0.65), w4=fp(0.12,0.65);
  const chBase=lerp2(lerp2(tN,tE,0.6),lerp2(tW,tS,0.6),0.3);
  const chOff={x:-tw*0.04,y:-5};
  const ch1={x:chBase.x+chOff.x,y:chBase.y+chOff.y};
  const ch2={x:chBase.x+chOff.x+tw*0.08,y:chBase.y+chOff.y+td*0.04};
  const ch3={x:chBase.x+chOff.x+tw*0.08,y:chBase.y+td*0.04};
  const ch4={x:chBase.x+chOff.x,y:chBase.y};
  const wl={x:bW.x+tw*0.12, y:bW.y+2};
  const wr={x:bS.x-tw*0.15, y:bS.y+2};
  const cx=(tN.x+tE.x+tS.x+tW.x)/4, cy=(tN.y+tE.y+tS.y+tW.y)/4;
  return (
    <g onClick={onClick} style={{cursor:'pointer'}} className={isBusy?'glow':undefined}>
      <polygon points={pts(tW,tS,bS,bW)} fill={c.l}/>
      <polygon points={pts(tS,tE,bE,bS)} fill={c.r}/>
      <polygon points={pts(tN,tE,tS,tW)} fill={c.t}
        stroke={isSel?'#fff':'rgba(0,0,0,0.15)'} strokeWidth={isSel?2.5:0.6}/>
      <polygon points={pts(a1,a2,a3,a4)} fill={c.a} opacity={0.95}/>
      <polygon points={pts(a1,a2,a3,a4)} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5"/>
      <polygon points={pts(w1,w2,w3,w4)} fill="#FFD080" opacity={0.92}/>
      <polygon points={pts(w1,w2,w3,w4)} fill="none" stroke="#8B6914" strokeWidth="0.7"/>
      <line x1={lerp2(w1,w2,0.5).x} y1={lerp2(w1,w2,0.5).y}
            x2={lerp2(w4,w3,0.5).x} y2={lerp2(w4,w3,0.5).y}
            stroke="#8B6914" strokeWidth="0.5" opacity={0.6}/>
      <polygon points={pts(ch1,ch2,ch3,ch4)} fill="#555" opacity={0.85}/>
      <ellipse cx={wl.x} cy={wl.y} rx={tw*0.06} ry={TH*0.12} fill="#222" opacity={0.85}/>
      <ellipse cx={wr.x} cy={wr.y} rx={tw*0.06} ry={TH*0.12} fill="#222" opacity={0.85}/>
      <text x={cx} y={cy+1.5} textAnchor="middle" fill="rgba(255,255,255,0.97)"
            fontSize="6.5" fontWeight="800" style={{pointerEvents:'none',
            filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.6))'}}>
        {name.length>9?name.slice(0,8)+'…':name}
      </text>
    </g>
  );
}

/* ── Bar/Tent illustration ─────────────────────────────────────────── */
function BarTent({bx,by,tw,td,hp,c,name,isSel,isBusy,onClick}:{
  bx:number,by:number,tw:number,td:number,hp:number,
  c:{t:string,l:string,r:string,a:string},name:string,isSel:boolean,isBusy:boolean,onClick:()=>void
}) {
  const tN={x:bx+tw/2, y:by-hp};
  const tE={x:bx+tw,   y:by+td/2-hp};
  const tS={x:bx+tw/2, y:by+td-hp};
  const tW={x:bx,      y:by+td/2-hp};
  const bS={x:bx+tw/2, y:by+td};
  const bE={x:bx+tw,   y:by+td/2};
  const bW={x:bx,      y:by+td/2};
  const topCx=(tN.x+tE.x+tS.x+tW.x)/4, topCy=(tN.y+tE.y+tS.y+tW.y)/4;
  const peakH=Math.max(10, hp*0.5);
  const apex={x:topCx, y:topCy-peakH};
  const fp=(sh:number,sv:number)=>{
    const top=lerp2(tW,tS,sh), bot=lerp2(bW,bS,sh);
    return lerp2(top,bot,sv);
  };
  const rfp=(sh:number,sv:number)=>{
    const top=lerp2(tS,tE,sh), bot=lerp2(bS,bE,sh);
    return lerp2(top,bot,sv);
  };
  const e1=fp(0.15,0.42), e2=fp(0.52,0.42), e3=fp(0.52,1.0), e4=fp(0.15,1.0);
  const cnt1=rfp(0,0.6), cnt2=rfp(1,0.6), cnt3=rfp(1,0.78), cnt4=rfp(0,0.78);
  const lightsL=Array.from({length:5},(_,i)=>lerp2(tW,tS,i/4));
  const lightsR=Array.from({length:4},(_,i)=>lerp2(tS,tE,(i+1)/4));
  const cx=(tN.x+tE.x+tS.x+tW.x)/4, cy=(tN.y+tE.y+tS.y+tW.y)/4;
  return (
    <g onClick={onClick} style={{cursor:'pointer'}} className={isBusy?'glow':undefined}>
      <polygon points={pts(tW,tS,bS,bW)} fill={c.l}/>
      <polygon points={pts(tS,tE,bE,bS)} fill={c.r}/>
      <polygon points={pts(cnt1,cnt2,cnt3,cnt4)} fill={c.a} opacity={0.7}/>
      <polygon points={pts(tN,tE,tS,tW)} fill={c.t}
        stroke={isSel?'#fff':'rgba(0,0,0,0.15)'} strokeWidth={isSel?2.5:0.6}/>
      <polygon points={pts(apex,tW,tS)} fill={c.l} opacity={0.82}/>
      <polygon points={pts(apex,tS,tE)} fill={c.r} opacity={0.82}/>
      <polygon points={pts(apex,tN,tW)} fill={c.t} opacity={0.7}/>
      <polygon points={pts(apex,tE,tN)} fill={c.t} opacity={0.6}/>
      <line x1={apex.x} y1={apex.y} x2={tW.x} y2={tW.y} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"/>
      <line x1={apex.x} y1={apex.y} x2={tS.x} y2={tS.y} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"/>
      <line x1={apex.x} y1={apex.y} x2={tE.x} y2={tE.y} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8"/>
      <polygon points={pts(e1,e2,e3,e4)} fill="rgba(0,0,0,0.55)"/>
      {[...lightsL,...lightsR].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={['#FFD700','#FF4444','#44BBFF','#FF44FF','#44FF88'][i%5]} opacity={0.92}/>
      ))}
      <text x={cx} y={cy+1.5} textAnchor="middle" fill="rgba(255,255,255,0.97)"
            fontSize="6.5" fontWeight="800" style={{pointerEvents:'none',
            filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.6))'}}>
        {name.length>9?name.slice(0,8)+'…':name}
      </text>
    </g>
  );
}

/* ── Palm tree ─────────────────────────────────────────────────────── */
function palmSVG(cx:number,cy:number,s=1){
  const angles=[0,52,105,158,212,265,318];
  const leaves=angles.map(a=>`<ellipse cx="${cx}" cy="${cy-34*s}" rx="${17*s}" ry="${5*s}" fill="#2D8B4E" opacity="0.9" transform="rotate(${a} ${cx} ${cy-34*s})"/>`).join('');
  return `<g class="palm"><rect x="${cx-2.5*s}" y="${cy-34*s}" width="${5*s}" height="${34*s}" fill="#8B6914" rx="2" transform="rotate(-4 ${cx} ${cy})"/>${leaves}<circle cx="${cx+3*s}" cy="${cy-30*s}" r="${3*s}" fill="#5B3210" opacity="0.9"/></g>`;
}

export function MapView({ festivalId, navigate }: Props) {
  const [puestos,setPuestos]   = useState<PuestoMapa[]>([]);
  const [loading,setLoading]   = useState(true);
  const [selected,setSelected] = useState<PuestoMapa|null>(null);
  const [tf,setTf]             = useState({x:0,y:0,scale:0.65});
  const dragRef  = useRef({active:false,sx:0,sy:0,tx:0,ty:0});
  const touchRef = useRef<{x:number,y:number}|null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const el=containerRef.current; if(!el) return;
    const h=(e:WheelEvent)=>{ e.preventDefault(); setTf(t=>({...t,scale:clamp(t.scale*(e.deltaY<0?1.1:0.92),0.3,5)})); };
    el.addEventListener('wheel',h,{passive:false}); return()=>el.removeEventListener('wheel',h);
  },[]);

  const load=useCallback(async()=>{
    setLoading(true);
    try{setPuestos(await getMapaPuestos(festivalId));}catch(e){console.error(e);}finally{setLoading(false);}
  },[festivalId]);

  useEffect(()=>{ load(); const iv=setInterval(load,30000); return()=>clearInterval(iv); },[load]);

  const onMD=(e:React.MouseEvent)=>{dragRef.current={active:true,sx:e.clientX,sy:e.clientY,tx:tf.x,ty:tf.y};};
  const onMM=(e:React.MouseEvent)=>{
    if(!dragRef.current.active)return;
    setTf(t=>({...t,x:dragRef.current.tx+(e.clientX-dragRef.current.sx),y:dragRef.current.ty+(e.clientY-dragRef.current.sy)}));
  };
  const onMU=()=>{dragRef.current.active=false;};
  const onTS=(e:React.TouchEvent)=>{if(e.touches.length===1)touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY};};
  const onTM=(e:React.TouchEvent)=>{
    if(e.touches.length===1&&touchRef.current){
      const dx=e.touches[0].clientX-touchRef.current.x, dy=e.touches[0].clientY-touchRef.current.y;
      touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
      setTf(t=>({...t,x:t.x+dx,y:t.y+dy}));
    }
  };

  const maxOrders=Math.max(...puestos.map(p=>p.pedidos_activos),1);
  const mapped=puestos.slice(0,10).map((p,i)=>({...p,gc:GRID[i][0],gr:GRID[i][1]}));
  const sorted=[...mapped].sort((a,b)=>(a.gc+a.gr)-(b.gc+b.gr));

  /* ── Decorative positions ─────────────────────────────────────── */
  const palms=[
    iso(-2,3),iso(-2,7),iso(2,-2.5),iso(6,-2.5),iso(11,-2.5),iso(16,-2.5),
    iso(19,2),iso(19,6),iso(5,11.5),iso(9,12),iso(13,11.5),
  ];
  const SC=5.5, SR=-4.5; // stage col/row — top center
  const entrIso=iso(8.5,13);

  /* ── isoBox for scene elements ───────────────────────────────── */
  function ibox(col:number,row:number,w:number,d:number,h:number){
    const {x,y}=iso(col,row);
    const tw=TW*w, td=TH*d, hp=h*TH;
    return {
      top:  pts({x:x+tw/2,y:y-hp},{x:x+tw,y:y+td/2-hp},{x:x+tw/2,y:y+td-hp},{x:x,y:y+td/2-hp}),
      left: pts({x:x,y:y+td/2-hp},{x:x+tw/2,y:y+td-hp},{x:x+tw/2,y:y+td},{x:x,y:y+td/2}),
      right:pts({x:x+tw/2,y:y+td-hp},{x:x+tw,y:y+td/2-hp},{x:x+tw,y:y+td/2},{x:x+tw/2,y:y+td}),
      cx:x+tw/2, cy:y+td/2-hp, x, y, tw, td, hp,
    };
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{backgroundColor:'#FDF6EE'}}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
           style={{backgroundColor:'#FFF3E4',borderBottom:'1px solid #E8D5C0'}}>
        <button onClick={()=>navigate('main')} className="flex items-center gap-1 hover:opacity-70">
          <ChevronLeft className="w-5 h-5" style={{color:'#A67C52'}}/>
          <span className="text-xs font-semibold" style={{color:'#A67C52'}}>Volver</span>
        </button>
        <h2 className="text-sm font-extrabold" style={{color:'#A67C52'}}>Mapa del Festival</h2>
        <button onClick={load} style={{color:'#A67C52'}} className="p-1.5 hover:opacity-70">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
        </button>
      </div>

      {/* Map */}
      <div ref={containerRef}
           className="flex-1 overflow-hidden relative select-none"
           style={{cursor:dragRef.current.active?'grabbing':'grab',
                   background:'linear-gradient(160deg,#4A8CC0 0%,#6BACD4 35%,#A8D4EC 70%,#C8E8F8 100%)'}}
           onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
           onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={()=>{touchRef.current=null;}}>

        {loading?(
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin"/>
          </div>
        ):(
          <div style={{transform:`translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`,
                       transformOrigin:'center center',width:'100%',height:'100%',
                       display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg viewBox="-100 -140 660 520" width="520" height="400" style={{overflow:'visible'}}
                 onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}>

              <defs>
                <style>{`
                  .palm{animation:sway 4s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom center}
                  @keyframes sway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
                  .lpulse{animation:lp 1.6s ease-in-out infinite alternate}
                  @keyframes lp{0%{opacity:0.35}100%{opacity:1}}
                  .glow{filter:drop-shadow(0 0 6px rgba(232,83,74,0.7));animation:gb 2s ease-in-out infinite alternate}
                  @keyframes gb{0%{filter:drop-shadow(0 0 3px rgba(232,83,74,0.4))}100%{filter:drop-shadow(0 0 12px rgba(232,83,74,0.9))}}
                  .flagwave{animation:fw 2.2s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:left center}
                  @keyframes fw{0%{transform:skewX(-5deg)}100%{transform:skewX(5deg)}}
                `}</style>
                <radialGradient id="gndGrad" cx="50%" cy="40%" r="65%">
                  <stop offset="0%" stopColor="#DFC48A"/>
                  <stop offset="70%" stopColor="#C8A96E"/>
                  <stop offset="100%" stopColor="#9A7845"/>
                </radialGradient>
                <radialGradient id="stageGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FF7B00" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#FF7B00" stopOpacity="0"/>
                </radialGradient>
              </defs>

              {/* ── Ground island — leaf/boat shape ──────────────── */}
              {(()=>{
                // Elongated leaf shape — narrow at both ends, wide in the middle
                const corners=[
                  iso(-2.5,6),   // left tip
                  iso(-1,0.5),
                  iso(0,-2),
                  iso(5,-4),
                  iso(10,-4.5),  // top center (wide)
                  iso(16,-3.5),
                  iso(19,0),
                  iso(19.5,6),   // right tip area
                  iso(17,12),
                  iso(12,13.5),
                  iso(8,14),     // bottom center
                  iso(4,13.5),
                  iso(0,12),
                  iso(-2,9),
                ];
                // Darker edge shadow
                const shadow=corners.map(({x,y})=>({x:x+4,y:y+8}));
                return <>
                  <polygon points={shadow.map(p=>`${p.x},${p.y}`).join(' ')} fill="rgba(0,0,0,0.18)"/>
                  {/* Base sandy ground */}
                  <polygon points={corners.map(p=>`${p.x},${p.y}`).join(' ')} fill="url(#gndGrad)"/>
                  {/* Dark sandy edges for depth */}
                  <polygon points={corners.map(p=>`${p.x},${p.y}`).join(' ')}
                           fill="none" stroke="#8B6830" strokeWidth="3" opacity={0.5}/>
                </>;
              })()}

              {/* ── Zone colored overlays ─────────────────────────── */}
              {(()=>{
                // FOOD zone (left) — dark navy blue
                const foodZone=[iso(-0.5,-1),iso(7,-1),iso(7,5.5),iso(-0.5,5.5)];
                // BAR zone (right) — dark navy blue
                const barZone=[iso(9.5,-1),iso(17.5,-1),iso(17.5,5.5),iso(9.5,5.5)];
                // STAGE zone (top center) — orange glow area
                const stageZone=[iso(3,-5),iso(13,-5),iso(13,-0.5),iso(3,-0.5)];
                // VIP zone (bottom right) — yellow/gold
                const vipZone=[iso(12,6.5),iso(18,6.5),iso(18,12.5),iso(12,12.5)];
                // CHILL zone (bottom left) — teal/purple
                const chillZone=[iso(-0.5,6.5),iso(7,6.5),iso(7,12.5),iso(-0.5,12.5)];

                const fmt=(pts:{x:number,y:number}[])=>pts.map(p=>`${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ');
                return <>
                  <polygon points={fmt(foodZone)}  fill="#1B3A6B" opacity={0.48}/>
                  <polygon points={fmt(barZone)}   fill="#1B3A6B" opacity={0.48}/>
                  <polygon points={fmt(stageZone)} fill="#C85A00" opacity={0.32}/>
                  <polygon points={fmt(vipZone)}   fill="#B8960A" opacity={0.42}/>
                  <polygon points={fmt(chillZone)} fill="#4B0082" opacity={0.22}/>
                  {/* Stage glow ellipse */}
                  <ellipse cx={iso(8.5,-2.5).x} cy={iso(8.5,-2.5).y+20} rx="160" ry="60" fill="url(#stageGlow)"/>
                </>;
              })()}

              {/* ── Sandy corridor (center) ───────────────────────── */}
              {(()=>{
                const h=ibox(7.2,-0.5,1.6,14,0.12);
                return <><polygon points={h.left} fill="#B89050" opacity={0.7}/><polygon points={h.right} fill="#CCA860" opacity={0.7}/><polygon points={h.top} fill="#DFB870" opacity={0.85}/></>;
              })()}
              {/* Horizontal corridor */}
              {(()=>{
                const h=ibox(-0.5,5.8,18,1.2,0.12);
                return <><polygon points={h.left} fill="#B89050" opacity={0.6}/><polygon points={h.right} fill="#CCA860" opacity={0.6}/><polygon points={h.top} fill="#DFB870" opacity={0.8}/></>;
              })()}
              {/* Dotted path center line */}
              {[0.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5,8.5,9.5,10.5,11.5].map(r=>{
                const {x,y}=iso(8,r);
                return <ellipse key={r} cx={x} cy={y} rx={3} ry={1.5} fill="rgba(255,255,255,0.35)"/>;
              })}
              {/* Direction arrows on corridor */}
              {[1.5,3.5,5.5].map(r=>{
                const {x,y}=iso(8,r);
                return <polygon key={r} points={`${x},${y-9} ${x+7},${y} ${x-7},${y}`} fill="#22CC44" opacity={0.7}/>;
              })}

              {/* ── Entrance plaza ────────────────────────────────── */}
              {(()=>{
                const h=ibox(5,11,7,3,0.15);
                return <><polygon points={h.left} fill="#B09050"/><polygon points={h.right} fill="#C4A460"/><polygon points={h.top} fill="#DEC070"/></>;
              })()}

              {/* ── Stage (ESCENARIO PRINCIPAL — orange) ─────────── */}
              {(()=>{
                const sc=SC, sr=SR;
                const base=ibox(sc,sr,7,3,0.6);
                const wall=ibox(sc,sr+2.5,7,0.4,4.5);
                const roof=ibox(sc-0.6,sr+0.5,8.2,2.8,0.25);
                const spkL=ibox(sc-0.8,sr+0.6,0.6,0.6,3.5);
                const spkR=ibox(sc+7.2,sr+0.6,0.6,0.6,3.5);
                const ledPos=iso(sc+1,sr+3), ledPos2=iso(sc+6,sr+3);
                const ledBot=iso(sc+1,sr+3.5), ledBot2=iso(sc+6,sr+3.5);
                const {x:lx,y:ly}=iso(sc+3.5,sr+1.8);
                const lightCols=['#FF2020','#2020FF','#FFFF20','#20FF60','#FF20FF','#FF8800','#20FFFF'];
                const orangeL='#AA4A00', orangeM='#CC5C00', orangeT='#FF6B00';
                const orangeRoof='#883800', orangeRoofT='#CC5500';
                return <g>
                  {/* Base platform */}
                  <polygon points={base.left}  fill="#505050"/><polygon points={base.right} fill="#686868"/><polygon points={base.top} fill="#808080"/>
                  {/* Back wall */}
                  <polygon points={wall.left}  fill="#0A0A0A"/><polygon points={wall.right} fill="#141414"/><polygon points={wall.top}  fill="#1E1E1E"/>
                  {/* LED screen — big bright display */}
                  <polygon points={pts({x:ledPos.x+12,y:ledPos.y-45},{x:ledPos2.x-12,y:ledPos2.y-45},{x:ledBot2.x-12,y:ledBot2.y-35},{x:ledBot.x+12,y:ledBot.y-35})} fill="#002288" opacity={0.9}/>
                  <polygon points={pts({x:ledPos.x+12,y:ledPos.y-45},{x:ledPos2.x-12,y:ledPos2.y-45},{x:ledBot2.x-12,y:ledBot2.y-35},{x:ledBot.x+12,y:ledBot.y-35})} fill="none" stroke="#4488FF" strokeWidth="1.5"/>
                  {/* Screen glow lines */}
                  {[0,1,2,3,4].map(i=>{
                    const ty=(ledPos.y-45)+(ledPos.y-ledBot.y+45)*i/5;
                    return <line key={i} x1={ledPos.x+12} y1={ty} x2={ledPos2.x-12} y2={ty+((ledPos2.y-ledPos.y)/5)} stroke="#6699FF" strokeWidth="0.5" opacity={0.4}/>;
                  })}
                  {/* Roof — orange color */}
                  <polygon points={roof.left}  fill={orangeRoof}/><polygon points={roof.right} fill={orangeL}/><polygon points={roof.top} fill={orangeRoofT}/>
                  {/* Roof truss lines */}
                  {[0.15,0.4,0.65,0.9].map((t,i)=>{
                    const p1=iso(sc-0.6+t*8.2,sr+0.5), p2=iso(sc-0.6+t*8.2,sr+3.3);
                    return <line key={i} x1={p1.x} y1={p1.y-roof.hp} x2={p2.x} y2={p2.y-roof.hp} stroke="#CC8844" strokeWidth="1.2" opacity={0.6}/>;
                  })}
                  {/* Orange stripe at base of roof */}
                  {(()=>{ const s=ibox(sc-0.6,sr+2.8,8.2,0.4,0.18); return <><polygon points={s.left} fill={orangeL}/><polygon points={s.right} fill={orangeM}/><polygon points={s.top} fill={orangeT}/></>; })()}
                  {/* Speaker towers */}
                  <polygon points={spkL.left} fill="#080808"/><polygon points={spkL.right} fill="#101010"/><polygon points={spkL.top} fill="#181818"/>
                  <polygon points={spkR.left} fill="#080808"/><polygon points={spkR.right} fill="#101010"/><polygon points={spkR.top} fill="#181818"/>
                  {/* Hanging colored lights */}
                  {[0.5,1.2,1.9,2.6,3.3,4.0,4.7,5.4,6.1].map((off,i)=>{
                    const lpos=iso(sc+off,sr+2.8);
                    return <g key={i} className="lpulse" style={{animationDelay:`${i*0.18}s`}}>
                      <line x1={lpos.x} y1={lpos.y-roof.hp+2} x2={lpos.x} y2={lpos.y-roof.hp+9} stroke="#999" strokeWidth="0.8"/>
                      <circle cx={lpos.x} cy={lpos.y-roof.hp+11} r="4" fill={lightCols[i%7]}/>
                    </g>;
                  })}
                  {/* Stage label */}
                  <rect x={lx-48} y={ly-88} width="96" height="18" rx="4" fill="#FF6B00" opacity={0.92}/>
                  <text x={lx} y={ly-75} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#fff"
                        style={{filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.8))'}}>🎵 ESCENARIO PRINCIPAL</text>
                </g>;
              })()}

              {/* ── Crowd near stage ──────────────────────────────── */}
              {Array.from({length:28},(_,i)=>{
                const cc=SC+0.3+(i%7)*0.9, cr=SR+3.6+Math.floor(i/7)*0.55;
                const {x,y}=iso(cc,cr);
                const hues=['#FF5555','#5566FF','#FFCC44','#44FF99','#FF55CC','#55DDFF','#FF8844'];
                return <ellipse key={i} cx={x} cy={y} rx={5} ry={2.8} fill={hues[i%7]} opacity={0.72}/>;
              })}

              {/* ── VIP area (gold/yellow) ────────────────────────── */}
              {(()=>{
                const step1=ibox(12.5,6.5,5.5,5.5,0.25);
                const step2=ibox(13,7,4.5,4.5,0.35);
                const tent=ibox(13.3,7.3,3.8,3.8,0.18);
                const {x:vx,y:vy}=iso(15.2,9.2);
                const tpE={x:tent.cx+tent.tw/2+10,y:tent.cy-tent.hp/2};
                const tpS={x:tent.cx,y:tent.cy+10};
                const tpW={x:tent.cx-tent.tw/2-10,y:tent.cy-tent.hp/2};
                const ap={x:tent.cx,y:tent.cy-tent.hp-18};
                return <>
                  <polygon points={step1.left} fill="#7A6225"/><polygon points={step1.right} fill="#8A7235"/><polygon points={step1.top} fill="#A89048"/>
                  <polygon points={step2.left} fill="#A08030"/><polygon points={step2.right} fill="#B09040"/><polygon points={step2.top} fill="#D4B050"/>
                  <polygon points={tent.left}  fill="#C8B040"/><polygon points={tent.right} fill="#D8C050"/><polygon points={tent.top}  fill="#F0D860"/>
                  {/* Tent peak */}
                  <polygon points={pts(ap,tpW,tpS)} fill="#D4BC44" opacity={0.88}/>
                  <polygon points={pts(ap,tpS,tpE)} fill="#C4AC34" opacity={0.88}/>
                  {/* Gold rope posts */}
                  {[0,1,2,3].map(i=>{
                    const b=ibox(13+i*1.5,10.5,0.15,0.15,0.7);
                    return <g key={i}><polygon points={b.left} fill="#8B6914"/><polygon points={b.top} fill="#D4A820"/></g>;
                  })}
                  {/* Gold rope lines */}
                  <line x1={iso(13,10.5).x} y1={iso(13,10.5).y} x2={iso(17.5,10.5).x} y2={iso(17.5,10.5).y} stroke="#D4A820" strokeWidth="1.2" opacity={0.8}/>
                  {/* VIP badge */}
                  <rect x={vx-24} y={vy-36} width="48" height="18" rx="5" fill="#FFD700"/>
                  <rect x={vx-24} y={vy-36} width="48" height="18" rx="5" fill="none" stroke="#AA8800" strokeWidth="1"/>
                  <text x={vx} y={vy-23} textAnchor="middle" fontSize="9" fontWeight="900" fill="#5A4000">⭐ VIP</text>
                </>;
              })()}

              {/* ── Chill zone / Picnic (bottom left) ────────────── */}
              {(()=>{
                // Striped circus tent
                const tent=ibox(1,8.5,3.5,3.5,1.2);
                const topCx=tent.cx, topCy=tent.cy-tent.hp;
                const apex={x:topCx,y:topCy-22};
                const tN={x:topCx,y:topCy};
                const tE={x:topCx+tent.tw/2,y:topCy+tent.td/2};
                const tS={x:topCx,y:topCy+tent.td};
                const tW={x:topCx-tent.tw/2,y:topCy+tent.td/2};
                const {x:tx,y:ty}=iso(2.5,10);
                return <>
                  <polygon points={tent.left}  fill="#CC1111"/><polygon points={tent.right} fill="#EE2222"/><polygon points={tent.top}  fill="#FFFFFF" opacity={0.6}/>
                  {/* Red-white striped roof */}
                  <polygon points={pts(apex,tW,tS)} fill="#DD1111" opacity={0.9}/>
                  <polygon points={pts(apex,tS,tE)} fill="#EE3333" opacity={0.9}/>
                  <polygon points={pts(apex,tN,tW)} fill="#FF5555" opacity={0.75}/>
                  <polygon points={pts(apex,tE,tN)} fill="#FF4444" opacity={0.6}/>
                  {/* White stripes on left face */}
                  {[0.2,0.5,0.8].map((t,i)=>{
                    const p1=lerp2({x:apex.x,y:apex.y},{x:tW.x,y:tW.y},t);
                    const p2=lerp2({x:apex.x,y:apex.y},{x:tS.x,y:tS.y},t);
                    return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="2.5" opacity={0.5}/>;
                  })}
                  <rect x={tx-20} y={ty-22} width="40" height="12" rx="3" fill="#8B0000" opacity={0.85}/>
                  <text x={tx} y={ty-12} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">PICNIC</text>
                </>;
              })()}

              {/* ── Service kiosk on corridor ─────────────────────── */}
              {(()=>{
                const k=ibox(7.8,4.2,1.2,1.2,1.0);
                const kr=ibox(7.55,3.95,1.7,1.7,0.18);
                return <><polygon points={k.left} fill="#C07020"/><polygon points={k.right} fill="#D08030"/><polygon points={k.top} fill="#F09A40"/>
                  <polygon points={kr.left} fill="#AA3800"/><polygon points={kr.right} fill="#CC4800"/><polygon points={kr.top} fill="#FF5A14"/></>;
              })()}

              {/* ── Trash bins ────────────────────────────────────── */}
              {[[3.5,5.5],[8.5,5.5],[13.5,5.5]].map(([c,r],i)=>{
                const b=ibox(c,r,0.35,0.35,0.7);
                return <g key={i}><polygon points={b.left} fill="#1A5E1A"/><polygon points={b.right} fill="#227722"/><polygon points={b.top} fill="#2E8B2E"/></g>;
              })}

              {/* ── Bushes / planters ─────────────────────────────── */}
              {[[11,6.5],[11,8],[11,9.5],[11,11],[5.5,6.5],[5.5,8]].map(([c,r],i)=>{
                const b=ibox(c,r,0.7,0.7,0.6);
                const greens=['#1A6A18','#246B22','#1E7A1A'];
                const g=greens[i%3];
                return <g key={i}><polygon points={b.left} fill={g}/><polygon points={b.right} fill={g} opacity={0.85}/><polygon points={b.top} fill="#3AAA38"/></g>;
              })}

              {/* ── Fence perimeter ───────────────────────────────── */}
              {[
                ...Array.from({length:18},(_,c)=>ibox(c,-0.7,1,0.12,0.7)),
                ...Array.from({length:18},(_,c)=>ibox(c,13.58,1,0.12,0.7)),
                ...Array.from({length:15},(_,r)=>ibox(-0.7,r,0.12,1,0.7)),
                ...Array.from({length:15},(_,r)=>ibox(18.58,r,0.12,1,0.7)),
              ].map((b,i)=>(
                <g key={`f${i}`}><polygon points={b.left} fill="#3E1A08"/><polygon points={b.right} fill="#4E2810"/><polygon points={b.top} fill="#5E3820"/></g>
              ))}

              {/* ── Stands — sorted back→front ───────────────────── */}
              {sorted.map(p=>{
                const st=getStatus(p);
                const c=COLORS[st];
                const h=standH(p,maxOrders);
                const {x,y}=iso(p.gc,p.gr);
                const w=2.2, d=2.2;
                const tw=TW*w, td=TH*d, hp=h*TH;
                const isSel=selected?.id===p.id;
                const isBusy=st==='busy';
                const name=p.nombre;
                const props={bx:x,by:y,tw,td,hp,c,name,isSel,isBusy,onClick:()=>setSelected(isSel?null:p)};
                return p.tipo==='foodtruck'
                  ? <FoodTruck key={p.id} {...props}/>
                  : <BarTent   key={p.id} {...props}/>;
              })}

              {/* ── Zone label signs ──────────────────────────────── */}
              {(()=>{
                const foodP=iso(2,-2.2), barP=iso(13.5,-2.2), vipP=iso(15.5,7.2), chillP=iso(2.5,8.5);
                const stageP=iso(8.5,-5);
                return <>
                  {/* FOOD ZONE */}
                  <rect x={foodP.x-28} y={foodP.y-16} width="56" height="16" rx="6" fill="#1B3A6B" opacity={0.92}/>
                  <text x={foodP.x} y={foodP.y-5} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">🍕 FOOD ZONE</text>
                  {/* BAR ZONE */}
                  <rect x={barP.x-26} y={barP.y-16} width="52" height="16" rx="6" fill="#1B3A6B" opacity={0.92}/>
                  <text x={barP.x} y={barP.y-5} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">🍺 BAR ZONE</text>
                  {/* VIP */}
                  <rect x={vipP.x-24} y={vipP.y-16} width="48" height="16" rx="6" fill="#8B6914" opacity={0.88}/>
                  <text x={vipP.x} y={vipP.y-5} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#FFE66D">VIP'S AREA</text>
                  {/* CHILL */}
                  <rect x={chillP.x-26} y={chillP.y-16} width="52" height="16" rx="6" fill="#5B008E" opacity={0.82}/>
                  <text x={chillP.x} y={chillP.y-5} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">🎪 CHILL ZONE</text>
                  {/* Stage - above fence */}
                  <rect x={stageP.x-44} y={stageP.y-16} width="88" height="16" rx="6" fill="#CC5500" opacity={0.92}/>
                  <text x={stageP.x} y={stageP.y-5} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">🎵 ESCENARIOS / STAGES</text>
                </>;
              })()}

              {/* ── Floating service icons ────────────────────────── */}
              {[
                {p:iso(8,5.8),   icon:'🚻', bg:'#0055CC', lbl:'WC'},
                {p:iso(3.5,6.2), icon:'🚻', bg:'#0055CC', lbl:'WC'},
                {p:iso(13.5,6.2),icon:'🚻', bg:'#0055CC', lbl:'WC'},
                {p:iso(6,10.5),  icon:'ℹ',  bg:'#0077AA', lbl:'INFO'},
                {p:iso(10,10.5), icon:'🩺',  bg:'#CC0000', lbl:''},
                {p:iso(15.5,5.5),icon:'💳',  bg:'#6600CC', lbl:'CASHLESS'},
              ].map(({p,icon,bg,lbl},i)=>(
                <g key={i}>
                  <circle cx={p.x} cy={p.y-14} r="10" fill={bg} opacity={0.92}/>
                  <text x={p.x} y={p.y-10} textAnchor="middle" fontSize="10">{icon}</text>
                  {lbl&&<text x={p.x} y={p.y-1} textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#fff">{lbl}</text>}
                </g>
              ))}

              {/* ── Palm trees ───────────────────────────────────── */}
              <g dangerouslySetInnerHTML={{__html:palms.map((p,i)=>palmSVG(p.x,p.y,0.72+i%3*0.08)).join('')}}/>

              {/* ── Entrance arch (bottom center) ────────────────── */}
              {(()=>{
                const {x,y}=entrIso;
                return <g>
                  {/* Arch pillars */}
                  <rect x={x-35} y={y-56} width="12" height="56" fill="#6B4A20" rx="3"/>
                  <rect x={x+23} y={y-56} width="12" height="56" fill="#6B4A20" rx="3"/>
                  {/* Arch curve */}
                  <path d={`M${x-35} ${y-56} Q${x} ${y-100} ${x+35} ${y-56}`} fill="none" stroke="#6B4A20" strokeWidth="10"/>
                  {/* Festival name banner */}
                  <rect x={x-40} y={y-78} width="80" height="20" rx="4" fill="#FF6B00" opacity={0.95}/>
                  <text x={x} y={y-63} textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">FESTIVAL</text>
                  {/* Colorful flags */}
                  {['#FF4444','#FFD700','#44CC44','#4488FF','#FF44CC','#44FFEE'].map((col,i)=>{
                    const fx=x-25+i*10;
                    return <g key={i} className="flagwave">
                      <line x1={fx} y1={y-95} x2={fx} y2={y-70} stroke="#666" strokeWidth="0.8"/>
                      <polygon points={`${fx},${y-95} ${fx+9},${y-88} ${fx},${y-81}`} fill={col}/>
                    </g>;
                  })}
                  {/* GENERAL ENTRANCE label */}
                  <rect x={x-38} y={y-58} width="76" height="14" rx="3" fill="#22AA44" opacity={0.88}/>
                  <text x={x} y={y-47} textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff">ENTRADA GENERAL</text>
                  {/* Green exit arrows */}
                  {[-1,0,1].map(i=>{
                    const ax=x+i*14, ay=y+4;
                    return <polygon key={i} points={`${ax},${ay-10} ${ax+7},${ay} ${ax-7},${ay}`} fill="#22CC44" opacity={0.8}/>;
                  })}
                </g>;
              })()}

              {/* ── Exit arrows at perimeter ──────────────────────── */}
              {[iso(-2,6), iso(19.5,6)].map(({x,y},i)=>(
                <g key={i}>
                  <circle cx={x} cy={y} r="11" fill="#22AA44" opacity={0.88}/>
                  <text x={x} y={y+4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">{i===0?'←EXIT→'[0]:'EXIT'}</text>
                </g>
              ))}

              {/* ── Meeting point ─────────────────────────────────── */}
              {(()=>{
                const mp=iso(8,7);
                return <g>
                  <circle cx={mp.x} cy={mp.y-14} r="10" fill="#1144AA" opacity={0.9}/>
                  <text x={mp.x} y={mp.y-10} textAnchor="middle" fontSize="11">👣</text>
                  <text x={mp.x} y={mp.y} textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#1144AA" opacity={0.8}>MEETING POINT</text>
                </g>;
              })()}

              {/* ── Corridor label ────────────────────────────────── */}
              {(()=>{
                const p=iso(8.2,3);
                return <text x={p.x} y={p.y+2} textAnchor="middle" fontSize="6.5" fill="#8B6914" opacity={0.6}
                             transform={`rotate(-27,${p.x},${p.y})`} fontStyle="italic" fontWeight="600">Main Corridor</text>;
              })()}

            </svg>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          {[
            {lbl:<Plus className="w-4 h-4"/>,   fn:()=>setTf(t=>({...t,scale:clamp(t.scale*1.2,0.3,5)}))},
            {lbl:<Minus className="w-4 h-4"/>,  fn:()=>setTf(t=>({...t,scale:clamp(t.scale/1.2,0.3,5)}))},
            {lbl:<span className="text-[9px] font-bold">FIT</span>, fn:()=>setTf({x:0,y:0,scale:0.65})},
          ].map(({lbl,fn},i)=>(
            <button key={i} onClick={fn}
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border"
              style={{backgroundColor:'rgba(255,243,228,0.92)',borderColor:'#E8D5C0',color:'#A67C52'}}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Legend — zone colors */}
        <div className="absolute top-2 left-2 rounded-xl p-2 flex flex-col gap-1"
             style={{backgroundColor:'rgba(255,243,228,0.92)',border:'1px solid #E8D5C0',fontSize:'9px',minWidth:'90px'}}>
          {[
            {col:'#FF6B00',lbl:'Escenario'},
            {col:'#1B3A6B',lbl:'Comida / Bar'},
            {col:'#B8960A',lbl:'VIP'},
            {col:'#5B008E',lbl:'Chill'},
          ].map(({col,lbl})=>(
            <span key={lbl} className="flex items-center gap-1.5 font-semibold" style={{color:'#4A3020'}}>
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{backgroundColor:col}}/>
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Stand legend */}
      <div className="flex-shrink-0 flex items-center justify-around py-2 border-t"
           style={{backgroundColor:'#FFF3E4',borderColor:'#E8D5C0'}}>
        <span className="text-[10px] font-semibold flex items-center gap-1" style={{color:'#8B6650'}}>
          🍕 <em>Food truck</em>
        </span>
        {([['#4FC78E','Libre'],['#FFAB00','Moderado'],['#E8534A','Saturado']] as [string,string][]).map(([col,lbl])=>(
          <span key={lbl} className="flex items-center gap-1 text-[10px] font-semibold" style={{color:'#8B6650'}}>
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{backgroundColor:col}}/>
            {lbl}
          </span>
        ))}
        <span className="text-[10px] font-semibold flex items-center gap-1" style={{color:'#8B6650'}}>
          🍺 <em>Barra</em>
        </span>
      </div>

      {/* Popup */}
      {selected&&(
        <div className="flex-shrink-0 border-t px-4 py-3"
             style={{backgroundColor:'#FFF3E4',borderColor:'#E8D5C0'}}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2" style={{color:'#2C1810'}}>
                {selected.tipo==='foodtruck'?'🍕':'🍺'} {selected.nombre}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{backgroundColor:selected.abierto?'#D1FAE5':'#FEE2E2',color:selected.abierto?'#065F46':'#991B1B'}}>
                  {selected.abierto?'Abierto':'Cerrado'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{backgroundColor:COLORS[getStatus(selected)].t+'33',color:COLORS[getStatus(selected)].l}}>
                  {statusLabel(getStatus(selected))}
                </span>
              </div>
            </div>
            <button onClick={()=>setSelected(null)} style={{color:'#A67C52'}}><X className="w-4 h-4"/></button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              {label:'Pedidos activos', value:selected.pedidos_activos},
              {label:'Espera media',    value:formatWait(selected.espera_min,selected.pedidos_activos>0)},
              {label:'Ingresos',        value:`${Number(selected.ingresos_hoy).toFixed(0)}€`},
            ].map(({label,value})=>(
              <div key={label} className="rounded-xl p-2 text-center border"
                   style={{backgroundColor:'#FDF6EE',borderColor:'#E8D5C0'}}>
                <p className="text-sm font-extrabold" style={{color:'#A67C52'}}>{value}</p>
                <p className="text-[9px]" style={{color:'#8B6650'}}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={()=>{setSelected(null);navigate('stands');}}
            className="w-full text-center text-xs font-bold py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{backgroundColor:'#A67C52',color:'#fff'}}>
            Ver detalle completo →
          </button>
        </div>
      )}
    </div>
  );
}
