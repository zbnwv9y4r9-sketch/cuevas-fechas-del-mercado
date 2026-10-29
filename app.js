/* CUEVAS - Fechas del mercado — app estática.
   Datos: data/paises.json (índice), data/paises/<codigo>.json (fechas por país), data/northbay.json (agenda interna).
   Si la página trae window.APP_DATA (versión de un solo archivo), se usa eso en lugar de pedir los JSON. */
(function(){
'use strict';

const CATS = [
  {id:'feriado',  label:'Feriado / día libre', short:'Feriado',  pdf:'#C2410C'},
  {id:'comercio', label:'Comercio y ventas',   short:'Comercio', pdf:'#1D4ED8'},
  {id:'pagos',    label:'Pagos e ingresos',    short:'Pagos',    pdf:'#15803D'},
  {id:'deporte',  label:'Carreras',            short:'Carrera',  pdf:'#7C3AED'},
  {id:'escolar',  label:'Escolar / cívico',    short:'Escolar',  pdf:'#0E7490'},
  {id:'northbay', label:'Agenda Northbay',     short:'Northbay', pdf:'#A16207'}
];
const CAT = Object.fromEntries(CATS.map(c=>[c.id,c]));
const PERIODS = [
  {id:'2026', label:'Oct–Dic 2026', months:[[2026,9],[2026,10],[2026,11]]},
  {id:'2027', label:'2027', months:Array.from({length:12},(_,i)=>[2027,i])}
];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DOW = ['dom','lun','mar','mié','jue','vie','sáb'];
const LONG = 7; // rangos de más de 7 días van como franja del mes, no pintan cada día

const $ = id => document.getElementById(id);
const D = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const today = (()=>{ const t=new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()); })();
const spanDays = e => Math.round((e.e-e.s)/864e5)+1;
const norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

/* ---------- datos ---------- */
const store = { index:null, paises:{}, northbay:[], actualizado:'' };
async function getJSON(url){ const r = await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(url+' → '+r.status); return r.json(); }
async function loadIndex(){
  if(window.APP_DATA){ const A=window.APP_DATA; store.index=A.index; store.paises=A.paises; store.northbay=A.northbay.eventos; store.actualizado=A.index.actualizado; return; }
  const [idx, nb] = await Promise.all([getJSON('data/paises.json'), getJSON('data/northbay.json').catch(()=>({eventos:[]}))]);
  store.index=idx; store.northbay=nb.eventos||[]; store.actualizado=idx.actualizado;
}
async function loadCountry(c){
  if(!store.paises[c]) store.paises[c] = await getJSON('data/paises/'+c+'.json');
  return store.paises[c];
}

/* ---------- estado ---------- */
const defaultPeriod = today <= new Date(2026,11,31) ? '2026' : '2027';
const state = { country:'pa', period:defaultPeriod, month:null, q:'', cats:new Set(CATS.map(c=>c.id)), sel:null };
try{
  const s = JSON.parse(localStorage.getItem('fdm-state')||'null');
  if(s){ if(s.country) state.country=s.country; if(PERIODS.some(p=>p.id===s.period)) state.period=s.period; if(Array.isArray(s.cats)) state.cats=new Set(s.cats.filter(c=>CAT[c])); }
}catch(e){}
function save(){ try{ localStorage.setItem('fdm-state',JSON.stringify({country:state.country,period:state.period,cats:[...state.cats]})); }catch(e){} }

function allEvents(){
  const p = store.paises[state.country]; if(!p) return [];
  let list = p.eventos.map(x=>({...x, s:D(x.inicio), e:D(x.fin||x.inicio)}));
  const nb = store.northbay.filter(x=>!x.paises || x.paises.includes('todos') || x.paises.includes(state.country))
    .map(x=>({...x, cat:'northbay', s:D(x.inicio), e:D(x.fin||x.inicio)}));
  return list.concat(nb).sort((a,b)=>a.s-b.s || (a.cat==='northbay')-(b.cat==='northbay'));
}
function filtered(){
  const q = norm(state.q);
  return allEvents().filter(x=>state.cats.has(x.cat) && (!q || norm(x.titulo+' '+(x.detalle||'')).includes(q)));
}
function visibleMonths(){
  const P = PERIODS.find(p=>p.id===state.period);
  return state.month==null ? P.months : P.months.filter(([y,m])=>m===state.month);
}
function whenLabel(ev){
  const s=ev.s, e=ev.e;
  if(+s===+e) return {big:s.getDate()+' '+MES[s.getMonth()], small:DOW[s.getDay()]};
  if(s.getMonth()===e.getMonth()&&s.getFullYear()===e.getFullYear()) return {big:s.getDate()+'–'+e.getDate()+' '+MES[s.getMonth()], small:DOW[s.getDay()]+'–'+DOW[e.getDay()]};
  return {big:s.getDate()+' '+MES[s.getMonth()]+' → '+e.getDate()+' '+MES[e.getMonth()], small:spanDays(ev)+' días'};
}

/* ---------- utilidades DOM ---------- */
function el(tag, attrs={}, ...kids){
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){ if(v==null) continue; if(k==='style') n.style.cssText=v; else if(k.startsWith('on')) n.addEventListener(k.slice(2),v); else n.setAttribute(k,v); }
  for(const k of kids.flat()){ if(k==null||k===false) continue; n.append(k.nodeType?k:document.createTextNode(k)); }
  return n;
}
const cvar = id => `--c:var(--c-${id})`;

