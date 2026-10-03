const $=s=>document.querySelector(s);
const els={sections:$("#sections"),template:$("#sectionTemplate"),start:$("#startBtn"),reset:$("#resetBtn"),prev:$("#prevBtn"),next:$("#nextBtn"),add:$("#addSectionBtn"),volume:$("#volume"),countIn:$("#countIn"),loop:$("#loopProgram"),pulse:$("#pulse"),beat:$("#beatDisplay"),bpm:$("#bpmDisplay"),sig:$("#signatureDisplay"),measure:$("#measureDisplay"),totalMeasure:$("#totalMeasureDisplay"),section:$("#sectionDisplay"),totalSection:$("#totalSectionDisplay"),progress:$("#progressBar"),nextChange:$("#nextChange")};

const STORAGE_KEY="samantha-metronome-program-v3";
const DEFAULT_PROGRAM=[
  {measures:4,bpm:60,signature:"3/4"},   // 1–4
  {measures:4,bpm:60,signature:"3/4"},   // 5–8
  {measures:8,bpm:60,signature:"3/4"},   // 9–16
  {measures:4,bpm:144,signature:"4/4"},  // 17–20
  {measures:4,bpm:144,signature:"4/4"},  // 21–24
  {measures:4,bpm:144,signature:"4/4"},  // 25–28
  {measures:4,bpm:144,signature:"4/4"},  // 29–32
  {measures:4,bpm:144,signature:"4/4"},  // 33–36
  {measures:4,bpm:144,signature:"4/4"},  // 37–40
  {measures:4,bpm:144,signature:"4/4"},  // 41–44
  {measures:4,bpm:144,signature:"4/4"},  // 45–48
  {measures:4,bpm:144,signature:"4/4"},  // 49–52
  {measures:4,bpm:144,signature:"4/4"},  // 53–56
  {measures:4,bpm:144,signature:"4/4"},  // 57–60
  {measures:4,bpm:144,signature:"4/4"},  // 61–64
  {measures:4,bpm:60,signature:"3/4"},   // 65–68
  {measures:4,bpm:60,signature:"3/4"},   // 69–72
  {measures:4,bpm:144,signature:"4/4"},  // 73–76
  {measures:4,bpm:144,signature:"4/4"},  // 77–80
  {measures:4,bpm:144,signature:"4/4"}   // 81–84
];
let sections=loadProgram();
let audioCtx=null, masterGain=null, timer=null, playing=false, paused=false, nextNoteTime=0, currentSection=0, measureInSection=0, globalMeasure=0, beatInMeasure=0, countInRemaining=0;
const LOOKAHEAD_MS=25, SCHEDULE_AHEAD=0.1;

