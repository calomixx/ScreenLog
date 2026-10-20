const fs=require('fs');
const p='D:\\Users\\datin501\\.local\\share\\opencode\\worktree\\54911b\\lucky-knight\\ScreenLog\\src\\components\\DetailModal.tsx';
const s=fs.readFileSync(p,'utf8');
const bad=  h-[92vh] sm:h-auto sm:max-h-[95vh]";
if(s.includes(bad)){
  s=s.replace(bad,   h-[92vh] sm:h-auto sm:max-h-[95vh]");
}
fs.writeFileSync(p,s);
console.log('ok');
