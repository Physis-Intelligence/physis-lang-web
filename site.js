'use strict';
// Draw the release-paper trajectories with numerical axes and accessible text.
function trajectory(hostId, iterations, values, min, max, ticks, metric) {
  const w = 480, h = 255, left = 48, right = 25, top = 33, bottom = 49;
  const x = i => left + (i - 1) / 8 * (w - left - right);
  const y = v => top + (max - v) / (max - min) * (h - top - bottom);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', metric + ': ' + iterations.map((i,j) => `iteration ${i}, ${values[j]}`).join('; '));
  function el(tag, attrs, text) { const e = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k,v)); if(text != null)e.textContent=text; svg.appendChild(e); return e; }
  ticks.forEach(t => { el('line', {x1:left,y1:y(t),x2:w-right,y2:y(t),stroke:'#e2e9e3','stroke-dasharray':'3 4'}); el('text',{x:left-12,y:y(t)+4,'text-anchor':'end',fill:'#78877c','font-size':12},t); });
  const distances=[0];
  iterations.slice(1).forEach((it,j)=>distances.push(distances[j]+Math.hypot(x(it)-x(iterations[j]),y(values[j+1])-y(values[j]))));
  el('polyline',{'class':'trajectory-line',pathLength:1,points:iterations.map((i,j)=>`${x(i)},${y(values[j])}`).join(' '),fill:'none',stroke:'#28734d','stroke-width':2.5,'stroke-linejoin':'round'});
  iterations.forEach((i,j)=>{const key=i===1||i===9;const delay=`--point-delay:${Math.round(distances[j]/distances.at(-1)*1500)}ms`;el('circle',{'class':'trajectory-point',style:delay,cx:x(i),cy:y(values[j]),r:key?5:4,fill:key?'#28734d':'#fff',stroke:'#28734d','stroke-width':2}); if(key||iterations.length<5) el('text',{'class':'trajectory-value',style:delay,x:x(i)+(i===1?6:0),y:y(values[j])-13,'text-anchor':i===1?'start':i===9?'end':'middle','font-size':12,fill:'#175c40','font-weight':600},values[j].toFixed(2)); el('text',{x:x(i),y:h-28,'text-anchor':'middle',fill:'#78877c','font-size':12},i);});
  el('text',{x:w/2,y:h-7,'text-anchor':'middle',fill:'#78877c','font-size':12},'Guideline iteration');
  document.getElementById(hostId).appendChild(svg);
}
trajectory('caption-chart',[1,2,3,4,5,6,7,8,9],[78.64,76.28,78.03,81.71,81.50,81.19,81.76,81.63,87.82],74,91,[75,80,85,90],'PhysCapBench F1');
trajectory('generation-chart',[1,4,8,9],[64.17,65.63,65.83,67.29],63,69,[63,65,67,69],'PhyGenBench score');

const benchmarks = [
  ['PhyGenBench',[61.67,65.63,71.04],60,72],
  ['Physics-IQ Verified',[40.23,34.99,43.41],32,44],
  ['VideoPhy-2 · Hard',[48.31,58.43,62.36],45,65],
  ['PhyGround',[65.18,69.24,69.90],64,72]
];
const colors = ['#b6c4bb','#859dbb','#175c40'];
const names = ['Cosmos3-Nano','Veo 3.1','Physis-Lang (Cosmos3-Nano)'];
document.getElementById('result-bars').innerHTML = benchmarks.map(([label,scores,min,max]) => `<article class="result-panel"><h3>${label}</h3>${scores.map((v,i)=>`<div class="score-row" aria-label="${names[i]}: ${v}"><div class="score-track" aria-hidden="true"><div class="score-fill" style="width:${(v-min)/(max-min)*100}%;background:${colors[i]}"></div></div><b>${v.toFixed(2)}</b></div>`).join('')}<div class="score-scale" aria-label="Score axis from ${min} to ${max}"><span>${min}</span><span>${(min+max)/2}</span><span>${max}</span></div><p class="score-axis-note">Score · axis starts at ${min}</p></article>`).join('');

// Native video playback works both on GitHub Pages and from local files.
const mediaObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); });
}, {threshold: 0.05});
document.querySelectorAll('video').forEach(video => mediaObserver.observe(video));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());
});

document.getElementById('copy-citation').addEventListener('click',async function(){const text=document.getElementById('bibtex').textContent;try{await navigator.clipboard.writeText(text);this.textContent='Copied';document.getElementById('copy-status').textContent='Citation copied to clipboard.';}catch{const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(document.getElementById('bibtex'));selection.removeAllRanges();selection.addRange(range);this.textContent='Selected — copy text';document.getElementById('copy-status').textContent='Citation selected. Copy the selected text.';}setTimeout(()=>{this.textContent='Copy BibTeX';},2500);});

const navObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('.topbar nav a').forEach(a=>{const active=a.hash==='#'+e.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}});},{rootMargin:'-15% 0px -60% 0px'});
['overview','method','results','gallery'].forEach(id=>navObserver.observe(document.getElementById(id)));

// Figure 5: animate once on entry, with explicit replay and reduced-motion support.
const retrievalChart = document.getElementById('retrieval-chart');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reducedMotion.matches) retrievalChart.classList.add('animate-ready');
const retrievalObserver = new IntersectionObserver(entries => {
  if (entries.some(entry => entry.isIntersecting)) {
    retrievalChart.classList.add('is-visible');
    retrievalObserver.disconnect();
  }
}, {threshold:0.2});
retrievalObserver.observe(retrievalChart);
let retrievalReplayTimer;
document.getElementById('replay-retrieval').addEventListener('click', () => {
  if(reducedMotion.matches)return;
  clearTimeout(retrievalReplayTimer);
  retrievalChart.classList.remove('is-visible');
  retrievalReplayTimer=setTimeout(()=>retrievalChart.classList.add('is-visible'),80);
});

// Reveal each chart when it enters the viewport, including stacked mobile cards.
function setupChartAnimation(targets, replayId) {
  let replayTimer;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('chart-visible');observer.unobserve(entry.target);}
  }),{threshold:0.25});
  targets.forEach(target=>{if(!reducedMotion.matches)target.classList.add('chart-animated');observer.observe(target);});
  document.getElementById(replayId).addEventListener('click',()=>{
    if(reducedMotion.matches)return;
    clearTimeout(replayTimer);
    targets.forEach(target=>{observer.unobserve(target);target.classList.remove('chart-visible');});
    replayTimer=setTimeout(()=>targets.forEach(target=>target.classList.add('chart-visible')),80);
  });
}
setupChartAnimation([...document.querySelectorAll('#evolution .chart-card')],'replay-evolution');
document.querySelectorAll('#result-bars .result-panel').forEach(panel=>panel.querySelectorAll('.score-row').forEach((row,i)=>row.style.setProperty('--bar-delay',`${i*140}ms`)));
setupChartAnimation([...document.querySelectorAll('#result-bars .result-panel')],'replay-results');
