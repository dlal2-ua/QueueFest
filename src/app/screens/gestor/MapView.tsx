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
const TW = 40, TH = 20, OX = 230, OY = 60;
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

  // face-point on left face: sh=horizontal(0=left,1=right), sv=vertical(0=top,1=bottom)
  const fp=(sh:number,sv:number)=>{
    const top=lerp2(tW,tS,sh), bot=lerp2(bW,bS,sh);
    return lerp2(top,bot,sv);
  };

  // Awning (stripe above window)
  const a1=fp(0.08,0.12), a2=fp(0.78,0.12), a3=fp(0.78,0.28), a4=fp(0.08,0.28);
  // Serving window
  const w1=fp(0.12,0.30), w2=fp(0.70,0.30), w3=fp(0.70,0.62), w4=fp(0.12,0.62);
  // Chimney on top face
  const chBase=lerp2(lerp2(tN,tE,0.6),lerp2(tW,tS,0.6),0.3);
  const chOff={x:-tw*0.04,y:-5};
  const ch1={x:chBase.x+chOff.x,y:chBase.y+chOff.y};
  const ch2={x:chBase.x+chOff.x+tw*0.08,y:chBase.y+chOff.y+td*0.04};
  const ch3={x:chBase.x+chOff.x+tw*0.08,y:chBase.y+td*0.04};
  const ch4={x:chBase.x+chOff.x,y:chBase.y};
  // Wheel ellipses (below left face bottom corners)
  const wl={x:bW.x+tw*0.12, y:bW.y+2};
  const wr={x:bS.x-tw*0.15, y:bS.y+2};
  // Center of top face for text
  const cx=(tN.x+tE.x+tS.x+tW.x)/4, cy=(tN.y+tE.y+tS.y+tW.y)/4;

  return (
    <g onClick={onClick} style={{cursor:'pointer'}} className={isBusy?'glow':undefined}>
      {/* Body */}
      <polygon points={pts(tW,tS,bS,bW)} fill={c.l}/>
      <polygon points={pts(tS,tE,bE,bS)} fill={c.r}/>
      <polygon points={pts(tN,tE,tS,tW)} fill={c.t}
        stroke={isSel?'#fff':'rgba(0,0,0,0.15)'} strokeWidth={isSel?2.5:0.6}/>
      {/* Awning stripe */}
      <polygon points={pts(a1,a2,a3,a4)} fill={c.a} opacity={0.95}/>
      <polygon points={pts(a1,a2,a3,a4)} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5"/>
      {/* Serving window */}
      <polygon points={pts(w1,w2,w3,w4)} fill="#FFD080" opacity={0.9}/>
      <polygon points={pts(w1,w2,w3,w4)} fill="none" stroke="#8B6914" strokeWidth="0.7"/>
      {/* Window cross */}
      <line x1={lerp2(w1,w2,0.5).x} y1={lerp2(w1,w2,0.5).y}
            x2={lerp2(w4,w3,0.5).x} y2={lerp2(w4,w3,0.5).y}
            stroke="#8B6914" strokeWidth="0.5" opacity={0.6}/>
      {/* Chimney */}
      <polygon points={pts(ch1,ch2,ch3,ch4)} fill="#555" opacity={0.85}/>
      {/* Wheels */}
      <ellipse cx={wl.x} cy={wl.y} rx={tw*0.06} ry={TH*0.12} fill="#222" opacity={0.85}/>
      <ellipse cx={wr.x} cy={wr.y} rx={tw*0.06} ry={TH*0.12} fill="#222" opacity={0.85}/>
      {/* Name */}
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

  // Tent apex
  const topCx=(tN.x+tE.x+tS.x+tW.x)/4, topCy=(tN.y+tE.y+tS.y+tW.y)/4;
  const peakH=Math.max(10, hp*0.5);
  const apex={x:topCx, y:topCy-peakH};

  // Left face point helper
  const fp=(sh:number,sv:number)=>{
    const top=lerp2(tW,tS,sh), bot=lerp2(bW,bS,sh);
    return lerp2(top,bot,sv);
  };

  // Entrance arch on left face
  const e1=fp(0.15,0.42), e2=fp(0.52,0.42), e3=fp(0.52,1.0), e4=fp(0.15,1.0);
  // Bar counter (darker strip at bottom of right face)
  const rfp=(sh:number,sv:number)=>{
    const top=lerp2(tS,tE,sh), bot=lerp2(bS,bE,sh);
    return lerp2(top,bot,sv);
  };
  const cnt1=rfp(0,0.6), cnt2=rfp(1,0.6), cnt3=rfp(1,0.78), cnt4=rfp(0,0.78);

  // String lights along tent bottom edges (tW→tS and tS→tE)
  const lightsL=Array.from({length:5},(_,i)=>lerp2(tW,tS,i/4));
  const lightsR=Array.from({length:4},(_,i)=>lerp2(tS,tE,(i+1)/4));

  const cx=(tN.x+tE.x+tS.x+tW.x)/4, cy=(tN.y+tE.y+tS.y+tW.y)/4;

  return (
    <g onClick={onClick} style={{cursor:'pointer'}} className={isBusy?'glow':undefined}>
      {/* Body */}
      <polygon points={pts(tW,tS,bS,bW)} fill={c.l}/>
      <polygon points={pts(tS,tE,bE,bS)} fill={c.r}/>
      {/* Bar counter strip */}
      <polygon points={pts(cnt1,cnt2,cnt3,cnt4)} fill={c.a} opacity={0.7}/>
      {/* Top face (floor of tent) */}
      <polygon points={pts(tN,tE,tS,tW)} fill={c.t}
        stroke={isSel?'#fff':'rgba(0,0,0,0.15)'} strokeWidth={isSel?2.5:0.6}/>
      {/* Tent roof — front-left slope */}
      <polygon points={pts(apex,tW,tS)} fill={c.l} opacity={0.82}/>
      {/* Tent roof — front-right slope */}
      <polygon points={pts(apex,tS,tE)} fill={c.r} opacity={0.82}/>
      {/* Tent roof — back slopes (partially visible) */}
      <polygon points={pts(apex,tN,tW)} fill={c.t} opacity={0.7}/>
      <polygon points={pts(apex,tE,tN)} fill={c.t} opacity={0.6}/>
      {/* Tent edges */}
      <line x1={apex.x} y1={apex.y} x2={tW.x} y2={tW.y} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"/>
      <line x1={apex.x} y1={apex.y} x2={tS.x} y2={tS.y} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"/>
      <line x1={apex.x} y1={apex.y} x2={tE.x} y2={tE.y} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8"/>
      {/* Entrance dark area */}
      <polygon points={pts(e1,e2,e3,e4)} fill="rgba(0,0,0,0.55)"/>
      {/* String lights */}
      {[...lightsL,...lightsR].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="#FFD700" opacity={0.9}/>
      ))}
      {/* Name */}
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
  const angles=[0,55,110,165,220,280,335];
  const leaves=angles.map(a=>`<ellipse cx="${cx}" cy="${cy-34*s}" rx="${16*s}" ry="${5*s}" fill="#2D8B4E" opacity="0.88" transform="rotate(${a} ${cx} ${cy-34*s})"/>`).join('');
  return `<g class="palm"><rect x="${cx-2.5*s}" y="${cy-34*s}" width="${5*s}" height="${34*s}" fill="#8B6914" rx="2" transform="rotate(-4 ${cx} ${cy})"/>${leaves}<circle cx="${cx+2.5*s}" cy="${cy-31*s}" r="${2.8*s}" fill="#6B4226"/></g>`;
}

