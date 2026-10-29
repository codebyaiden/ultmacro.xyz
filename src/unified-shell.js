/* Shared public navigation. Existing route headers remain as no-JavaScript fallbacks. */
(() => {
  const legacyHeader = document.querySelector('body > header');
  if (!legacyHeader || legacyHeader.classList.contains('um-site-header')) return;
  const pathname = location.pathname;
  const guide = /^\/guide(?:\/|$)/.test(pathname);
  const active = guide || /^\/wiki(?:\/|$)/.test(pathname) ? 'wiki'
    : /^\/strategies(?:\/|$)/.test(pathname) ? 'strategies'
    : /^\/early-access(?:\/|$)/.test(pathname) ? 'early'
    : /^\/download(?:\/|$)/.test(pathname) ? 'download' : '';
  const guideLabel = {
    requirements:'Requirements',install:'Install',display:'Display settings',
    'first-run':'First run',recording:'Recording',sessions:'Sessions',
    discord:'Discord & profiles',tools:'Tools',troubleshooting:'Troubleshooting',safety:'Safety'
  };
  const segment = pathname.split('/').filter(Boolean);
  const context = guide
    ? (guideLabel[segment[1]] || 'Guide')
    : pathname.startsWith('/wiki/api/') ? 'Wiki API'
    : active === 'wiki' ? 'Wiki'
    : active === 'strategies' ? 'Strategies'
    : active === 'early' ? 'Early access'
    : active === 'download' ? 'Download' : '';
  const destinations = [
    { id:'features',label:'Features',href:'/#features' },
    { id:'wiki',label:'Wiki',href:'/wiki/' },
    { id:'strategies',label:'Strategy Network',href:'/strategies/' },
    { id:'early',label:'Early Access',href:'/early-access/' },
    { id:'download',label:'Download',href:'/download/' }
  ];
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const makeLink = ({ id,label,href }) => {
    const a = el('a','',label);
    a.href = href;
    if (active === id) a.setAttribute('aria-current','page');
    return a;
  };

  const header = el('header','um-site-header');
  const inner = el('div','um-header-inner');
  const left = el('div','um-brand-wrap');
  const brand = el('a','um-brand');
  brand.href = '/'; brand.setAttribute('aria-label','Ultimate Macro homepage');
  const image = el('img');
  image.src = '/assets/ultimate-logo.png';image.alt = '';image.width=29;image.height=29;
  const brandText = el('span','');
  brandText.append('Ultimate ',el('b','', 'Macro'));
  brand.append(image,brandText);
  left.append(brand);
  if (context) left.append(el('span','um-context',context));
  const desktop = el('nav','um-primary');
  desktop.setAttribute('aria-label','Primary navigation');
  destinations.forEach(link => desktop.append(makeLink(link)));
  const actions = el('div','um-header-actions');
  const discord = el('a','um-discord','Discord');
  discord.href='https://discord.gg/ultmacro';discord.target='_blank';discord.rel='noopener noreferrer';
  if (pathname === '/wiki/' || pathname === '/wiki') {
    const search = el('button','um-wiki-search','Search');
    search.type='button';search.setAttribute('aria-label','Search wiki articles');
    search.addEventListener('click',()=>{
      if (menuOpen) setOpen(false);
      document.getElementById('search-trigger')?.click();
    });
    actions.append(search);
  } else if (pathname.startsWith('/wiki/api/')) {
    const search=el('a','um-wiki-search','Search guides');
    search.href='#search-guides';
    search.addEventListener('click',()=>{ if (menuOpen) setOpen(false); });
    actions.append(search);
  }
  // Wiki navigation belongs to the shared header when the original header is hidden.
  if (pathname === '/wiki/' || pathname === '/wiki') {
    const browse = el('button','um-wiki-browse','Guides');
    browse.type='button';
    browse.setAttribute('aria-label','Browse Wiki guides');
    browse.setAttribute('aria-controls','sidebar');
    browse.setAttribute('aria-expanded','false');
    browse.addEventListener('click',()=>{
      if (toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
      document.getElementById('nav-toggle')?.click();
    });
    actions.append(browse);
    const legacyBrowse = document.getElementById('nav-toggle');
    if (legacyBrowse && 'MutationObserver' in window) {
      new MutationObserver(()=>browse.setAttribute('aria-expanded',legacyBrowse.getAttribute('aria-expanded') || 'false'))
        .observe(legacyBrowse,{attributes:true,attributeFilter:['aria-expanded']});
    }
  }
  const cta = el('a','um-cta','Get the macro ↗');
  cta.href='/download/';
  const toggle=el('button','um-menu-toggle','Menu');
  toggle.type='button';toggle.setAttribute('aria-label','Open navigation');
  toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','um-menu-panel');
  actions.append(discord,cta,toggle);
  inner.append(left,desktop,actions);
  const mobile = el('nav','um-menu-panel');
  mobile.id='um-menu-panel';mobile.setAttribute('aria-label','Mobile primary navigation');
  destinations.forEach(link => mobile.append(makeLink(link)));
  const support = el('a','','Discord community ↗');
  support.href='https://discord.gg/ultmacro';support.rel='noopener noreferrer';support.target='_blank';
  mobile.append(support);
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
      mobile.querySelector('a')?.focus();
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
  document.body.insertBefore(sky,legacyHeader);
  document.body.classList.add('um-unified-page');
})();
