import type { CityState } from "./city";
import type { Category } from "./types";

type Wave = "sine" | "triangle" | "square" | "sawtooth";

export interface Layer {
  id: string;
  wave: Wave;
  octave: number; // octaves above 110 Hz
  every: number; // plays on every Nth eighth-note step
  len: number; // note length, in steps
  density: number; // 0..1 chance a step actually sounds
  gain: number; // 0..1
  seed: number;
}

export interface Score {
  bpm: number;
  minor: boolean;
  smog: number; // 0..1, detune + muffling + drone + hiss
  factory: number; // 0..1, chance of an industrial thump
  layers: Layer[];
}

// Each district is an instrument.
const VOICES: Record<Category, { wave: Wave; octave: number; every: number; len: number }> = {
  groceries: { wave: "triangle", octave: 0, every: 4, len: 4 },
  dining: { wave: "sine", octave: 1, every: 2, len: 3 },
  transport: { wave: "sawtooth", octave: 1, every: 1, len: 1 },
  entertainment: { wave: "square", octave: 2, every: 2, len: 1.5 },
  household: { wave: "sine", octave: 0, every: 8, len: 8 },
  health: { wave: "sine", octave: 2, every: 4, len: 4 },
  clothing: { wave: "triangle", octave: 2, every: 2, len: 2 },
  tech_subscriptions: { wave: "square", octave: 1, every: 1, len: 0.6 },
  other: { wave: "triangle", octave: 1, every: 3, len: 2 },
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Turn the city into music: bigger districts play more, smog makes it dirty and slow-muffled. */
export function buildScore(city: CityState): Score {
  const total = Math.max(city.totalSpend, 1);
  const base = Math.round(city.totalSpend * 100) + city.itemCount * 7;
  return {
    bpm: 74 + (100 - city.health) * 0.45,
    minor: city.health < 50,
    smog: clamp(city.pollution / 6, 0, 1),
    factory: clamp(city.impulseShare * 1.5, 0, 0.9),
    layers: city.districts.slice(0, 5).map((d, i) => {
      const share = d.spend / total;
      const v = VOICES[d.category];
      return {
        id: d.category,
        ...v,
        density: clamp(0.25 + share * 1.2, 0.25, 0.9),
        gain: clamp(0.4 + share * 1.5, 0.4, 1),
        seed: base + i * 101,
      };
    }),
  };
}

/** Self-contained Web Audio page. The play button lives inside it so iOS accepts the tap as a user gesture. */
export function buildHtml(c: { bg: string; accent: string; onAccent: string; ink: string; muted: string }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0}
html,body{height:100%;background:transparent;font-family:-apple-system,system-ui,sans-serif;overflow:hidden}
#b{display:flex;align-items:center;gap:12px;width:100%;height:100%;padding:0 12px;border:0;border-radius:18px;background:${c.bg};color:${c.ink};text-align:left;font:inherit}
#ic{width:42px;height:42px;flex-shrink:0;border-radius:21px;background:${c.accent};color:${c.onAccent};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800}
#k{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:${c.muted}}
#t{font-weight:800;font-size:14px;margin-top:1px}
#s{font-size:12px;color:${c.muted};margin-top:1px}
.eq{margin-left:auto;display:flex;gap:3px;align-items:flex-end;height:20px}
.eq i{width:3px;background:${c.accent};height:4px;border-radius:2px}
.on .eq i{animation:e .6s ease-in-out infinite alternate}
.on .eq i:nth-child(2){animation-delay:.15s}
.on .eq i:nth-child(3){animation-delay:.3s}
.on .eq i:nth-child(4){animation-delay:.45s}
@keyframes e{to{height:20px}}
</style></head><body>
<button id="b"><div id="ic">&#9654;</div><div><div id="k">Now playing</div><div id="t">Your city's soundtrack</div><div id="s">Scan a receipt to compose</div></div><div class="eq"><i></i><i></i><i></i><i></i></div></button>
<script>
var b=document.getElementById('b'),ic=document.getElementById('ic'),s=document.getElementById('s');
var S=null,ctx=null,master,filt,droneG,hissG,nb,playing=false,timer=null,step=0,nextTime=0;
var SC_MAJ=[0,2,4,7,9],SC_MIN=[0,3,5,7,10],ROOT=110;
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function label(){
  if(!S||!S.layers.length){s.textContent='Scan a receipt to compose';return}
  s.textContent=(S.minor?'Minor':'Major')+' \\u00b7 '+Math.round(S.bpm)+' bpm \\u00b7 smog '+Math.round(S.smog*100)+'%';
}
window.setScore=function(sc){
  sc.layers.forEach(function(L){L.rand=rng(L.seed);L.idx=2});
  S=sc;label();if(ctx)apply();
};
function apply(){
  var t=ctx.currentTime;
  filt.frequency.setTargetAtTime(1200+(1-S.smog)*6000,t,.3);
  droneG.gain.setTargetAtTime(S.smog*.05,t,.5);
  hissG.gain.setTargetAtTime(S.smog*.04,t,.5);
}
function init(){
  ctx=new(window.AudioContext||window.webkitAudioContext)();
  master=ctx.createGain();master.gain.value=.8;master.connect(ctx.destination);
  filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=7000;filt.connect(master);
  var dl=ctx.createDelay(1);dl.delayTime.value=.3;
  var fb=ctx.createGain();fb.gain.value=.3;
  var wet=ctx.createGain();wet.gain.value=.25;
  filt.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(master);
  nb=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
  var d=nb.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  droneG=ctx.createGain();droneG.gain.value=0;droneG.connect(filt);
  [55,77.78].forEach(function(f){var o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(droneG);o.start()});
  hissG=ctx.createGain();hissG.gain.value=0;
  var hs=ctx.createBufferSource();hs.buffer=nb;hs.loop=true;
  var hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=4000;
  hs.connect(hp);hp.connect(hissG);hissG.connect(master);hs.start();
}
function note(L,f,t,len){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.type=L.wave;o.frequency.value=f;o.detune.value=(Math.random()-.5)*S.smog*70;
  var end=t+len;
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(.11*L.gain,t+.015);
  g.gain.exponentialRampToValueAtTime(.0001,end);
  o.connect(g);g.connect(filt);o.start(t);o.stop(end+.05);
}
function thump(t){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(40,t+.12);
  g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+.2);
  var c=ctx.createBufferSource();c.buffer=nb;
  var cg=ctx.createGain();cg.gain.setValueAtTime(.08,t);cg.gain.exponentialRampToValueAtTime(.001,t+.05);
  c.connect(cg);cg.connect(master);c.start(t,Math.random()*.5,.06);
}
function play(n,t,sd){
  S.layers.forEach(function(L){
    if(n%L.every)return;
    if(L.rand()>L.density)return;
    L.idx=Math.max(0,Math.min(9,L.idx+Math.floor(L.rand()*5)-2));
    var sc=S.minor?SC_MIN:SC_MAJ;
    var semi=sc[L.idx%5]+12*Math.floor(L.idx/5);
    note(L,ROOT*Math.pow(2,L.octave+semi/12),t,sd*L.len);
  });
  if(n%4===2&&Math.random()<S.factory)thump(t);
}
function tick(){
  if(!S)return;
  var sd=30/S.bpm;
  while(nextTime<ctx.currentTime+.25){play(step,nextTime,sd);nextTime+=sd;step++}
}
b.onclick=function(){
  if(!S||!S.layers.length)return;
  if(!ctx){init();apply()}
  if(!playing){
    ctx.resume();playing=true;step=0;nextTime=ctx.currentTime+.1;
    timer=setInterval(tick,50);b.className='on';ic.innerHTML='&#10074;&#10074;';
  }else{
    playing=false;clearInterval(timer);ctx.suspend();b.className='';ic.innerHTML='&#9654;';
  }
};
</script></body></html>`;
}