/* ---------- controles ---------- */
function renderControls(){
  const sel=$('country'); sel.replaceChildren();
  const groups={};
  store.index.paises.forEach(c=>(groups[c.region] ||= []).push(c));
  ['Centroamérica','Sudamérica','Caribe'].filter(g=>groups[g]).forEach(g=>{
    const og=el('optgroup',{label:g});
    groups[g].sort((a,b)=>a.pais.localeCompare(b.pais,'es')).forEach(c=>og.append(el('option',{value:c.codigo},c.pais)));
    sel.append(og);
  });
  if(!store.index.paises.some(c=>c.codigo===state.country)) state.country='pa';
  sel.value=state.country;
  sel.addEventListener('change',async()=>{ state.country=sel.value; state.sel=null; save(); await loadCountry(state.country).catch(showErr); render(); });

  const tabs=$('periods');
  PERIODS.forEach(p=>{
    const b=el('button',{type:'button',class:'tab',role:'tab','aria-selected':String(p.id===state.period)},p.label);
    b.addEventListener('click',()=>{ state.period=p.id; state.month=null; state.sel=null; [...tabs.children].forEach(t=>t.setAttribute('aria-selected',String(t===b))); save(); renderMonthsBar(); render(); });
    tabs.append(b);
  });

  const box=$('cats');
  CATS.forEach(c=>{
    const b=el('button',{type:'button',class:'chip','aria-pressed':String(state.cats.has(c.id)),style:cvar(c.id)}, el('span',{class:'sw'}), c.label);
    b.addEventListener('click',()=>{ state.cats.has(c.id)?state.cats.delete(c.id):state.cats.add(c.id); b.setAttribute('aria-pressed',String(state.cats.has(c.id))); save(); render(); });
    box.append(b);
  });

  let t; $('q').addEventListener('input',e=>{ clearTimeout(t); t=setTimeout(()=>{ state.q=e.target.value; render(); },150); });
  renderMonthsBar();
}
function renderMonthsBar(){
  const bar=$('monthsbar'); bar.replaceChildren();
  const P=PERIODS.find(p=>p.id===state.period);
  const mk=(label,val)=>{ const b=el('button',{type:'button',class:'mchip','aria-pressed':String(state.month===val)},label);
    b.addEventListener('click',()=>{ state.month=val; state.sel=null; renderMonthsBar(); render(); }); bar.append(b); };
  mk('Todos',null);
  P.months.forEach(([y,m])=>mk(MESES[m].slice(0,3),m));
}

