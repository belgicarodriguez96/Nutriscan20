const $=id=>document.getElementById(id);
let mediaStream=null, scanLoop=null, barcodeDetector=null, installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').classList.remove('hidden')});
$('install').addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install').classList.add('hidden')});
if('serviceWorker'in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hidden',v.id!==btn.dataset.tab));$('result').classList.add('hidden');}));
function val(id){const x=$(id);return x&&x.value!==''&&Number.isFinite(Number(x.value))?Number(x.value):null}
function render(p){
  const ingredients=(p.ingredients||'').toLocaleLowerCase('es');
  let score=10,known=0;const favorable=[],caution=[];
  const metric=(x,fn)=>{if(x!==null&&x!==undefined){known++;score+=fn(x)}};
  metric(p.sugar,x=>x<=5?2:x<=10?0:x<=22.5?-2:-4);
  metric(p.salt,x=>x<=.3?2:x<=1?0:x<=1.5?-2:-4);
  if(p.salt==null)metric(p.sodium,x=>x<=120?2:x<=400?0:x<=600?-2:-4);
  metric(p.sat,x=>x<=1.5?2:x<=5?0:x<=10?-2:-4);
  metric(p.fiber,x=>x>=6?3:x>=3?2:x>=1?1:0);
  metric(p.protein,x=>x>=10?2:x>=5?1:0);
  const pos=[
    [/avena integral|trigo integral|centeno integral|arroz integral|harina integral|grano entero/,'Cereales integrales: pueden aportar fibra y favorecer la saciedad.'],
    [/lenteja|garbanzo|poroto|frijol|arveja|soja|soya/,'Legumbres: aportan fibra y proteínas vegetales.'],
    [/nuez|almendra|avellana|mani|cacahuate|chia|linaza|sesamo|semilla/,'Frutos secos o semillas: aportan grasas insaturadas y otros nutrientes.'],
    [/aceite de oliva/,'Aceite de oliva: aporta principalmente grasas insaturadas.'],
    [/fruta|manzana|platano|banana|pera|frutilla|fresa|arandano|ciruela/,'Ingrediente de fruta: su aporte depende de la forma y cantidad.'],
    [/espinaca|zanahoria|tomate|brocoli|calabaza|verdura/,'Verduras: pueden aportar fibra y micronutrientes.']
  ];
  pos.forEach(([re,msg])=>{if(re.test(ingredients))favorable.push(msg)});
  const caut=[
    [/azucar|jarabe de maiz|jarabe de glucosa|dextrosa|fructosa|sacarosa/,'Aparecen azúcares o jarabes: revisa la cantidad total y su posición en la lista.'],
    [/grasa vegetal hidrogenada|aceite parcialmente hidrogenado/,'Grasa parcialmente hidrogenada: merece especial atención por posibles grasas trans.'],
    [/nitrito de sodio|nitrato de sodio|nitrito de potasio|nitrato de potasio/,'Contiene nitritos o nitratos, aditivos autorizados en ciertos productos; importa el contexto y la frecuencia.'],
    [/edulcorante|sucralosa|aspartamo|acesulfamo/,'Contiene edulcorante: no significa automáticamente que sea perjudicial.']
  ];
  caut.forEach(([re,msg])=>{if(re.test(ingredients))caution.push(msg)});
  if(/azucar|jarabe de maiz|jarabe de glucosa|dextrosa|fructosa|sacarosa/i.test(ingredients))score-=1;
  if(/grasa vegetal hidrogenada|aceite parcialmente hidrogenado/i.test(ingredients))score-=2;
  score=Math.max(0,Math.min(20,Math.round(score)));
  const grade=score<=5?'Muy baja':score<=9?'Baja':score<=13?'Intermedia':score<=17?'Buena':'Muy buena';
  $('foodname').textContent=p.name||'Alimento sin nombre';$('score').textContent=score;
  $('scoreRing').style.setProperty('--angle',(score*5)+'%');
  $('grade').textContent=grade+' · '+score+'/20';
  $('summary').textContent=known>=4?'Puntuación basada en varios datos nutricionales disponibles.':'Puntuación provisional: faltan datos para una evaluación más completa.';
  $('source').textContent=p.source||'Análisis manual orientativo';
  const nutrients=[['Azúcares',p.sugar,'g/100 g'],['Sal',p.salt,'g/100 g'],['Grasas saturadas',p.sat,'g/100 g'],['Fibra',p.fiber,'g/100 g'],['Proteínas',p.protein,'g/100 g'],['Sodio',p.sodium,'mg/100 g']];
  $('nutrients').innerHTML=nutrients.filter(n=>n[1]!=null).map(n=>`<div class="nut"><span>${n[0]}</span><strong>${n[1]} ${n[2]}</strong></div>`).join('')||'<p class="muted">No hay datos nutricionales disponibles.</p>';
  $('good').innerHTML=favorable.length?favorable.map(x=>`<li>${x}</li>`).join(''):'<li>No se identificaron señales favorables específicas. Puede faltar información.</li>';
  $('caution').innerHTML=caution.length?caution.map(x=>`<li>${x}</li>`).join(''):'<li>No se identificaron señales específicas; esto no garantiza que el producto sea saludable.</li>';
  let tips=[];if(p.sugar>10)tips.push('Compara con una alternativa con menos azúcares por 100 g.');if(p.salt>1||p.sodium>400)tips.push('Busca una versión con menos sal o sodio.');if(p.sat>5)tips.push('Compara las grasas saturadas.');if(p.fiber!=null&&p.fiber<3)tips.push('Si es un cereal o snack, considera una alternativa integral con más fibra.');tips.push('Considera la porción y la frecuencia de consumo; no te guíes solo por la nota.');
  $('tips').textContent=tips.join(' ');
  $('result').classList.remove('hidden');$('result').scrollIntoView({behavior:'smooth',block:'start'});
}
async function lookup(){
 const code=$('barcode').value.trim();if(!/^\d{8,14}$/.test(code)){$('status').textContent='Introduce un código de barras de 8 a 14 dígitos.';return}
 $('status').textContent='Consultando Open Food Facts…';$('search').disabled=true;
 try{
  const url=`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_es,ingredients_text,ingredients_text_es,nutriments,brands,code`;
  const r=await fetch(url);if(!r.ok)throw Error();const data=await r.json();if(data.status!==1||!data.product)throw Error('notfound');
  const x=data.product,n=x.nutriments||{};const get=k=>n[k]!=null&&n[k]!==''&&Number.isFinite(Number(n[k]))?Number(n[k]):null;
  const sodium=get('sodium_100g'),salt=get('salt_100g');
  render({name:x.product_name_es||x.product_name||x.brands||'Producto',ingredients:x.ingredients_text_es||x.ingredients_text||'',sugar:get('sugars_100g'),salt:salt??(sodium==null?null:sodium*2.5),sodium,sat:get('saturated-fat_100g'),fiber:get('fiber_100g'),protein:get('proteins_100g'),source:'Datos de Open Food Facts · verifica el envase'});
  $('status').textContent='Producto encontrado. Confirma que la etiqueta coincida con los datos.';
 }catch(e){$('status').textContent=e.message==='notfound'?'No encontramos este producto. Prueba otro código o usa el análisis manual.':'No se pudo consultar la base de datos. Revisa tu conexión e inténtalo de nuevo.'}
 finally{$('search').disabled=false}
}
$('search').addEventListener('click',lookup);$('barcode').addEventListener('keydown',e=>{if(e.key==='Enter')lookup()});
async function stopScan(){if(scanLoop)cancelAnimationFrame(scanLoop);scanLoop=null;if(mediaStream)mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null;$('video').srcObject=null;$('video').classList.add('hidden');$('scan').textContent='📷 Usar cámara'}
$('scan').addEventListener('click',async()=>{
 if(mediaStream){await stopScan();return}
 if(!('BarcodeDetector'in window)||!navigator.mediaDevices?.getUserMedia){$('status').textContent='Este navegador no admite el escaneo directo. Introduce el código manualmente.';return}
 try{barcodeDetector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});$('video').srcObject=mediaStream;$('video').classList.remove('hidden');$('scan').textContent='Cerrar cámara';await $('video').play();
 const tick=async()=>{if(!mediaStream)return;try{const found=await barcodeDetector.detect($('video'));if(found.length){$('barcode').value=found[0].rawValue;await stopScan();await lookup();return}}catch(e){}scanLoop=requestAnimationFrame(tick)};tick()
 }catch(e){await stopScan();$('status').textContent='No se pudo abrir la cámara. Comprueba los permisos.'}
});
const fresh={
 apple:{name:'Manzana fresca',sugar:10.4,fiber:2.4,protein:.3,sat:.03,salt:0,sodium:1,good:['Fruta entera: aporta fibra y agua.','No contiene azúcares añadidos si se consume fresca.'],caution:['Sus azúcares son naturales; el zumo no equivale a la fruta entera.']},
 banana:{name:'Plátano fresco',sugar:12.2,fiber:2.6,protein:1.1,sat:.1,salt:0,sodium:1,good:['Aporta potasio, fibra y carbohidratos.','Fruta entera sin azúcares añadidos.'],caution:['Aporta carbohidratos naturales; la porción depende de las necesidades individuales.']},
 orange:{name:'Naranja fresca',sugar:9.4,fiber:2.4,protein:.9,sat:.02,salt:0,sodium:0,good:['Aporta vitamina C, agua y fibra.','La fruta entera conserva más fibra que el zumo.'],caution:['El zumo se consume con mayor facilidad en cantidades grandes.']},
 pear:{name:'Pera fresca',sugar:9.8,fiber:3.1,protein:.4,sat:.02,salt:0,sodium:1,good:['Aporta agua y fibra.','Fruta entera sin azúcares añadidos.'],caution:['Los azúcares son naturales y forman parte de su perfil nutricional.']},
 strawberry:{name:'Frutilla fresca',sugar:4.9,fiber:2,protein:.7,sat:.02,salt:0,sodium:1,good:['Aporta vitamina C y agua.','Relativamente baja en azúcares por 100 g.'],caution:['Las mermeladas y preparaciones pueden llevar azúcar añadido.']},
 blueberry:{name:'Arándanos frescos',sugar:10,fiber:2.4,protein:.7,sat:.03,salt:0,sodium:1,good:['Aportan fibra y compuestos vegetales.','La fruta fresca no necesita azúcar añadido.'],caution:['Los arándanos deshidratados pueden llevar azúcar añadido.']},
 carrot:{name:'Zanahoria fresca',fiber:2.8,protein:.9,sat:.03,salt:.07,sodium:69,good:['Aporta betacaroteno y fibra.','Verdura versátil para distintas comidas.'],caution:['Las salsas o preparaciones pueden aumentar la sal y la energía.']},
 broccoli:{name:'Brócoli fresco',fiber:2.6,protein:2.8,sat:.1,salt:.07,sodium:33,good:['Aporta fibra, vitamina C y folato.','Verdura rica en micronutrientes.'],caution:['Las salsas o el exceso de sal modifican el perfil del plato.']},
 tomato:{name:'Tomate fresco',fiber:1.2,protein:.9,sat:.03,salt:.01,sodium:5,good:['Aporta agua y licopeno.','Bajo en sodio de forma natural.'],caution:['Salsas y conservas de tomate pueden tener sal añadida.']},
 spinach:{name:'Espinaca fresca',fiber:2.2,protein:2.9,sat:.1,salt:.2,sodium:79,good:['Aporta folato, vitamina K y otros micronutrientes.','Verdura con fibra.'],caution:['Personas con indicaciones médicas específicas pueden necesitar adaptar su consumo.']},
 potato:{name:'Papa fresca',fiber:2.2,protein:2,sat:.03,salt:.01,sodium:6,good:['Aporta potasio y carbohidratos.','Hervida o al horno puede formar parte de una alimentación equilibrada.'],caution:['Freírla o añadir mucha sal cambia considerablemente su perfil.']},
 avocado:{name:'Palta fresca',fiber:6.7,protein:2,sat:2.1,salt:.02,sodium:7,good:['Aporta fibra y grasas principalmente insaturadas.','Puede contribuir a la saciedad.'],caution:['Es energéticamente densa; la porción depende de las necesidades individuales.']},
 lentils:{name:'Lentejas cocidas sin sal añadida',fiber:7.9,protein:9,sat:.1,salt:.02,sodium:2,good:['Legumbre con fibra y proteína vegetal.','Aporta folato, hierro y otros minerales.'],caution:['Las versiones en conserva pueden contener más sodio; revisa la etiqueta.']},
 chickpeas:{name:'Garbanzos cocidos sin sal añadida',fiber:7.6,protein:8.9,sat:.3,salt:.02,sodium:7,good:['Aportan fibra y proteína vegetal.','Pueden ayudar a preparar comidas saciantes.'],caution:['Las conservas pueden contener sal añadida.']},
 egg:{name:'Huevo entero',fiber:0,protein:12.6,sat:3.1,salt:.36,sodium:142,good:['Aporta proteína de buena calidad y vitamina B12.','Versátil y nutritivo.'],caution:['Contiene grasas saturadas; evalúa la alimentación global y tus indicaciones clínicas.']},
 salmon:{name:'Salmón fresco',fiber:0,protein:20,sat:3.1,salt:.13,sodium:59,good:['Aporta proteína y ácidos grasos omega-3.','No contiene azúcares añadidos si es fresco sin aderezos.'],caution:['Preparaciones ahumadas o curadas pueden tener más sodio.']},
 chicken:{name:'Pollo sin piel, sin aderezos',fiber:0,protein:23,sat:1,salt:.1,sodium:70,good:['Aporta proteína de buena calidad.','Sin empanizado ni salsas añadidas.'],caution:['Fiambres o marinados pueden contener más sodio.']},
 milk:{name:'Leche natural',fiber:0,protein:3.4,sat:1.9,salt:.1,sodium:44,good:['Aporta proteínas y calcio.','La lactosa es un azúcar natural de la leche.'],caution:['Considera tolerancia individual y necesidades; las versiones saborizadas pueden llevar azúcar añadido.']},
 oats:{name:'Avena sin azúcar añadido',sugar:1,fiber:10,protein:13.2,sat:1.2,salt:.02,sodium:2,good:['Cereal integral rico en fibra.','Aporta proteína vegetal y beta-glucanos.'],caution:['Los sobres saborizados pueden llevar azúcar o sodio añadido.']},
 almonds:{name:'Almendras sin sal',fiber:12.5,protein:21.2,sat:3.8,salt:0,sodium:1,good:['Aportan grasas insaturadas, fibra y vitamina E.','Sin sal añadida en esta opción.'],caution:['Son energéticamente densas; una porción habitual suele ser pequeña.']}
};
$('freshAnalyze').addEventListener('click',()=>{const f=fresh[$('freshfood').value];render({...f,source:'Perfil nutricional típico por 100 g · valores aproximados'});$('good').innerHTML=f.good.map(x=>`<li>${x}</li>`).join('');$('caution').innerHTML=f.caution.map(x=>`<li>${x}</li>`).join('');$('tips').textContent='Prefiere preparaciones sencillas y considera el tamaño de la porción. Los valores pueden variar según variedad, preparación y madurez.';});
