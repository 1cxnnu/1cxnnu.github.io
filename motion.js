(function(){
  const isFine = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  if(!isFine) return; // PC/trackpad only

  const els = [];
  function collect(){
    els.length = 0;
    document.querySelectorAll('.container, .choix-niveau').forEach(e=> els.push(e));
  }
  collect();
  const ro = new ResizeObserver(collect); ro.observe(document.documentElement);

  // Spotlight overlay
  const glow = document.createElement('div');
  glow.className = 'pointer-glow';
  Object.assign(glow.style, {
    position:'fixed', inset:'0', pointerEvents:'none', zIndex:'1',
    background:'transparent', transition:'opacity .2s ease', opacity:'0.9'
  });
  document.addEventListener('DOMContentLoaded', ()=>{ document.body.appendChild(glow); });

  let vw = window.innerWidth, vh = window.innerHeight;
  window.addEventListener('resize', ()=>{ vw = window.innerWidth; vh = window.innerHeight; });

  let mx = 0, my = 0, raf = null;
  function onMove(e){
    mx = e.clientX; my = e.clientY;
    if(!raf) raf = requestAnimationFrame(apply);
  }
  function onLeave(){
    mx = vw/2; my = vh/2; if(!raf) raf = requestAnimationFrame(apply);
  }

  function apply(){
    raf = null;
    const cx = vw/2, cy = vh/2;
    const nx = (mx - cx) / cx; // -1..1
    const ny = (my - cy) / cy;
    const rotMax = 3; // degrees (très léger)
    const tx = nx * rotMax;
    const ty = -ny * rotMax;
    const dz = 0; // pas de translation Z pour éviter tout effet zoom

    els.forEach(el=>{
      el.style.transform = `perspective(900px) rotateY(${tx}deg) rotateX(${ty}deg) translateZ(${dz}px)`;
      el.style.transition = 'transform .15s ease-out';
      el.style.willChange = 'transform';
    });

    // spotlight
    const size = 200; // px
    const alpha = 0.09;
    glow.style.background = `radial-gradient(${size}px ${size}px at ${mx}px ${my}px, rgba(255,255,255,${alpha}), transparent 60%)`;
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseleave', onLeave);

  // Reduce motion respect
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseleave', onLeave);
    glow.style.display = 'none';
    els.forEach(el=>{ el.style.transform = ''; el.style.transition = ''; el.style.willChange=''; });
  }
})();
