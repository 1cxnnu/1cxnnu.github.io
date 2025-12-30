(function(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Page transitions
  document.addEventListener('DOMContentLoaded', ()=>{
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(6px)';
    document.body.style.transition = 'opacity 380ms ease, transform 380ms ease';
    requestAnimationFrame(()=>{
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    });
    // Intercept internal links for fade-out
    document.querySelectorAll('a[href$=".html"]').forEach(a=>{
      a.addEventListener('click', (e)=>{
        const url = a.getAttribute('href');
        if(!url || url.startsWith('http') || url.startsWith('https') || a.target==='_blank') return;
        e.preventDefault();
        document.body.style.opacity = '0';
        document.body.style.transform = 'translateY(6px)';
        setTimeout(()=>{ location.href = url; }, 220);
      });
    });
  });

  if(reduce) return; // Respect reduced motion

  // Constellation background
  const isIndex = /(^|\/)index\.html$/i.test(location.pathname) || (!/\.html$/i.test(location.pathname) && document.title.includes('Accès') || document.title.includes('Manuels Corrigés'));
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.78;';
  if(isIndex){ canvas.style.zIndex = '1'; canvas.style.opacity = '.85'; }
  const ctx = canvas.getContext('2d');
  let W=0,H=0, dpr=1, pts=[]; let mx=null,my=null; let densityMul = isIndex ? 2.0 : 1.0;
  function resize(){
    dpr = Math.min(2, window.devicePixelRatio||1);
    W = canvas.width = Math.floor(innerWidth*dpr);
    H = canvas.height = Math.floor(innerHeight*dpr);
    canvas.style.width = innerWidth+'px';
    canvas.style.height = innerHeight+'px';
    init();
  }
  function init(){
    const base = Math.round((innerWidth*innerHeight)/15000);
    const count = Math.round(base * densityMul); // density boost on index
    pts = Array.from({length: Math.max(30, count)}, ()=>({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-.5)*0.2, vy: (Math.random()-.5)*0.2,
      r: Math.random()*1.8+0.4
    }));
  }
  function step(){
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = isIndex ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.9)';
    const maxDist = (isIndex ? 260 : 200)*dpr;
    for(let i=0;i<pts.length;i++){
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if(p.x<0||p.x>W) p.vx*=-1; if(p.y<0||p.y>H) p.vy*=-1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      for(let j=i+1;j<pts.length;j++){
        const q = pts[j];
        const dx = p.x-q.x, dy=p.y-q.y; const dist = Math.hypot(dx,dy);
        if(dist<maxDist){
          const alpha = 1 - (dist/maxDist);
          const k = isIndex ? 0.32 : 0.15; // brighter lines on index
          ctx.strokeStyle = `rgba(255,255,255,${alpha*k})`;
          ctx.lineWidth = isIndex ? 1.6 : 1.2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      // Mouse influence
      if(mx!=null){
        const dx = p.x - mx, dy = p.y - my; const d = Math.hypot(dx,dy);
        const force = Math.max(0, 120*dpr-d)/120*dpr;
        p.vx += (dx/(d||1))*force*0.02; p.vy += (dy/(d||1))*force*0.02;
      }
    }
    requestAnimationFrame(step);
    ctx.restore();
  }
  window.addEventListener('mousemove', (e)=>{ mx = (e.clientX*dpr); my = (e.clientY*dpr); });
  window.addEventListener('mouseleave', ()=>{ mx = my = null; });
  window.addEventListener('resize', resize);
  resize();
  document.body.appendChild(canvas);

  // Parallaxe légère sur titres
  const headers = document.querySelectorAll('.header h1, .header h2');
  window.addEventListener('mousemove', (e)=>{
    if(!headers.length) return;
    const nx = (e.clientX / innerWidth) - 0.5;
    const ny = (e.clientY / innerHeight) - 0.5;
    headers.forEach((el,i)=>{
      const depth = (i===0)? 6 : 10;
      el.style.transform = `translate3d(${nx*depth}px, ${ny*depth}px, 0)`;
      el.style.transition = 'transform .08s linear';
    });
  });

  // Reveal on scroll for cards
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){ en.target.classList.add('reveal'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  function armReveal(){
    const items = Array.from(document.querySelectorAll('.card, .level-card'));
    items.forEach((el,i)=>{
      el.style.animationDelay = (i*90)+'ms';
      io.observe(el);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', armReveal); else armReveal();
})();