export function MapView({ festivalId, navigate }: Props) {
  const [puestos,setPuestos]   = useState<PuestoMapa[]>([]);
  const [loading,setLoading]   = useState(true);
  const [selected,setSelected] = useState<PuestoMapa|null>(null);
  const [tf,setTf]             = useState({x:0,y:0,scale:0.7});
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
  const palms=[iso(-1.5,1),iso(-1.5,4),iso(-1.5,7),iso(2,-2),iso(8,-2.2),iso(14,-2),iso(17.5,1),iso(17.5,4),iso(17.5,7),iso(5,11),iso(11,11)];
  const SC=6.5, SR=-3.5; // stage col/row
  const entrIso=iso(8,11);

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
                   background:'linear-gradient(180deg,#5BA3D0 0%,#8CC4E8 40%,#C8E8F8 100%)'}}
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
            <svg viewBox="-60 -100 560 420" width="500" height="360" style={{overflow:'visible'}}
                 onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}>

              <defs>
                <style>{`
                  .palm{animation:sway 4s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom center}
                  @keyframes sway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
                  .lpulse{animation:lp 1.8s ease-in-out infinite alternate}
                  @keyframes lp{0%{opacity:0.4}100%{opacity:1}}
                  .glow{filter:drop-shadow(0 0 6px rgba(232,83,74,0.7));animation:gb 2s ease-in-out infinite alternate}
                  @keyframes gb{0%{filter:drop-shadow(0 0 3px rgba(232,83,74,0.4))}100%{filter:drop-shadow(0 0 12px rgba(232,83,74,0.9))}}
                `}</style>
              </defs>

              {/* ── Ground island (organic polygon) ───────────────── */}
              {(()=>{
                const corners=[
                  iso(-1,4), iso(1,-1.5), iso(7,-2.5), iso(13,-2), iso(18.5,-0.5),
                  iso(18.5,6), iso(17,12), iso(10,12.5), iso(4,12.5), iso(-1,11),
                  iso(-1.5,7),
                ];
                // Shadow below ground
                const shadow=corners.map(({x,y})=>({x,y:y+10}));
                return <>
                  <polygon points={shadow.map(p=>`${p.x},${p.y}`).join(' ')} fill="rgba(0,0,0,0.12)"/>
                  <polygon points={corners.map(p=>`${p.x},${p.y}`).join(' ')} fill="#C8A96E"/>
                  {/* Grass zones */}
                  <polygon points={[iso(-0.5,-0.5),iso(7,-0.5),iso(7,5.5),iso(-0.5,5.5)].map(p=>`${p.x},${p.y}`).join(' ')} fill="#6BBF40" opacity={0.8}/>
                  <polygon points={[iso(9.5,-0.5),iso(17.5,-0.5),iso(17.5,5.5),iso(9.5,5.5)].map(p=>`${p.x},${p.y}`).join(' ')} fill="#6BBF40" opacity={0.8}/>
                </>;
              })()}

              {/* ── Sandy paths ──────────────────────────────────── */}
              {(()=>{
                const h=ibox(7,0,2.5,12,0.15);
                return <><polygon points={h.left} fill="#B89050"/><polygon points={h.right} fill="#CCA860"/><polygon points={h.top} fill="#E0BF70"/></>;
              })()}
              {(()=>{
                const h=ibox(-0.5,5.5,18.5,1.5,0.15);
                return <><polygon points={h.left} fill="#B89050"/><polygon points={h.right} fill="#CCA860"/><polygon points={h.top} fill="#E0BF70"/></>;
              })()}
              {/* Path arrows */}
              {[2,5,8].map(r=>{
                const {x,y}=iso(8,r);
                return <polygon key={r} points={`${x},${y-8} ${x+6},${y} ${x-6},${y}`} fill="#FF6B35" opacity={0.55}/>;
              })}

              {/* ── Entrance plaza ────────────────────────────────── */}
              {(()=>{
                const h=ibox(5.5,10,6,2,0.18);
                return <><polygon points={h.left} fill="#C09858"/><polygon points={h.right} fill="#D4AE68"/><polygon points={h.top} fill="#ECC878"/></>;
              })()}

              {/* ── VIP platform ─────────────────────────────────── */}
              {(()=>{
                const step1=ibox(12.5,6.5,5.5,5,0.28);
                const step2=ibox(13,7,4.5,4,0.38);
                const tent=ibox(13.3,7.3,3.8,3.4,0.18);
                const {x:vx,y:vy}=iso(15.3,9);
                // Tent apex
                const tpN={x:tent.cx,y:tent.cy-tent.hp};
                const tpE={x:tent.cx+tent.tw/2+10,y:tent.cy-tent.hp/2};
                const tpS={x:tent.cx,y:tent.cy+10};
                const tpW={x:tent.cx-tent.tw/2-10,y:tent.cy-tent.hp/2};
                const ap={x:tent.cx,y:tent.cy-tent.hp-14};
                return <>
                  <polygon points={step1.left} fill="#6B5535"/><polygon points={step1.right} fill="#7B6545"/><polygon points={step1.top} fill="#8B7555"/>
                  <polygon points={step2.left} fill="#7B6545"/><polygon points={step2.right} fill="#8B7555"/><polygon points={step2.top} fill="#9B8565"/>
                  <polygon points={tent.left}  fill="#D8D0C8"/><polygon points={tent.right} fill="#C8C0B8"/><polygon points={tent.top}  fill="#F0EDE8"/>
                  <polygon points={pts({x:ap.x,y:ap.y},tpW,tpS)} fill="#E0DCd8" opacity={0.85}/>
                  <polygon points={pts({x:ap.x,y:ap.y},tpS,tpE)} fill="#D0CCC8" opacity={0.85}/>
                  {/* Rope barrier */}
                  {[0,1,2].map(i=>{
                    const px=iso(13+i*1.8,10.8);
                    const b=ibox(13+i*1.8-0.1,10.8-0.1,0.2,0.2,0.6);
                    return <g key={i}><polygon points={b.left} fill="#8B6914"/><polygon points={b.top} fill="#A67C28"/></g>;
                  })}
                  <rect x={vx-18} y={vy-28} width="36" height="14" rx="4" fill="#FFD700"/>
                  <text x={vx} y={vy-18} textAnchor="middle" fontSize="8" fontWeight="800" fill="#6B4A00">⭐ VIP</text>
                </>;
              })()}

              {/* ── Stage ────────────────────────────────────────── */}
              {(()=>{
                const sc=SC,sr=SR;
                const base=ibox(sc,sr,6,2.5,0.55);
                const wall=ibox(sc,sr+2.2,6,0.35,3.5);
                const roof=ibox(sc-0.5,sr+0.5,7,2.2,0.2);
                const stripe=ibox(sc-0.5,sr+2.4,7,0.35,0.15);
                const spkL=ibox(sc-0.7,sr+0.5,0.55,0.55,2.8);
                const spkR=ibox(sc+6.2,sr+0.5,0.55,0.55,2.8);
                // LED screen on back wall
                const lp=iso(sc+1,sr+2.5);
                const lp2=iso(sc+5,sr+2.5);
                const lsp=iso(sc+1,sr+3);
                const lsp2=iso(sc+5,sr+3);
                const {x:lx,y:ly}=iso(sc+3,sr+1.5);
                const lightCols=['#FF3232','#3232FF','#FFFF32','#32FF32','#FF32FF','#FF8800'];
                return <g>
                  <polygon points={base.left}  fill="#606060"/><polygon points={base.right} fill="#787878"/><polygon points={base.top} fill="#909090"/>
                  <polygon points={wall.left}  fill="#0E0E0E"/><polygon points={wall.right} fill="#181818"/><polygon points={wall.top}  fill="#222"/>
                  {/* LED screen */}
                  <polygon points={pts({x:lp.x+10,y:lp.y-25},{x:lp2.x-10,y:lp2.y-25},{x:lsp2.x-10,y:lsp2.y-25},{x:lsp.x+10,y:lsp.y-25})} fill="#0044CC" opacity={0.85}/>
                  <polygon points={pts({x:lp.x+10,y:lp.y-25},{x:lp2.x-10,y:lp2.y-25},{x:lsp2.x-10,y:lsp2.y-25},{x:lsp.x+10,y:lsp.y-25})} fill="none" stroke="#2266FF" strokeWidth="1"/>
                  {/* Screen scan lines */}
                  {[0,1,2,3].map(i=>{
                    const ty=(lp.y-25)+(lp.y-lsp.y+25)*i/4;
                    return <line key={i} x1={lp.x+10} y1={ty} x2={lp2.x-10} y2={ty+((lp2.y-lp.y)/4)} stroke="white" strokeWidth="0.4" opacity={0.3}/>;
                  })}
                  <polygon points={roof.left}  fill="#303030"/><polygon points={roof.right} fill="#3C3C3C"/><polygon points={roof.top}  fill="#484848"/>
                  {/* Roof truss lines */}
                  {[0.2,0.5,0.8].map((t,i)=>{
                    const p1=iso(sc-0.5+t*7,sr+0.5), p2=iso(sc-0.5+t*7,sr+2.7);
                    return <line key={i} x1={p1.x} y1={p1.y-roof.hp} x2={p2.x} y2={p2.y-roof.hp} stroke="#666" strokeWidth="1" opacity={0.7}/>;
                  })}
                  <polygon points={stripe.left} fill="#CC5520"/><polygon points={stripe.right} fill="#DD6630"/><polygon points={stripe.top} fill="#FF6B35"/>
                  <polygon points={spkL.left} fill="#0C0C0C"/><polygon points={spkL.right} fill="#141414"/><polygon points={spkL.top} fill="#1C1C1C"/>
                  <polygon points={spkR.left} fill="#0C0C0C"/><polygon points={spkR.right} fill="#141414"/><polygon points={spkR.top} fill="#1C1C1C"/>
                  {/* Stage lights hanging from roof */}
                  {[0.4,1.2,2.0,2.8,3.6,4.4,5.2].map((off,i)=>{
                    const lpos=iso(sc+off,sr+2.4);
                    return <g key={i} className="lpulse" style={{animationDelay:`${i*0.22}s`}}>
                      <line x1={lpos.x} y1={lpos.y-roof.hp+2} x2={lpos.x} y2={lpos.y-roof.hp+8} stroke="#888" strokeWidth="0.8"/>
                      <circle cx={lpos.x} cy={lpos.y-roof.hp+10} r="3.5" fill={lightCols[i%6]}/>
                    </g>;
                  })}
                  <text x={lx} y={ly-65} textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff"
                        style={{filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.9))'}}>🎵 ESCENARIO</text>
                </g>;
              })()}

              {/* ── Fence perimeter ───────────────────────────────── */}
              {[
                ...Array.from({length:18},(_,c)=>ibox(c,-0.55,1,0.12,0.6)),
                ...Array.from({length:18},(_,c)=>ibox(c,12.45,1,0.12,0.6)),
                ...Array.from({length:13},(_,r)=>ibox(-0.55,r,0.12,1,0.6)),
                ...Array.from({length:13},(_,r)=>ibox(17.45,r,0.12,1,0.6)),
              ].map((b,i)=>(
                <g key={`f${i}`}><polygon points={b.left} fill="#3E1A08"/><polygon points={b.right} fill="#4E2810"/><polygon points={b.top} fill="#603620"/></g>
              ))}

              {/* ── Zone label signs ──────────────────────────────── */}
              {(()=>{
                const foodP=iso(2,-1.2);
                const barP=iso(13,-1.2);
                return <>
                  <rect x={foodP.x-22} y={foodP.y-14} width="44" height="14" rx="6" fill="#FF6B35" opacity={0.88}/>
                  <text x={foodP.x} y={foodP.y-4} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">🍕 FOOD ZONE</text>
                  <rect x={barP.x-20} y={barP.y-14} width="40" height="14" rx="6" fill="#A67C52" opacity={0.88}/>
                  <text x={barP.x} y={barP.y-4} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">🍺 BAR ZONE</text>
                </>;
              })()}

              {/* ── Floating service icons ────────────────────────── */}
              {[
                {p:iso(8.5,5.5), icon:'🚻', bg:'#0066CC'},
                {p:iso(6.5,10),  icon:'ℹ',  bg:'#0066CC'},
                {p:iso(10,10),   icon:'🩺',  bg:'#CC0000'},
              ].map(({p,icon,bg},i)=>(
                <g key={i}>
                  <circle cx={p.x} cy={p.y-12} r="9" fill={bg} opacity={0.9}/>
                  <text x={p.x} y={p.y-8} textAnchor="middle" fontSize="9">{icon}</text>
                </g>
              ))}

              {/* ── Decorations ──────────────────────────────────── */}
              {/* Kiosk */}
              {(()=>{
                const k=ibox(8,4.5,1,1,0.9), kr=ibox(7.7,4.2,1.6,1.6,0.15);
                return <><polygon points={k.left} fill="#C07020"/><polygon points={k.right} fill="#D08030"/><polygon points={k.top} fill="#EE9A40"/>
                  <polygon points={kr.left} fill="#CC4010"/><polygon points={kr.right} fill="#DD5020"/><polygon points={kr.top} fill="#FF6428"/></>;
              })()}
              {/* Trash bins */}
              {[[3.5,5],[8.5,5],[13.5,5]].map(([c,r],i)=>{
                const b=ibox(c,r,0.3,0.3,0.65);
                return <g key={i}><polygon points={b.left} fill="#222"/><polygon points={b.right} fill="#2E2E2E"/><polygon points={b.top} fill="#3A3A3A"/></g>;
              })}
              {/* Bushes */}
              {[[11.5,6.8],[11.5,8.2],[11.5,9.6],[11.5,11]].map(([c,r],i)=>{
                const b=ibox(c,r,0.65,0.65,0.6);
                return <g key={i}><polygon points={b.left} fill="#1A5818"/><polygon points={b.right} fill="#247022"/><polygon points={b.top} fill="#308830"/></g>;
              })}

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

              {/* ── Crowd near stage ──────────────────────────────── */}
              {Array.from({length:20},(_,i)=>{
                const cc=SC+0.5+(i%5)*0.9, cr=SR+3.2+Math.floor(i/5)*0.6;
                const {x,y}=iso(cc,cr);
                const hues=['#FF6464','#6464FF','#FFD064','#64FF96','#FF80CC'];
                return <ellipse key={i} cx={x} cy={y} rx={4} ry={2.5} fill={hues[i%5]} opacity={0.7}/>;
              })}

              {/* ── Palm trees ───────────────────────────────────── */}
              <g dangerouslySetInnerHTML={{__html:palms.map((p,i)=>palmSVG(p.x,p.y,0.75+i%3*0.07)).join('')}}/>

              {/* ── Entrance arch ─────────────────────────────────── */}
              {(()=>{
                const {x,y}=entrIso;
                return <g>
                  <rect x={x-28} y={y-46} width="10" height="46" fill="#A67C52" rx="2"/>
                  <rect x={x+18} y={y-46} width="10" height="46" fill="#A67C52" rx="2"/>
                  <path d={`M${x-28} ${y-46} Q${x} ${y-80} ${x+28} ${y-46}`} fill="none" stroke="#A67C52" strokeWidth="8"/>
                  <text x={x} y={y-50} textAnchor="middle" fontSize="8.5" fill="#FF6B35" fontWeight="800">FESTIVAL</text>
                  {['#FF6B35','#FFD700','#4CAF88','#FF6B35','#FFD700'].map((col,i)=>{
                    const fx=x-16+i*8;
                    return <polygon key={i} points={`${fx},${y-73} ${fx+5},${y-65} ${fx-5},${y-65}`} fill={col}/>;
                  })}
                </g>;
              })()}

              {/* ── Corridor label ────────────────────────────────── */}
              {(()=>{
                const p=iso(8.2,3);
                return <text x={p.x} y={p.y} textAnchor="middle" fontSize="7" fill="#8B6914" opacity={0.65}
                             transform={`rotate(-26,${p.x},${p.y})`} fontStyle="italic">Main Corridor</text>;
              })()}

            </svg>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          {[
            {lbl:<Plus className="w-4 h-4"/>,   fn:()=>setTf(t=>({...t,scale:clamp(t.scale*1.2,0.3,5)}))},
            {lbl:<Minus className="w-4 h-4"/>,  fn:()=>setTf(t=>({...t,scale:clamp(t.scale/1.2,0.3,5)}))},
            {lbl:<span className="text-[9px] font-bold">FIT</span>, fn:()=>setTf({x:0,y:0,scale:0.7})},
          ].map(({lbl,fn},i)=>(
            <button key={i} onClick={fn}
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border"
              style={{backgroundColor:'rgba(255,243,228,0.92)',borderColor:'#E8D5C0',color:'#A67C52'}}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
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
