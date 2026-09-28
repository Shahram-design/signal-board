const API_KEY='7da662aff2b349808cc0f2d253c5b891';
const PAIRS={'EUR/USD':'EUR/USD','GBP/USD':'GBP/USD','USD/JPY':'USD/JPY','AUD/USD':'AUD/USD','USD/CAD':'USD/CAD','EUR/GBP':'EUR/GBP','GBP/JPY':'GBP/JPY','Gold (XAU/USD)':'XAU/USD'};
const $=id=>document.getElementById(id);
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let hist=ld('h',[]),log=ld('log',[]),last={};
$('pair').innerHTML=Object.keys(PAIRS).map(p=>`<option>${p}</option>`).join('');

const ema=(a,p)=>{const k=2/(p+1);let e=a[0];return a.map(v=>e=v*k+e*(1-k))};
function rsi(cl,p=14){let g=0,l=0;for(let i=1;i<=p;i++){const d=cl[i]-cl[i-1];d>0?g+=d:l-=d}g/=p;l/=p;
 for(let i=p+1;i<cl.length;i++){const d=cl[i]-cl[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p}
 return l===0?100:100-100/(1+g/l)}
function adx(c,p=14){const n=c.length;if(n<2*p+1)return null;const tr=[],pd=[],md=[];
 for(let i=1;i<n;i++){const u=c[i].h-c[i-1].h,d=c[i-1].l-c[i].l;
  tr.push(Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c)));pd.push(u>d&&u>0?u:0);md.push(d>u&&d>0?d:0)}
 const sm=a=>a.slice(0,p).reduce((x,y)=>x+y);let T=sm(tr),P=sm(pd),M=sm(md);const dx=[];
 for(let i=p;i<=tr.length;i++){if(i>p){T=T-T/p+tr[i-1];P=P-P/p+pd[i-1];M=M-M/p+md[i-1]}
  const a=100*P/T,b=100*M/T;dx.push(100*Math.abs(a-b)/((a+b)||1))}
 let A=dx.slice(0,p).reduce((x,y)=>x+y)/p;for(let i=p;i<dx.length;i++)A=(A*(p-1)+dx[i])/p;return A}
function trend(c){const cl=c.map(x=>x.c);if(cl.length<30)return 0;return ema(cl,9).at(-1)>ema(cl,21).at(-1)?1:-1}
function agg2(c){const m={};c.forEach(x=>{const k=Math.floor(x.t/120000);
 if(!m[k])m[k]={t:k*120000,o:x.o,h:x.h,l:x.l,c:x.c};else{m[k].h=Math.max(m[k].h,x.h);m[k].l=Math.min(m[k].l,x.l);m[k].c=x.c}});
 return Object.values(m)}
function analyze(c){
 const cl=c.map(x=>x.c);if(cl.length<40)return null;const rows=[];
 const e9=ema(cl,9).at(-1),e21=ema(cl,21).at(-1);
 rows.push(['EMA 9/21',e9>e21?1:-1,e9>e21?'9 ऊपर 21':'9 नीचे 21']);
 const r=rsi(cl);rows.push(['RSI 14',r<30?1:r>70?-1:r>52?0.5:r<48?-0.5:0,r.toFixed(1)]);
 const e12=ema(cl,12),e26=ema(cl,26),m=e12.map((v,i)=>v-e26[i]),sg=ema(m,9),h=m.at(-1)-sg.at(-1);
 rows.push(['MACD',h>0?1:-1,h.toFixed(5)]);
 const w=cl.slice(-20),mean=w.reduce((a,b)=>a+b)/20,sd=Math.sqrt(w.reduce((a,b)=>a+(b-mean)**2,0)/20),p=cl.at(-1);
 rows.push(['Bollinger',p<mean-2*sd?1:p>mean+2*sd?-1:p>mean?0.3:-0.3,p>mean?'mid से ऊपर':'mid से नीचे']);
 const s=c.slice(-14),hi=Math.max(...s.map(x=>x.h)),lo=Math.min(...s.map(x=>x.l)),k=(p-lo)/(hi-lo||1)*100;
 rows.push(['Stoch 14',k<20?1:k>80?-1:0,k.toFixed(0)]);
 const l3=c.slice(-3),mom=l3.every(x=>x.c>x.o)?1:l3.every(x=>x.c<x.o)?-1:0;
 rows.push(['Last 3 candles',mom,mom>0?'3 हरी':mom<0?'3 लाल':'mixed']);
 const sc=rows.reduce((a,x)=>a+x[1],0),conf=Math.min(100,Math.round(Math.abs(sc)/rows.length*130));
 return{rows,dir:sc>0.5?'UP':sc<-0.5?'DOWN':'NEUTRAL',conf,p}}
function decide(a,F){
 if(!a)return null;const d=a.dir==='UP'?1:-1,why=[];
 if(a.dir==='NEUTRAL')why.push('signal saaf nahi');
 else{if(F.t5!==d)why.push('5m trend ulta');if(F.t15!==d)why.push('15m trend ulta');
  if(F.adx!==null&&F.adx<20)why.push('market sideways');if(a.conf<70)why.push('confidence kam')}
 return{...a,why,verdict:why.length?'SKIP':a.dir}}