/* ---------- vistas ---------- */
function renderNext(all){
  const box=$('next'); box.replaceChildren();
  const up=all.filter(e=>e.s>=today && state.cats.has(e.cat)).slice(0,6);
  box.append(el('h3',{},'Próximas fechas · '+store.paises[state.country].pais));
  if(!up.length){ box.append(el('p',{class:'det',style:'margin:0'},'No hay fechas próximas en las categorías seleccionadas.')); return; }
  box.append(el('ol',{}, up.map(e=>{ const w=whenLabel(e); return el('li',{}, el('b',{},w.big), el('span',{}, el('i',{class:'sw',style:cvar(e.cat),'aria-hidden':'true'}), e.titulo)); })));
}
function renderSummary(list){
  const months=visibleMonths();
  const first=new Date(months[0][0],months[0][1],1), last=new Date(months[months.length-1][0],months[months.length-1][1]+1,0);
  const own=list.filter(e=>e.cat!=='northbay' && e.s<=last && e.e>=first);
  const count=c=>own.filter(e=>e.cat===c).length;
  const bf=own.find(e=>/black friday/i.test(e.titulo));
  const pays=own.filter(e=>e.cat==='pagos');
  const box=$('summary'); box.replaceChildren();
  const stat=(b,s)=>box.append(el('div',{class:'stat'},el('b',{},b),el('span',{},s)));
  stat(String(count('feriado')),'feriados y días libres');
  stat(String(count('deporte')),'carreras');
  stat(String(count('comercio')),'fechas de venta');
  stat(bf? bf.s.getDate()+' '+MES[bf.s.getMonth()] : String(pays.length), bf? 'Black Friday' : 'fechas de pago');
}
function renderMonths(list){
  const root=$('months'); root.replaceChildren();
  for(const [y,m] of visibleMonths()){
    const first=new Date(y,m,1), last=new Date(y,m+1,0);
    const inMonth=list.filter(e=>e.s<=last && e.e>=first);
    const long=inMonth.filter(e=>spanDays(e)>LONG), short=inMonth.filter(e=>spanDays(e)<=LONG);
    const byDay={};
    short.forEach(e=>{ for(let d=new Date(Math.max(e.s,first)); d<=e.e && d<=last; d.setDate(d.getDate()+1)) (byDay[d.getDate()] ||= new Set()).add(e.cat); });
    const cal=el('div',{class:'cal'});
    ['L','M','M','J','V','S','D'].forEach(d=>cal.append(el('div',{class:'dow','aria-hidden':'true'},d)));
    const lead=(first.getDay()+6)%7;
    for(let i=0;i<lead;i++) cal.append(el('div',{class:'day empty'}));
    for(let d=1; d<=last.getDate(); d++){
      const date=new Date(y,m,d), cats=byDay[d];
      const cls=['day']; if(cats) cls.push('has'); if(date<today) cls.push('past'); if(+date===+today) cls.push('today'); if(state.sel && +state.sel===+date) cls.push('sel');
      const dots=el('span',{class:'dots','aria-hidden':'true'}); if(cats) CATS.filter(c=>cats.has(c.id)).slice(0,4).forEach(c=>dots.append(el('i',{style:cvar(c.id)})));
      const lab=d+' de '+MESES[m].toLowerCase()+(cats?': '+[...cats].map(c=>CAT[c].short).join(', '):'');
      const b=el(cats?'button':'div',{class:cls.join(' '),'aria-label':lab,type:cats?'button':null}, String(d), dots);
      if(cats) b.addEventListener('click',()=>{ state.sel=(state.sel && +state.sel===+date)?null:date; renderMonths(filtered()); });
      cal.append(b);
    }
    const isNow = today>=first && today<=last;
    const left=el('div',{}, el('h2',{},MESES[m]+' '+y), cal, el('div',{class:'calnote'}, isNow?'Recuadro = hoy · toca un día para resaltarlo':'Toca un día para resaltar sus fechas'));
    const ag=el('div',{class:'agenda'});
    if(long.length){ const bn=el('div',{class:'banner'}); long.forEach(e=>bn.append(el('span',{class:'pill',style:cvar(e.cat)}, e.titulo+' · '+whenLabel(e).big))); ag.append(bn); }
    if(!short.length) ag.append(el('div',{class:'none'}, state.q?'Sin resultados para la búsqueda en este mes.':'Sin fechas en las categorías seleccionadas.'));
    short.forEach(e=>{
      const w=whenLabel(e), hl=state.sel && state.sel>=e.s && state.sel<=e.e;
      const tags=el('div',{class:'tags'}, el('span',{class:'tag',style:cvar(e.cat)},CAT[e.cat].short));
      if(e.nike) tags.append(el('span',{class:'tag nike'},'Nike'));
      if(e.confirmado===false) tags.append(el('span',{class:'tag ghost'},'Por confirmar'));
      const what=el('div',{class:'what'}, tags, el('div',{class:'ttl'},e.titulo), e.detalle?el('div',{class:'det'},e.detalle):null);
      if(e.fuente) what.append(el('div',{class:'src'}, el('a',{href:e.fuente,target:'_blank',rel:'noopener'},'Fuente')));
      ag.append(el('div',{class:'ev'+(e.e<today?' past':'')+(hl?' hl':'')}, el('div',{class:'when'},w.big,el('small',{},w.small)), what));
    });
    root.append(el('section',{class:'month','aria-label':MESES[m]+' '+y}, left, ag));
  }
}
function render(){
  if(!store.paises[state.country]) return;
  const all=allEvents(), list=filtered();
  renderNext(all); renderSummary(list); renderMonths(list);
  $('foot-updated').textContent='Datos actualizados al '+fmtISO(store.actualizado)+'. Cubre de octubre 2026 a diciembre 2027.';
}
const fmtISO = s => { if(!s) return '—'; const d=D(s); return d.getDate()+' de '+MESES[d.getMonth()].toLowerCase()+' de '+d.getFullYear(); };
function showErr(err){ $('months').replaceChildren(el('div',{class:'err'},'No se pudieron cargar las fechas ('+err.message+'). Si abriste el archivo directamente desde la computadora, usa el enlace de GitHub Pages.')); }

