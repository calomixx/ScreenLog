const fs = require('fs');
const p = 'D:\\Users\\datin501\\.local\\share\\opencode\\worktree\\54911b\\lucky-knight\\ScreenLog\\src\\components\\DetailModal.tsx';
const s = fs.readFileSync(p, 'utf8');
const i = s.indexOf('relative w-full max-w-5xl');
console.log(i);
if(i >= 0) {
  console.log(s.substring(i-10, i+200));
}
