const PAIRS=['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','LTCUSDT'];
let pair=PAIRS[0],c1=[],ws=null,hist=[];
try{hist=JSON.parse(localStorage.getItem('h')||'[]')}catch(e){}
const $=id=>document.getElementById(id);
$('pair').innerHTML=PAIRS.map(p=>`<option>${p}</option>`).join('');
$('pair').onchange=e=>{pair=e.target.value;start()};

const ema=(a,p)=>{const k=2/(p+1);let e=a[0];return a.map(v=>e=v*k+e*(1-k))};
function rsi(cl,p=14){let g=0,l=0;for(let i=1;i<=p;i++){const d=cl[i]-cl[i-1];d>0?g+=d:l-=d}g/=p;l/=p;
 for(let i=p+1;i<cl.length;i++){const d=cl[i]-cl[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p}
 return l===0?100:100-100/(1+g/l)}
function agg2(c){const m={};c.forEach(x=>{const k=Math.floor(x.t/120000);
 if(!m[k])m[k]={t:k*120000,o:x.o,h:x.h,l:x.l,c:x.c};else{m[k].h=Math.max(m[k].h,x.h);m[k].l=Math.min(m[k].l,x.l);m[k].c=x.c}});
 return Object.values(m)}
function analyze(c){
 const cl=c.map(x=>x.c);if(cl.length<40)return null;const rows=[];
 const e9=ema(cl,9).at(-1),e21=ema(cl,21).at(-1);
 rows.push(['EMA 9/21',e9>e21?1:-1,e9>e21?'9 ऊपर 21':'9 नीचे 21']);
 const r=rsi(cl);rows.push(['RSI 14',r<30?1:r>70?-1:r>52?0.5:r<48?-0.5:0,r.toFixed(1)]);
 const m=ema(cl,12).map((v,i)=>v-ema(cl,26)[i]),sg=ema(m,9);
 const h=m.at(-1)-sg.at(-1);rows.push(['MACD',h>0?1:-1,h.toFixed(4)]);
 const w=cl.slice(-20),mean=w.reduce((a,b)=>a+b)/20,sd=Math.sqrt(w.reduce((a,b)=>a+(b-mean)**2,0)/20),p=cl.at(-1);
 rows.push(['Bollinger',p<mean-2*sd?1:p>mean+2*sd?-1:p>mean?0.3:-0.3,p>mean?'mid से ऊपर':'mid से नीचे']);
 const s=c.slice(-14),hi=Math.max(...s.map(x=>x.h)),lo=Math.min(...s.map(x=>x.l)),k=(p-lo)/(hi-lo||1)*100;
 rows.push(['Stoch 14',k<20?1:k>80?-1:0,k.toFixed(0)]);
 const l3=c.slice(-3),mom=l3.every(x=>x.c>x.o)?1:l3.every(x=>x.c<x.o)?-1:0;
 rows.push(['Last 3 candles',mom,mom>0?'3 हरी':mom<0?'3 लाल':'mixed']);
 const sc=rows.reduce((a,x)=>a+x[1],0),conf=Math.min(100,Math.round(Math.abs(sc)/rows.length*130));
 return{rows,dir:sc>0.5?'UP':sc<-0.5?'DOWN':'NEUTRAL',conf,p}}
function card(id,label,a,ts){
 const el=$(id);if(!a){el.innerHTML=`<div class="mu">${label}</div>डेटा लोड हो रहा है…`;return}
 const cls=a.dir==='UP'?'up':a.dir==='DOWN'?'dn':'mu',ar=a.dir==='UP'?'▲':a.dir==='DOWN'?'▼':'—';
 el.innerHTML=`<div class="mu">${label}</div><div class="big ${cls}">${ar} ${a.dir}</div>
 <div>Confidence: <b>${a.conf}%</b></div><div class="mu">Entry: ${a.p} • ${ts}</div>
 <table>${a.rows.map(r=>`<tr><td>${r[0]}</td><td class="${r[1]>0?'up':r[1]<0?'dn':'mu'}">${r[1]>0?'▲':r[1]<0?'▼':'•'}</td><td class="mu">${r[2]}</td></tr>`).join('')}</table>`}
$('btn').onclick=()=>{
 const ts=new Date().toLocaleTimeString(),a1=analyze(c1),a2=analyze(agg2(c1));
 card('r1','1 मिनट',a1,ts);card('r2','2 मिनट',a2,ts);
 if(a1){hist.unshift(`${ts} ${pair} 1m:${a1.dir}(${a1.conf}%) 2m:${a2?a2.dir+'('+a2.conf+'%)':'-'}`);hist=hist.slice(0,15);
 try{localStorage.setItem('h',JSON.stringify(hist))}catch(e){}renderH()}
 if(navigator.vibrate)navigator.vibrate(60)};
const renderH=()=>$('hist').innerHTML=hist.join('<br>')||'—';renderH();

async function start(){
 if(ws){ws.onclose=null;ws.close()}
 $('st').textContent='connecting…';
 try{const r=await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&limit=300`);
  c1=(await r.json()).map(k=>({t:k[0],o:+k[1],h:+k[2],l:+k[3],c:+k[4]}))}catch(e){$('st').textContent='history error'}
 connect()}
function connect(){
 ws=new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@kline_1m`);
 ws.onopen=()=>$('st').textContent='🟢 live';
 ws.onmessage=m=>{const k=JSON.parse(m.data).k,x={t:k.t,o:+k.o,h:+k.h,l:+k.l,c:+k.c};
  if(c1.length&&c1.at(-1).t===x.t)c1[c1.length-1]=x;else{c1.push(x);if(c1.length>400)c1.shift()}
  $('price').textContent=x.c};
 ws.onclose=()=>{$('st').textContent='🔴 reconnecting…';setTimeout(connect,2000)};
 ws.onerror=()=>ws.close()}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(!ws||ws.readyState>1))start()});
start();
