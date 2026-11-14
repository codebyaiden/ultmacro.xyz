/* Shared public navigation. Existing route headers remain as no-JavaScript fallbacks. */
(() => {
  const legacyHeader = document.querySelector('body > header');
  if (!legacyHeader || legacyHeader.classList.contains('um-site-header')) return;
  const pathname = location.pathname;
  const guide = /^\/guide(?:\/|$)/.test(pathname);
  const active = /^\/features(?:\/|$)/.test(pathname) ? 'features'
    : guide || /^\/wiki(?:\/|$)/.test(pathname) ? 'wiki'
    : /^\/strategies(?:\/|$)/.test(pathname) ? 'strategies'
    : /^\/about(?:\/|$)/.test(pathname) ? 'about'
    : /^\/early-access(?:\/|$)/.test(pathname) ? 'early'
    : /^\/dashboard(?:\/|$)/.test(pathname) ? 'dashboard'
    : /^\/download(?:\/|$)/.test(pathname) ? 'download' : '';
  const destinations = [
    { id:'features',label:'Features',href:'/features/' },
    { id:'wiki',label:'Wiki',href:'/wiki/' },
    { id:'early',label:'Early Access',href:'/early-access/' },
    { id:'about',label:'About Us',href:'/about/' },
  ];
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  if (/^\/dashboard(?:\/|$)/.test(pathname)) {
    document.body.classList.add('um-unified-page','um-dashboard-site-page');
    // The dashboard app has its own sidebar brand. Keep a compact brand on
    // the pairing entry page, which has no dashboard sidebar.
    if (/^\/dashboard\/?$/.test(pathname)) {
      const header = el('header','um-site-header dashboard-site-header');
      const inner = el('div','um-header-inner');
      const brand = el('a','um-brand dashboard-site-brand');
      brand.href = '/dashboard/overview/';
      brand.setAttribute('aria-label','Ultimate Macro dashboard');
      const image = el('img');
      image.src = '/assets/ultimate-macro-mascot.png';
      image.alt = '';
      image.width = 30;
      image.height = 30;
      const text = el('span','');
      text.append('Ultimate ',el('b','', 'Macro'));
      brand.append(image,text);
      inner.append(brand);
      header.append(inner);
      document.body.insertBefore(header,legacyHeader);
    }
    return;
  }
  const makeLink = ({ id,label,href }) => {
    const a = el('a','',label);
    a.href = href;
    if (active === id) {
      a.setAttribute('aria-current','page');
      a.addEventListener('click', event => event.preventDefault());
    }
    return a;
  };

  const header = el('header','um-site-header');
  const inner = el('div','um-header-inner');
  const brand = el('a','um-brand');
  brand.href = '/'; brand.setAttribute('aria-label','Ultimate Macro homepage');
  const image = el('img');
  image.src = '/assets/ultimate-macro-mascot.png';image.alt = '';image.width=38;image.height=38;
  const brandText = el('span','');
  brandText.append('Ultimate ',el('b','', 'Macro'));
  brand.append(image,brandText);
  const left = el('div','um-brand-wrap');
  left.append(brand);
  const trace = el('svg','um-nav-loop-trace');
  trace.setAttribute('viewBox','0 0 800 50');
  trace.setAttribute('aria-hidden','true');
  trace.setAttribute('focusable','false');
  trace.innerHTML = '<defs><linearGradient id="um-nav-loop-light" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c91ae" stop-opacity="0"/><stop offset=".4" stop-color="#b8a7d7" stop-opacity=".52"/><stop offset=".52" stop-color="#e5d9f8" stop-opacity=".82"/><stop offset=".68" stop-color="#a98bd5" stop-opacity=".48"/><stop offset="1" stop-color="#9c91ae" stop-opacity="0"/></linearGradient></defs><path class="um-nav-loop-base" d="M8 25 C150 3 258 3 400 25 C542 47 650 47 792 25 C650 3 542 3 400 25 C258 47 150 47 8 25"/><path class="um-nav-loop-flow" d="M8 25 C150 3 258 3 400 25 C542 47 650 47 792 25 C650 3 542 3 400 25 C258 47 150 47 8 25"/>';
  const desktop = el('nav','um-primary');
  desktop.setAttribute('aria-label','Primary navigation');
  destinations.forEach(link => desktop.append(makeLink(link)));
  const actions = el('div','um-header-actions');
  const cta = makeLink({id:'download',label:'Download',href:'/download/'});
  cta.className='um-cta';
  const toggle=el('button','um-menu-toggle','Menu');
  toggle.type='button';toggle.setAttribute('aria-label','Open navigation');
  toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','um-menu-panel');
  actions.append(cta,toggle);
  inner.append(left,trace,desktop,actions);
  const mobile = el('nav','um-menu-panel');
  mobile.id='um-menu-panel';mobile.setAttribute('aria-label','Mobile primary navigation');
  destinations.forEach(link => mobile.append(makeLink(link)));
  const mobileCta = makeLink({id:'download',label:'Download',href:'/download/'});
  mobileCta.className='um-menu-cta';
  mobile.append(mobileCta);
  header.append(inner,mobile);

  const scrim=el('button','um-menu-backdrop');
  scrim.type='button';scrim.hidden=true;scrim.setAttribute('aria-label','Close navigation');
  const sky=el('div','um-atmosphere');
  sky.setAttribute('aria-hidden','true');
  sky.innerHTML = '<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true"><defs><linearGradient id="um-crescent-fill" x1="18" y1="12" x2="82" y2="88" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#b8c8e8"/></linearGradient><mask id="um-crescent-mask"><rect width="100" height="100" fill="black"/><circle cx="45" cy="50" r="40" fill="white"/><circle cx="66" cy="42" r="40" fill="black"/></mask></defs><rect width="100" height="100" fill="url(#um-crescent-fill)" mask="url(#um-crescent-mask)"/></svg>';

  let closeTimer = 0;
  let menuOpen = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setOpen = (open, restoreFocus=false) => {
    window.clearTimeout(closeTimer);
    menuOpen = open;
    if (open && document.getElementById('nav-toggle')?.getAttribute('aria-expanded') === 'true') {
      document.getElementById('nav-toggle').click();
    }
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
    mobile.inert = !open;
    mobile.setAttribute('aria-hidden',String(!open));
    document.body.classList.toggle('um-nav-open',open);
    if (open) {
      mobile.hidden = false;
      scrim.hidden = false;
      mobile.dataset.state = 'opening';
      scrim.dataset.state = 'opening';
    } else {
      mobile.dataset.state = 'closing';
      scrim.dataset.state = 'closing';
      if (restoreFocus) toggle.focus();
      const finish = () => {
        if (menuOpen) return;
        mobile.hidden = true;
        scrim.hidden = true;
      };
      if (reduceMotion.matches || mobile.hidden) finish();
      else closeTimer = window.setTimeout(finish, 180);
    }
  };
  mobile.hidden=true;mobile.inert=true;mobile.setAttribute('aria-hidden','true');
  scrim.hidden=true;
  toggle.addEventListener('click',()=>setOpen(!menuOpen,true));
  scrim.addEventListener('click',()=>setOpen(false,true));
  mobile.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false)});
  document.addEventListener('keydown',e=>{
    if (!menuOpen) return;
    if(e.key==='Escape'){e.preventDefault();setOpen(false,true);return;}
    if(e.key!=='Tab')return;
    const links=[...mobile.querySelectorAll('a')];
    const first=links[0], last=links[links.length-1];
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  });
  const desktopMatch=window.matchMedia('(min-width:1111px)');
  desktopMatch.addEventListener('change',e=>{if(e.matches)setOpen(false)});

  document.body.insertBefore(header,legacyHeader);
  document.body.insertBefore(scrim,legacyHeader);
  if (!document.body.classList.contains('home-rework') && !document.querySelector('.night-sky,.site-sky')) document.body.insertBefore(sky,legacyHeader);
  document.body.classList.add('um-unified-page');
  const updateScrollState = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll',updateScrollState,{passive:true});
  updateScrollState();

  if (pathname === '/wiki/' || pathname === '/wiki' || pathname.startsWith('/wiki/api/')) {
    const main = document.getElementById('main');
    if (main) {
      const tools = el('div','wiki-page-tools');
      tools.setAttribute('role','group');
      tools.setAttribute('aria-label','Wiki tools');
      if (pathname.startsWith('/wiki/api/')) {
        const search = el('a','wiki-search-action','Search guides');
        search.href='#search-guides';
        tools.append(search);
      } else {
        const search = el('button','wiki-search-action','Search guides');
        search.type='button';
        search.setAttribute('aria-label','Search Wiki guides');
        search.addEventListener('click',()=>document.getElementById('search-trigger')?.click());
        const browse = el('button','wiki-browse-action','Browse guides');
        browse.type='button';
        browse.setAttribute('aria-controls','sidebar');
        browse.addEventListener('click',()=>document.getElementById('nav-toggle')?.click());
        const legacyBrowse = document.getElementById('nav-toggle');
        const syncBrowseState = () => browse.setAttribute('aria-expanded',legacyBrowse?.getAttribute('aria-expanded') || 'false');
        syncBrowseState();
        if (legacyBrowse && 'MutationObserver' in window) new MutationObserver(syncBrowseState).observe(legacyBrowse,{attributes:true,attributeFilter:['aria-expanded']});
        tools.append(search,browse);
      }
      main.insertBefore(tools,main.firstChild);
    }
  }
})();
