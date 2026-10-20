const fs=require('fs');
const p='D:\\Users\\datin501\\.local\\share\\opencode\\worktree\\54911b\\lucky-knight\\ScreenLog\\src\\components\\DetailModal.tsx';
const s=fs.readFileSync(p,'utf8');
console.log(s.match(/max-h-\[/g));
