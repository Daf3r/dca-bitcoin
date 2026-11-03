(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var nfUSD=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
function usd(n){return nfUSD.format(n)}
function usdK(n){return '$'+Math.round(n).toLocaleString('en-US')}
function tickK(v){return v>=1000?'$'+(v/1000).toLocaleString('en-US',{maximumFractionDigits:1})+'k':'$'+Math.round(v)}
function btcFmt(n){return n.toFixed(8)}
function sats(n){return Math.round(n*1e8).toLocaleString('en-US')}
function sgn(n,s){return (n>0?'+':n<0?'−':'')+s}
function pad2(n){return String(n).padStart(2,'0')}
function iso(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function dateOf(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function startOfToday(){var n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime()}
var dfFull=new Intl.DateTimeFormat('es-SV',{day:'numeric',month:'short',year:'numeric'});
var dfShort=new Intl.DateTimeFormat('es-SV',{day:'numeric',month:'short'});
var dfMonth=new Intl.DateTimeFormat('es-SV',{month:'short',year:'numeric'});
var dfTime=new Intl.DateTimeFormat('es-SV',{hour:'numeric',minute:'2-digit'});
function fmtDate(s){var d=dateOf(s);return isNaN(d)?String(s):dfFull.format(d)}

function parseNum(str){
  var s=String(str||'').replace(/[^0-9.,]/g,'');
  if(!s) return null;
  if(s.indexOf('.')>-1){ s=s.replace(/,/g,''); }
  else if((s.match(/,/g)||[]).length===1 && /,\d{1,2}$/.test(s)){ s=s.replace(',','.'); }
  else { s=s.replace(/,/g,''); }
  var n=parseFloat(s);
  return isFinite(n)?n:null;
}
function parseSats(str){var s=String(str||'').replace(/[\s,._']/g,'');return /^\d{1,13}$/.test(s)&&+s>0?parseInt(s,10):null}
function fmtInput(n){return n.toLocaleString('en-US',{maximumFractionDigits:2})}

/* ---------- ejemplo (solo en memoria) ---------- */
function buildDemo(){
  var precios=[61200,63800,59400,64900,66300,68800,65200,67100,70400,72900,69800,71200,68900,70300];
  var montos=[50,50,50,75,50,50,50,50,100,50,50,50,75,50];
  var hoy=new Date(startOfToday()), out=[];
  for(var i=0;i<precios.length;i++){
    var d=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()-7*(precios.length-1-i));
    out.push({id:'demo'+i,fecha:iso(d),monto:montos[i],precio:precios[i],creado:i});
  }
  return {compras:out,precio:71450};
}

/* ---------- estado ---------- */
var S={compras:[],precio:null,precioTs:null,precioViejo:false,precioFuente:'',precioErr:false,manual:false,loaded:false,storage:'ok',demo:false,editing:null,pendDel:null,notice:null,saving:false,canExport:true};
var DEMO=null, delTimer=null;

function view(){
  if(S.demo){ if(!DEMO) DEMO=buildDemo(); return {compras:DEMO.compras,precio:DEMO.precio,ts:null}; }
  return {compras:S.compras,precio:S.precio,ts:S.precioTs};
}
function calc(v){
  var list=v.compras.slice().sort(function(a,b){
    return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:(a.creado||0)-(b.creado||0);
  });
  var inv=0,btc=0;
  var series=list.map(function(c){
    var q=c.sats>0?c.sats/1e8:c.monto/c.precio; inv+=c.monto; btc+=q;
    return {id:c.id,fecha:c.fecha,monto:c.monto,precio:c.precio,q:q,avg:inv/btc};
  });
  var avg=btc?inv/btc:null;
  var val=(v.precio!=null&&btc)?btc*v.precio:null;
  var pnl=val!=null?val-inv:null;
  var pct=(pnl!=null&&inv)?pnl/inv*100:null;
  return {list:series,n:series.length,inv:inv,btc:btc,avg:avg,val:val,pnl:pnl,pct:pct};
}

/* ---------- render ---------- */
var elPrecio=$('#precio');
var REDUCE=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
var introHero=false, introChart=false, introBars=false, heroRaf=0;
var ICO={
  up:'<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5 9 8H1z" fill="currentColor"/></svg>',
  down:'<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 8.5 1 2h8z" fill="currentColor"/></svg>',
  edit:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.8 4.2l3 3L7.5 15.5 4 16l.5-3.5zM11.3 5.7l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  del:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6M8.7 9v4M11.3 9v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  chart:'<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M6 36h32M10 30l8-9 6 5 10-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
function esc(t){return String(t).replace(/[&<>"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]})}
function renderAll(){
  var v=view(), c=calc(v);
  renderPrecio(v);
  renderHero(c,v);
  renderStats(c,v);
  renderChart(c,v);
  renderBars(c);
  renderTable(c,v);
  renderNotice();
  renderForm();
}
function renderPrecio(v){
  if(document.activeElement!==elPrecio){ elPrecio.value=v.precio!=null?fmtInput(v.precio):''; }
  elPrecio.disabled=S.demo;
  $('#usar-vivo').hidden=!(S.manual&&!S.demo);
  var ago=$('#precio-ago'), pp=$('#ppill');
  var st=S.demo?'demo':S.manual?'manual':v.precio==null?(S.precioErr?'err':'wait'):(S.precioViejo||S.precioErr?'err':'live');
  pp.className='ppill is-'+st;
  if(S.demo){ ago.textContent='Precio de ejemplo.'; return; }
  if(S.manual){ ago.textContent='Precio escrito a mano.'; return; }
  if(v.precio==null){ ago.textContent=S.precioErr?'No se pudo obtener el precio. Escríbelo a mano.':'Obteniendo el precio…'; return; }
  ago.textContent='En vivo'+(S.precioFuente?' · '+S.precioFuente:'')+(v.ts?' · '+dfTime.format(new Date(v.ts)):'')+(S.precioViejo||S.precioErr?' (dato antiguo)':'');
}
function setHeroNum(el,target){
  cancelAnimationFrame(heroRaf);
  if(introHero||REDUCE){ introHero=true; el.textContent=usd(target); return; }
  introHero=true;
  var t0=performance.now(), dur=1100;
  (function step(now){
    var k=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-k,3);
    el.textContent=usd(target*e);
    if(k<1) heroRaf=requestAnimationFrame(step);
  })(t0);
}
function renderHero(c,v){
  var val=$('#h-val'), pill=$('#h-pnl'), sub=$('#h-sub');
  renderSpark(c,v);
  if(!c.n){
    cancelAnimationFrame(heroRaf);
    val.textContent=usd(0); pill.hidden=true;
    sub.textContent=(!S.loaded&&!S.demo)?'Cargando tus compras…':'Registra tu primera compra para empezar.'; return;
  }
  if(c.val==null){
    cancelAnimationFrame(heroRaf);
    val.textContent='—'; pill.hidden=true;
    sub.textContent=S.precioErr?'No se pudo obtener el precio de BTC. Escríbelo arriba para ver tu posición.':'Obteniendo el precio de BTC…'; return;
  }
  setHeroNum(val,c.val);
  var up=c.pnl>=0;
  pill.hidden=false;
  pill.className='chip '+(up?'gain':'loss');
  pill.innerHTML=(up?ICO.up:ICO.down)+'<span>'+sgn(c.pct,Math.abs(c.pct).toFixed(2)+'%')+' · '+sgn(c.pnl,usd(Math.abs(c.pnl)))+'</span>';
  sub.textContent=(up?'Ganancia':'Pérdida')+' sin vender sobre '+usd(c.inv)+' invertidos.';
}
/* valor de la posición tras cada compra, terminando en el precio actual */
function renderSpark(c,v){
  var box=$('#spark');
  if(c.n<1){ box.innerHTML=''; return; }
  var pts=[], btc=0;
  c.list.forEach(function(p){ btc+=p.q; pts.push(btc*p.precio); });
  if(v.precio!=null) pts.push(c.btc*v.precio);
  if(pts.length<2){ box.innerHTML=''; return; }
  var W=300,H=96,lo=Math.min.apply(null,pts),hi=Math.max.apply(null,pts),r=(hi-lo)||1;
  var P=pts.map(function(y,i){return [i/(pts.length-1)*(W-6)+3,(1-(y-lo)/r)*(H-14)+7]});
  var d=P.map(function(p,i){return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)}).join(' ');
  var last=P[P.length-1];
  box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="sp-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>'+
    '<path class="s-area" d="'+d+' L'+last[0].toFixed(1)+' '+H+' L3 '+H+' Z" fill="url(#sp-g)"/><path class="s-line" d="'+d+'" vector-effect="non-scaling-stroke"/>'+
    '<circle class="s-end" cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="4" vector-effect="non-scaling-stroke"/></svg>';
}
function renderStats(c,v){
  var rel=' ', gauge='';
  if(c.avg!=null&&v.precio!=null){
    var d=(v.precio/c.avg-1)*100;
    rel=d>=0.05?'Mercado '+d.toFixed(1)+'% sobre tu promedio':d<=-0.05?'Mercado '+Math.abs(d).toFixed(1)+'% bajo tu promedio':'Mercado en tu promedio';
    var mn=Math.min.apply(null,c.list.map(function(p){return p.precio}).concat([v.precio])),
        mx=Math.max.apply(null,c.list.map(function(p){return p.precio}).concat([v.precio])), rg=(mx-mn)||1;
    gauge='<span class="gauge" data-avg="'+((c.avg-mn)/rg*100).toFixed(1)+'" data-cur="'+((v.precio-mn)/rg*100).toFixed(1)+'"><span class="gauge-fill"></span><span class="gauge-mark"></span></span>'+
      '<span class="gauge-cap"><span>Mín '+usdK(mn)+'</span><span>Máx '+usdK(mx)+'</span></span>';
  }
  var cells=[
    ['Precio promedio',c.avg!=null?usd(c.avg):'—',rel,'lead',gauge],
    ['Total invertido',c.n?usd(c.inv):'—',c.n?c.n+(c.n===1?' compra':' compras'):'Sin compras'],
    ['BTC acumulado',c.n?btcFmt(c.btc):'—',c.n?sats(c.btc)+' sats':' '],
    ['Promedio por compra',c.n?usd(c.inv/c.n):'—',c.n?'Desde '+fmtDate(c.list[0].fecha):' ']
  ];
  var box=$('#stats');
  box.innerHTML=cells.map(function(x){
    return '<div class="stat'+(x[3]?' '+x[3]:'')+'"><span class="k">'+x[0]+'</span><span class="v">'+x[1]+'</span>'+(x[4]||'')+'<span class="s">'+x[2]+'</span></div>';
  }).join('');
  var g=box.querySelector('.gauge');
  if(g){
    g.querySelector('.gauge-fill').style.width=Math.max(2,+g.dataset.cur)+'%';
    g.querySelector('.gauge-mark').style.left='calc('+g.dataset.avg+'% - 1px)';
  }
}

function niceTicks(lo,hi,n){
  var range=(hi-lo)||1, raw=range/n, mag=Math.pow(10,Math.floor(Math.log10(raw))), norm=raw/mag;
  var step=(norm<=1?1:norm<=2?2:norm<=2.5?2.5:norm<=5?5:10)*mag;
  var a=Math.floor(lo/step)*step, b=Math.ceil(hi/step)*step, out=[];
  for(var t=a;t<=b+step*0.001;t+=step) out.push(+t.toFixed(6));
  return out;
}
var CH=null;
function tag(cls,x,y,txt){
  var w=txt.length*6.7+14;
  return '<g class="'+cls+'"><rect class="tag-bg" x="'+(x-w).toFixed(1)+'" y="'+(y-10).toFixed(1)+'" width="'+w.toFixed(1)+'" height="20" rx="6"/><text x="'+(x-7).toFixed(1)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end">'+txt+'</text></g>';
}
function renderChart(c,v){
  var box=$('#chart');
  if(!c.n){ CH=null; box.innerHTML='<div class="vacio">'+ICO.chart+'<p>'+(!S.loaded&&!S.demo?'Cargando…':'La gráfica aparece con tu primera compra.')+'</p></div>'; return; }
  var W=Math.max(260,box.clientWidth), H=W<480?240:300;
  var m={l:46,r:12,t:16,b:26}, day=864e5;
  var ts=c.list.map(function(p){return dateOf(p.fecha).getTime()});
  var today=startOfToday();
  var lastT=Math.max.apply(null,ts);
  var t0=Math.min.apply(null,ts), t1=Math.max(lastT,today);
  var span=t1-t0;
  if(span<14*day){ t0=t1-14*day; span=14*day; }
  var pd=span*0.03; t0-=pd; span=t1-t0;
  /* reserva espacio a la derecha para las etiquetas */
  var tagW=W<480?0:112; m.r+=tagW;
  var ys=c.list.map(function(p){return p.precio}).concat(c.list.map(function(p){return p.avg}));
  if(v.precio!=null) ys.push(v.precio);
  ys=ys.filter(isFinite);
  var lo=Math.min.apply(null,ys), hi=Math.max.apply(null,ys);
  var yp=(hi-lo)*0.12||hi*0.05;
  var ticks=niceTicks(Math.max(0,lo-yp),hi+yp,4);
  var y0=ticks[0], y1=ticks[ticks.length-1];
  function X(t){return m.l+(t-t0)/span*(W-m.l-m.r)}
  function Y(p){return m.t+(1-(p-y0)/(y1-y0))*(H-m.t-m.b)}
  var xEnd=W-m.r;
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gráfica de tus compras, tu precio promedio acumulado y el precio actual de Bitcoin">';
  s+='<defs><linearGradient id="avg-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>';
  ticks.forEach(function(t){
    var y=Y(t).toFixed(1);
    s+='<line class="grid" x1="'+m.l+'" x2="'+xEnd+'" y1="'+y+'" y2="'+y+'"/>';
    s+='<text x="'+(m.l-8)+'" y="'+(+y+4)+'" text-anchor="end">'+tickK(t)+'</text>';
  });
  var nx=W<480?3:5, fmtX=span>200*day?dfMonth:dfShort;
  for(var k=0;k<nx;k++){
    var tk=t0+span*k/(nx-1), anc=k===0?'start':k===nx-1?'end':'middle';
    s+='<text x="'+X(tk).toFixed(1)+'" y="'+(H-6)+'" text-anchor="'+anc+'">'+fmtX.format(new Date(tk))+'</text>';
  }
  var d='M'+X(ts[0]).toFixed(1)+' '+Y(c.list[0].avg).toFixed(1);
  for(var i=1;i<c.n;i++){
    d+=' L'+X(ts[i]).toFixed(1)+' '+Y(c.list[i-1].avg).toFixed(1)+' L'+X(ts[i]).toFixed(1)+' '+Y(c.list[i].avg).toFixed(1);
  }
  var avgLast=c.list[c.n-1].avg;
  var xLast=X(Math.max(lastT,today));
  d+=' L'+xLast.toFixed(1)+' '+Y(avgLast).toFixed(1);
  var base=(H-m.b).toFixed(1);
  s+='<path class="avg-area" d="'+d+' L'+xLast.toFixed(1)+' '+base+' L'+X(ts[0]).toFixed(1)+' '+base+' Z" fill="url(#avg-g)"/>';
  s+='<path class="avg" d="'+d+'"/>';
  var yAvg=Y(avgLast), yCur=null;
  if(v.precio!=null){
    yCur=Y(v.precio);
    s+='<line class="cur" x1="'+m.l+'" x2="'+xEnd+'" y1="'+yCur.toFixed(1)+'" y2="'+yCur.toFixed(1)+'"/>';
  }
  s+='<line class="xh" x1="0" x2="0" y1="'+m.t+'" y2="'+base+'" visibility="hidden"/>';
  var pts=c.list.map(function(p,i){return {x:X(ts[i]),y:Y(p.precio),p:p}});
  pts.forEach(function(o){ s+='<circle class="halo" cx="'+o.x.toFixed(1)+'" cy="'+o.y.toFixed(1)+'" r="9"/>'; });
  pts.forEach(function(o,i){ s+='<circle class="dot" data-i="'+i+'" cx="'+o.x.toFixed(1)+'" cy="'+o.y.toFixed(1)+'" r="4.5"/>'; });
  /* etiquetas: separadas y fuera del trazo */
  var top=m.t+10, bot=H-m.b-10, la=Math.min(bot,Math.max(top,yAvg)), lc=yCur!=null?Math.min(bot,Math.max(top,yCur)):null;
  if(lc!=null&&Math.abs(lc-la)<24){
    var mid=(lc+la)/2, upCur=yCur<=yAvg;
    lc=mid+(upCur?-12:12); la=mid+(upCur?12:-12);
    if(Math.min(lc,la)<top){ var sh=top-Math.min(lc,la); lc+=sh; la+=sh; }
    if(Math.max(lc,la)>bot){ var sh2=Math.max(lc,la)-bot; lc-=sh2; la-=sh2; }
  }
  var tx=W-4;
  if(tagW){
    s+=tag('tag-avg',tx,la,'Prom. '+usdK(avgLast));
    if(lc!=null) s+=tag('tag-cur',tx,lc,'Hoy '+usdK(v.precio));
  }
  s+='</svg>';
  if(!tagW){
    s+='<p class="card-sub">Promedio <b class="num">'+usdK(avgLast)+'</b>'+(v.precio!=null?' · Hoy <b class="num">'+usdK(v.precio)+'</b>':'')+'</p>';
  }
  s+='<div class="tip" role="status" aria-live="off"></div>';
  box.innerHTML=s;
  box.querySelector('svg').style.color='var(--avg)';
  var avgP=box.querySelector('.avg');
  if(!introChart&&!REDUCE&&S.loaded&&avgP.getTotalLength){
    try{ box.style.setProperty('--len',Math.ceil(avgP.getTotalLength())); box.classList.add('draw'); }catch(_){}
    setTimeout(function(){ box.classList.remove('draw'); },1400);
  }
  if(S.loaded||S.demo) introChart=true;
  CH={W:W,pts:pts,precio:v.precio};
}
function chartTip(ev){
  if(!CH) return;
  var box=$('#chart'), svg=box.querySelector('svg'); if(!svg) return;
  var r=svg.getBoundingClientRect(), k=CH.W/r.width;
  var x=((ev.touches?ev.touches[0].clientX:ev.clientX)-r.left)*k, best=0, bd=1e9;
  CH.pts.forEach(function(o,i){ var dd=Math.abs(o.x-x); if(dd<bd){ bd=dd; best=i; } });
  var o=CH.pts[best], p=o.p, tip=box.querySelector('.tip'), xh=svg.querySelector('.xh');
  svg.querySelectorAll('.dot.on').forEach(function(e){e.classList.remove('on')});
  var dot=svg.querySelector('.dot[data-i="'+best+'"]'); if(dot) dot.classList.add('on');
  xh.setAttribute('x1',o.x.toFixed(1)); xh.setAttribute('x2',o.x.toFixed(1)); xh.setAttribute('visibility','visible');
  var hoy='';
  if(CH.precio!=null){ var rr=(CH.precio/p.precio-1)*100; hoy='<span class="'+(rr>=0?'t-g':'t-l')+'">'+sgn(rr,Math.abs(rr).toFixed(1)+'%')+' desde entonces</span>'; }
  tip.innerHTML='<b>'+fmtDate(p.fecha)+'</b>'+usd(p.monto)+' a '+usd(p.precio)+'<br>'+btcFmt(p.q)+' BTC<br>Promedio '+usd(p.avg)+(hoy?'<br>'+hoy:'');
  var px=o.x/k, py=o.y/k, tw=tip.offsetWidth, th=tip.offsetHeight, bw=box.clientWidth;
  var left=px+14; if(left+tw>bw) left=px-14-tw; if(left<0) left=Math.max(0,Math.min(bw-tw,px-tw/2));
  var topY=py-th-12; if(topY<0) topY=py+14;
  tip.style.transform='translate('+left.toFixed(0)+'px,'+topY.toFixed(0)+'px)';
  tip.classList.add('on');
}
function chartTipOff(){
  var box=$('#chart'), tip=box.querySelector('.tip'), svg=box.querySelector('svg');
  if(tip) tip.classList.remove('on');
  if(svg){ var xh=svg.querySelector('.xh'); if(xh) xh.setAttribute('visibility','hidden'); svg.querySelectorAll('.dot.on').forEach(function(e){e.classList.remove('on')}); }
}
(function(){
  var box=$('#chart');
  box.addEventListener('pointermove',chartTip);
  box.addEventListener('pointerdown',chartTip);
  box.addEventListener('pointerleave',chartTipOff);
})();

var dfMes=new Intl.DateTimeFormat('es-SV',{month:'short'});
function renderBars(c){
  var box=$('#bars'), sub=$('#mes-sub');
  if(!c.n){ box.innerHTML='<div class="vacio"><p>'+(!S.loaded&&!S.demo?'Cargando…':'Tus aportes mensuales aparecen aquí.')+'</p></div>'; sub.textContent=''; return; }
  var first=dateOf(c.list[0].fecha), now=new Date(startOfToday());
  var months=[], y=first.getFullYear(), mo=first.getMonth();
  while(y<now.getFullYear()||(y===now.getFullYear()&&mo<=now.getMonth())){ months.push({y:y,m:mo,v:0}); mo++; if(mo>11){mo=0;y++;} }
  months=months.slice(-12);
  var idx={}; months.forEach(function(x,i){ idx[x.y+'-'+x.m]=i; });
  c.list.forEach(function(p){ var d=dateOf(p.fecha), key=d.getFullYear()+'-'+d.getMonth(); if(idx[key]!=null) months[idx[key]].v+=p.monto; });
  var mx=Math.max.apply(null,months.map(function(x){return x.v}))||1, act=months.filter(function(x){return x.v>0}).length;
  var tot=months.reduce(function(a,x){return a+x.v},0);
  sub.textContent=act+' de '+months.length+(months.length===1?' mes':' meses')+' con aportes · '+usd(tot/months.length)+' al mes';
  var W=320,H=150,top=18,bot=22,gap=months.length>8?6:10,bw=(W-gap*(months.length-1))/months.length;
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Aportes por mes en los últimos '+months.length+' meses">';
  months.forEach(function(x,i){
    var bx=i*(bw+gap), h=Math.max(x.v?3:0,(x.v/mx)*(H-top-bot)), by=H-bot-h;
    s+='<rect class="bar-bg" x="'+bx.toFixed(1)+'" y="'+top+'" width="'+bw.toFixed(1)+'" height="'+(H-top-bot)+'" rx="5"/>';
    if(x.v) s+='<rect class="bar'+(i===months.length-1?' last':'')+'" x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="5"><title>'+usd(x.v)+'</title></rect>';
    if(x.v&&bw>=22) s+='<text class="bv" x="'+(bx+bw/2).toFixed(1)+'" y="'+(by-5).toFixed(1)+'" text-anchor="middle">$'+Math.round(x.v)+'</text>';
    s+='<text x="'+(bx+bw/2).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+dfMes.format(new Date(x.y,x.m,1)).replace('.','')+'</text>';
  });
  s+='</svg>';
  box.innerHTML=s;
  if(!introBars&&!REDUCE&&S.loaded){ box.classList.add('draw'); setTimeout(function(){box.classList.remove('draw')},900); }
  if(S.loaded||S.demo) introBars=true;
}

function renderTable(c,v){
  var wrap=$('#tabla');
  $('#csv').hidden=!(S.canExport&&c.n&&!S.demo);
  if(!S.loaded&&!S.demo){ wrap.innerHTML='<div class="vacio"><p>Cargando tus compras…</p></div>'; return; }
  if(!c.n){
    wrap.innerHTML='<div class="vacio"><p>Todavía no hay compras. Usa el formulario con la fecha, el monto y los sats que recibiste.</p><button type="button" class="btn sec" data-act="demo">Ver con datos de ejemplo</button></div>';
    return;
  }
  var rows=c.list.slice().reverse().map(function(p){
    var hoy='—';
    if(v.precio!=null){ var r=(v.precio/p.precio-1)*100; hoy='<span class="pct '+(r>=0?'gain':'loss')+'">'+sgn(r,Math.abs(r).toFixed(1)+'%')+'</span>'; }
    var acc='';
    if(!S.demo){
      var fd=esc(fmtDate(p.fecha));
      acc='<span class="acts"><button type="button" class="ib" data-act="edit" data-id="'+p.id+'" aria-label="Editar compra del '+fd+'" title="Editar">'+ICO.edit+'</button>'+
          (S.pendDel===p.id
            ?'<button type="button" class="ib confirm" data-act="del" data-id="'+p.id+'" aria-label="Confirmar borrado de la compra del '+fd+'">Confirmar</button>'
            :'<button type="button" class="ib danger" data-act="del" data-id="'+p.id+'" aria-label="Borrar compra del '+fd+'" title="Borrar">'+ICO.del+'</button>')+'</span>';
    }
    return '<tr><td>'+fmtDate(p.fecha)+'</td><td data-k="Monto">'+usd(p.monto)+'</td><td data-k="Precio BTC">'+usd(p.precio)+'</td><td data-k="BTC">'+btcFmt(p.q)+'</td><td class="c-hoy">'+hoy+'</td><td class="c-acc">'+acc+'</td></tr>';
  }).join('');
  wrap.innerHTML='<table><thead><tr><th>Fecha</th><th>Monto</th><th>Precio BTC</th><th>BTC</th><th>Hoy</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function renderNotice(){
  var el=$('#aviso'), txt='', act='';
  if(S.demo){ txt='Estás viendo datos de ejemplo. No se guardan.'; act='<button type="button" class="link" data-act="exit-demo">Salir del ejemplo</button>'; }
  else if(S.storage==='error'){ txt='No se pudo cargar tu historial. Si tu sesión venció, recarga la página.'; act='<button type="button" class="link" data-act="retry">Reintentar</button>'; }
  else if(S.notice){ txt=S.notice; }
  el.hidden=!txt;
  el.innerHTML=txt?'<span>'+txt+'</span>'+act:'';
}
function renderForm(){
  var editing=!!S.editing;
  $('#fs').disabled=S.demo;
  var g=$('#f-guardar'); g.setAttribute('aria-busy',S.saving?'true':'false');
  $('#form-t').textContent=editing?'Editar compra':'Registrar compra';
  g.textContent=S.saving?'Guardando…':editing?'Guardar cambios':'Guardar compra';
  $('#f-cancelar').hidden=!editing;
}

/* ---------- formulario ---------- */
var fFecha=$('#f-fecha'), fMonto=$('#f-monto'), fSats=$('#f-sats'), fPrecio=$('#f-precio');
fFecha.value=iso(new Date());
fFecha.max=iso(new Date());
function setErr(t,el){$('#f-error').textContent=t||'';[fFecha,fMonto,fSats,fPrecio].forEach(function(x){x.removeAttribute('aria-invalid')});if(el){el.setAttribute('aria-invalid','true');el.focus();}}
/* Con sats o USD basta: el resto se calcula (con el precio escrito o, si falta, el actual). */
function resolver(){
  var m=parseNum(fMonto.value), n=parseSats(fSats.value), p=parseNum(fPrecio.value), est=false;
  if(!(m>0)) m=null; if(!(p>0)) p=null;
  if(m&&n) return {monto:m,sats:n,precio:m*1e8/n,est:false};
  if(!m&&!n) return null;
  if(!p){ if(S.precio>0){ p=S.precio; est=true; } else return {falta:'precio'}; }
  if(n) return {monto:Math.round(n*p/1e6)/100,sats:n,precio:p,est:est};
  return {monto:m,sats:Math.max(1,Math.round(m/p*1e8)),precio:p,est:est};
}
function updatePreview(){
  $('#f-error').textContent='';
  var r=resolver(), el=$('#preview'), okv=r&&r.monto>0&&r.sats>0;
  el.className='preview'+(okv?'':' empty');
  el.innerHTML='<span class="pv-k">'+(okv?(r.est?'Estimado con precio actual':'Esta compra'):'Esta compra')+'</span><span class="pv-v">'+(okv?usd(r.monto):'—')+'</span><span class="pv-s">'+(okv?r.sats.toLocaleString('en-US')+' sats · precio '+usd(r.precio):(r&&r.falta?'Escribe el precio de 1 BTC':'Escribe sats o monto'))+'</span>';
  syncChips();
}
function syncChips(){
  var m=parseNum(fMonto.value), f=fFecha.value;
  document.querySelectorAll('#form .qchip').forEach(function(b){
    var on=b.dataset.amt?(m===+b.dataset.amt):(f===iso(new Date(startOfToday()-(+b.dataset.dia)*864e5)));
    b.setAttribute('aria-pressed',on?'true':'false');
  });
}
$('#form').addEventListener('click',function(e){
  var b=e.target.closest('.qchip'); if(!b) return;
  if(b.dataset.amt){ fMonto.value=b.dataset.amt; }
  else { var d=new Date(startOfToday()); d.setDate(d.getDate()-(+b.dataset.dia)); fFecha.value=iso(d); }
  setErr(''); updatePreview();
});
fFecha.addEventListener('input',syncChips);
fFecha.addEventListener('change',syncChips);
fMonto.addEventListener('input',updatePreview);
fSats.addEventListener('input',updatePreview);
fPrecio.addEventListener('input',updatePreview);
$('#usar-precio').addEventListener('click',function(){
  if(S.precio!=null){ fPrecio.value=fmtInput(S.precio); updatePreview(); }
  else { setErr('Todavía no hay precio actual. Escríbelo.',fPrecio); }
});
function resetForm(){
  S.editing=null; fMonto.value=''; fSats.value=''; fPrecio.value=''; fFecha.value=iso(new Date()); setErr(''); updatePreview(); renderForm();
}
$('#f-cancelar').addEventListener('click',resetForm);

$('#form').addEventListener('submit',async function(e){
  e.preventDefault();
  if(S.demo||S.saving) return;
  var fecha=fFecha.value, err='', r=resolver();
var bad=null;
  if(!fecha||isNaN(dateOf(fecha))){ err='Elige la fecha de la compra.'; bad=fFecha; }
  else if(dateOf(fecha).getTime()>startOfToday()){ err='La fecha no puede ser futura.'; bad=fFecha; }
  else if(!r){ err='Escribe los sats que recibiste o el monto en USD. Ejemplo: 74,627 sats'; bad=fSats; }
  else if(r.falta){ err='Escribe el precio de 1 BTC (no hay precio actual todavía).'; bad=fPrecio; }
  setErr(err,bad);
  if(err) return;
  S.saving=true; renderForm();
  var rec={fecha:fecha,monto:r.monto,sats:r.sats};
  try{
    var saved=S.editing?await api('PUT','/api/compras/'+encodeURIComponent(S.editing),rec):await api('POST','/api/compras',rec);
    saved.id=String(saved.id);
    if(S.editing){ S.compras=S.compras.map(function(c){return c.id===S.editing?saved:c}); }
    else { S.compras.push(saved); }
    S.notice=null; S.saving=false; resetForm(); renderAll(); fMonto.focus();
  }catch(e){
    S.saving=false;
    if(e.status===400){ renderAll(); setErr(e.message); }
    else { S.notice=e.status===0?'Sin conexión con el servidor. Si tu sesión venció, recarga la página.':'No se pudo guardar la compra. Intenta de nuevo.'; renderAll(); $('#f-guardar').focus(); }
  }
});

/* ---------- precio actual ---------- */
var raf=0;
elPrecio.addEventListener('input',function(){
  if(S.demo) return;
  S.manual=true; S.precio=parseNum(elPrecio.value); S.precioTs=Date.now();
  if(raf) return;
  raf=requestAnimationFrame(function(){
    raf=0; var v=view(), c=calc(v);
    $('#usar-vivo').hidden=false; $('#precio-ago').textContent='Precio escrito a mano.';
    renderHero(c,v); renderStats(c,v); renderChart(c,v); renderTable(c,v);
    $('#ppill').className='ppill is-manual';
  });
});
elPrecio.addEventListener('change',function(){
  if(S.demo) return;
  var n=parseNum(elPrecio.value);
  if(!(n>0)){ S.manual=false; S.precio=null; renderAll(); pollPrecio(); return; }
  S.manual=true; S.precio=n; S.precioTs=Date.now(); elPrecio.value=fmtInput(n); renderAll();
});
$('#usar-vivo').addEventListener('click',function(){ S.manual=false; S.precio=null; renderAll(); pollPrecio(); });

/* ---------- tabla y avisos ---------- */
async function doDelete(id){
  try{
    await api('DELETE','/api/compras/'+encodeURIComponent(id));
    S.compras=S.compras.filter(function(c){return c.id!==id});
    if(S.editing===id) resetForm();
    S.notice=null; renderAll();
    $('#tabla-live').textContent='Compra borrada.';
    $('#tabla-t').focus();
  }catch(e){
    if(e.status===404){ S.compras=S.compras.filter(function(c){return c.id!==id}); S.notice='Esa compra ya no existe.'; }
    else { S.notice='No se pudo borrar la compra. Intenta de nuevo.'; }
    renderAll();
  }
}
function startEdit(id){
  var c=S.compras.find(function(x){return x.id===id}); if(!c) return;
  S.editing=id; fFecha.value=c.fecha; fMonto.value=String(c.monto); fPrecio.value=''; fSats.value=(c.sats>0?c.sats:Math.round(c.monto/c.precio*1e8)).toLocaleString('en-US');
  setErr(''); updatePreview(); renderForm();
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#form').scrollIntoView({block:'nearest',behavior:reduce?'auto':'smooth'});
  fMonto.focus({preventScroll:true});
}
$('#tabla').addEventListener('click',function(e){
  var b=e.target.closest('button[data-act]'); if(!b) return;
  var act=b.dataset.act, id=b.dataset.id;
  if(act==='edit'){ startEdit(id); }
  else if(act==='del'){
    if(S.pendDel===id){ clearTimeout(delTimer); S.pendDel=null; doDelete(id); }
    else {
      S.pendDel=id; clearTimeout(delTimer);
      delTimer=setTimeout(function(){ var had=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.id===id; S.pendDel=null; renderTable(calc(view()),view()); $('#tabla-live').textContent='Borrado cancelado.'; if(had){ var r=$('#tabla').querySelector('[data-act="del"][data-id="'+id+'"]'); if(r) r.focus(); } },4000);
      renderTable(calc(view()),view());
      var nb=$('#tabla').querySelector('[data-act="del"][data-id="'+id+'"]'); if(nb) nb.focus();
      $('#tabla-live').textContent='Pulsa Confirmar en los próximos 4 segundos para borrar la compra.';
    }
  }
  else if(act==='demo'){ S.demo=true; resetForm(); renderAll(); $('#tabla-t').focus(); }
});
$('#aviso').addEventListener('click',function(e){
  var b=e.target.closest('button[data-act]'); if(!b) return;
  if(b.dataset.act==='exit-demo'){ S.demo=false; renderAll(); fMonto.focus(); pollPrecio(); }
  else if(b.dataset.act==='retry'){ loadCompras(); }
});
$('#csv').addEventListener('click',function(){ window.location.href='/api/export.csv'; });

/* ---------- API y arranque ---------- */
async function api(method,path,body){
  var opt={method:method,headers:{'Accept':'application/json'},credentials:'same-origin',cache:'no-store'};
  if(body!==undefined){ opt.headers['Content-Type']='application/json'; opt.body=JSON.stringify(body); }
  var r;
  try{ r=await fetch(path,opt); }
  catch(_){ var e0=new Error('Sin conexión'); e0.status=0; throw e0; }
  if(r.status===204) return null;
  var j=null; try{ j=await r.json(); }catch(_){}
  if(!r.ok){ var e=new Error((j&&j.error)||('Error '+r.status)); e.status=r.status; throw e; }
  return j;
}
async function loadCompras(){
  try{
    var list=await api('GET','/api/compras');
    if(!Array.isArray(list)) throw new Error('Respuesta inválida');
    S.compras=list.map(function(c){return {id:String(c.id),fecha:c.fecha,monto:c.monto,precio:c.precio,sats:c.sats,creado:c.creado}}).filter(function(c){
      return typeof c.fecha==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)&&c.monto>0&&c.precio>0;
    });
    S.storage='ok';
  }catch(_){ S.storage='error'; }
  S.loaded=true; renderAll();
}
async function pollPrecio(){
  if(S.demo||S.manual) return;
  try{
    var j=await api('GET','/api/precio');
    if(!S.manual){
      if(j&&j.precio>0){ S.precio=j.precio; S.precioTs=j.ts; S.precioViejo=!!j.viejo; S.precioFuente=j.fuente||''; S.precioErr=false; }
      else { S.precioErr=true; }
    }
  }catch(_){ if(!S.manual) S.precioErr=true; }
  softRender();
}
function softRender(){
  var v=view(), c=calc(v);
  renderPrecio(v); renderHero(c,v); renderStats(c,v); renderChart(c,v); renderBars(c);
  if(!S.pendDel) renderTable(c,v);
}
function init(){
  updatePreview();
  renderAll();
  loadCompras();
  pollPrecio();
  setInterval(pollPrecio,30000);
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') pollPrecio(); });
}
var lastW=0;
if(window.ResizeObserver){
  new ResizeObserver(function(){
    var w=$('#chart').clientWidth;
    if(w!==lastW){ lastW=w; var v=view(); chartTipOff(); renderChart(calc(v),v); }
  }).observe($('#chart'));
}
init();
})();
