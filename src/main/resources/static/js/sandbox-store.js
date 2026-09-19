/* Ephemeral API: deliberately no fetch, IndexedDB, cookies or browser storage. */
(function (root) {
  'use strict';
  function createSandboxStore(initialTheme='oscuro') {
    let sequence = 0;
    const id = () => ++sequence;
    const copy = value => JSON.parse(JSON.stringify(value));
    const now = () => new Date().toISOString();
    const dateLabel = value => {const d=new Date(value),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;};
    const user = {id:1,nombre:'Visitante',apellido:'',nombreCompleto:'Visitante',correo:'',edad:null,universidad:'',programa:'',semestre:null,descripcion:'',avatarUrl:'',fechaRegistro:now()};
    const data = {projects:[],channels:[],deliverables:[],reminders:[],notes:[],urls:[],preferences:{id:1,canal:'whatsapp',telefonoWhatsapp:'',activo:false,minutosAntesTarea:60,minutosAntesEntrega:1440,minutosAntesApunte:60,silencioDesde:null,silencioHasta:null,pasarelaConectada:false}};
    function storage() {
      const values = new Map();
      return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear()};
    }
    const local = storage(), session = storage();
    // Theme is copied from the entry screen, but remains isolated in RAM here.
    local.setItem('studyflow-tema', initialTheme==='claro' ? 'claro' : 'oscuro');
    local.setItem('studyflow_user',JSON.stringify({firstName:'Visitante',lastName:'',name:'Visitante',email:'',university:'',career:'',semester:'',description:'',avatar:''}));
    local.setItem('studyflow_projects','[]'); local.setItem('studyflow.schedule.subjects.v2','[]');
    const fail = (message, status=400, field=null) => {throw Object.assign(new Error(message),{status,field});};
    const findProject = code => data.projects.find(p=>p.codigo===code) || fail('Proyecto no encontrado',404);
    const findTask = taskId => data.projects.flatMap(p=>p.tareas).find(t=>t.id===Number(taskId)) || fail('Tarea no encontrada',404);
    const projectOf = task => data.projects.find(p=>p.tareas.includes(task));
    const labels = {'sin-empezar':'Sin empezar','en-proceso':'En proceso','en-revision':'En revisión',terminada:'Terminada'};
    const normalizeState = value => ({pending:'sin-empezar',progress:'en-proceso',done:'terminada','in-progress':'en-proceso','in-review':'en-revision',completed:'terminada'}[value] || (labels[value] ? value : 'sin-empezar'));
    const done = t => t.estado === 'terminada';
    const blocked = t => (t.dependencias||[]).map(findTask).filter(d=>!done(d));
    const phaseKey = value => String(value||'').trim().toLocaleLowerCase('es');
    function ensurePhaseIds(project) {
      project.etapaIds ||= {};
      project.etapas.forEach(name => {if(project.etapaIds[phaseKey(name)] == null) project.etapaIds[phaseKey(name)] = id();});
      return project.etapaIds;
    }
    function phaseId(project,name) {return ensurePhaseIds(project)[phaseKey(name)];}
    function updatePhases(project,body) {
      if(!Array.isArray(body.fases)||!body.fases.length) fail('El proyecto debe conservar al menos una fase');
      if(!Number.isInteger(body.etapaActualIndice)||body.etapaActualIndice<0||body.etapaActualIndice>=body.fases.length) fail('Elige una fase predeterminada válida para las tareas nuevas');
      const ids=ensurePhaseIds(project),existing=new Map(project.etapas.map(name=>[Number(ids[phaseKey(name)]),name]));
      const requestedIds=new Set(),names=new Set(),plan=[];
      body.fases.forEach(entry=>{
        const nombre=String(entry?.nombre||'').trim();
        if(!nombre) fail('Cada fase necesita un nombre');
        if(nombre.length>60) fail('El nombre de una fase no puede superar 60 caracteres');
        const clave=phaseKey(nombre);if(names.has(clave)) fail('No puede haber dos fases con el mismo nombre');names.add(clave);
        const phase=entry?.id==null?null:Number(entry.id);
        if(phase!=null&&(!Number.isInteger(phase)||!existing.has(phase))) fail('La fase que intentas editar no pertenece a este proyecto');
        if(phase!=null&&requestedIds.has(phase)) fail('Una fase solo puede aparecer una vez en el orden');
        if(phase!=null) requestedIds.add(phase);
        plan.push({id:phase,nombre});
      });
      const removed=project.etapas.filter(name=>!requestedIds.has(Number(ids[phaseKey(name)])));
      removed.forEach(name=>{const count=project.tareas.filter(task=>phaseKey(task.etapa)===phaseKey(name)).length;if(count) fail(`No puedes eliminar la fase «${name}» porque tiene ${count} ${count===1?'tarea':'tareas'}. Mueve esas tareas a otra fase antes de guardarla.`);});
      plan.forEach(item=>{
        if(item.id==null) item.id=id();
        const previous=existing.get(item.id);
        if(previous&&previous!==item.nombre) {
          project.tareas.forEach(task=>{if(phaseKey(task.etapa)===phaseKey(previous)) task.etapa=item.nombre;});
          if(phaseKey(project.etapaActual)===phaseKey(previous)) project.etapaActual=item.nombre;
        }
      });
      project.etapas=plan.map(item=>item.nombre);
      project.etapaIds=Object.fromEntries(plan.map(item=>[phaseKey(item.nombre),item.id]));
      project.etapaActual=plan[body.etapaActualIndice].nombre;
      return projectDTO(project);
    }
    function validarFechaContraEntrega(project, fechaLimite) {
      if (!fechaLimite || !project.fechaEntrega) return;
      if (new Date(`${fechaLimite}T00:00:00`) > new Date(`${project.fechaEntrega}T00:00:00`)) {
        const entrega = project.fechaEntrega.split('-').reverse().join('/');
        fail(`La fecha límite de la tarea no puede ser posterior a la fecha de entrega del proyecto (${entrega}).`);
      }
    }
    function task(body, project) {if(!body.titulo?.trim()) fail('Escribe un título para la tarea');const etapa=body.etapa||project.etapaActual;if(!project.etapas.includes(etapa)) fail('La etapa elegida no pertenece a este proyecto');validarFechaContraEntrega(project,body.fechaLimite);const estado=normalizeState(body.estado);return {id:id(),codigo:'t-'+sequence,titulo:body.titulo.trim(),descripcion:body.descripcion||'',responsable:body.responsable==='Tú'?'Visitante':body.responsable||null,colorResponsable:'#8b75d7',etapa,fechaLimite:body.fechaLimite||null,horaLimite:body.horaLimite||null,estado,estadoEtiqueta:labels[estado],generadaPorIa:false,resultadoTexto:null,archivoResultadoNombre:null,archivoResultadoUrl:null,tieneResultado:false,dependencias:[]};}
    function projectDTO(project) {project.progreso=project.tareas.length?Math.round(project.tareas.filter(done).length/project.tareas.length*100):0;return project;}
    function channel(project,body) {if(!body.nombre?.trim()) fail('Escribe un nombre para el canal');const general=body.tipo==='general';const c={id:id(),nombre:body.nombre.trim(),slug:general?'general':'canal-'+sequence,tipo:body.tipo||'tema',descripcion:body.descripcion||'',proyectoCodigo:project.codigo,proyectoNombre:project.nombre,color:project.color,totalMensajes:0,totalArchivos:0,ultimaActividad:null,borrable:!general,mensajes:[],archivos:[],resumenes:[],ultimoResumen:null};data.channels.push(c);return c;}
    const marcasResumen=['quedamos','acordamos','hagamos','me encargo','yo hago','listo','entrega','fecha','pendiente','falta','necesito','revisar','?'];
    const resumirTexto = (texto, maximo=140) => {const limpio=String(texto||'').replace(/\s+/g,' ').trim();return limpio.length>maximo?`${limpio.slice(0,maximo)}…`:limpio;};
    function resumenLocal(canal) {
      const mensajes=canal.mensajes||[];
      if(!mensajes.length) fail('El canal aún no tiene mensajes que resumir.');
      const relevantes=mensajes.filter(mensaje=>marcasResumen.some(marca=>mensaje.contenido.toLocaleLowerCase('es').includes(marca)));
      const seleccion=(relevantes.length?relevantes:mensajes).slice(0,5);
      const participantes=[...new Set(mensajes.map(mensaje=>mensaje.autorNombre).filter(Boolean))].slice(0,4);
      const cantidad=mensajes.length===1?'1 mensaje':`${mensajes.length} mensajes`;
      const autores=participantes.length?` entre ${participantes.join(', ')}`:'';
      return {id:id(),contenido:`Se revisaron ${cantidad}${autores}. Aspectos principales: ${seleccion.slice(0,3).map(mensaje=>resumirTexto(mensaje.contenido)).join(' · ')}`,puntosClave:seleccion.map(mensaje=>`${mensaje.autorNombre}: ${resumirTexto(mensaje.contenido)}`),mensajesResumidos:mensajes.length,modelo:'Local',fechaGeneracion:dateLabel(now())};
    }
    const deliverableStates={BORRADOR:'Borrador',EN_REVISION:'En revisión',FINAL:'Final'};
    const deliverableTypes={DOCUMENTO:['Documento','bi-file-earmark-text'],PRESENTACION:['Presentación','bi-easel'],DISENO:['Diseño','bi-palette'],HOJA_CALCULO:['Hoja de cálculo','bi-file-earmark-spreadsheet'],CODIGO:['Repositorio','bi-github'],VIDEO:['Video','bi-camera-video'],OTRO:['Otro','bi-link-45deg']};
    function formatDeliverable(item) {item.estado=String(item.estado||'BORRADOR').toUpperCase().replace(/-/g,'_');if(!deliverableStates[item.estado])item.estado='BORRADOR';item.estadoEtiqueta=deliverableStates[item.estado];item.tipo=String(item.tipo||'OTRO').toUpperCase();if(!deliverableTypes[item.tipo])item.tipo='OTRO';[item.tipoEtiqueta,item.icono]=deliverableTypes[item.tipo];return item;}
    const allowedRoutes = [
      ['GET',/^\/api\/sesion\/actual$/], ['POST',/^\/api\/sesion\/salir$/],
      ['GET|PUT',/^\/api\/usuarios\/actual$/], ['GET',/^\/api\/materias$/],
      ['GET|POST',/^\/api\/apuntes$/], ['PATCH',/^\/api\/apuntes\/\d+\/resuelto$/], ['DELETE',/^\/api\/apuntes\/\d+$/],
      ['GET',/^\/api\/organizador\/estado$/], ['POST',/^\/api\/organizador\/plan$/],
      ['GET|POST',/^\/api\/proyectos$/], ['GET',/^\/api\/proyectos\/[^/]+$/],
      ['GET|POST',/^\/api\/proyectos\/[^/]+\/(tareas|canales|entregables)$/],
      ['GET|PUT',/^\/api\/proyectos\/[^/]+\/integrantes$/], ['PATCH',/^\/api\/proyectos\/[^/]+\/reparto$/],
      ['GET|PUT',/^\/api\/proyectos\/[^/]+\/fases$/], ['GET',/^\/api\/proyectos\/[^/]+\/archivos$/], ['PUT',/^\/api\/tareas\/\d+$/],
      ['PATCH',/^\/api\/tareas\/\d+\/(estado|completar)$/], ['POST',/^\/api\/tareas\/\d+\/(reclamar|liberar|dependencias)$/],
      ['DELETE',/^\/api\/tareas\/\d+\/dependencias\/\d+$/], ['GET|DELETE',/^\/api\/canales\/\d+$/],
      ['POST',/^\/api\/canales\/\d+\/(mensajes|resumen)$/], ['GET',/^\/api\/canales\/\d+\/resumenes$/],
      ['GET|POST',/^\/api\/canales\/\d+\/archivos$/], ['DELETE',/^\/api\/archivos\/\d+$/],
      ['POST',/^\/api\/mensajes\/\d+\/reacciones$/], ['PUT|DELETE',/^\/api\/entregables\/\d+$/],
      ['PATCH',/^\/api\/entregables\/\d+\/estado$/], ['GET|POST',/^\/api\/recordatorios$/],
      ['GET|PUT',/^\/api\/recordatorios\/preferencias$/], ['POST',/^\/api\/recordatorios\/(prueba|reprogramar)$/],
      ['POST',/^\/api\/recordatorios\/\d+\/enviar$/], ['DELETE',/^\/api\/recordatorios\/\d+$/]
    ];
    function graph(project) {
      const stages=[...new Set([...project.etapas,...project.tareas.map(t=>t.etapa)])];
      const tasks=project.tareas.map(t=>({...t,ordenEtapa:stages.indexOf(t.etapa),bloqueantes:blocked(t).map(d=>d.titulo),disponible:project.modoReparto==='libre'&&!t.responsable&&!done(t)&&!blocked(t).length}));
      return {proyectoCodigo:project.codigo,proyectoNombre:project.nombre,modoReparto:project.modoReparto,puedeConfigurarReparto:true,puedeConfigurarFases:true,fases:stages.map((nombre,orden)=>({id:phaseId(project,nombre),nombre,orden,tareas:tasks.filter(t=>t.etapa===nombre)})),disponibles:tasks.filter(t=>t.disponible)};
    }
    async function request(path, options={}) {
      try {
        const url=new URL(path,'http://sandbox.local'), parts=url.pathname.split('/').filter(Boolean), method=(options.method||'GET').toUpperCase();
        if(url.origin!=='http://sandbox.local'||!allowedRoutes.some(([methods,route])=>methods.split('|').includes(method)&&route.test(url.pathname))) fail('Esta acción no está disponible en la prueba.',404);
        const body=typeof options.body==='string'?JSON.parse(options.body):options.body||{};
        let result;
        if(url.pathname==='/api/sesion/actual') result={iniciada:true,usuario:copy(user),cuentaDemostracion:''};
        else if(url.pathname==='/api/sesion/salir') result={mensaje:'Prueba terminada'};
        else if(url.pathname==='/api/usuarios/actual') {if(method!=='GET') Object.assign(user,body);result=user;}
        else if(url.pathname==='/api/materias') result=[];
        else if(parts[1]==='apuntes') {
          if(parts.length===2&&method==='GET') result=data.notes;
          else if(parts.length===2&&method==='POST') {if(!body.titulo?.trim()) fail('Escribe un título');result={...body,id:id(),resuelto:false,fechaCreacion:now()};data.notes.push(result);}
          else {const note=data.notes.find(n=>n.id===Number(parts[2]))||fail('Pendiente no encontrado',404);if(method==='DELETE') {data.notes=data.notes.filter(n=>n!==note);result=null;}else {note.resuelto=body.resuelto!==false;result=note;}}
        }
        else if(parts[1]==='organizador') {if(method==='GET') result={disponible:false,configurado:false};else fail('La IA no está conectada en la prueba. Crea las tareas manualmente.',503);}
        else if(parts[1]==='proyectos') {
          if(parts.length===2) {
            if(method==='POST') {
              if(!body.nombre?.trim()) fail('Escribe un nombre para el proyecto');
              if(!body.descripcion?.trim()) fail('Describe el objetivo del proyecto');
              if(!body.fechaEntrega) fail('Indica la fecha de entrega',400,'fechaEntrega');const fechaEntrega=new Date(`${body.fechaEntrega}T00:00:00`),hoy=new Date();hoy.setHours(0,0,0,0);if(Number.isNaN(fechaEntrega.getTime())||fechaEntrega<=hoy) fail('La fecha de entrega debe ser posterior a la fecha actual.',400,'fechaEntrega');
              if(!['asignado','libre'].includes(body.modoReparto)) fail('Elige cómo se repartirán las tareas',400,'modoReparto');
              const etapas=(body.etapas||[]).reduce((lista,entrada)=>{const nombre=String(entrada||'').trim();return nombre&&!lista.some(item=>item.toLocaleLowerCase('es')===nombre.toLocaleLowerCase('es'))?[...lista,nombre]:lista;},[])||[];
              if(!etapas.length) etapas.push('Planeación');
              const etapaActual=etapas[0];
              const etapaIds=Object.fromEntries(etapas.map(etapa=>[phaseKey(etapa),id()]));
              const project={id:id(),codigo:'prueba-'+sequence,nombre:body.nombre,descripcion:body.descripcion||'',fechaEntrega:body.fechaEntrega||null,color:body.color||'#8b75d7',etapaActual,etapas,etapaIds,modoReparto:body.modoReparto,progreso:0,integrantes:[{id:id(),nombre:'Visitante',iniciales:'V',color:'#8b75d7',rol:'creador'},...(body.integrantes||[]).map(m=>({...m,id:id(),iniciales:m.nombre.split(/\s+/).map(n=>n[0]).join('').slice(0,2),color:m.color||'#8b75d7',rol:'integrante'}))],tareas:[]};
              project.tareas=(body.tareas||[]).map(entrada=>task(entrada,project));
              data.projects.push(project);channel(project,{nombre:'General',tipo:'general',descripcion:'Conversación del proyecto'});result=projectDTO(project);
            } else result=data.projects.map(projectDTO);
          } else {
            const project=findProject(parts[2]);
            if(parts.length===3) result=projectDTO(project);
            else if(parts[3]==='tareas'&&method==='POST') {result=task(body,project);project.tareas.push(result);}
            else if(parts[3]==='tareas') result=project.tareas;
            else if(parts[3]==='integrantes') {if(method!=='GET') project.integrantes=body.map(m=>({...m,id:m.id||id(),iniciales:m.nombre.slice(0,2),color:m.color||'#8b75d7',rol:'integrante'}));result=project.integrantes;}
            else if(parts[3]==='reparto'&&method==='PATCH') {if(!['asignado','libre'].includes(body.modoReparto)) fail('Elige un modo de reparto');project.modoReparto=body.modoReparto;result=projectDTO(project);}
            else if(parts[3]==='fases') result=method==='PUT'?updatePhases(project,body):graph(project);
            else if(parts[3]==='archivos') result=data.channels.filter(c=>c.proyectoCodigo===project.codigo).flatMap(c=>c.archivos);
            else if(parts[3]==='canales') result=method==='POST'?channel(project,body):data.channels.filter(c=>c.proyectoCodigo===project.codigo);
            else if(parts[3]==='entregables') {
              if(method==='POST') {if(!body.nombre?.trim()||!/^https?:\/\//i.test(body.url||''))fail('Escribe un nombre y un enlace válido');result=formatDeliverable({...body,id:id(),proyectoCodigo:project.codigo,colorResponsable:'#8b75d7',tarea:null,fechaRegistro:dateLabel(now())});data.deliverables.push(result);}
              else result=data.deliverables.filter(d=>d.proyectoCodigo===project.codigo);
            } else fail('Acción no disponible en la prueba',404);
          }
        } else if(parts[1]==='tareas') {
          const t=findTask(parts[2]), project=projectOf(t);
          if(parts[3]==='dependencias') {
            if(method==='DELETE') t.dependencias=t.dependencias.filter(d=>d!==Number(parts[4]));
            else {const dependency=findTask(body.dependeDe);if(projectOf(dependency)!==project) fail('La dependencia pertenece a otro proyecto');const fechaTarea=t.fechaLimite&&new Date(`${t.fechaLimite}T00:00:00`),fechaDependencia=dependency.fechaLimite&&new Date(`${dependency.fechaLimite}T00:00:00`);if(fechaTarea&&fechaDependencia&&fechaDependencia>fechaTarea) fail(`Verifica las fechas: «${dependency.titulo}» vence el ${dependency.fechaLimite}, después de «${t.titulo}» (${t.fechaLimite}). Una dependencia debe vencer antes o el mismo día que la tarea que espera.`);const reaches=(node,target,seen=new Set())=>node.id===target||(!seen.has(node.id)&&(seen.add(node.id),node.dependencias.some(d=>reaches(findTask(d),target,seen))));if(reaches(dependency,t.id)) fail('Esta dependencia crearía un ciclo');if(!t.dependencias.includes(dependency.id)) t.dependencias.push(dependency.id);}
          } else if(parts[3]==='reclamar') {if(project.modoReparto!=='libre'||t.responsable||blocked(t).length||done(t)) fail('Esta tarea no está disponible');t.responsable='Visitante';if(t.estado==='sin-empezar'){t.estado='en-proceso';t.estadoEtiqueta=labels[t.estado];}}
          else if(parts[3]==='liberar') {if(project.modoReparto!=='libre') fail('El proyecto usa tareas asignadas');t.responsable=null;t.estado='sin-empezar';t.estadoEtiqueta=labels[t.estado];}
          else if(parts[3]==='completar') {const resultado=String(body.get?.('resultado')||'').trim(),archivo=body.get?.('archivo');if(!resultado&&!archivo&&!t.tieneResultado) fail('Para terminar una tarea debes registrar un resultado escrito o adjuntar un archivo.');if(resultado)t.resultadoTexto=resultado;if(archivo){t.archivoResultadoNombre=archivo.name;t.archivoResultadoUrl=URL.createObjectURL(archivo);data.urls.push(t.archivoResultadoUrl);}t.tieneResultado=true;t.estado='terminada';t.estadoEtiqueta=labels[t.estado];}
          else if(parts[3]==='estado') {const siguiente=normalizeState(body.estado);if(siguiente==='terminada'&&!t.tieneResultado) fail('Para terminar una tarea debes registrar un resultado escrito o adjuntar un archivo.');t.estado=siguiente;t.estadoEtiqueta=labels[t.estado];}
          else if(method==='PUT') {if(!body.titulo?.trim()) fail('Escribe un título para la tarea');if('etapa'in body&&!project.etapas.includes(body.etapa)) fail('La etapa elegida no pertenece a este proyecto');if(body.responsable&&!project.integrantes.some(i=>i.nombre===body.responsable)) fail('El responsable elegido no pertenece al proyecto.');const fechaNueva=body.fechaLimite??t.fechaLimite;validarFechaContraEntrega(project,fechaNueva);const fechaNuevaDate=fechaNueva&&new Date(`${fechaNueva}T00:00:00`),dependenciaTardia=t.dependencias.map(findTask).find(d=>fechaNuevaDate&&d.fechaLimite&&new Date(`${d.fechaLimite}T00:00:00`)>fechaNuevaDate),tareaQueEspera=project.tareas.find(otra=>otra.dependencias.includes(t.id)&&fechaNuevaDate&&otra.fechaLimite&&fechaNuevaDate>new Date(`${otra.fechaLimite}T00:00:00`));if(dependenciaTardia) fail(`Verifica las fechas: «${dependenciaTardia.titulo}» vence después de esta tarea. Una dependencia debe vencer antes o el mismo día que la tarea que espera.`);if(tareaQueEspera) fail(`Verifica las fechas: «${tareaQueEspera.titulo}» espera a esta tarea y vence antes. Una dependencia debe vencer antes o el mismo día que la tarea que espera.`);['titulo','descripcion','responsable','etapa','fechaLimite','horaLimite'].forEach(key=>{if(key in body)t[key]=body[key];});const siguiente=normalizeState(body.estado||t.estado);if(siguiente==='terminada'&&!t.tieneResultado) fail('Para terminar una tarea debes registrar un resultado escrito o adjuntar un archivo.');t.estado=siguiente;t.estadoEtiqueta=labels[t.estado];}
          result=t;
        } else if(parts[1]==='canales') {
          const c=data.channels.find(c=>c.id===Number(parts[2]))||fail('Canal no encontrado',404);
          if(parts[3]==='mensajes') {if(!body.contenido?.trim()) fail('Escribe un mensaje');result={id:id(),autorNombre:'Visitante',autorColor:'#8b75d7',iniciales:'V',contenido:body.contenido,fechaEnvio:now(),generadoPorIa:false,propio:true,reacciones:[],adjuntos:[]};c.mensajes.push(result);c.totalMensajes=c.mensajes.length;c.ultimaActividad=now();}
          else if(parts[3]==='archivos') {
            if(method==='POST') {const file=body.get('archivo');if(!file) fail('Elige un archivo');if(file.size>10*1024*1024) fail('Máximo 10 MB en la prueba');const blobUrl=URL.createObjectURL(file);data.urls.push(blobUrl);result={id:id(),nombre:file.name,url:blobUrl,tamano:Math.round(file.size/1024)+' KB',esImagen:file.type.startsWith('image/'),tipoMime:file.type,fechaSubida:now(),subidoPor:'Visitante',canal:c.nombre};c.archivos.push(result);c.totalArchivos=c.archivos.length;c.mensajes.find(m=>m.id===Number(url.searchParams.get('mensajeId')||body.get('mensajeId')))?.adjuntos.push(result);}
            else result=url.searchParams.get('soloImagenes')==='true'?c.archivos.filter(f=>f.esImagen):c.archivos;
          } else if(parts[3]==='resumen') {const resumen=resumenLocal(c);c.ultimoResumen=resumen;(c.resumenes||=[]).unshift(resumen);result=resumen;}
          else if(parts[3]==='resumenes') result=c.resumenes||[];
          else if(method==='DELETE') {if(!c.borrable)fail('El canal general no se puede eliminar');data.channels=data.channels.filter(item=>item!==c);result=null;}
          else result=c;
        } else if(parts[1]==='mensajes'&&parts[3]==='reacciones') {
          if(!['acuerdo','hecho','gracias'].includes(body.emoji)) fail('Reacción no admitida');
          const message=data.channels.flatMap(c=>c.mensajes).find(m=>m.id===Number(parts[2]))||fail('Mensaje no encontrado',404);
          const prior=message.reacciones.find(r=>r.emoji===body.emoji);message.reacciones=prior?message.reacciones.filter(r=>r!==prior):[...message.reacciones,{emoji:body.emoji,total:1,propia:true,personas:['Visitante']}];result=message;
        } else if(parts[1]==='archivos') {
          const channel=data.channels.find(c=>c.archivos.some(f=>f.id===Number(parts[2])))||fail('Archivo no encontrado',404);
          const file=channel.archivos.find(f=>f.id===Number(parts[2]));URL.revokeObjectURL(file.url);data.urls=data.urls.filter(url=>url!==file.url);channel.archivos=channel.archivos.filter(f=>f!==file);channel.totalArchivos=channel.archivos.length;channel.mensajes.forEach(m=>m.adjuntos=m.adjuntos.filter(f=>f!==file));result=null;
        } else if(parts[1]==='entregables') {
          const item=data.deliverables.find(d=>d.id===Number(parts[2]))||fail('Entregable no encontrado',404);
          if(method==='DELETE') {data.deliverables=data.deliverables.filter(d=>d!==item);result=null;}
          else {Object.assign(item,body);result=formatDeliverable(item);}
        } else if(parts[1]==='recordatorios') {
          if(parts[2]==='preferencias') {if(method==='PUT') Object.assign(data.preferences,body,{pasarelaConectada:false});result=data.preferences;}
          else if(parts[2]==='prueba'||parts[2]==='reprogramar') result={mensaje:'Simulación completada. No se envió ningún mensaje.',programados:0};
          else if(parts[3]==='enviar') {result=data.reminders.find(r=>r.id===Number(parts[2]))||fail('Recordatorio no encontrado',404);result.estado='ENVIADO';result.mensaje=(result.mensaje?result.mensaje+' · ':'')+'Simulación: no se envió ningún mensaje.';}
          else if(method==='DELETE') {const reminder=data.reminders.find(r=>r.id===Number(parts[2]))||fail('Recordatorio no encontrado',404);reminder.estado='CANCELADO';result=null;}
          else if(method==='POST') {const due=new Date(body.fechaVencimiento),lead=Number(body.minutosAntes);if(!body.titulo?.trim()||body.titulo.length>150||!Number.isFinite(due.getTime())||due.getTime()<=Date.now()) fail('Completa el título y una fecha futura');if(!Number.isInteger(lead)||lead<0||lead>43200||due.getTime()-lead*60000<=Date.now()) fail('Elige una antelación válida y futura');result={id:id(),tipo:'PERSONAL',tipoEtiqueta:'Personal',canal:'WHATSAPP',estado:'PROGRAMADO',titulo:body.titulo,mensaje:body.mensaje||'',fechaVencimiento:dateLabel(due),fechaHora:dateLabel(due.getTime()-lead*60000),proyecto:null,errorEnvio:null};data.reminders.push(result);}
          else result=data.reminders;
        } else fail('Esta acción no está disponible en la prueba.',404);
        local.setItem('studyflow_projects',JSON.stringify(data.projects.map(projectDTO)));
        return {status:result===null?204:200,data:copy(result)};
      } catch(error) {return {status:error.status||400,data:{mensaje:error.message,message:error.message,errores:error.field?{[error.field]:error.message}:undefined}};}
    }
    const isoDay = value => {
      const date = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
      return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    };
    const dayAt = (start, end, progress) => {
      const range = Math.max(0, end.getTime() - start.getTime());
      return isoDay(new Date(start.getTime() + Math.round(range * progress)));
    };
    const initials = name => String(name || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
    const persistProjects = () => local.setItem('studyflow_projects', JSON.stringify(data.projects.map(projectDTO)));

    /*
     * The complete dependency tree in the guided tour is made of the same RAM
     * entities and operations as a project created by the visitor. It is not a
     * visual fixture: each generated node can be opened, edited, moved to a
     * phase, assigned, completed with a result, or connected through the API.
     *
     * This private store operation is deliberately not an HTTP route. Only the
     * isolated sandbox host can invoke it, so it cannot affect a signed-in
     * account or reach the persistent backend.
     */
    function prepareTourDiagram(projectCode) {
      const project = findProject(projectCode || data.projects[0]?.codigo);
      if (project.tourDiagramReady) return copy(projectDTO(project));

      const roots = project.tareas.filter(tarea => !tarea.tourDiagramTask).slice(0, 2);
      if (roots.length < 2) fail('Crea las dos tareas iniciales antes de abrir el diagrama completo.');

      const phases = ['Planeación', 'Diseño', 'Implementación', 'Revisión'];
      phases.forEach(phase => {
        if (!project.etapas.some(current => current.toLocaleLowerCase('es') === phase.toLocaleLowerCase('es'))) {
          project.etapas.push(phase);
          ensurePhaseIds(project)[phaseKey(phase)] = id();
        }
      });
      const phaseName = phase => project.etapas.find(current => current.toLocaleLowerCase('es') === phase.toLocaleLowerCase('es')) || phase;
      const team = [
        ['Laura', '#8b75d7'], ['Mateo', '#19a7bd'], ['Camila', '#36aa8a'],
        ['Diego', '#f2ae3d'], ['Valeria', '#d7639d']
      ];
      team.forEach(([nombre, color]) => {
        if (!project.integrantes.some(member => member.nombre === nombre)) {
          project.integrantes.push({ id:id(), nombre, iniciales:initials(nombre), color, rol:'integrante' });
        }
      });

      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const delivery = project.fechaEntrega ? new Date(`${project.fechaEntrega}T12:00:00`) : null;
      const lastDay = delivery && !Number.isNaN(delivery.getTime()) && delivery >= tomorrow
        ? delivery
        : new Date(tomorrow.getTime() + 12 * 86400000);
      const dates = {
        planning: dayAt(tomorrow, lastDay, 0),
        design: dayAt(tomorrow, lastDay, .38),
        implementation: dayAt(tomorrow, lastDay, .72),
        review: dayAt(tomorrow, lastDay, 1)
      };

      // The two tasks the visitor just created become the independent roots of
      // the real example. The preceding one-to-one link is replaced by a wider
      // graph so the following screen can demonstrate forks and joins.
      roots.forEach(root => {
        root.etapa = phaseName('Planeación');
        root.fechaLimite = dates.planning;
        root.horaLimite = root.horaLimite || '09:00';
        root.dependencias = [];
        root.estadoEtiqueta = labels[root.estado] || labels['sin-empezar'];
      });

      const add = body => {
        const item = task({ ...body, etapa: phaseName(body.etapa), horaLimite:'09:00' }, project);
        item.tourDiagramTask = true;
        project.tareas.push(item);
        return item;
      };
      const map = add({
        titulo:'Mapear experiencia', descripcion:'Sintetiza lo aprendido en las dos tareas iniciales.',
        responsable:'Camila', etapa:'Diseño', fechaLimite:dates.design, estado:'sin-empezar'
      });
      const flow = add({
        titulo:'Diseñar flujo', descripcion:'Propone el recorrido principal a partir del alcance y los criterios.',
        responsable:'Diego', etapa:'Diseño', fechaLimite:dates.design, estado:'sin-empezar'
      });
      const architecture = add({
        titulo:'Definir arquitectura', descripcion:'Organiza la solución visual y técnica para el equipo.',
        responsable:'Valeria', etapa:'Diseño', fechaLimite:dates.design, estado:'sin-empezar'
      });
      const build = add({
        titulo:'Construir pantalla', descripcion:'Implementa la pantalla principal del proyecto.',
        responsable:'Diego', etapa:'Implementación', fechaLimite:dates.implementation, estado:'sin-empezar'
      });
      const content = add({
        titulo:'Integrar contenido', descripcion:'Incorpora los contenidos definidos en el mapa de experiencia.',
        responsable:'Camila', etapa:'Implementación', fechaLimite:dates.implementation, estado:'sin-empezar'
      });
      const tests = add({
        titulo:'Preparar pruebas', descripcion:'Define los escenarios para validar el resultado.',
        responsable:'Mateo', etapa:'Implementación', fechaLimite:dates.implementation, estado:'sin-empezar'
      });
      const final = add({
        titulo:'Presentar resultados', descripcion:'Reúne los tres resultados de implementación para la entrega final.',
        responsable:'Visitante', etapa:'Revisión', fechaLimite:dates.review, estado:'sin-empezar'
      });
      [map, flow, architecture].forEach(item => { item.dependencias = roots.map(root => root.id); });
      build.dependencias = [flow.id];
      content.dependencias = [map.id];
      tests.dependencias = [architecture.id];
      final.dependencias = [build.id, content.id, tests.id];
      project.tourDiagramReady = true;
      persistProjects();
      return copy(projectDTO(project));
    }
    return {storage:local,sessionStorage:session,request,projectCode:()=>data.projects[0]?.codigo||null,isTourDiagramPrepared:code=>Boolean(findProject(code || data.projects[0]?.codigo).tourDiagramReady),prepareTourDiagram,setTheme:theme=>local.setItem('studyflow-tema',theme==='claro'?'claro':'oscuro'),destroy(){data.urls.forEach(url=>URL.revokeObjectURL(url));data.urls.length=0;data.projects.length=0;data.channels.length=0;data.deliverables.length=0;data.reminders.length=0;data.notes.length=0;data.preferences.telefonoWhatsapp='';data.preferences.activo=false;local.clear();session.clear();}};
  }
  root.createSandboxStore=createSandboxStore;
  if(typeof module!=='undefined') module.exports={createSandboxStore};
})(typeof window==='undefined'?globalThis:window);
