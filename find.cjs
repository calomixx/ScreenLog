const fs=require('fs');
const p='D:\\Users\\datin501\\.local\\share\\opencode\\worktree\\54911b\\lucky-knight\\ScreenLog\\src\\components\\DetailModal.tsx';
const s=fs.readFileSync(p,'utf8');
const idx=s.indexOf('max-h-[95vh]');
console.log(idx);
if(idx>=0) console.log(s.substring(idx-40,idx+80));
