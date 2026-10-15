// Cabecera superpuesta y translúcida: el contenido pasa por debajo con desenfoque y fundido.
(function(){
  const h=document.querySelector('body > header'); if(!h) return;
  const css=document.createElement('style');
  css.textContent=`body{position:relative}
body > header{position:absolute;top:0;left:0;right:0;z-index:30;padding-top:max(14px,env(safe-area-inset-top));isolation:isolate}
body > header::before{content:"";position:absolute;inset:0 0 -18px 0;z-index:-1;pointer-events:none;transition:opacity .25s ease}
main{padding-top:calc(var(--hh,64px) + 16px) !important;scroll-padding-top:calc(var(--hh,64px) + 16px)}
body > header::before{background:rgba(0,0,0,.62);-webkit-backdrop-filter:blur(18px) saturate(1.2);backdrop-filter:blur(18px) saturate(1.2);
  -webkit-mask-image:linear-gradient(#000 calc(100% - 26px),transparent);mask-image:linear-gradient(#000 calc(100% - 26px),transparent)}`;
  document.head.appendChild(css);
  const set=()=>document.body.style.setProperty('--hh',h.offsetHeight+'px');
  new ResizeObserver(set).observe(h); set();
})();
