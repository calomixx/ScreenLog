const fs = require('fs');
const p = 'D:\\Users\\datin501\\.local\\share\\opencode\\worktree\\54911b\\lucky-knight\\ScreenLog\\src\\components\\DetailModal.tsx';
const s = fs.readFileSync(p, 'utf8');
const idx = s.indexOf('overflow-y-auto');
console.log(idx);
if(idx >= 0) {
  console.log(s.substring(idx-220, idx+90));
}