/* ---------- PDF ---------- */
const pdfText = s => String(s).replace(/→/g,'->').replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/…/g,'...').replace(/[^\x00-\xFF]/g,'');
async function buildPdf(){
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const hex = h => rgb(parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255);
  const pdf=await PDFDocument.create();
  const R=await pdf.embedFont(StandardFonts.Helvetica), B=await pdf.embedFont(StandardFonts.HelveticaBold);
  const c=store.paises[state.country], list=filtered();
  const INK=hex('#14213D'), GREY=hex('#4A5568'), LIGHT=hex('#ECE8DF'), BG=hex('#F5F3EE'), RULE=hex('#DCD8CE'), WHITE=hex('#FBFAF6');
  const W=297, H=210, K=72/25.4, PW=W*K, PH=H*K;
  pdf.setTitle(pdfText('CUEVAS - Fechas del mercado · '+c.pais)); pdf.setAuthor('Northbay International');
  let pg=null, n=0;
  const rect=(x,y,w,h,color)=>pg.drawRectangle({x:x*K,y:PH-(y+h)*K,width:w*K,height:h*K,color});
  const tw=(s,f,size)=>f.widthOfTextAtSize(pdfText(s),size)/K;
  const text=(s,x,y,{f=R,size=10,color=INK,align='left'}={})=>{ s=pdfText(s); let xx=x; if(align==='right') xx=x-tw(s,f,size); if(align==='center') xx=x-tw(s,f,size)/2; pg.drawText(s,{x:xx*K,y:PH-y*K,size,font:f,color}); };
  const wrap=(s,f,size,max)=>{ const words=pdfText(s).split(/\s+/); const out=[]; let cur=''; for(const w of words){ const t=cur?cur+' '+w:w; if(tw(t,f,size)<=max||!cur) cur=t; else { out.push(cur); cur=w; } } if(cur) out.push(cur); return out; };
  const head=title=>{
    pg=pdf.addPage([PW,PH]); n++;
    rect(0,0,W,H,BG); rect(0,0,W,22,INK);
    text(title,12,14.5,{f:B,size:18,color:WHITE});
    text('CUEVAS - Fechas del mercado',W-12,14.5,{size:9.5,color:WHITE,align:'right'});
    text(c.pais+' · generado '+today.toLocaleDateString('es')+(state.q?' · búsqueda: "'+state.q+'"':''),12,H-7,{size:7.5,color:GREY});
    text(String(n),W-12,H-7,{size:7.5,color:GREY,align:'right'});
  };
  for(const [yy,m] of visibleMonths()){
    const first=new Date(yy,m,1), last=new Date(yy,m+1,0);
    const inMonth=list.filter(e=>e.s<=last&&e.e>=first);
    const long=inMonth.filter(e=>spanDays(e)>LONG), short=inMonth.filter(e=>spanDays(e)<=LONG);
    const byDay={}; short.forEach(e=>{ for(let d=new Date(Math.max(e.s,first)); d<=e.e&&d<=last; d.setDate(d.getDate()+1)) (byDay[d.getDate()] ||= new Set()).add(e.cat); });
    const title=c.pais+' · '+MESES[m]+' '+yy;
    head(title);
    const X0=12, Y0=32, CW=16.5, CH=13.5, G=1.2, lead=(first.getDay()+6)%7;
    ['L','M','M','J','V','S','D'].forEach((d,i)=>text(d,X0+i*(CW+G)+CW/2,Y0-2,{f:B,size:8,color:GREY,align:'center'}));
    for(let d=1; d<=last.getDate(); d++){
      const idx=lead+d-1, x=X0+(idx%7)*(CW+G), y=Y0+Math.floor(idx/7)*(CH+G);
      rect(x,y,CW,CH,LIGHT); text(String(d),x+2,y+5,{f:B,size:10});
      const cats=byDay[d]; if(cats) CATS.filter(k=>cats.has(k.id)).slice(0,4).forEach((k,i)=>pg.drawCircle({x:(x+3+i*3.4)*K,y:PH-(y+CH-3)*K,size:1.25*K,color:hex(k.pdf)}));
    }
    let ly=Y0+6*(CH+G)+6;
    CATS.filter(k=>state.cats.has(k.id)).forEach(k=>{ rect(X0,ly-2.6,3.2,3.2,hex(k.pdf)); text(k.label,X0+5,ly,{size:8}); ly+=5.2; });
    const AX=145, AW=W-AX-12; let y=32;
    const ensure=need=>{ if(y+need>H-14){ head(title+' (cont.)'); y=32; } };
    if(long.length){
      text('TODO EL PERIODO',AX,y,{f:B,size:8.5,color:GREY}); y+=4.5;
      long.forEach(e=>{ const t=wrap(e.titulo+' ('+whenLabel(e).big+')',R,9,AW-6); ensure(t.length*4+2); rect(AX,y-3,1.4,t.length*4,hex(CAT[e.cat].pdf)); t.forEach((l,i)=>text(l,AX+4,y+i*4,{size:9})); y+=t.length*4+1.5; });
      y+=2;
    }
    if(!short.length) text('Sin fechas en las categorias seleccionadas.',AX,y+4,{size:10,color:GREY});
    short.forEach(e=>{
      const w=whenLabel(e), tl=wrap(e.titulo,B,10,AW-38);
      let note=e.detalle||''; if(e.confirmado===false) note=(note?note+' · ':'')+'Por confirmar'; if(e.nike) note=(note?note+' · ':'')+'Nike';
      const dl=note?wrap(note,R,8.5,AW-38):[];
      const h=3.8+tl.length*4.3+dl.length*3.8+3.5;
      ensure(h);
      const col=hex(CAT[e.cat].pdf);
      pg.drawLine({start:{x:AX*K,y:PH-(y+h-2.5)*K},end:{x:(AX+AW)*K,y:PH-(y+h-2.5)*K},thickness:0.6,color:RULE});
      text(w.big,AX,y+1,{f:B,size:10}); text(w.small.toUpperCase(),AX,y+4.6,{size:7.5,color:GREY});
      rect(AX+34,y-2.6,1.6,h-3.2,col);
      text(CAT[e.cat].short.toUpperCase(),AX+38,y+0.4,{f:B,size:7,color:col});
      let yy2=y+4.2; tl.forEach(l=>{ text(l,AX+38,yy2,{f:B,size:10}); yy2+=4.3; });
      dl.forEach(l=>{ text(l,AX+38,yy2-0.3,{size:8.5,color:GREY}); yy2+=3.8; });
      y+=h;
    });
  }
  return pdf.save();
}