function loadProgram(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));return Array.isArray(x)&&x.length?x:structuredClone(DEFAULT_PROGRAM)}catch{return structuredClone(DEFAULT_PROGRAM)}}
function saveProgram(){localStorage.setItem(STORAGE_KEY,JSON.stringify(sections))}
function parseSig(sig){const [n,d]=sig.split("/").map(Number);return{beats:n,den:d}}
function beatSeconds(section){const {den}=parseSig(section.signature);return (60/section.bpm)*(4/den)}
function totalMeasures(){return sections.reduce((a,s)=>a+s.measures,0)}
function sectionStartMeasure(i){return 1+sections.slice(0,i).reduce((a,s)=>a+s.measures,0)}
function sanitize(){sections=sections.map(s=>({measures:Math.max(1,Math.min(999,Number(s.measures)||1)),bpm:Math.max(20,Math.min(320,Number(s.bpm)||80)),signature:s.signature||"4/4"}));if(!sections.length)sections=structuredClone(DEFAULT_PROGRAM);saveProgram()}
function renderSections(){sanitize();els.sections.innerHTML="";sections.forEach((s,i)=>{const node=els.template.content.firstElementChild.cloneNode(true);const start=sectionStartMeasure(i),end=start+s.measures-1;node.querySelector(".range-badge").textContent=`Measures ${start}–${end}`;const m=node.querySelector(".measures"),b=node.querySelector(".bpm"),sig=node.querySelector(".signature");m.value=s.measures;b.value=s.bpm;sig.value=s.signature;
m.onchange=()=>{sections[i].measures=+m.value;programChanged()};b.onchange=()=>{sections[i].bpm=+b.value;programChanged()};sig.onchange=()=>{sections[i].signature=sig.value;programChanged()};
node.querySelector(".move-up").disabled=i===0;node.querySelector(".move-down").disabled=i===sections.length-1;
node.querySelector(".move-up").onclick=()=>{[sections[i-1],sections[i]]=[sections[i],sections[i-1]];programChanged()};
node.querySelector(".move-down").onclick=()=>{[sections[i+1],sections[i]]=[sections[i],sections[i+1]];programChanged()};
node.querySelector(".delete").onclick=()=>{if(sections.length>1){sections.splice(i,1);programChanged()}};
els.sections.appendChild(node)});refreshDisplay()}
function programChanged(){sanitize();stopPlayback(false);renderSections()}
function ensureAudio(){if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.connect(audioCtx.destination)}masterGain.gain.value=+els.volume.value;return audioCtx.resume()}
function clickAt(time,accent=false){const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.frequency.setValueAtTime(accent?1400:900,time);gain.gain.setValueAtTime(accent?.22:.12,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.05);osc.connect(gain);gain.connect(masterGain);osc.start(time);osc.stop(time+.055)}
function flash(accent,beat){const delay=Math.max(0,(nextNoteTime-audioCtx.currentTime)*1000);setTimeout(()=>{els.beat.textContent=beat;els.pulse.classList.remove("hit","accent");void els.pulse.offsetWidth;els.pulse.classList.add("hit");if(accent)els.pulse.classList.add("accent");setTimeout(()=>els.pulse.classList.remove("hit","accent"),90);refreshDisplay()},delay)}
function scheduleNote(){const section=sections[currentSection],{beats}=parseSig(section.signature);const accent=beatInMeasure===0;clickAt(nextNoteTime,accent);flash(accent,beatInMeasure+1);nextNoteTime+=beatSeconds(section);beatInMeasure++;
if(beatInMeasure>=beats){beatInMeasure=0;measureInSection++;globalMeasure++;if(measureInSection>=section.measures){currentSection++;measureInSection=0;if(currentSection>=sections.length){if(els.loop.checked){currentSection=0;globalMeasure=0}else{setTimeout(()=>stopPlayback(true),Math.max(0,(nextNoteTime-audioCtx.currentTime)*1000));return false}}}}return true}
function scheduler(){while(playing&&nextNoteTime<audioCtx.currentTime+SCHEDULE_AHEAD){if(countInRemaining>0){const section=sections[currentSection],{beats}=parseSig(section.signature);const accent=((countInRemaining-1)%beats)===0;clickAt(nextNoteTime,accent);nextNoteTime+=beatSeconds(section);countInRemaining--;continue}if(!scheduleNote())break}}
async function startPlayback(){if(playing){paused=true;stopPlayback(false,true);els.start.textContent="Resume";return}await ensureAudio();playing=true;paused=false;els.start.textContent="Pause";nextNoteTime=audioCtx.currentTime+.08;if(globalMeasure===0&&beatInMeasure===0&&els.countIn.checked){countInRemaining=parseSig(sections[currentSection].signature).beats}else countInRemaining=0;timer=setInterval(scheduler,LOOKAHEAD_MS);scheduler()}
function stopPlayback(resetToStart=true,preservePosition=false){playing=false;if(timer){clearInterval(timer);timer=null}if(!preservePosition&&resetToStart){currentSection=0;measureInSection=0;globalMeasure=0;beatInMeasure=0;countInRemaining=0;els.beat.textContent="1"}els.start.textContent=paused?"Resume":"Start";refreshDisplay()}
function reset(){paused=false;stopPlayback(true,false)}
function jumpSection(dir){paused=false;playing=false;if(timer)clearInterval(timer);timer=null;currentSection=Math.max(0,Math.min(sections.length-1,currentSection+dir));measureInSection=0;globalMeasure=sections.slice(0,currentSection).reduce((a,s)=>a+s.measures,0);beatInMeasure=0;els.start.textContent="Start";refreshDisplay()}
function refreshDisplay(){const s=sections[Math.min(currentSection,sections.length-1)];els.bpm.textContent=s.bpm;els.sig.textContent=s.signature;els.measure.textContent=Math.min(globalMeasure+1,totalMeasures());els.totalMeasure.textContent=totalMeasures();els.section.textContent=Math.min(currentSection+1,sections.length);els.totalSection.textContent=sections.length;const total=totalMeasures(),done=Math.min(globalMeasure,total);els.progress.style.width=`${total?done/total*100:0}%`;
const nextIdx=Math.min(currentSection+1,sections.length-1);if(currentSection<sections.length-1){const n=sections[nextIdx];els.nextChange.textContent=`Next: measure ${sectionStartMeasure(nextIdx)} → ${n.bpm} BPM, ${n.signature}`}else{els.nextChange.textContent=els.loop.checked?"End → loop back to section 1":"Final section"}}
els.start.onclick=startPlayback;els.reset.onclick=reset;els.prev.onclick=()=>jumpSection(-1);els.next.onclick=()=>jumpSection(1);els.volume.oninput=()=>{if(masterGain)masterGain.gain.value=+els.volume.value};els.loop.onchange=refreshDisplay;els.add.onclick=()=>{sections.push({measures:4,bpm:100,signature:"4/4"});programChanged()};
document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing){paused=true;stopPlayback(false,true);els.start.textContent="Resume"}});
renderSections();