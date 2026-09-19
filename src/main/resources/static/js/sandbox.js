(() => {
  'use strict';
  const THEME_KEY='studyflow-tema';
  const initialTheme=(()=>{
    try {
      const saved=localStorage.getItem(THEME_KEY);
      if(saved==='claro'||saved==='oscuro') return saved;
    } catch (_) { /* The system preference is a safe visual fallback. */ }
    return document.documentElement.classList.contains('sandbox-light')?'claro':'oscuro';
  })();
  const store=createSandboxStore(initialTheme), stage=document.querySelector('#sandbox-stage'), themeButton=document.querySelector('#sandbox-theme');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=null, version=0, tourActive=true, chapter=1, pausedFocus=0, route='/panel', theme=initialTheme;
  // Last required spot in each chapter. Keep this in sync with recorrido.js so
  // completing a guided action can unlock navigation to the next workspace.
  const completedTourSteps=new Set(), finalSpotByChapter=[0,8,1,3,0,1,1,1,0];
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,reduced.matches?0:ms));
  const routes=()=>['/panel','/proyectos/nuevo',`/proyectos/${store.projectCode()}`,`/proyectos/${store.projectCode()}/fases`,`/proyectos/${store.projectCode()}/canales`,`/proyectos/${store.projectCode()}/entregables`,'/horarios','/recordatorios','/panel'];
  const guideButton=document.querySelector('#sandbox-tour');
  const showGuideButton=visible=>guideButton.hidden=!visible;
  function applyTheme(nextTheme, remember=true) {
    theme=nextTheme==='claro'?'claro':'oscuro';
    const oscuro=theme==='oscuro';
    document.documentElement.classList.toggle('sandbox-light',!oscuro);
    document.documentElement.style.colorScheme=theme;
    store.setTheme(theme);
    if(remember) try {localStorage.setItem(THEME_KEY,theme);} catch (_) { /* The tour still changes tone for this visit. */ }
    themeButton.textContent=oscuro?'Cambiar a modo claro':'Cambiar a modo oscuro';
    themeButton.setAttribute('aria-pressed',String(oscuro));
    themeButton.setAttribute('title',oscuro?'Usar modo claro':'Usar modo oscuro');
    try {
      frame?.contentDocument?.documentElement.classList.toggle('dark',oscuro);
      frame?.contentWindow?.dispatchEvent(new frame.contentWindow.CustomEvent('studyflow:tema-cambiar',{detail:{oscuro}}));
    } catch (_) { /* A frame that is navigating receives the tone from RAM on load. */ }
  }
  function exit(url) {store.destroy();window.location.assign(url);}
  function finishTour() {
    tourActive=false;
    showGuideButton(false);
    frame?.contentWindow.dispatchEvent(new Event('studyflow:pause-tour'));
    document.querySelector('#sandbox-finish').showModal();
  }
  function completeTourStep(tourChapter, spot) {
    if (!tourActive || tourChapter!==chapter || !Number.isInteger(spot)) return;
    completedTourSteps.add(`${tourChapter}:${spot}`);
  }
  function chapterFor(url, explicit) {
    if (explicit>=1&&explicit<=9) return explicit;
    if (url.pathname===routes()[chapter-1]) return chapter;
    const index=routes().indexOf(url.pathname);
    return index>=0?index+1:null;
  }
  function mayNavigateTo(destinationChapter) {
    if (!tourActive || destinationChapter===chapter) return true;
    if (destinationChapter===chapter-1) return true;
    return destinationChapter===chapter+1&&completedTourSteps.has(`${chapter}:${finalSpotByChapter[chapter-1]}`);
  }
  async function navigate(destination) {
    const url=new URL(destination,location.origin);
    if(['/registro','/login','/'].includes(url.pathname)) {exit(url.pathname+url.search);return;}
    if(url.pathname==='/sandbox') return;
    if(url.pathname==='/navegacion.html') {window.open('/navegacion.html','_blank','noopener');return;}
    if(!/^\/(panel|proyectos(?:\/[a-zA-Z0-9_-]+(?:\/(?:fases|canales|entregables))?)?|horarios|recordatorios|perfil(?:\/editar)?)$/.test(url.pathname)) return;
    const explicit=Number(url.searchParams.get('recorrido'));
    const explicitFocus=Number(url.searchParams.get('enfoque'));
    const destinationChapter=chapterFor(url,explicit);
    if (tourActive&&!mayNavigateTo(destinationChapter)) return;
    // A matching app route alone must not resurrect a guide that the visitor
    // deliberately closed.  The guide resumes only while it is already active
    // (normal tour navigation) or when its explicit query is requested from
    // the "Abrir guía" control.
    if(destinationChapter && (tourActive || (explicit>=1&&explicit<=9))) {
      chapter=destinationChapter;
      pausedFocus=Number.isInteger(explicitFocus)&&explicitFocus>=0 ? explicitFocus : 0;
      tourActive=true;
      showGuideButton(false);
    }
    else if(tourActive) {tourActive=false;showGuideButton(true);}
    route=url.pathname;
    const currentVersion=++version, previous=frame;
    previous?.classList.add('is-leaving');
    await delay(previous?320:0);
    if(currentVersion!==version) return;
    const next=document.createElement('iframe');
    next.title='StudyFlow: espacio de prueba temporal';
    next.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups');
    next.className='is-entering';
    const query=new URLSearchParams({ruta:route});
    url.searchParams.forEach((value,key)=>{if(key!=='recorrido') query.set(key,value);});
    if(tourActive) query.set('recorrido',String(chapter));
    next.src='/sandbox/vista?'+query;
    const loaded=new Promise(resolve=>next.addEventListener('load',resolve,{once:true}));
    stage.append(next); frame=next;
    await loaded;
    if(currentVersion!==version) {next.remove();return;}
    previous?.remove();
    await delay(60);next.classList.remove('is-entering');
    document.title='StudyFlow · Prueba temporal';
  }
  window.StudyFlowSandbox={...store,navigate,finishTour,completeTourStep,isTourStepComplete(tourChapter,spot){return completedTourSteps.has(`${tourChapter}:${spot}`);},pauseTour(tourChapter=chapter,spot=pausedFocus){
    if(Number.isInteger(tourChapter)&&tourChapter>=1&&tourChapter<=9) chapter=tourChapter;
    if(Number.isInteger(spot)&&spot>=0) pausedFocus=spot;
    tourActive=false;
    showGuideButton(true);
  },get tourActive(){return tourActive;},get chapter(){return chapter;}};
  themeButton.onclick=()=>applyTheme(theme==='oscuro'?'claro':'oscuro');
  applyTheme(initialTheme,false);
  showGuideButton(false);
  guideButton.onclick=()=>navigate(routes()[Math.min(chapter-1,8)]+'?recorrido='+chapter+'&enfoque='+pausedFocus);
  document.querySelector('#sandbox-reset').onclick=()=>{if(confirm('¿Borrar lo que has probado y empezar de nuevo?')) exit('/sandbox');};
  document.querySelector('#sandbox-register').onclick=()=>finishTour();
  document.querySelector('#sandbox-finish-register').onclick=()=>exit('/registro');
  document.querySelector('#sandbox-keep').onclick=()=>{document.querySelector('#sandbox-finish').close();showGuideButton(true);};
  document.querySelector('#sandbox-exit').onclick=event=>{event.preventDefault();exit('/login');};
  window.addEventListener('pagehide',()=>store.destroy());
  window.addEventListener('pageshow',event=>{if(event.persisted) window.location.replace('/sandbox');});
  Promise.all([navigate('/panel?recorrido=1'),delay(1800)]).then(()=>document.querySelector('#sandbox-curtain').classList.add('is-hidden'));
})();
