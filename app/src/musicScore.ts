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
var S=null,ctx=null,master,out,filt,droneG,hissG,nb,G=null,playing=false,timer=null,step=0,nextTime=0;
var ROOT=110; // A2
// Chord roots (semitones above ROOT) and quality (1 = minor triad), one chord per bar of 8 steps.
var PROG_MAJ=[[0,0],[9,1],[5,0],[7,0]]; // I  vi IV V
var PROG_MIN=[[0,1],[8,0],[3,0],[10,0]]; // i  VI III VII
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function label(){
  if(!S||!S.layers.length){s.textContent='Scan a receipt to compose';return}
  s.textContent=(S.minor?'Minor':'Major')+' \\u00b7 '+Math.round(S.bpm)+' bpm \\u00b7 smog '+Math.round(S.smog*100)+'%';
}
window.setScore=function(sc){
  sc.layers.forEach(function(L){L.rand=rng(L.seed);L.idx=2});
  G=rng((sc.layers[0]?sc.layers[0].seed:1)+7);
  S=sc;label();if(ctx)apply();
};
function chord(n){
  var p=(S.minor?PROG_MIN:PROG_MAJ)[Math.floor(n/8)%4];
  return [p[0],p[0]+(p[1]?3:4),p[0]+7];
}
function apply(){
  var t=ctx.currentTime;
  filt.frequency.setTargetAtTime(1400+(1-S.smog)*7000,t,.3);
  droneG.gain.setTargetAtTime(S.smog*.035,t,.5);
  hissG.gain.setTargetAtTime(S.smog*.025,t,.5);
}
function reverbIR(){
  var len=Math.floor(ctx.sampleRate*2.4),buf=ctx.createBuffer(2,len,ctx.sampleRate);
  for(var ch=0;ch<2;ch++){var d=buf.getChannelData(ch);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}
  return buf;
}
function init(){
  ctx=new(window.AudioContext||window.webkitAudioContext)();
  var comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-20;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=.01;comp.release.value=.25;
  comp.connect(ctx.destination);
  out=ctx.createGain();out.gain.value=0;out.connect(comp); // fades in/out on play/pause
  master=ctx.createGain();master.gain.value=.85;master.connect(out);
  filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=8000;filt.Q.value=.5;
  filt.connect(master);
  // Room reverb + a soft echo give the notes space.
  var verb=ctx.createConvolver();verb.buffer=reverbIR();
  var verbG=ctx.createGain();verbG.gain.value=.32;
  filt.connect(verb);verb.connect(verbG);verbG.connect(master);
  var dl=ctx.createDelay(1);dl.delayTime.value=.36;
  var fb=ctx.createGain();fb.gain.value=.22;
  var wet=ctx.createGain();wet.gain.value=.16;
  filt.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(master);
  nb=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
  var d=nb.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  // Smog: a low, muffled drone and a hiss.
  droneG=ctx.createGain();droneG.gain.value=0;
  var dlp=ctx.createBiquadFilter();dlp.type='lowpass';dlp.frequency.value=320;
  droneG.connect(dlp);dlp.connect(master);
  [55,77.78].forEach(function(f){var o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(droneG);o.start()});
  hissG=ctx.createGain();hissG.gain.value=0;
  var hs=ctx.createBufferSource();hs.buffer=nb;hs.loop=true;
  var hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=5000;
  hs.connect(hp);hp.connect(hissG);hissG.connect(master);hs.start();
}
// One voice: two slightly detuned oscillators through a per-note filter, with attack and release.
function voice(wave,f,t,len,gain){
  var harsh=wave==='sawtooth'||wave==='square';
  var g=ctx.createGain(),lp=ctx.createBiquadFilter();
  lp.type='lowpass';lp.Q.value=.7;
  lp.frequency.setValueAtTime(harsh?2600:6000,t);
  lp.frequency.exponentialRampToValueAtTime(harsh?700:2500,t+Math.max(.15,len));
  var atk=len>1.2?.06:.008,peak=gain*(harsh?.05:.09),end=t+len+.25;
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(peak,t+atk);
  g.gain.exponentialRampToValueAtTime(peak*.55,t+atk+Math.min(.3,len*.5));
  g.gain.exponentialRampToValueAtTime(.0001,end);
  lp.connect(g);g.connect(filt);
  [-6,6].forEach(function(cents){
    var o=ctx.createOscillator();o.type=wave;o.frequency.value=f;
    o.detune.value=cents+(G()-.5)*S.smog*60;
    o.connect(lp);o.start(t);o.stop(end+.05);
  });
}
function bass(f,t,len){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';o.frequency.value=f;
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(.16,t+.03);
  g.gain.exponentialRampToValueAtTime(.0001,t+len);
  o.connect(g);g.connect(filt);o.start(t);o.stop(t+len+.05);
}
function hat(t,v){
  var c=ctx.createBufferSource();c.buffer=nb;
  var hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=7500;
  var g=ctx.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.04);
  c.connect(hp);hp.connect(g);g.connect(master);c.start(t,G()*.5,.05);
}
function thump(t){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);
  g.gain.setValueAtTime(.3,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+.22);
  var c=ctx.createBufferSource();c.buffer=nb;
  var bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1800;bp.Q.value=4;
  var cg=ctx.createGain();cg.gain.setValueAtTime(.06,t);cg.gain.exponentialRampToValueAtTime(.001,t+.07);
  c.connect(bp);bp.connect(cg);cg.connect(master);c.start(t,G()*.5,.08);
}
function play(n,t,sd){
  var ch=chord(n);
  if(n%8===0)bass(ROOT/2*Math.pow(2,ch[0]/12),t,sd*7.5);
  if(n%8===4)bass(ROOT/2*Math.pow(2,(ch[0]+7)/12),t,sd*3.5);
  S.layers.forEach(function(L){
    if(n%L.every)return;
    if(L.rand()>L.density)return;
    // Walk over the current chord's tones (two octaves), so every layer harmonises.
    var top=L.octave>=2?3:5;
    L.idx=Math.max(0,Math.min(top,L.idx+Math.floor(L.rand()*3)-1));
    var semi=ch[L.idx%3]+12*Math.floor(L.idx/3);
    var f=ROOT*Math.pow(2,L.octave+semi/12),len=sd*L.len;
    voice(L.wave,f,t,len,L.gain);
    if(L.len>=4)voice(L.wave,ROOT*Math.pow(2,L.octave+ch[(L.idx+1)%3]/12),t,len,L.gain*.7); // pads play a dyad
  });
  if(S.layers.length>1&&n%2===1)hat(t,.012+.01*(1-S.smog));
  if(n%4===2&&G()<S.factory)thump(t);
}
function tick(){
  if(!S)return;
  var sd=30/S.bpm;
  while(nextTime<ctx.currentTime+.25){
    var swing=step%2?sd*.12:0;
    play(step,nextTime+swing,sd);nextTime+=sd;step++;
  }
}
b.onclick=function(){
  if(!S||!S.layers.length)return;
  if(!ctx){init();apply()}
  var t=ctx.currentTime;
  if(!playing){
    ctx.resume();playing=true;step=0;nextTime=t+.1;
    S.layers.forEach(function(L){L.rand=rng(L.seed);L.idx=2});G=rng((S.layers[0]?S.layers[0].seed:1)+7);
    out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(1,t+.8);
    timer=setInterval(tick,50);b.className='on';ic.innerHTML='&#10074;&#10074;';
  }else{
    playing=false;clearInterval(timer);
    out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+.3);
    setTimeout(function(){if(!playing)ctx.suspend()},350);
    b.className='';ic.innerHTML='&#9654;';
  }
};
</script></body></html>`;
}
