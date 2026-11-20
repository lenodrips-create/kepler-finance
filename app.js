  // ---------- Settings & data ----------
  const NAME = "Lennon";
  const months  = ["Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov"];
  const revenue = [7200,7900,8100,8800,9300,9100,10200,10900,11400,11800,11880,12840];
  const stocks = [
    {t:"AMZN", n:"Amazon",    p:214.05, c: 2.1, lo:151.6, hi:233.0},
    {t:"AAPL", n:"Apple",     p:231.40, c: 1.2, lo:164.1, hi:237.5},
    {t:"MSFT", n:"Microsoft", p:468.15, c: 0.8, lo:385.6, hi:480.9},
    {t:"GOOGL",n:"Alphabet",  p:187.22, c: 0.4, lo:130.7, hi:191.8},
    {t:"TSLA", n:"Tesla",     p:331.88, c:-0.7, lo:182.0, hi:358.6},
    {t:"NVDA", n:"NVIDIA",    p:142.70, c:-1.9, lo: 86.6, hi:152.9},
  ];
  const news = [
    {cat:"Stocks",      title:"Tech shares edge higher ahead of earnings week",        time:"2h ago"},
    {cat:"Investments", title:"What rising bond yields mean for a balanced portfolio",  time:"4h ago"},
    {cat:"Revenue",     title:"Small businesses report stronger holiday-season sales", time:"6h ago"},
    {cat:"Markets",     title:"Index funds see record inflows this quarter",           time:"8h ago"},
    {cat:"Crypto",      title:"Crypto prices steady after a volatile week",            time:"Yesterday"},
    {cat:"Economy",     title:"Consumer spending holds up through November",           time:"Yesterday"},
  ];
  const alloc    = [["US stocks",46],["Index funds",28],["Bonds",12],["Crypto",8],["Cash",6]];
  const accounts = [["Brokerage","Taxable",24100],["Roth IRA","Retirement",15200],["High-yield savings","Cash",8960]];

  // ---------- Helpers ----------
  const $ = id => document.getElementById(id);
  const money = n => "$" + Math.round(n).toLocaleString("en-US");
  const signed = (c, unit="%") => `<span class="${c>=0?'pos':'neg'}">${c>=0?'+':'−'}${Math.abs(c).toFixed(1)}${unit}</span>`;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // deterministic fake 30-day series per ticker, ending on today's move
  function series(seed, trend){
    let x = seed * 9301 % 233280, v = 100, out=[];
    for(let i=0;i<30;i++){ x=(x*9301+49297)%233280; v += (x/233280-.5)*3 + trend*.12; out.push(v); }
    return out;
  }
  function spark(vals, w=90, h=24){
    const mn=Math.min(...vals), mx=Math.max(...vals);
    const pts = vals.map((v,i)=>`${(i/(vals.length-1)*w).toFixed(1)},${(h-2-(v-mn)/(mx-mn||1)*(h-4)).toFixed(1)}`).join(" ");
    const col = vals.at(-1)>=vals[0] ? css("--pos") : css("--neg");
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  }

  function lineChart(el, vals, labels, h=260){
    const w=Math.max(340, el.clientWidth||720), L=40, R=8, T=12, B=26;
    const lo = Math.floor(Math.min(...vals)*.9/1000)*1000, hi = Math.ceil(Math.max(...vals)*1.05/1000)*1000;
    const X = i => L + i*(w-L-R)/(vals.length-1);
    const Y = v => T + (1-(v-lo)/(hi-lo))*(h-T-B);
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Monthly revenue, ${labels[0]} to ${labels.at(-1)}">`;
    const steps = 4, every = w<520 ? 2 : 1;
    for(let i=0;i<=steps;i++){
      const v = lo + (hi-lo)*i/steps, y=Y(v);
      s += `<line x1="${L}" x2="${w-R}" y1="${y}" y2="${y}" stroke="${css('--rule-2')}"/>`;
      s += `<text class="axis" x="${L-8}" y="${y+4}" text-anchor="end">${(v/1000).toFixed(0)}k</text>`;
    }
    labels.forEach((m,i)=>{ if(i%every && i!==labels.length-1) return; s += `<text class="axis" x="${X(i)}" y="${h-6}" text-anchor="middle">${m}</text>`; });
    const pts = vals.map((v,i)=>`${X(i)},${Y(v)}`).join(" ");
    s += `<polygon points="${X(0)},${h-B} ${pts} ${X(vals.length-1)},${h-B}" fill="${css('--pos')}" opacity=".12"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${css('--pos')}" stroke-width="2" stroke-linejoin="round"/>`;
    s += `<line class="xh" y1="${T}" y2="${h-B}" stroke="${css('--muted')}" stroke-dasharray="2 3" visibility="hidden"/>`;
    s += `<circle class="dot" r="4" fill="${css('--paper')}" stroke="${css('--pos')}" stroke-width="2"/>`;
    s += `<rect class="hit" x="${L}" y="${T}" width="${w-L-R}" height="${h-T-B}" fill="transparent"/>`;
    s += `</svg><div class="readout" aria-live="polite"></div>`;
    el.innerHTML = s;

    const svg=el.querySelector("svg"), dot=el.querySelector(".dot"), xh=el.querySelector(".xh"), out=el.querySelector(".readout");
    const set = i => {
      dot.setAttribute("cx",X(i)); dot.setAttribute("cy",Y(vals[i]));
      xh.setAttribute("x1",X(i)); xh.setAttribute("x2",X(i));
      const prev = i ? (vals[i]-vals[i-1])/vals[i-1]*100 : null;
      out.innerHTML = `${labels[i]} &nbsp;<b>${money(vals[i])}</b>` + (prev!==null ? ` &nbsp;${signed(prev)}` : "");
    };
    const last = vals.length-1;
    svg.addEventListener("pointermove", e=>{
      const r=svg.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*w;
      const i=Math.max(0,Math.min(last,Math.round((x-L)/((w-L-R)/last))));
      xh.setAttribute("visibility","visible"); set(i);
    });
    svg.addEventListener("pointerleave", ()=>{ xh.setAttribute("visibility","hidden"); set(last); });
    set(last);
  }

  // ---------- Render ----------
  
  const now = new Date(), hr = now.getHours();
  $("greeting").textContent = `Hello, ${NAME}`;
  $("today").textContent = now.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  const wk = now.getDay()>0 && now.getDay()<6, mins = hr*60+now.getMinutes();
  $("mkt").textContent = (wk && mins>=570 && mins<960) ? "open" : "closed";

  const total = accounts.reduce((a,x)=>a+x[2],0);
  if($("netWorth")) $("netWorth").textContent = money(total);

  const drawCharts = () => {
    if($("homeChart")) lineChart($("homeChart"), revenue, months);
    if($("revChart"))  lineChart($("revChart"), revenue, months, 300);
  };
  drawCharts();
  let rz; addEventListener("resize", ()=>{ clearTimeout(rz); rz=setTimeout(drawCharts,150); });

  const imgIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/></svg>`;
  if($("newsList")){
  $("newsList").innerHTML = news.map(n=>`
    <li><a href="#home">
      <div class="ph" role="img" aria-label="${n.cat} image placeholder">${imgIcon}</div>
      <div class="cat">${n.cat}</div>
      <h3>${n.title}</h3>
      <time>${n.time}</time>
    </a></li>`).join("");

  }
  const withSeries = stocks.map((s,i)=>({...s, sp: series(i+3, s.c)}));
  if($("homeWatch")){
  $("homeWatch").innerHTML = withSeries.slice(0,5).map(s=>`
    <tr><td><span class="tick">${s.t}</span></td>
        <td class="r">${spark(s.sp,70,20)}</td>
        <td class="r num">${s.p.toFixed(2)}</td>
        <td class="r num">${signed(s.c)}</td></tr>`).join("");

  }
  if($("stockTable")){
  $("stockTable").innerHTML = withSeries.map(s=>{
    const pos = (s.p-s.lo)/(s.hi-s.lo)*100;
    return `<tr><td><span class="tick">${s.t}</span></td>
      <td class="co hide-sm">${s.n}</td>
      <td class="r num">${s.p.toFixed(2)}</td>
      <td class="r num">${signed(s.c)}</td>
      <td class="r hide-sm">${spark(s.sp)}</td>
      <td class="r hide-sm"><div class="range" title="${s.lo} – ${s.hi}"><i style="left:${pos}%"></i></div></td></tr>`;
  }).join("");

  }
  const colors = ["--c1","--c2","--c3","--c4","--c5"].map(css);
  if($("allocTotal")){
  $("allocTotal").textContent = money(total);
  $("allocBar").innerHTML = alloc.map(([l,v],i)=>`<i style="flex:${v};background:${colors[i]}" title="${l} ${v}%"></i>`).join("");
  $("allocBar").setAttribute("aria-label", alloc.map(([l,v])=>`${l} ${v}%`).join(", "));
  $("allocTable").innerHTML = alloc.map(([l,v],i)=>`
    <tr><td><span class="sw" style="background:${colors[i]}"></span>${l}</td>
        <td class="r num">${v}%</td><td class="r num">${money(total*v/100)}</td></tr>`).join("");

  }
  if($("accounts")){
  $("accounts").innerHTML = accounts.map(([n,t,v])=>`
    <tr><td>${n}<div class="co">${t}</div></td>
        <td class="r num">${money(v)}<div class="co">${(v/total*100).toFixed(0)}%</div></td></tr>`).join("");

  }
  const sum = revenue.reduce((a,b)=>a+b,0), bi = revenue.indexOf(Math.max(...revenue));
  if($("ytd")){
  $("ytd").textContent  = money(sum);
  $("best").textContent = money(revenue[bi]);
  $("best").insertAdjacentHTML("afterend", `<div class="d">${months[bi]}</div>`);
  $("avg").textContent  = money(sum/revenue.length);
  $("revTable").innerHTML = revenue.map((v,i)=>({m:months[i],v,c:i?(v-revenue[i-1])/revenue[i-1]*100:null}))
    .reverse().map(r=>`<tr><td>${r.m}</td><td class="r num">${money(r.v)}</td><td class="r num">${r.c===null?'<span class="co">—</span>':signed(r.c)}</td></tr>`).join("");

  }
  // ---------- Nav: mark current page ----------
  const page = document.body.dataset.page;
  document.querySelectorAll("nav ul a").forEach(a=>{ if(a.dataset.page===page) a.setAttribute("aria-current","page"); });
