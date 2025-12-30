(function(){
  // Lecture en boucle ULTRA-SMOOTH via Web Audio API avec détection auto des silences
  // - Décode la piste
  // - Analyse le buffer pour retirer le silence début/fin (padding encodage MP3)
  // - Utilise loopStart/loopEnd pour une boucle sample-accurate
  // - Fallback: crossfade HTMLAudio si WebAudio non dispo

  const OFFSET_KEY = 'noisyOffset';

  async function smoothLoopWebAudio(url, opts={}){
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const vol = Math.min(1, Math.max(0, opts.volume ?? 1));
    const threshold = opts.threshold ?? 0.002;    // seuil de silence
    const headGuard = opts.headGuard ?? 0.01;     // 10 ms pour éviter clicks
    const tailGuard = opts.tailGuard ?? 0.02;     // 20 ms pour marge fin

    // Déverrouillage audio sur interaction (mobile/autoplay)
    const unlock = ()=>{ if(ctx.state !== 'running'){ ctx.resume(); } cleanup(); };
    const cleanup = ()=>{
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);

    // Téléchargement + décodage
    const res = await fetch(url, { cache: 'force-cache' }).catch(()=>null);
    if(!res || !res.ok){ throw new Error('Audio fetch failed'); }
    const arr = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arr);

    // Analyse pour trouver zone utile sans silence
    const ch = buffer.numberOfChannels;
    const len = buffer.length;
    const sr = buffer.sampleRate;
    const view = [];
    for(let i=0;i<ch;i++) view.push(buffer.getChannelData(i));

    function isLoudAt(i){
      for(let c=0;c<ch;c++){ if(Math.abs(view[c][i]) > threshold) return true; }
      return false;
    }
    let start = 0; while(start < len && !isLoudAt(start)) start++;
    let end = len-1; while(end > 0 && !isLoudAt(end)) end--;

    // Gardes pour éviter clicks aux bords
    let loopStart = Math.max(0, start + Math.floor(sr * headGuard));
    let loopEnd = Math.min(len, end - Math.floor(sr * tailGuard));

    // Si détection douteuse, fallback aux extrêmes raisonnables
    if(loopEnd - loopStart < sr * 0.1){ // moins de 100ms -> pas fiable
      loopStart = Math.floor(sr * 0.01);
      loopEnd = Math.max(loopStart + Math.floor(sr * 0.5), len - Math.floor(sr * 0.02));
    }

    // Chaîne audio
    const gain = ctx.createGain();
    gain.gain.value = 0; // fade-in pour éviter pop initial
    gain.connect(ctx.destination);

    const loopLenSec = (loopEnd - loopStart) / sr;
    let saved = 0;
    try{ const v = localStorage.getItem(OFFSET_KEY); if(v) saved = Math.max(0, parseFloat(v)||0) % loopLenSec; }catch(e){}

    function playLoop(offsetSec){
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.loopStart = loopStart / sr;
      src.loopEnd = loopEnd / sr;
      src.connect(gain);
      const startAt = src.loopStart + (offsetSec||0);
      src.start(0, startAt);
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.15);
      return src;
    }

    const node = playLoop(saved);
    const t0 = ctx.currentTime - saved; // temps de référence (offset 0)

    // Sauvegarde périodique de l’offset
    const saver = setInterval(()=>{
      const off = ((ctx.currentTime - t0) % loopLenSec);
      try{ localStorage.setItem(OFFSET_KEY, String(off)); }catch(e){}
    }, 400);

    // Option: relancer si le contexte change d’état
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'visible' && ctx.state !== 'running'){
        ctx.resume();
      }
    });

    window.addEventListener('beforeunload', ()=>{ clearInterval(saver); });

    // Expose minimal debug
    window.__RovoNoiseCtx = ctx;
    window.__RovoNoiseNode = node;
  }

  // Fallback HTMLAudio avec crossfade (moins parfait que WebAudio)
  function smoothLoopFallback(url, overlapSec = 0.6){
    const a = new Audio(url);
    const b = new Audio(url);
    [a,b].forEach(el=>{ el.loop = false; el.preload = 'auto'; el.volume = 0; });
    a.volume = 1;
    let current = a, next = b, started = false, timer = null;
    const fadeMs = Math.max(200, overlapSec * 1000);

    function crossfade(){
      const steps = 32;
      const stepMs = fadeMs / steps;
      let i = 0;
      const iv = setInterval(()=>{
        i++;
        const t = i/steps;
        // Equal-power crossfade pour éviter pertes de niveau
        const v1 = Math.cos(t * Math.PI/2);
        const v2 = Math.sin(t * Math.PI/2);
        current.volume = v1;
        next.volume = v2;
        if(i >= steps){
          clearInterval(iv);
          try{ current.pause(); }catch(e){}
          current.volume = 0;
          next.volume = 1;
          const tmp = current; current = next; next = tmp;
          schedule();
        }
      }, stepMs);
    }

    function schedule(){
      if(!started || !current.duration || isNaN(current.duration)){
        timer = setTimeout(schedule, 200);
        return;
      }
      const overlap = Math.min(overlapSec, Math.max(0.2, current.duration * 0.08));
      const timeToStart = (current.duration - current.currentTime - overlap);
      const ms = Math.max(0, timeToStart * 1000);
      timer = setTimeout(()=>{
        try{ next.currentTime = 0; next.play().catch(()=>{}); }catch(e){}
        crossfade();
      }, ms);
    }

    let saved = 0; try{ const v = localStorage.getItem(OFFSET_KEY); if(v) saved = Math.max(0, parseFloat(v)||0); }catch(e){}

    function start(){
      if(started) return; started = true;
      a.addEventListener('loadedmetadata', ()=>{
        try{ if(saved && a.duration){ a.currentTime = saved % a.duration; } }catch(e){}
        schedule();
      }, { once: true });
      a.play().catch(()=>{});
    }

    start();

    // reprise après interaction (politiques autoplay)
    const resume = ()=>{
      start();
      try{ current.play().catch(()=>{}); next.play().catch(()=>{}); }catch(e){}
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
      document.removeEventListener('touchstart', resume);
    };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);
    document.addEventListener('touchstart', resume);

    // Sauvegarde périodique de l’offset
    const saver = setInterval(()=>{
      try{
        const d = current.duration || 1;
        const off = (current.currentTime % d);
        localStorage.setItem(OFFSET_KEY, String(off));
      }catch(e){}
    }, 400);
    window.addEventListener('beforeunload', ()=>{ clearInterval(saver); });
  }

  function smoothLoop(url, options){
    if(window.AudioContext || window.webkitAudioContext){
      smoothLoopWebAudio(url, options).catch(()=> smoothLoopFallback(url, (options && options.overlapSec) || 0.6));
    } else {
      smoothLoopFallback(url, (options && options.overlapSec) || 0.6);
    }
  }

  window.RovoNoise = { smoothLoop };
})();
