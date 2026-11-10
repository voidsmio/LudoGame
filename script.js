function start(){
  if(S.players.length<2)return;S.phase='play';S.turn=0;S.roll=null;S.winner=null;
  S.players.forEach(p=>S.pcs[p.color]=[-1,-1,-1,-1]);S.msg=S.players[0].name+' starts — roll the dice';push()}
function reset(){S.phase='lobby';S.players=S.players.filter(p=>!p.gone);S.players.forEach((p,i)=>p.color=ORDER[i]);S.pcs={};push()}
function movable(pcs,r){return pcs.map((p,i)=>(p<0?r===6:p+r<=56)?i:-1).filter(i=>i>=0)}
function doRoll(id){
  const pl=S.players[S.turn];if(S.phase!=='play'||pl.id!==id||S.roll!==null)return;
  S.roll=1+Math.random()*6|0;
  if(movable(S.pcs[pl.color],S.roll).length){S.msg=pl.name+' rolled '+S.roll+' — pick a piece';push()}
  else{S.msg=pl.name+' rolled '+S.roll+' — no move';push();setTimeout(()=>next(false),1300)}}
function doMove(id,i){
  const pl=S.players[S.turn];if(S.phase!=='play'||pl.id!==id||S.roll===null)return;
  const pcs=S.pcs[pl.color];if(!movable(pcs,S.roll).includes(i))return;
  const np=pcs[i]<0?0:pcs[i]+S.roll;pcs[i]=np;let cap=false;
  if(np<=50){const a=(START[pl.color]+np)%52;
    if(!SAFE.includes(a))S.players.forEach(q=>{if(q.color!==pl.color)S.pcs[q.color]=S.pcs[q.color].map(x=>x>=0&&x<=50&&(START[q.color]+x)%52===a?(cap=true,-1):x)})}
  if(pcs.every(x=>x===56)){S.phase='over';S.winner=pl.name;S.roll=null;S.msg='🏆 '+pl.name+' wins!';return push()}
  const extra=S.roll===6||cap||np===56;
  S.msg=cap?pl.name+' captured a piece!':'';next(extra)}
function next(extra){
  S.roll=null;
  if(!extra){let n=0;do{S.turn=(S.turn+1)%S.players.length;n++}while(S.players[S.turn].gone&&n<5)}
  S.msg=(S.msg?S.msg+' ':'')+S.players[S.turn].name+(extra?' goes again':"’s turn");push()}
// ---- rendering ----
function render(s){
  S=s;
  if(s.phase==='lobby'){
    show('room');$('rc').textContent=roomCode;$('pc').textContent=s.players.length;
    $('plist').innerHTML=s.players.map(p=>`<li><span class="dot" style="background:${COL[p.color]}"></span>${esc(p.name)}${p.id===me?' (you)':''}</li>`).join('');
    $('start').classList.toggle('hidden',!isHost);$('start').disabled=s.players.length<2;
    $('wait').textContent=isHost?(s.players.length<2?'Waiting for at least one friend to join…':'Everyone in? Start the game.'):'Waiting for the host to start…';
    return}
  show('game');const cur=s.players[s.turn],mine=cur&&cur.id===me&&s.phase==='play';
  $('chips').innerHTML=s.players.map((p,i)=>`<div class="chip ${i===s.turn&&s.phase==='play'?'on':''}"><span class="dot" style="background:${COL[p.color]}"></span>${esc(p.name)}${p.gone?' ✕':''}<small>${s.pcs[p.color].filter(x=>x===56).length}/4 home</small></div>`).join('');
  const pe=$('pieces'),mv=mine&&s.roll!==null?movable(s.pcs[cur.color],s.roll):[],seen={};pe.innerHTML='';
  s.players.forEach(p=>s.pcs[p.color].forEach((pos,k)=>{
    let[r,c]=xy(p.color,pos,k);const key=r+','+c;seen[key]=(seen[key]||0);if(pos>=0&&pos<56){r-=seen[key]*.12;c+=seen[key]*.12}seen[key]++;
    const b=document.createElement('button');b.className='piece'+(p.id===me&&mv.includes(k)?' go':'');
    b.style.cssText=`left:${c/15*100}%;top:${r/15*100}%;background:${COL[p.color]}`;b.setAttribute('aria-label',CN[p.color]+' piece '+(k+1));
    if(b.classList.contains('go'))b.onclick=()=>act('move',k);else b.tabIndex=-1;pe.appendChild(b)}));
  const d=$('die');d.textContent=s.roll?FACES[s.roll-1]:'🎲';d.disabled=!(mine&&s.roll===null);
  if(s.roll){d.classList.add('roll');setTimeout(()=>d.classList.remove('roll'),250)}
  $('msg').textContent=s.phase==='over'?s.msg:(mine&&s.roll===null?'Your turn — roll the dice!':s.msg);
  $('again').style.display=s.phase==='over'&&isHost?'flex':'none';
}
const esc=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// ---- wiring ----
$('create').onclick=create;$('join').onclick=join;$('start').onclick=()=>act('start');
$('die').onclick=()=>act('roll');$('back').onclick=()=>act('reset');
$('copyc').onclick=()=>navigator.clipboard.writeText(roomCode).then(()=>toast('Code copied'));
$('copyl').onclick=()=>navigator.clipboard.writeText(location.origin+location.pathname+'?room='+roomCode).then(()=>toast('Link copied'));
const q=new URLSearchParams(location.search).get('room');if(q){$('code').value=q.toUpperCase();$('create').classList.add('hidden')}
