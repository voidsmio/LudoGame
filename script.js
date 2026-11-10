const $=id=>document.getElementById(id);
const COL=['#e5484d','#2fa56b','#f2b52c','#3d7bf7'],CN=['Red','Green','Yellow','Blue'];
const START=[0,13,26,39],SAFE=[0,8,13,21,26,34,39,47],ORDER=[0,2,1,3],FACES='⚀⚁⚂⚃⚄⚅';
// ---- board geometry ----
const P=[],L=(r,c,dr,dc,n)=>{for(let i=0;i<n;i++)P.push([r+dr*i,c+dc*i])};
L(6,1,0,1,5);L(5,6,-1,0,6);L(0,7,0,1,2);L(1,8,1,0,5);L(6,9,0,1,6);L(7,14,1,0,2);
L(8,13,0,-1,5);L(9,8,1,0,6);L(14,7,0,-1,2);L(13,6,-1,0,5);L(8,5,0,-1,6);L(7,0,-1,0,2);
const HC=[0,1,2,3,4].map(i=>[[7,1+i],[1+i,7],[7,13-i],[13-i,7]]); // HC[i][color]
const BASE=[[0,0],[0,9],[9,9],[9,0]];
function xy(color,pos,k){
  if(pos<0){const[b0,b1]=BASE[color];return[b0+(k<2?2:4)+.5,b1+(k%2?4:2)+.5]}
  if(pos<=50){const c=P[(START[color]+pos)%52];return[c[0]+.5,c[1]+.5]}
  if(pos<56){const c=HC[pos-51][color];return[c[0]+.5,c[1]+.5]}
  return[[6.9,7.5],[7.5,8.1],[8.1,7.5],[7.5,6.9]].map(a=>a)[color].map((v,i)=>v+(k-1.5)*.12*(i?1:-1));
}
(function build(){
  const g=$('grid'),m={};
  P.forEach(([r,c])=>m[r*15+c]={});
  HC.forEach(a=>a.forEach(([r,c],k)=>m[r*15+c]={bg:COL[k]}));
  for(let k=0;k<4;k++){const[r,c]=P[START[k]];m[r*15+c]={bg:COL[k]}}
  SAFE.forEach(i=>{if(!START.includes(i)){const[r,c]=P[i];m[r*15+c]={t:'★'}}});
  for(let r=0;r<15;r++)for(let c=0;c<15;c++){
    const d=document.createElement('div'),o=m[r*15+c];
    if(!o)d.className='e';else{if(o.bg)d.style.background=o.bg;if(o.t)d.textContent=o.t}
    g.appendChild(d)}
})();
// ---- state / networking ----
let S=null,peer,hostConn,isHost=false,me=null,roomCode='';const conns={};
const show=id=>['home','room','game'].forEach(s=>$(s).classList.toggle('hidden',s!==id));
function toast(t){const e=$('toast');e.textContent=t;e.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add('hidden'),3500)}
const rc=()=>Array.from({length:5},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');
const nm=()=>($('name').value.trim()||'Player').slice(0,12);
function push(){for(const c of Object.values(conns))if(c.open)c.send({t:'s',s:S,code:roomCode});render(S)}
function create(){
  const name=nm();roomCode=rc();peer=new Peer('ludo-'+roomCode);
  peer.on('open',id=>{isHost=true;me=id;S={phase:'lobby',players:[],turn:0,roll:null,pcs:{},msg:'',winner:null};addPlayer(id,name);push()});
  peer.on('error',e=>e.type==='unavailable-id'?create():toast('Connection problem: '+e.type));
  peer.on('connection',c=>{
    c.on('data',d=>hostMsg(c,d));
    c.on('close',()=>{delete conns[c.peer];const p=S.players.find(p=>p.id===c.peer);if(p){if(S.phase==='lobby')S.players=S.players.filter(x=>x!==p);else{p.gone=true;if(S.players[S.turn]===p){S.roll=null;next(false);return}}push()}});
  });
}
function join(){
  const code=$('code').value.trim().toUpperCase(),name=nm();if(code.length<5)return toast('Enter the 5-letter room code');
  roomCode=code;peer=new Peer();
  peer.on('open',id=>{me=id;hostConn=peer.connect('ludo-'+code,{reliable:true});
    hostConn.on('open',()=>hostConn.send({t:'join',name}));
    hostConn.on('data',d=>{if(d.t==='s')render(d.s);if(d.t==='full')toast('Room is full or the game already started')});
    hostConn.on('close',()=>toast('Host left the room'));
    setTimeout(()=>{if(!S)toast('Room not found — check the code')},9000)});
  peer.on('error',e=>toast(e.type==='peer-unavailable'?'Room not found — check the code':'Connection problem: '+e.type));
}
