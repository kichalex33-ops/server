(function(){
  const VERSION = 'h536';
  const asset = (path) => {
    if (window.assetUrl) return window.assetUrl(path + '?v=' + VERSION);
    return path + '?v=' + VERSION;
  };
  const addCss = (href, attr) => {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => (l.getAttribute('href') || '').includes(href))) return;
    const link = document.createElement('link');
    link.rel='stylesheet';
    link.href = asset('assets/css/' + href);
    if(attr) link.dataset[attr]='1';
    document.head.appendChild(link);
  };
  const addJs = (src) => {
    if ([...document.scripts].some(s => (s.getAttribute('src') || '').includes(src))) return;
    const script = document.createElement('script');
    script.src = asset('assets/js/' + src);
    script.defer = true;
    document.body.appendChild(script);
  };
  addCss('h534-correcao-final.css','h534Visual');
  addCss('h536-contraste-tema-unificado.css','h536Visual');
  addCss('h537-transicao-tema-suave.css','h537Transition');
  addCss('h540-interface-agatho-icons.css','h540Interface');
  addJs('h534-security-lgpd.js');
})();