function card(id,label,a,ts,key,pair){
 const el=$(id);if(!a){el.innerHTML=`<div class="mu">${label}</div>Data kam hai`;return}
 const skip=a.verdict==='SKIP',cls=skip?'sk':a.dir==='UP'?'up':'dn',ar=skip?'⛔':a.dir==='UP'?'▲':'▼';
 last[key]={pair,dir:a.dir,conf:a.conf,skip,done:false};
 el.innerHTML=`<div class="mu">${label}</div><div class="big ${cls}">${ar} ${a.verdict}</div>
 <div>Confidence: <b>${a.conf}%</b> ${skip?'<span class="mu">('+a.dir+')</span>':''}</div>
 ${skip?`<div class="rs">Kyun skip: ${a.why.join(', ')}</div>`:`<div class="mu">Entry: ${a.p} • ${ts}</div><div id="b_${key}"><button class="wl" onclick="rec('${key}',1)">✅ Jeeta</button> <button class="wl" onclick="rec('${key}',0)">❌ Haara</button></div>`}
 <table>${a.rows.map(r=>`<tr><td>${r[0]}</td><td class="${r[1]>0?'up':r[1]<0?'dn':'mu'}">${r[1]>0?'▲':r[1]<0?'▼':'•'}</td><td class="mu">${r[2]}</td></tr>`).join('')}</table>`}
function rec(key,r){const l=last[key];if(!l||l.done||l.skip)return;l.done=true;
 log.unshift({pair:l.pair,tf:key,dir:l.dir,conf:l.conf,r});log=log.slice(0,500);sv('log',log);
 $('b_'+key).innerHTML='<div class="mu">✔ Save ho gaya</div>';renderS()}
function renderS(){const t=log.length;if(!t){$('stats').innerHTML='<br>Abhi koi trade record nahi. Trade ke baad ✅/❌ dabao.';return}
 const w=log.filter(x=>x.r).length,by={};log.forEach(x=>{by[x.pair]=by[x.pair]||[0,0];by[x.pair][1]++;if(x.r)by[x.pair][0]++});
 const pc=(a,b)=>Math.round(a/b*100)+'%',hi=log.filter(x=>x.conf>=80);
 $('stats').innerHTML=`<br>Total: <b>${t}</b> • Jeete: <b class="up">${w}</b> • Haare: <b class="dn">${t-w}</b><br>Accuracy: <b>${pc(w,t)}</b> ${t<100?'(100 trades tak pakka mat maano)':''}<br>${hi.length?'80%+ confidence: '+pc(hi.filter(x=>x.r).length,hi.length)+' ('+hi.length+' trades)<br>':''}${Object.entries(by).map(([k,v])=>k+': '+pc(v[0],v[1])+' ('+v[1]+')').join('<br>')}`}
$('rst').onclick=()=>{if(confirm('Sara record delete karein?')){log=[];sv('log',log);renderS()}};
const renderH=()=>$('hist').innerHTML=hist.join('<br>')||'—';renderH();renderS();

async function get(sym,int,n){
 const j=await(await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=${int}&outputsize=${n}&apikey=${API_KEY}`)).json();
 if(j.status==='error'||!j.values)throw new Error(j.message||'data nahi mila');
 return j.values.reverse().map(v=>({t:new Date(v.datetime.replace(' ','T')+'Z').getTime(),o:+v.open,h:+v.high,l:+v.low,c:+v.close}))}
$('btn').onclick=async()=>{
 const name=$('pair').value,sym=PAIRS[name];
 $('btn').disabled=true;$('st').textContent='⏳ data la raha hai…';$('warn').textContent='';
 try{
  const [c1,c5,c15]=await Promise.all([get(sym,'1min',120),get(sym,'5min',60),get(sym,'15min',60)]);
  const age=(Date.now()-c1.at(-1).t)/60000;
  if(age>5)$('warn').textContent=`⚠️ Market band lag raha hai (last candle ${Math.round(age)} min purani). Trade mat lagao.`;
  const F={t5:trend(c5),t15:trend(c15),adx:adx(c1)};
  const now=new Date(),ist=((now.getUTCHours()*60+now.getUTCMinutes()+330)%1440)/60,good=ist>=13.5&&ist<23;
  $('badges').innerHTML=`<span class="badge">5m ${F.t5>0?'▲':'▼'}</span><span class="badge">15m ${F.t15>0?'▲':'▼'}</span><span class="badge">ADX ${F.adx===null?'-':F.adx.toFixed(0)}</span><span class="badge">${good?'🟢 Achha session':'🟠 Kam volume waqt'}</span>`;
  const ts=now.toLocaleTimeString(),a1=decide(analyze(c1),F),a2=decide(analyze(agg2(c1)),F);
  $('price').textContent=c1.at(-1).c;$('st').textContent='🟢 '+ts;
  card('r1','1 मिनट',a1,ts,'1m',name);card('r2','2 मिनट',a2,ts,'2m',name);
  if(a1){hist.unshift(`${ts} ${name} 1m:${a1.verdict}(${a1.conf}%) 2m:${a2?a2.verdict+'('+a2.conf+'%)':'-'}`);hist=hist.slice(0,15);sv('h',hist);renderH()}
  if(navigator.vibrate)navigator.vibrate(60);
 }catch(e){$('st').textContent='🔴';$('warn').textContent='Error: '+e.message}
 $('btn').disabled=false};