let downloads=null; // capacidad de descarga cuando la app corre dentro de Claude
async function saveFile(name, bytes){
  if(downloads){ await downloads.save({filename:name, data:bytes}); return; }
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=el('a',{href:url,download:name}); document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function wirePdf(){
  const btn=$('pdf'), status=$('status');
  btn.addEventListener('click',async()=>{
    if(!window.PDFLib){ status.textContent='No se pudo cargar el generador de PDF. Recarga la página.'; return; }
    btn.disabled=true; status.textContent='Preparando PDF…';
    try{
      const bytes=await buildPdf();
      const P=PERIODS.find(p=>p.id===state.period);
      const per=state.month==null? P.label : MESES[state.month]+' '+P.months[0][0];
      const name=('CUEVAS-Fechas-del-mercado-'+store.paises[state.country].pais+'-'+per).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w-]+/g,'-').replace(/-+/g,'-')+'.pdf';
      await saveFile(name, bytes);
      status.textContent='PDF listo: '+name;
    }catch(err){
      const code=err&&err.code;
      status.textContent = code==='declined'?'Descarga cancelada.' : code==='rate_limited'?'Ya hay una descarga pendiente; espera un momento.' : 'No se pudo generar el PDF ('+(code||err.message||'error')+').';
    }finally{ btn.disabled=false; }
  });
}

/* ---------- arranque ---------- */
async function start(){
  try{
    await loadIndex();
    renderControls(); wirePdf();
    await loadCountry(state.country);
    render();
  }catch(err){ showErr(err); }
  if(window.claude && window.claude.use){ window.claude.use('downloads').then(d=>{ downloads=d; }).catch(()=>{}); }
  if('serviceWorker' in navigator && location.protocol==='https:' && !window.APP_DATA){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
}
start();
window.__fdm={state,buildPdf};
})();
