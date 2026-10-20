const fs=require('fs');
const p='D:\\Users\\datin501\\.local\\share\\opencode\\worktree\\54911b\\lucky-knight\\ScreenLog\\src\\components\\DetailModal.tsx';
let s=fs.readFileSync(p,'utf8');
const idx=s.indexOf('h-[92vh] sm:h-auto');
if(idx>=0){
  // look back to find start of className
  const start=s.lastIndexOf('className="',idx);
  const end=s.indexOf('"',idx+20)+1;
  if(start>=0 && end>start){
    // replace the broken className with fixed
    const fixed='className="relative w-full max-w-4xl bg-[#141416] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/90 my-auto text-slate-100 flex flex-col h-[92vh] sm:h-[88vh] md:h-[90vh]"';
    s=s.substring(0,start)+fixed+s.substring(end);
    fs.writeFileSync(p,s);
    console.log('replaced');
    process.exit(0);
  }
}
console.log('no');
