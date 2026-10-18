
'use strict';

/* =========================================================
   LIMS v1.1 — Full Offline PWA
   - 100% offline core
   - No CDN / no fetch / no external CSS or JS
   - LocalStorage database
   - Backup / restore JSON
   - Offline report printing -> Android/Chrome "Save as PDF"
   - Optional local html2pdf hook:
       vendor/html2pdf.bundle.min.js
     If you later place that file beside this HTML, the
     Export PDF button will use it. Otherwise Print PDF works.
   ========================================================= */

const KEY='biotech_lims_general_v10'; // Keep V11 database key so existing V11 local data is retained
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=p=>p+Date.now().toString().slice(-7)+Math.floor(Math.random()*90+10);
const money=n=>Number(n||0).toLocaleString()+' '+(db.settings.currency||'MMK');

const base={
  settings:{
    labName:'BioTech Laboratory',address:'Myitkyina, Myanmar',phone:'09-000000000',
    currency:'MMK',theme:'#0b8ecf',themeConfig:{preset:'Ocean',primary:'#0b8ecf',secondary:'#28b6ef',dark:'#12304a',background:'#eaf6fb',navButton:'#a9e4fa'},
    quick:['Positive','Negative','Reactive','Non-Reactive','Detected','Not Detected','Present','Absent','Normal','Abnormal','Trace','Nil'],
    auth:{username:'adm',password:'adm',enabled:true},
    app:{autoLockMinutes:0,version:'1.0',showResultControls:true,v12BaseRepair:false,navLayout:'sidebar'},
    billing:{showDoctor:true},
    report:{
      layout:'A4 Portrait',mode:'full',
      tester:'Laboratory Technician',verifier:'Laboratory Technician',doctor:'Consultant / Pathologist',
      showHeader:true,showTester:true,showVerifier:false,showDoctor:true,showDoctorInfo:true,
      showReference:true,showUnit:true,showStatus:true,showRemark:true,showCategory:false,showFooter:false,
      commentTitle:'Comment',
      showLogo:false,footer:'',logo:'',headerMode:'text',headerText:'',headerImage:'',headerImageWidth:180,headerImageHeight:60,headerBlankSpace:70,resultOnly:false,
      layoutStyle:'clean',showSeparators:false,showTestDescription:true,showResults:true,
      exportFolders:{report:'',invoice:'',voucher:''},footerText:'',showFooterText:false
    }
  },
  doctors:[
    {id:1,name:'Dr Win Ko Ko',contact:'',fee:0},
    {id:2,name:'Dr MTA',contact:'',fee:0}
  ],
  prefixes:[
    {id:1,title:'U',gender:'Male'},{id:2,title:'Daw',gender:'Female'},
    {id:3,title:'Ko',gender:'Male'},{id:4,title:'Ma',gender:'Female'}
  ],
  tests:[],patients:[],waiting:[],archives:[],qc:[],eqa:[],protocols:[],invoices:[],vouchers:[],nextLab:112555
};

const seed=[
['CBC','Hematology','panel','','See report','EDTA','2',12000,['WBC','RBC','Hb','Hct','MCV','MCH','MCHC','RDW-CV','Platelet','Neutrophil %','Lymphocyte %','Monocyte %','Eosinophil %','Basophil %']],
['ESR','Hematology','numeric','mm/hr','See lab range','EDTA','1.5',4000,[]],
['Blood Group & Rh','Hematology','panel','','See report','EDTA','2',5000,['ABO Group','Rh(D)']],
['PT / INR','Coagulation','panel','','See report','Citrate','2.7',10000,['PT','INR']],
['APTT','Coagulation','numeric','sec','See lab range','Citrate','2.7',10000,[]],
['Glucose','Chemistry','numeric','mg/dL','70–110','Fluoride/Serum','0.5',5000,[]],
['Urea','Chemistry','numeric','mmol/L','2.5–7.5','Yellow','0.5',7000,[]],
['Creatinine','Chemistry','numeric','µmol/L','53–97','Yellow','0.5',7000,[]],
['Uric Acid','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',7000,[]],
['AST','Chemistry','numeric','U/L','See lab range','Yellow','0.5',6000,[]],
['ALT','Chemistry','numeric','U/L','See lab range','Yellow','0.5',6000,[]],
['ALP','Chemistry','numeric','U/L','See lab range','Yellow','0.5',6000,[]],
['GGT','Chemistry','numeric','U/L','See lab range','Yellow','0.5',6000,[]],
['Bilirubin Total','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',6000,[]],
['Total Protein','Chemistry','numeric','g/dL','See lab range','Yellow','0.5',6000,[]],
['Albumin','Chemistry','numeric','g/dL','See lab range','Yellow','0.5',6000,[]],
['Cholesterol','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',6000,[]],
['Triglyceride','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',6000,[]],
['HDL-C','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',6000,[]],
['LDL-C','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',6000,[]],
['Calcium','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',6000,[]],
['Magnesium','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',6000,[]],
['Phosphorus','Chemistry','numeric','mg/dL','See lab range','Yellow','0.5',6000,[]],
['Electrolytes','Chemistry','panel','','See report','Serum','1',15000,['Na','K','Cl','HCO3']],
['HbA1c','Chemistry','numeric','%','See lab range','EDTA','2',12000,[]],
['CRP Quantitative','Serology','numeric','mg/L','<5','Yellow','0.5',12000,[]],
['ASO','Serology','numeric','IU/mL','See lab range','Yellow','0.5',8000,[]],
['RF','Serology','qualitative','','Negative','Yellow','0.5',7000,[]],
['Widal','Serology','panel','','See report','Serum','0.5',8000,['S. typhi O','S. typhi H','S. paratyphi AH','S. paratyphi BH']],
['VDRL','Serology','qualitative','','Non-Reactive','Serum','0.5',7000,[]],
['HBsAg','Serology','qualitative','','Non-Reactive','Serum','0.1',7000,[]],
['Anti-HCV','Serology','qualitative','','Non-Reactive','Serum','0.1',7000,[]],
['HIV Ab ICT','Serology','qualitative','','Non-Reactive','Whole Blood/Serum','1',8000,[]],
['Dengue NS1/IgM/IgG','Serology','panel','','See report','Serum/Whole Blood','1',10000,['NS1','IgM','IgG']],
['Malaria Blood Film','Microbiology','panel','','See report','EDTA/Capillary Blood','2',7000,['Thick Film','Thin Film','Parasite Detected','Species','Parasite Density','Remarks']],
['Dengue Duo (NS1/IgM/IgG)','Serology','panel','','See report','Serum/Whole Blood','1',12000,['NS1','IgM','IgG']],
['Urine RE','Urine','urine','','See report','Urine Cup','10',5000,['Colour','Appearance','pH','Specific Gravity','Protein','Glucose','Ketone','Bilirubin','Urobilinogen','Nitrite','Leukocyte Esterase','RBC','WBC','Epithelial Cells','Casts','Crystals','Bacteria','Yeast','Others']],
['Urine ACR','Urine','numeric','mg/g','See lab range','Urine Cup','5',10000,[]],
['Pregnancy Test','Urine','qualitative','','Negative','Urine Cup','2',5000,[]],
['Stool RE','Stool','stool','','See report','Stool Container','2',5000,['Colour','Consistency','Occult Blood','Mucus','RBC','WBC','Ova','Cyst','Trophozoite','Yeast','Fat Globules','Others']],
['Fluid RE','Body Fluid','fluid','','See report','Sterile Container','2',10000,['Colour','Appearance','Clarity','Cell Count','RBC','WBC','Neutrophil','Lymphocyte','Protein','Glucose','LDH','ADA','Gram Stain','AFB','Other']],
['Semen Analysis','Andrology','panel','','See report','Sterile Container','Whole',15000,['Volume','Colour','Liquefaction','Viscosity','pH','Sperm Concentration','Total Count','Motility','Progressive Motility','Morphology','WBC','RBC','Others']],
['G6PD Screening','Hematology','qualitative','','Normal','EDTA','2',10000,[]],
['Reticulocyte Count','Hematology','numeric','%','See lab range','EDTA','2',7000,[]],
['Peripheral Blood Film','Hematology','text','','See report','EDTA','2',7000,[]],
['Gram Stain','Microbiology','text','','See report','Sterile Container','1',5000,[]],
['AFB Smear','Microbiology','qualitative','','Negative','Sterile Container','1',7000,[]],
['KOH Mount','Microbiology','qualitative','','Negative','Sterile Container','1',7000,[]],
['Culture & Sensitivity','Microbiology','text','','See report','Sterile Container','1',20000,[]]
];

base.tests=seed.map((x,i)=>({
  id:i+1,name:x[0],category:x[1],type:x[2],unit:x[3],range:x[4],tube:x[5],
  sample:x[6],price:x[7],tat:'1 hour',fields:x[8].map(n=>({n,v:''}))
}));

/* Persistent storage adapter: localStorage first, IndexedDB fallback.
   This keeps the V11/V12 database key and avoids losing data when a WebView/content
   container temporarily blocks localStorage. */
const IDB_NAME='LIMS_Offline_Store_v1';
const IDB_STORE='kv';
let storageReady=false;
let storageBackend='localStorage';
let storageError='';
let memorySession={};
function localStorageUsable(){
  try{const k='__lims_storage_probe__';localStorage.setItem(k,'1');const ok=localStorage.getItem(k)==='1';localStorage.removeItem(k);return ok;}
  catch(e){storageError=String(e?.message||e);return false;}
}
function idbOpen(){return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window))return reject(new Error('IndexedDB unavailable'));
  const r=indexedDB.open(IDB_NAME,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(IDB_STORE))r.result.createObjectStore(IDB_STORE);};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('IndexedDB open failed'));
});}
function idbGet(key){return idbOpen().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(IDB_STORE,'readonly'),st=tx.objectStore(IDB_STORE),r=st.get(key);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error||new Error('IndexedDB read failed'));}));}
function idbSet(key,value){return idbOpen().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(IDB_STORE,'readwrite'),st=tx.objectStore(IDB_STORE),r=st.put(value,key);r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error||new Error('IndexedDB write failed'));}));}
function idbRemove(key){return idbOpen().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(IDB_STORE,'readwrite'),st=tx.objectStore(IDB_STORE),r=st.delete(key);r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error||new Error('IndexedDB delete failed'));}));}
function storageGetSync(key){
  if(localStorageUsable()){try{return localStorage.getItem(key);}catch(e){}}
  return null;
}
function storageSet(key,value){
  let wrote=false;
  try{if(localStorageUsable()){localStorage.setItem(key,value);wrote=true;storageBackend='localStorage';}}catch(e){storageError=String(e?.message||e);}
  idbSet(key,value).then(()=>{if(!wrote)storageBackend='IndexedDB';}).catch(e=>{storageError=String(e?.message||e);});
  return wrote;
}
function storageRemove(key){
  try{if(localStorageUsable())localStorage.removeItem(key);}catch(e){}
  idbRemove(key).catch(()=>{});
}
function sessionGet(key){try{return sessionStorage.getItem(key)||memorySession[key]||null;}catch(e){return memorySession[key]||null;}}
function sessionSet(key,value){memorySession[key]=String(value);try{sessionStorage.setItem(key,String(value));}catch(e){}}
function sessionRemove(key){delete memorySession[key];try{sessionStorage.removeItem(key);}catch(e){}}

let db=clone(base);
const syncSaved=storageGetSync(KEY);
if(syncSaved){try{db=JSON.parse(syncSaved);storageReady=true;storageBackend='localStorage';}catch(e){storageError='Saved database JSON is invalid';}}

async function hydratePersistentStore(){
  if(syncSaved && storageReady){return;}
  try{
    const saved=await idbGet(KEY);
    if(saved){db=JSON.parse(saved);normalize();seedMolecularTests();ensurePackages();storageBackend='IndexedDB';storageReady=true;save();
      applyTheme();
      if(sessionGet('lims_logged_in')==='1'){nav('registration');}
      else{$('loginUser')?.focus();}
      return;
    }
  }catch(e){storageError=String(e?.message||e);}
  storageReady=true;
  /* No prior persistent record exists: initialize it only after the IDB check,
     so an existing offline database can never be overwritten by the demo base. */
  save();
}

const MOLECULAR_TESTS=[
['HCV RNA PCR','Molecular','qualitative','','Not Detected','Plasma/Serum','1',30000,[]],
['HBV DNA PCR','Molecular','qualitative','','Not Detected','Plasma/Serum','1',30000,[]],
['HIV-1 Viral Load','Molecular','numeric','copies/mL','See lab range','EDTA Plasma','2',35000,[]],
['SARS-CoV-2 RT-PCR','Molecular','qualitative','','Not Detected','Nasopharyngeal swab','1',25000,[]],
['MTB / RIF Molecular Test','Molecular','panel','','See report','Sputum','2',25000,['MTB','Rifampicin Resistance']],
['HPV DNA Test','Molecular','qualitative','','Not Detected','Cervical specimen','1',30000,[]],
['CMV PCR','Molecular','qualitative','','Not Detected','Plasma/Whole Blood','1',30000,[]],
['EBV PCR','Molecular','qualitative','','Not Detected','Plasma/Whole Blood','1',30000,[]]
];
function seedMolecularTests(){
 const names=new Set(db.tests.map(t=>String(t.name||''))); let id=Math.max(0,...db.tests.map(t=>Number(t.id)||0))+1;
 MOLECULAR_TESTS.forEach(x=>{if(names.has(x[0]))return;db.tests.push({id:id++,name:x[0],category:x[1],type:x[2],unit:x[3],range:x[4],tube:x[5],sample:x[6],price:x[7],tat:'1 hour',fields:x[8].map(n=>({n,v:'',unit:'',ref:''})),refMode:x[4]?'custom':'blank',showReference:true,criticalLow:'',criticalHigh:''})});
}
function ensurePackages(){
 const names=new Set(db.packages.map(x=>x.name)); const find=n=>db.tests.find(t=>t.name===n)?.id;
 [['Electrolytes Panel',['Electrolytes']],['Liver Function Panel',['Bilirubin Total','ALP','ALT','AST','GGT','Total Protein','Albumin']],['Renal Function Panel',['Urea','Creatinine','Uric Acid']],['Molecular Viral Screen',['HCV RNA PCR','HBV DNA PCR']]].forEach(x=>{if(!names.has(x[0]))db.packages.push({id:'PKG'+Date.now()+Math.random().toString(36).slice(2,6),name:x[0],price:0,tests:x[1].map(find).filter(Boolean)})});
 const l=db.packages.find(p=>p.name==='Liver Function Panel'); if(l){const desired=['Bilirubin Total','ALP','ALT','AST','GGT','Total Protein','Albumin'].map(find).filter(Boolean); const old=l.tests||[]; l.tests=[...desired,...old.filter(id=>!desired.some(x=>String(x)===String(id)))];}
}
function normalize(){
  db.settings={...base.settings,...(db.settings||{})};
  db.settings.report={...base.settings.report,...(db.settings.report||{})};
  db.settings.report.showUnit=db.settings.report.showUnit!==false;db.settings.report.showStatus=db.settings.report.showStatus!==false;
  db.settings.auth={...base.settings.auth,...(db.settings.auth||{})};
  db.settings.app={...base.settings.app,...(db.settings.app||{})};
  db.settings.report.testOrder=Array.isArray(db.settings.report.testOrder)?db.settings.report.testOrder:[];
  db.settings.app.navLayout='sidebar';
  db.settings.themeConfig={...base.settings.themeConfig,...(db.settings.themeConfig||{})};
  if(!db.settings.themeConfig.primary)db.settings.themeConfig.primary=db.settings.theme||'#0b8ecf';
  db.settings.theme=db.settings.themeConfig.primary;
  if(db.settings.app.v12BaseRepair!==true){db.settings.auth={username:'adm',password:'adm',enabled:true};db.settings.app.v12BaseRepair=true;}
  if(typeof db.settings.auth.username!=='string'||!db.settings.auth.username.trim())db.settings.auth.username='adm';
  if(typeof db.settings.auth.password!=='string'||!db.settings.auth.password)db.settings.auth.password='adm';
  if(typeof db.settings.auth.enabled!=='boolean')db.settings.auth.enabled=true;
  db.settings.billing={...base.settings.billing,...(db.settings.billing||{})};
  db.settings.fieldGroups=db.settings.fieldGroups||{};db.packages=Array.isArray(db.packages)?db.packages:[];
  db.tests=db.tests||[];db.doctors=db.doctors||[];db.prefixes=db.prefixes||[];
  db.waiting=db.waiting||[];db.archives=db.archives||[];db.patients=db.patients||[];
  db.qc=db.qc||[];db.audit=db.audit||[];db.invoices=Array.isArray(db.invoices)?db.invoices:[];db.vouchers=Array.isArray(db.vouchers)?db.vouchers:[];db.settings.report.exportFolders={report:'',invoice:'',voucher:'',...(db.settings.report.exportFolders||{})};db.settings.report.headerMode=db.settings.report.headerMode||'text';db.settings.report.headerText=db.settings.report.headerText||'';db.settings.report.headerImage=db.settings.report.headerImage||db.settings.report.logo||'';db.settings.report.headerImageWidth=Number(db.settings.report.headerImageWidth||180);db.settings.report.headerImageHeight=Number(db.settings.report.headerImageHeight||60);db.settings.report.headerBlankSpace=Number(db.settings.report.headerBlankSpace||70);db.nextLab=Number(db.nextLab||112555);
  db.tests.forEach(t=>{
    t.fields=(t.fields||[]).map((f,i)=>({n:f.n||('Field '+(i+1)),unit:f.unit||'',ref:f.ref||'',v:f.v??'',type:f.type||'text',showReference:f.showReference!==false}));
    t.refMode=t.refMode||((t.type==='qualitative')?'blank':'custom');
    t.showReference=t.showReference!==false;
    t.criticalLow=t.criticalLow??'';
    t.criticalHigh=t.criticalHigh??'';
    t.remarkTemplate=t.remarkTemplate??'';
    t.interpretation=t.interpretation??'';
  });
  [...db.waiting,...db.archives].forEach(p=>{
    p.tests=p.tests||[];
    p.tests.forEach(t=>{
      t.fields=(t.fields||[]).map((f,i)=>({n:f.n||('Field '+(i+1)),unit:f.unit||'',ref:f.ref||'',v:f.v??'',type:f.type||'text',showReference:f.showReference!==false}));t.status=t.status||'Pending';t.remark=t.remark||'';
      t.resultFlag=t.resultFlag||'';
    })
  });
  if(!db.settings.auth.username)db.settings.auth.username='adm';
  if(!db.settings.auth.password)db.settings.auth.password='adm';
}
normalize();
updateOfflineStatus();
seedMolecularTests();
ensurePackages();
// Persist only when a synchronous local database was successfully loaded.
// If it was not available, hydratePersistentStore() checks IndexedDB first.
if(syncSaved && storageReady) storageSet(KEY,JSON.stringify(db));

function save(){
  if(!storageSet(KEY,JSON.stringify(db)) && storageBackend!=='IndexedDB') alert('Database storage is unavailable in this app container. Open/install LIMS as an offline app (not a temporary content preview).');
  applyTheme();
}
function updateOfflineStatus(){const el=$('offlinePill');if(!el)return;if(navigator.onLine===false){el.textContent='● Offline Mode';el.classList.add('off')}else{el.textContent=window.__offlinePWAReady?'● Offline Ready':'● Local Mode';el.classList.remove('off')}}
window.addEventListener('online',updateOfflineStatus);window.addEventListener('offline',updateOfflineStatus);
function applyTheme(){
  const tc=db.settings.themeConfig||{};
  const primary=tc.primary||db.settings.theme||'#0b8ecf';
  const secondary=tc.secondary||'#28b6ef';
  const dark=tc.dark||'#12304a';
  const bg=tc.background||'#eaf6fb';
  const navButton=tc.navButton||'#a9e4fa';
  document.documentElement.style.setProperty('--p',primary);
  document.documentElement.style.setProperty('--p2',secondary);
  document.documentElement.style.setProperty('--dark',dark);
  document.documentElement.style.setProperty('--bg',bg);
  document.documentElement.style.setProperty('--navBg',secondary);
  document.documentElement.style.setProperty('--navBtn',navButton);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',primary);
  document.body.classList.remove('nav-sidebar','nav-bottom','nav-compact','nav-top');document.body.classList.add('nav-sidebar');
  db.settings.app.navLayout='sidebar';
  document.body.classList.add('nav-sidebar');
  $('titleTop').textContent=(db.settings.labName||'BioTech Laboratory')+' — Offline LIMS v1.0';
}
function openModal(t,b,f=''){
  $('mt').textContent=t;$('mb').innerHTML=b;$('mf').innerHTML=f;$('modal').classList.add('show');
}
function closeModal(){$('modal').classList.remove('show')}
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});

function nav(page){
  document.querySelectorAll('.nav[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const fn={registration:renderRegistration,patients:renderPatients,waiting:renderWaiting,
    archive:renderArchive,qc:renderQC,dashboard:renderDashboard,invoices:renderInvoices,setup:renderSetup}[page]||renderRegistration;
  fn($('content'));
}
document.querySelectorAll('.nav[data-page]').forEach(b=>b.onclick=()=>nav(b.dataset.page));

function doctors(){
  return '<option value="">Self / None</option>'+
    db.doctors.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('');
}
function testOptions(){
  return '<option value="">Select test...</option>'+
    db.tests.map(t=>`<option value="${t.id}">${esc(t.name)} — ${esc(t.category)}</option>`).join('');
}

/* Registration */
let cart=[];
function renderRegistration(c){
  cart=[];
  c.innerHTML=`
  <div class="card"><h3>Patient Registration</h3>
    <div class="reg">
      <div class="card" style="margin:0"><div class="formgrid">
        <div class="field"><label>Lab ID</label><input id="rLab" value="${db.nextLab}" readonly></div>
        <div class="field"><label>Patient ID</label><input id="rPid" placeholder="P-10001"></div>
        <div class="field"><label>Title</label><select id="rPrefix">${db.prefixes.map(x=>`<option>${esc(x.title)}</option>`).join('')}</select></div>
        <div class="field"><label>Patient Name *</label><input id="rName"></div>
        <div class="field"><label>Age</label><input id="rAge" inputmode="numeric"></div>
        <div class="field"><label>Sex</label><select id="rSex"><option>Female</option><option>Male</option><option>Other</option></select></div>
        <div class="field"><label>Patient Type</label><select id="rType"><option>OPD</option><option>IPD</option><option>Emergency</option><option>External</option></select></div>
        <div class="field"><label>Phone</label><input id="rPhone"></div>
        <div class="field"><label>Referral Doctor</label><select id="rDoc">${doctors()}</select></div>
        <div class="field"><label>Collection Date</label><input id="rDate" type="date" value="${today()}"></div>
      </div></div>
      <div>
        <div class="toolbar"><div class="test-search-wrap"><input id="testSearch" class="search" list="testSearchList" autocomplete="off" placeholder="Type test name to search quickly..." oninput="filterTestSearch()"><datalist id="testSearchList">${db.tests.map(t=>`<option value="${esc(t.name)}" data-id="${esc(t.id)}">${esc(t.category)}</option>`).join('')}</datalist><div class="test-search-hint">Type a few letters, choose a test, then Add Test.</div></div><button class="btn blue" onclick="addTestToCart()">+ Add Test</button><select id="packageSelect" class="search"><option value="">Add package...</option>${db.packages.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select><button class="btn purple" onclick="addPackageToCart()">+ Add Package</button></div>
        <table><thead><tr><th>#</th><th>Test</th><th>Category</th><th>Sample</th><th>Tube</th><th>Price</th><th></th></tr></thead>
        <tbody id="cartBody"></tbody></table>
        <div class="right" style="margin-top:8px"><b>Total: <span id="cartTotal">0 MMK</span></b></div>
        <div class="toolbar" style="justify-content:flex-end;margin-top:8px">
          <button class="btn orange" onclick="renderRegistration($('content'))">Clear</button>
          <button class="btn green" onclick="register()">Register Patient</button>
        </div>
      </div>
    </div>
  </div>`;
  drawCart();
}
function findTestFromSearch(){const raw=String($('testSearch')?.value||'').trim();if(!raw)return null;let t=db.tests.find(x=>String(x.name).toLowerCase()===raw.toLowerCase());if(!t)t=db.tests.find(x=>(x.name+' '+x.category).toLowerCase().includes(raw.toLowerCase()));return t||null;}
function filterTestSearch(){const raw=String($('testSearch')?.value||'').toLowerCase().trim();if(!raw)return;const list=$('testSearchList');if(!list)return;list.innerHTML=db.tests.filter(t=>(t.name+' '+t.category).toLowerCase().includes(raw)).slice(0,40).map(t=>`<option value="${esc(t.name)}">${esc(t.category)}</option>`).join('');}
function addTestToCart(){
  const t=findTestFromSearch();
  if(!t)return alert('Type and select/search a test first.');
  if(cart.some(x=>x.id===t.id))return alert('This test is already selected.');
  cart.push(t);drawCart();if($('testSearch'))$('testSearch').value='';
}
function addPackageToCart(){const id=$('packageSelect')?.value;const pkg=db.packages.find(x=>String(x.id)===String(id));if(!pkg)return alert('Select a package first.');let added=0;pkg.tests.map(id=>db.tests.find(t=>String(t.id)===String(id))).filter(Boolean).forEach(t=>{if(!cart.some(x=>String(x.id)===String(t.id))){cart.push(t);added++;}});drawCart();alert(added+' test(s) added from '+pkg.name+'.');}
function drawCart(){
  const b=$('cartBody');if(!b)return;
  if(!cart.length){b.innerHTML='<tr><td colspan="7" class="empty">No tests selected</td></tr>';$('cartTotal').textContent='0 MMK';return}
  let total=0;
  b.innerHTML=cart.map((t,i)=>{
    total+=+t.price||0;
    return `<tr><td>${i+1}</td><td><b>${esc(t.name)}</b></td><td>${esc(t.category)}</td>
    <td>${esc(t.sample)}</td><td>${esc(t.tube)}</td><td>${money(t.price)}</td>
    <td><button class="btn red" onclick="cart.splice(${i},1);drawCart()">×</button></td></tr>`
  }).join('');
  $('cartTotal').textContent=money(total);
}
function register(){
  const name=$('rName').value.trim();
  if(!name)return alert('Patient name is required.');
  if(!cart.length)return alert('Add at least one test.');
  const d=db.doctors.find(x=>x.id===+$('rDoc').value);
  const p={
    labId:String(db.nextLab++),patientId:$('rPid').value.trim()||uid('P-'),
    title:$('rPrefix').value,name,age:$('rAge').value.trim(),sex:$('rSex').value,
    type:$('rType').value,phone:$('rPhone').value.trim(),doctor:d?.name||'Self / None',
    doctorId:d?.id||null,date:$('rDate').value,comment:'',
    tests:cart.map(t=>({testId:t.id,name:t.name,category:t.category,type:t.type,value:'',
      fields:clone(t.fields||[]),status:'Pending',remark:t.remarkTemplate||'',interpretation:t.interpretation||''}))
  };
  db.patients.unshift(clone(p));db.waiting.unshift(p);save();
  alert('Registered successfully — Lab ID '+p.labId);printBill(p);nav('waiting');
}

/* Waiting */
function matches(p,s,d){
  return p&&(!d||p.date===d)&&(!s||[p.name,p.labId,p.patientId,p.doctor].join(' ').toLowerCase().includes(s.toLowerCase()));
}
function renderWaiting(c){
  c.innerHTML=`<div class="card"><h3>Waiting List</h3>
  <div class="toolbar"><input id="ws" class="search" placeholder="Patient / Lab ID / Doctor">
  <input id="wd" type="date" class="date" value="${today()}">
  <button class="btn outline" onclick="$('wd').value='';drawWaiting()">All Dates</button></div><div id="wt"></div></div>`;
  drawWaiting();$('ws').oninput=drawWaiting;$('wd').onchange=drawWaiting;
}
function drawWaiting(){
  const s=$('ws')?.value||'',d=$('wd')?.value||'',rows=db.waiting.filter(p=>matches(p,s,d)),el=$('wt');if(!el)return;
  el.innerHTML=`<table><thead><tr><th>Lab ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Progress</th><th>Action</th></tr></thead><tbody>
  ${rows.length?rows.map(p=>{
    const i=db.waiting.indexOf(p),done=p.tests.filter(t=>testHasResult(t)).length;
    return `<tr><td><b>${esc(p.labId)}</b></td><td>${esc(p.title)} ${esc(p.name)}<br>${esc(p.age)} / ${esc(p.sex)}</td>
    <td>${esc(p.doctor)}</td><td>${p.date}</td><td>${done}/${p.tests.length}</td>
    <td><button class="btn blue" onclick="results(${i})">Enter Results</button> <button class="btn outline" onclick="openReport(db.waiting[${i}])">Preview</button></td></tr>`
  }).join(''):'<tr><td colspan="6" class="empty">No records</td></tr>'}</tbody></table>`;
}

/* Results */
let active=-1,activeStore='waiting';
function qbuttons(i){
  return '<div class="q">'+db.settings.quick.map(v=>`<button onclick="quick(${i},'${esc(v)}')">${esc(v)}</button>`).join('')+'</div>';
}
function results(i,store='waiting'){
  active=i;activeStore=store;const p=db[store][i];if(!p)return;
  openModal('Result Entry — '+p.name+' ('+p.labId+')',resultEditor(p),
    '<button class="btn outline" onclick="saveDraft()">Save Draft</button>'+
    '<button class="btn green" onclick="complete()">Complete & Archive</button>');
}

function testHasResult(t){
  if(!t)return false;
  if(Array.isArray(t.fields)&&t.fields.length)return t.fields.some(f=>String(f.v??'').trim()!=='');
  return String(t.value??'').trim()!=='';
}
function autoTestStatus(t,master){
  if(!testHasResult(t))return '';
  const flags=[];
  if(Array.isArray(t.fields)&&t.fields.length)t.fields.forEach(f=>{const fl=numericFlag(f.v,f.ref||master?.range);if(fl)flags.push(fl)});
  else {const fl=numericFlag(t.value,master?.range);if(fl)flags.push(fl)}
  if(flags.includes('High'))return 'High';
  if(flags.includes('Low'))return 'Low';
  if(flags.length)return 'Normal';
  return '';
}
function statusBadge(status){
  if(status!=='High'&&status!=='Low'&&status!=='Normal')return '<span class=\"result-flag blank\">—</span>';
  const cls=status==='High'?'high':status==='Low'?'low':'normal';
  return `<span class=\"result-flag ${cls}\">${esc(status)}</span>`;
}
function numericFlag(value, range){
  const v=Number(String(value).replace(/,/g,'').trim());
  if(!Number.isFinite(v)||!String(value).trim())return '';
  const r=String(range||'').trim();
  if(!r||/see|lab range|report/i.test(r))return '';
  let m=r.match(/^\s*([<>]=?)\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(m){const n=Number(m[2]); if(m[1]==='<')return v<n?'Normal':'High'; if(m[1]==='<=')return v<=n?'Normal':'High'; if(m[1]==='>')return v>n?'Normal':'Low'; if(m[1]==='>=')return v>=n?'Normal':'Low';}
  m=r.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);
  if(m){const lo=Number(m[1]),hi=Number(m[2]);return v<lo?'Low':v>hi?'High':'Normal'}
  return '';
}
function resultRef(master){
  if(!master || master.showReference===false || master.refMode==='blank')return '';
  return String(master.range||'').trim();
}
function flagBadge(flag){
  if(!flag)return '<span class="result-flag blank">—</span>';
  const cls=flag==='High'?'high':flag==='Low'?'low':'normal';
  return `<span class="result-flag ${cls}">${flag}</span>`;
}
function updateFieldFlag(i,j){const t=db.waiting.find(x=>x.labId===window.__resultLab)||db.archives.find(x=>x.labId===window.__resultLab);if(!t)return;const tr=t.tests[i],f=tr?.fields?.[j];if(!f)return;f.v=$('f_'+i+'_'+j)?.value||'';const b=$('ff_'+i+'_'+j);const fl=numericFlag(f.v,f.ref||((db.tests.find(x=>x.id===tr.testId)||{}).range));if(b){b.textContent=fl||'—';b.className='result-flag '+(fl==='High'?'high':fl==='Low'?'low':fl==='Normal'?'normal':'blank')}const sb=$('status_'+i+'_'+j);if(sb)sb.innerHTML=statusBadge(fl);}
function updateResultFlag(i){
  const p=db[activeStore]?.[active],t=p?.tests?.[i],m=t?db.tests.find(x=>x.id===t.testId):null;
  const e=$(`v_${i}`),b=$(`flag_${i}`); if(!t||!m||!e||!b)return;
  const f=numericFlag(e.value,m.range); t.resultFlag=f;
  b.className='result-flag '+(f==='High'?'high':f==='Low'?'low':f==='Normal'?'normal':'blank');
  b.textContent=f||'—';
  const sb=$('status_'+i);if(sb)sb.innerHTML=statusBadge(f);
}
function toggleResultDisplay(){
  const ref=$('resultShowRef')?.checked!==false;
  const head=$('resultShowHeader')?.checked!==false;
  document.querySelectorAll('.result-ref-cell').forEach(e=>e.style.display=ref?'':'none');
  document.querySelectorAll('.result-head').forEach(e=>e.style.display=head?'':'none');
}
function toggleReportHeader(){ 
  const e=$('reportShowHeader'); if(e) document.querySelectorAll('#report .report-title').forEach(x=>x.style.display=e.checked?'':'none');
}
function resultEditor(p){
  window.__resultLab=p.labId;
  const showRefDefault=db.settings.report.showReference!==false;
  const showHeadDefault=db.settings.report.showHeader!==false;
  return `<div class="result-display-bar">
    <label><input id="resultShowRef" type="checkbox" ${showRefDefault?'checked':''} onchange="toggleResultDisplay()"> Show Reference</label>
    <label><input id="resultShowHeader" type="checkbox" ${showHeadDefault?'checked':''} onchange="toggleResultDisplay()"> Show Patient Header</label>
    <span class="small">Status is automatic: High / Low / Normal only. Non-numeric or unflagged results show a blank status.</span>
  </div>
  <div class="result-head"><b>${esc(p.title)} ${esc(p.name)}</b> | Lab ID <b>${esc(p.labId)}</b> | ${esc(p.date)}<br>Doctor: ${esc(p.doctor)}</div>
  <table class="result-table"><thead><tr><th>Test Description</th><th>Results</th><th class="result-ref-cell">Reference</th><th>Unit</th><th>Status</th><th>Remark</th></tr></thead><tbody>
  ${p.tests.map((t,i)=>{
    const master=db.tests.find(x=>x.id===t.testId)||{};
    const ref=resultRef(master);
    const status=autoTestStatus(t,master);
    const unit=master.unit||'';
    if(t.fields?.length){
      const fieldRows=t.fields.map((f,j)=>{
        const ff=numericFlag(f.v,f.ref||master.range);
        const fs=ff;
        return `<tr>
          <td><b>${esc(t.name)}</b><br><span class="small">${esc(f.n)}</span></td>
          <td><div style="display:flex;align-items:center;gap:4px"><input id="f_${i}_${j}" value="${esc(f.v)}" oninput="updateFieldFlag(${i},${j})"><span id="ff_${i}_${j}" class="result-flag ${ff==='High'?'high':ff==='Low'?'low':ff==='Normal'?'normal':f.v?'normal':'blank'}">${ff||'—'}</span></div>${qbuttons(i)}</td>
          <td class="result-ref-cell"><span class="result-ref">${esc(f.ref||ref||'')}</span></td>
          <td>${esc(f.unit||unit)}</td>
          <td id="status_${i}_${j}">${statusBadge(fs)}</td>
          <td><input id="rm_${i}" value="${esc(t.remark||'')}"></td>
        </tr>`;
      }).join('');
      return fieldRows;
    }
    return `<tr><td><b>${esc(t.name)}</b></td>
      <td><div style="display:flex;align-items:center;gap:4px"><input id="v_${i}" value="${esc(t.value)}" oninput="updateResultFlag(${i})"><span id="flag_${i}">${flagBadge(t.resultFlag||numericFlag(t.value,master.range))}</span></div>${qbuttons(i)}</td>
      <td class="result-ref-cell"><span class="result-ref">${esc(ref||'')}</span></td>
      <td>${esc(unit)}</td>
      <td id="status_${i}">${statusBadge(status)}</td>
      <td><input id="rm_${i}" value="${esc(t.remark)}"></td></tr>`;
  }).join('')}</tbody></table>
  <div class="field" style="margin-top:8px"><label>Overall Comment</label><textarea id="pComment" rows="2">${esc(p.comment||'')}</textarea></div>`;
}
function collect(){
  const p=db[activeStore][active];
  p.tests.forEach((t,i)=>{
    if(t.fields?.length)t.fields.forEach((f,j)=>{const e=$(`f_${i}_${j}`);if(e)f.v=e.value});
    else{
      const e=$(`v_${i}`);if(e)t.value=e.value;
      const m=db.tests.find(x=>x.id===t.testId)||{};t.resultFlag=numericFlag(t.value,m.range);
    }
    const r=$(`rm_${i}`);if(r)t.remark=r.value;t.status=autoTestStatus(t,db.tests.find(x=>x.id===t.testId)||{});
  });
  p.comment=$('pComment')?.value||'';return p;
}
function quick(i,v){
  const p=db[activeStore][active],t=p.tests[i];
  if(t.fields?.length)t.fields[0].v=v;else t.value=v;
  $('mb').innerHTML=resultEditor(p);
}
function saveDraft(){collect();save();closeModal();alert('Draft saved.')}
function complete(){
  const p=collect();
  const hasAny=p.tests.some(t=>testHasResult(t));
  if(!hasAny)return alert('Enter at least one result before completing the report.');
  p.status='Completed';p.completedAt=new Date().toISOString();
  if(activeStore==='waiting'){
    const srcIndex=Number.isInteger(p.editOfArchiveIndex)?p.editOfArchiveIndex:-1;
    if(srcIndex>=0 && db.archives[srcIndex]){
      const old=clone(db.archives[srcIndex]);
      p.history=Array.isArray(old.history)?old.history:[];
      p.history.unshift({savedAt:new Date().toISOString(),snapshot:old});
      delete p.editOfArchiveIndex;delete p.editingFromArchive;
      db.archives[srcIndex]=p;db.waiting.splice(active,1);
    }else{db.archives.unshift(p);db.waiting.splice(active,1);}
  }else{db.archives[active]=p;}
  audit('Completed and archived',p?.labId||'');
  save();closeModal();openReport(p);
}

/* Archive */
function renderArchive(c){
  c.innerHTML=`<div class="card"><h3>Archives</h3><div class="toolbar">
  <input id="as" class="search" placeholder="Patient / Lab ID"><input id="ad" type="date" class="date">
  <button class="btn outline" onclick="$('ad').value='';drawArchive()">All Dates</button></div><div id="at"></div></div>`;
  drawArchive();$('as').oninput=drawArchive;$('ad').onchange=drawArchive;
}
function drawArchive(){
  const s=$('as')?.value||'',d=$('ad')?.value||'',rows=db.archives.filter(p=>matches(p,s,d)),el=$('at');if(!el)return;
  el.innerHTML=`<table><thead><tr><th>Lab ID</th><th>Patient</th><th>Date</th><th>Tests</th><th>Action</th></tr></thead><tbody>
  ${rows.length?rows.map(p=>{const i=db.archives.indexOf(p);return `<tr><td>${esc(p.labId)}</td><td>${esc(p.title)} ${esc(p.name)}</td><td>${esc(p.date)}</td><td>${p.tests.length}</td>
  <td><button class="btn blue" onclick="openReport(db.archives[${i}])">Preview</button>
  <button class="btn orange" onclick="editArchive(${i})">Edit</button> ${p.history?.length?`<button class="btn outline" onclick="showArchiveHistory(${i})">History (${p.history.length})</button>`:''}
  <button class="btn red" onclick="delArchive(${i})">Delete</button></td></tr>`}).join(''):
  '<tr><td colspan="5" class="empty">No records</td></tr>'}</tbody></table>`;
}
function editArchive(i){
  const p=db.archives[i];if(!p)return;
  const draft=clone(p);draft.editOfArchiveIndex=i;draft.editingFromArchive=true;
  db.waiting.unshift(draft);save();nav('waiting');
}
function showArchiveHistory(i){
  const p=db.archives[i];if(!p||!Array.isArray(p.history)||!p.history.length)return;
  const rows=p.history.map((h,n)=>{const s=h.snapshot||{};return `<tr><td>${esc(h.savedAt||'')}</td><td>${esc(s.name||p.name)}</td><td>${(s.tests||[]).filter(testHasResult).length}/${(s.tests||[]).length}</td><td><button class="btn blue" onclick="openReport(${JSON.stringify(s).replace(/\"/g,'&quot;')})">View</button></td></tr>`}).join('');
  openModal('Archived Result History',`<table><tr><th>Saved</th><th>Patient</th><th>Results</th><th>Action</th></tr>${rows}</table>`,'<button class="btn outline" onclick="closeModal()">Close</button>');
}
function delArchive(i){if(confirm('Delete archived record?')){db.archives.splice(i,1);save();drawArchive()}}

/* Reports */
function reportHTML(p){
  const landscape=db.settings.report.layout==='A4 Landscape';
  const rp=db.settings.report, show=(key)=>!!rp[key];
  const order=Array.isArray(window.__previewOrder)?window.__previewOrder:(db.settings.report.testOrder||[]);
  const hidden=window.__previewHidden||{};
  const rank=id=>{const i=order.findIndex(x=>String(x)===String(id));return i<0?999999:i};
  const sortedTests=p.tests.slice().sort((a,b)=>rank(a.testId)-rank(b.testId)).filter(t=>!hidden[String(t.testId)]);
  const style=rp.layoutStyle||'clean';
  const showUnit=rp.showUnit!==false, showStatus=rp.showStatus!==false;
  let rows='';
  sortedTests.forEach(t=>{
    const m=db.tests.find(x=>x.id===t.testId)||{};
    const vals=(t.fields||[]).filter(f=>String(f.v??'').trim()!=='');
    const baseRef=show('showReference')?resultRef(m):'';
    const refCell=(ref)=>show('showReference')?`<td>${esc(ref||'')}</td>`:'';
    const unitCell=(unit)=>showUnit?`<td>${esc(unit||'')}</td>`:'';
    const statusCell=(status)=>showStatus?`<td>${statusBadge(status)}</td>`:'';
    const remCell=show('showRemark')?`<td>${esc(t.remark||'')}</td>`:'';
    if(vals.length){
      // Panel heading: test name only. Category is intentionally never printed.
      rows+=`<tr class="report-section-row"><td class="section-name"><b>${esc(t.name)}</b></td><td></td>${show('showReference')?'<td></td>':''}${showUnit?'<td></td>':''}${showStatus?'<td></td>':''}${show('showRemark')?`<td>${esc(t.remark||'')}</td>`:''}</tr>`;
      vals.forEach(f=>{
        const fflag=f.flag||numericFlag(f.v,f.ref||m.range);
        const fstatus=fflag;
        const result=esc(f.v);
        rows+=`<tr class="report-child-row"><td>${esc(f.n)}</td><td>${result}</td>${refCell(f.ref||baseRef)}${unitCell(f.unit||m.unit)}${statusCell(fstatus)}${remCell}</tr>`;
      });
    }else{
      if(String(t.value??'').trim()==='')return;
      const flag=t.resultFlag||numericFlag(t.value,m.range);
      const tstatus=flag;
      rows+=`<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.value)}</td>${refCell(baseRef)}${unitCell(m.unit||'')}${statusCell(tstatus)}${remCell}</tr>`;
    }
  });
  const refHead=show('showReference')?'<th>Reference</th>':'';
  const unitHead=showUnit?'<th>Unit</th>':'';
  const statusHead=showStatus?'<th>Status</th>':'';
  const remHead=show('showRemark')?'<th>Remark</th>':'';
  const colCount=2+(show('showReference')?1:0)+(showUnit?1:0)+(showStatus?1:0)+(show('showRemark')?1:0);
  const sigs=[];
  if(rp.showTester)sigs.push(`<div><b>Performed by</b><br>${esc(rp.tester)}</div>`);
  if(rp.showVerifier)sigs.push(`<div><b>Verified by</b><br>${esc(rp.verifier||'')}</div>`);
  if(rp.showDoctor)sigs.push(`<div><b>Authorized by</b><br>${esc(rp.doctor)}</div>`);
  const classes=(rp.resultOnly?'results-only ':'')+(rp.showHeader?'':'compact')+' report-style-'+esc(style)+(rp.showSeparators?' report-lines':'');
  const hm=rp.headerMode||'text';
  const headerImage=rp.headerImage||rp.logo||'';
  const headerText=rp.headerText||db.settings.labName;
  const headerBlock=rp.showHeader?`<div class="report-title">${hm==='image'&&headerImage?`<img class="report-header-image" style="width:${Number(rp.headerImageWidth||180)}px;height:${Number(rp.headerImageHeight||60)}px" src="${esc(headerImage)}">`:''}${hm==='both'&&headerImage?`<img class="report-header-image" style="width:${Number(rp.headerImageWidth||180)}px;height:${Number(rp.headerImageHeight||60)}px" src="${esc(headerImage)}">`:''}${hm==='text'||hm==='both'?`<h2>${esc(headerText)}</h2><div>${esc(db.settings.address)} | ${esc(db.settings.phone)}</div><h3>LABORATORY REPORT</h3>`:''}${hm==='blank'?`<div style="height:${Number(rp.headerBlankSpace||70)}px"></div>`:''}</div>`:'';
  return `<div class="report ${classes}" id="report" style="${landscape?'max-width:1100px':''}">
   ${headerBlock}
   <div class="report-meta"><div><b>Patient:</b> ${esc(p.title)} ${esc(p.name)}<br><b>Patient ID:</b> ${esc(p.patientId)}<br><b>Age/Sex:</b> ${esc(p.age)} / ${esc(p.sex)}</div><div><b>Lab ID:</b> ${esc(p.labId)}<br><b>Date:</b> ${esc(p.date)}<br>${rp.showDoctorInfo?`<b>Doctor:</b> ${esc(p.doctor)}`:''}</div></div>
   <table><thead><tr><th>Test Description</th><th>Results</th>${refHead}${unitHead}${statusHead}${remHead}</tr></thead><tbody>${rows||`<tr><td colspan="${colCount}" class="empty">No entered results</td></tr>`}</tbody></table>
   ${(()=>{const notes=[];(p.tests||[]).forEach(t=>{const m=db.tests.find(x=>String(x.id)===String(t.testId))||{};const has=Array.isArray(t.fields)?t.fields.some(f=>String(f?.v??'').trim()!==''):String(t.value??'').trim()!=='';const txt=String(t.interpretation||m.interpretation||'').trim();if(has&&txt)notes.push(`<div><b>${esc(t.name||m.name||'Test')}:</b> ${esc(txt)}</div>`)});const title=rp.commentTitle||'Comment';return (p.comment||notes.length)?`<div class="report-comment"><p><b>${esc(title)}:</b> ${p.comment?esc(p.comment):''}</p>${notes.join('')}</div>`:''})()}${sigs.length?`<div class="report-sign">${sigs.join('')}</div>`:''}${rp.showFooter&&rp.footer?`<div class="report-footer">${esc(rp.footer)}</div>`:''}${rp.showFooterText&&rp.footerText?`<div class="report-footer">${esc(rp.footerText)}</div>`:''}</div>`;
}
function previewOrderIds(p){
  const preferred=(db.settings.report.testOrder||[]).map(String);
  return [...preferred.filter(id=>p.tests.some(t=>String(t.testId)===id)),
    ...p.tests.map(t=>String(t.testId)).filter(id=>!preferred.includes(id))];
}
function openReport(p){
  window.__previewPatient=p;
  window.__previewOrder=previewOrderIds(p);
  window.__previewHidden={};
  openModal('Report Preview',
    `<div class="toolbar print-hide">
      <b>Report mode:</b>
      <select id="reportMode" onchange="changeReportModePreview()">
        <option value="full">Full report</option><option value="resultsOnly">Patient + Results only</option>
        <option value="resultsReference">Patient + Results + Reference</option><option value="custom">Current settings</option>
      </select>
      <label><input id="reportShowHeader" type="checkbox" ${db.settings.report.showHeader!==false?'checked':''} onchange="toggleReportHeader()"> Show header</label>
      <button class="btn outline" onclick="togglePreviewOrderPanel()">Test Order</button><button class="btn purple" onclick="reportLayoutChooser()">Layout</button>
    </div>
    <div id="previewOrderPanel" class="print-hide" style="display:block;margin:8px 0">
      <div class="section-title">Preview Test Order / Hide Tests</div>
      <div class="small">Use ↑ / ↓ to change the report order. Untick a test to hide it from this report only. The saved Test Definition order is not changed.</div>
      <div id="previewOrderList"></div>
    </div>
    <div id="reportPreview">${reportHTML(p)}</div>`,
    '<button class="btn blue" onclick="saveReportPDFDirect()">Save to PDF</button>'+
    '<button class="btn green" onclick="printReport()">Print</button>'+
    '<button class="btn orange" onclick="openReportSettingsForThis()">Report Options</button>'+
    '<button class="btn outline" onclick="closeModal()">Close</button>');
  $('reportMode').value=db.settings.report.mode||'full';
  drawPreviewOrder();
}
function togglePreviewOrderPanel(){
  const e=$('previewOrderPanel');if(e)e.style.display=e.style.display==='none'?'block':'none';
}
function drawPreviewOrder(){
  const b=$('previewOrderList'),p=window.__previewPatient;if(!b||!p)return;
  b.innerHTML=(window.__previewOrder||[]).map((id,i)=>{
    const t=p.tests.find(x=>String(x.testId)===String(id));if(!t)return '';
    const hidden=!!window.__previewHidden[String(id)];
    return `<div class="report-order-item">
      <span class="field-order">${i+1}</span><span class="name">${esc(t.name)}</span>
      <label class="small"><input type="checkbox" ${hidden?'':'checked'} onchange="togglePreviewTest('${esc(id)}',this.checked)"> Show</label>
      <button class="order-btn" onclick="movePreviewTest(${i},-1)">↑</button>
      <button class="order-btn" onclick="movePreviewTest(${i},1)">↓</button>
    </div>`;
  }).join('')||'<div class="empty">No tests</div>';
}
function refreshReportPreview(){
  const p=window.__previewPatient;if(!p)return;
  const box=$('reportPreview');if(box)box.innerHTML=reportHTML(p);
  drawPreviewOrder();
}
function movePreviewTest(i,d){
  const a=window.__previewOrder||[],j=i+d;if(j<0||j>=a.length)return;
  [a[i],a[j]]=[a[j],a[i]];refreshReportPreview();
}
function togglePreviewTest(id,show){
  if(show)delete window.__previewHidden[String(id)];else window.__previewHidden[String(id)]=true;
  refreshReportPreview();
}
function changeReportModePreview(){
  const mode=$('reportMode')?.value||'full';
  if(mode==='full'){
    db.settings.report.showHeader=true;db.settings.report.showTester=true;db.settings.report.showDoctor=true;db.settings.report.showVerifier=false;db.settings.report.showReference=true;db.settings.report.showRemark=true;db.settings.report.showDoctorInfo=true;db.settings.report.resultOnly=false;
  }else if(mode==='resultsOnly'){
    db.settings.report.showHeader=false;db.settings.report.showTester=false;db.settings.report.showVerifier=false;db.settings.report.showDoctor=false;db.settings.report.showReference=false;db.settings.report.showRemark=false;db.settings.report.showDoctorInfo=false;db.settings.report.resultOnly=true;
  }else if(mode==='resultsReference'){
    db.settings.report.showHeader=false;db.settings.report.showTester=false;db.settings.report.showVerifier=false;db.settings.report.showDoctor=false;db.settings.report.showReference=true;db.settings.report.showRemark=false;db.settings.report.showDoctorInfo=false;db.settings.report.resultOnly=true;
  }else{
    db.settings.report.resultOnly=false;
  }
  db.settings.report.mode=mode;save();refreshReportPreview();
  const chk=$('reportShowHeader');if(chk)chk.checked=db.settings.report.showHeader!==false;
}
function toggleReportHeader(){
  const e=$('reportShowHeader'); if(e){db.settings.report.showHeader=e.checked;save();refreshReportPreview();}
}
function openReportSettingsForThis(){labSettings();}

function safeFilePart(v){return String(v||'').trim().replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').slice(0,80)||'Patient';}
function reportFileName(p){return `Report_${safeFilePart(p?.name||'Patient')}_${safeFilePart(p?.date||today())}.pdf`;}
function invoiceFileName(inv){return `Invoice_${safeFilePart(inv?.invoiceNo||'Invoice')}_${safeFilePart(inv?.date||today())}.pdf`;}
function voucherFileName(v){return `Voucher_${safeFilePart(v?.voucherNo||'Voucher')}_${safeFilePart(v?.date||today())}.pdf`;}
async function exportPDF(){
  const report=$('report'),p=window.__previewPatient;if(!report||!p)return;
  const filename=reportFileName(p);
  if(typeof window.html2pdf==='function'){
    try{await window.html2pdf().set({margin:8,filename,
      image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true},
      jsPDF:{unit:'mm',format:'a4',orientation:db.settings.report.layout==='A4 Landscape'?'landscape':'portrait'}
    }).from(report).save();return;}catch(e){console.warn('html2pdf failed',e)}
  }
  alert('PDF export is offline-ready. Your device print dialog will open; choose “Save as PDF” and use this filename:\n\n'+filename+'\n\nInternet is not required.');
  printReport();
}
function printReport(){
  const r=$('report'),p=window.__previewPatient;if(!r||!p)return;
  nativePrintDocument('report',reportFileName(p));
}

/* Registration / Patient Voucher PDF — same native print path as Report */
function billHTML(p){
  const tests=Array.isArray(p?.tests)?p.tests:[];
  const total=tests.reduce((a,t)=>a+(Number(db.tests.find(x=>String(x.id)===String(t.testId))?.price)||0),0);
  return `<div class="bill" id="bill"><div class="bill-title"><h2>${esc(db.settings.labName)}</h2>
    <div>${esc(db.settings.address)} | ${esc(db.settings.phone)}</div><h3>VOUCHER</h3></div>
    <p><b>Lab ID:</b> ${esc(p.labId)} &nbsp; <b>Date:</b> ${esc(p.date)}</p>
    <p><b>Patient:</b> ${esc(p.title)} ${esc(p.name)}<br><b>Patient ID:</b> ${esc(p.patientId)}
    ${db.settings.billing.showDoctor?`<br><b>Doctor:</b> ${esc(p.doctor)}`:''}</p>
    <table><thead><tr><th>#</th><th>Test</th><th>Category</th><th>Price</th></tr></thead><tbody>
    ${tests.map((t,i)=>{const m=db.tests.find(x=>String(x.id)===String(t.testId))||{};return `<tr><td>${i+1}</td><td>${esc(t.name)}</td><td>${esc(t.category||m.category||'')}</td><td>${money(m.price)}</td></tr>`}).join('')}
    </tbody></table><div class="bill-total">Total: ${money(total)}</div>
    <div class="report-footer">${esc(db.settings.report.footerText||'Computer generated voucher')}</div></div>`;
}
function printBill(p){
  if(!p)return;
  window.__billPatient=clone(p);
  openModal('Voucher Preview',billHTML(window.__billPatient),
    '<button class="btn blue" onclick="saveBillPDFDirect()">Save to PDF</button><button class="btn green" onclick="printBillNow()">Print</button><button class="btn outline" onclick="closeModal()">Close</button>');
}
function saveBillPDF(){printBillNow();}
function printBillNow(){
  const b=$('bill'),p=window.__billPatient;
  if(!b||!p){alert('Voucher preview is not ready.');return;}
  const old=document.title;
  const filename=`Voucher_${safeFilePart(p.name||'Patient')}_${safeFilePart(p.date||today())}`;
  document.title=filename;
  document.body.classList.add('printing-bill');
  const cleanup=()=>{document.body.classList.remove('printing-bill');document.title=old;window.__billPatient=null;};
  window.addEventListener('afterprint',cleanup,{once:true});
  setTimeout(()=>{
    try{window.print();}
    catch(e){cleanup();alert('Print service is not available in this app container. Use the browser/desktop Print command.');}
  },120);
}

/* Patients */
function renderPatients(c){
  c.innerHTML=`<div class="card"><h3>Patient Registry</h3><div class="alert">Edit / Add Tests lets you add tests after registration. Use Bill / PDF to print the complete current bill, including newly added tests. Delete removes the patient and linked active/archive records from this device.</div><div class="toolbar"><input id="ps" class="search" placeholder="Name / Patient ID / Lab ID"></div><div id="pt"></div></div>`;
  drawPatients();$('ps').oninput=drawPatients;
}
function drawPatients(){
  const s=$('ps')?.value.toLowerCase()||'';
  const rows=db.patients.filter(p=>[p.name,p.patientId,p.labId].join(' ').toLowerCase().includes(s));
  $('pt').innerHTML=`<table><tr><th>Patient ID</th><th>Lab ID</th><th>Name</th><th>Age/Sex</th><th>Doctor</th><th>Last Date</th><th>Action</th></tr>
  ${rows.map(p=>{const idx=db.patients.indexOf(p);return `<tr><td>${esc(p.patientId)}</td><td>${esc(p.labId)}</td><td>${esc(p.title)} ${esc(p.name)}</td><td>${esc(p.age)} / ${esc(p.sex)}</td>
  <td>${esc(p.doctor)}</td><td>${esc(p.date)}</td><td><button class="btn orange" onclick="editPatient(${idx})">Edit / Add Tests</button> <button class="btn blue" onclick="openPatientResult(${idx})">Results</button> <button class="btn green" onclick="printBill(db.patients[${idx}])">Voucher / PDF</button> <button class="btn red" onclick="deletePatient(${idx})">Delete</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">No records</td></tr>'}</table>`;
}

/* Patient editing / add tests after registration */
function openPatientResult(i){const p=db.patients[i];if(!p)return;const wi=db.waiting.findIndex(x=>String(x.labId)===String(p.labId));if(wi>=0){openModal('Result Entry — '+p.name+' ('+p.labId+')',resultEditor(db.waiting[wi]),'<button class="btn outline" onclick="closeModal()">Close</button>');}else{const ai=db.archives.findIndex(x=>String(x.labId)===String(p.labId));if(ai>=0)openReport(db.archives[ai]);else alert('No active result record found for this patient.');}}
function editPatient(i){
  const p=db.patients[i]; if(!p)return;
  const doc=db.doctors.find(x=>x.id===p.doctorId);
  const existing=new Set((p.tests||[]).map(t=>String(t.testId)));
  openModal('Edit Patient / Add Tests',`<div class="patient-edit-grid">
    <div class="field"><label>Patient ID</label><input id="epPid" value="${esc(p.patientId||'')}"></div>
    <div class="field"><label>Lab ID</label><input value="${esc(p.labId)}" readonly></div>
    <div class="field"><label>Title</label><select id="epTitle">${db.prefixes.map(x=>`<option ${x.title===p.title?'selected':''}>${esc(x.title)}</option>`).join('')}</select></div>
    <div class="field"><label>Patient Name *</label><input id="epName" value="${esc(p.name||'')}"></div>
    <div class="field"><label>Age</label><input id="epAge" value="${esc(p.age||'')}"></div>
    <div class="field"><label>Sex</label><select id="epSex"><option ${p.sex==='Female'?'selected':''}>Female</option><option ${p.sex==='Male'?'selected':''}>Male</option><option ${p.sex==='Other'?'selected':''}>Other</option></select></div>
    <div class="field"><label>Patient Type</label><select id="epType"><option ${p.type==='OPD'?'selected':''}>OPD</option><option ${p.type==='IPD'?'selected':''}>IPD</option><option ${p.type==='Emergency'?'selected':''}>Emergency</option><option ${p.type==='External'?'selected':''}>External</option></select></div>
    <div class="field"><label>Phone</label><input id="epPhone" value="${esc(p.phone||'')}"></div>
    <div class="field"><label>Referral Doctor</label><select id="epDoc">${doctors()}</select></div>
    <div class="field"><label>Collection Date</label><input id="epDate" type="date" value="${esc(p.date||today())}"></div>
  </div>
  <div class="section-title">Current Tests / Add More Tests</div>
  <div class="toolbar"><div class="test-search-wrap"><input id="epTestSearch" class="search" list="epTestList" autocomplete="off" placeholder="Type test name to search..." oninput="filterEditPatientTests()"><datalist id="epTestList">${db.tests.map(t=>`<option value="${esc(t.name)}">${esc(t.category)}</option>`).join('')}</datalist></div><button class="btn blue" onclick="addEditPatientTest()">+ Add Test</button><select id="epAddPkg" class="search"><option value="">Add package...</option>${db.packages.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select><button class="btn purple" onclick="addEditPatientPackage()">+ Add Package</button></div>
  <div id="epTests" class="edit-tests"></div>`,
  '<button class="btn outline" onclick="closeModal()">Cancel</button><button class="btn blue" onclick="savePatientEdit('+i+',true)">Save & Voucher PDF</button><button class="btn green" onclick="savePatientEdit('+i+',false)">Save Patient & Tests</button>');
  $('epDoc').value=String(p.doctorId||'');
  window.__editPatientTests=clone(p.tests||[]); drawEditPatientTests();
}
function drawEditPatientTests(){
  const b=$('epTests');if(!b)return;const rows=window.__editPatientTests||[];
  b.innerHTML=rows.map((t,i)=>`<div class="edit-test-row"><span class="field-order">${i+1}</span><span class="name">${esc(t.name)}</span><span class="price">${money(db.tests.find(x=>String(x.id)===String(t.testId))?.price||0)}</span><button class="order-btn" onclick="moveEditPatientTest(${i},-1)">↑</button><button class="order-btn" onclick="moveEditPatientTest(${i},1)">↓</button><button class="order-btn" onclick="removeEditPatientTest(${i})">×</button></div>`).join('')||'<div class="empty">No tests selected.</div>';}
function filterEditPatientTests(){const q=String($('epTestSearch')?.value||'').trim().toLowerCase();const dl=$('epTestList');if(!dl)return;dl.innerHTML=db.tests.filter(t=>(t.name+' '+t.category).toLowerCase().includes(q)).slice(0,50).map(t=>`<option value="${esc(t.name)}">${esc(t.category)}</option>`).join('');}
function findEditPatientTest(){const q=String($('epTestSearch')?.value||'').trim().toLowerCase();if(!q)return null;return db.tests.find(t=>String(t.name).toLowerCase()===q)||db.tests.find(t=>(t.name+' '+t.category).toLowerCase().includes(q))||null;}
function addEditPatientTest(){const t=findEditPatientTest();if(!t)return alert('Type and select/search a test first.');window.__editPatientTests=window.__editPatientTests||[];if(window.__editPatientTests.some(x=>String(x.testId)===String(t.id)))return alert('This test is already in the patient order.');window.__editPatientTests.push({testId:t.id,name:t.name,category:t.category,type:t.type,value:'',fields:clone(t.fields||[]),status:'Pending',remark:t.remarkTemplate||'',interpretation:t.interpretation||''});drawEditPatientTests();if($('epTestSearch'))$('epTestSearch').value='';}
function addEditPatientPackage(){const id=$('epAddPkg')?.value;const pkg=db.packages.find(x=>String(x.id)===String(id));if(!pkg)return alert('Select a package first.');window.__editPatientTests=window.__editPatientTests||[];let n=0;pkg.tests.map(id=>db.tests.find(t=>String(t.id)===String(id))).filter(Boolean).forEach(t=>{if(!window.__editPatientTests.some(x=>String(x.testId)===String(t.id))){window.__editPatientTests.push({testId:t.id,name:t.name,category:t.category,type:t.type,value:'',fields:clone(t.fields||[]),status:'Pending',remark:t.remarkTemplate||'',interpretation:t.interpretation||''});n++;}});drawEditPatientTests();alert(n+' test(s) added from '+pkg.name+'.');}
function removeEditPatientTest(i){window.__editPatientTests.splice(i,1);drawEditPatientTests();}
function moveEditPatientTest(i,d){const j=i+d;if(j<0||j>=window.__editPatientTests.length)return;[window.__editPatientTests[i],window.__editPatientTests[j]]=[window.__editPatientTests[j],window.__editPatientTests[i]];drawEditPatientTests();}
function savePatientEdit(i,printAfter){
  const p=db.patients[i];if(!p)return;const name=$('epName').value.trim();if(!name)return alert('Patient name is required.');
  const d=db.doctors.find(x=>x.id===+$('epDoc').value);
  p.patientId=$('epPid').value.trim()||p.patientId;p.title=$('epTitle').value;p.name=name;p.age=$('epAge').value.trim();p.sex=$('epSex').value;p.type=$('epType').value;p.phone=$('epPhone').value.trim();p.doctor=d?.name||p.doctor||'Self / None';p.doctorId=d?.id||null;p.date=$('epDate').value||p.date;p.tests=clone(window.__editPatientTests||[]);
  const sync=x=>{if(!x)return;Object.assign(x,{patientId:p.patientId,title:p.title,name:p.name,age:p.age,sex:p.sex,type:p.type,phone:p.phone,doctor:p.doctor,doctorId:p.doctorId,date:p.date,tests:clone(p.tests)});};
  const wi=db.waiting.findIndex(x=>String(x.labId)===String(p.labId));
  if(wi>=0)sync(db.waiting[wi]);
  const ai=db.archives.findIndex(x=>String(x.labId)===String(p.labId));
  if(ai>=0){
    const archived=db.archives[ai];
    const hadNew=(p.tests||[]).some(t=>!testHasResult(t));
    if(hadNew){const draft=clone(p);draft.editOfArchiveIndex=ai;draft.editingFromArchive=true;db.waiting.unshift(draft);}
    else sync(archived);
  }
  audit('Patient edited / tests updated',p.labId);save();window.__editPatientTests=[];closeModal();drawPatients();
  if(printAfter){ printBill(p); }
  else { alert('Patient updated successfully. Added tests are now available in the Waiting List.'); }
}
function deletePatient(i){
  const p=db.patients[i]; if(!p)return;
  const ok=confirm('Delete patient '+(p.name||'')+' ('+(p.labId||'')+')?\n\nThis removes the patient registration and linked waiting/archive records from this offline device. This cannot be undone unless you have a backup.');
  if(!ok)return;
  audit('Patient deleted',p.labId);
  db.patients.splice(i,1);
  db.waiting=db.waiting.filter(x=>String(x.labId)!==String(p.labId));
  db.archives=db.archives.filter(x=>String(x.labId)!==String(p.labId));
  save(); drawPatients();
}



/* Invoices — tests + laboratory items */
let __invoiceDraft=null;
function newInvoice(){
  __invoiceDraft={id:null,invoiceNo:'INV-'+Date.now().toString().slice(-8),date:today(),from:db.settings.labName,to:'',requestedBy:'',patientRef:'',notes:'',status:'Unpaid',items:[]};
  invoiceForm();
}
function invoiceManager(){
  renderInvoices($('content'));
}
function renderInvoices(c){
  c.innerHTML=`<div class="card"><h3>Invoice</h3>
    <div class="alert">Create invoices for laboratory tests and non-test items such as tubes or consumables. Add as many lines as needed, set quantity and unit price, then preview, print or save as PDF.</div>
    <div class="toolbar"><button class="btn green" onclick="newInvoice()">+ New Invoice</button><input id="invSearch" class="search" placeholder="Invoice No / billed to / requested by"></div>
    <div id="invoiceList"></div></div>`;
  drawInvoices();$('invSearch').oninput=drawInvoices;
}
function drawInvoices(){
  const s=String($('invSearch')?.value||'').toLowerCase();
  const rows=db.invoices.filter(x=>[x.invoiceNo,x.to,x.requestedBy,x.patientRef].join(' ').toLowerCase().includes(s));
  $('invoiceList').innerHTML=`<table><thead><tr><th>Invoice</th><th>Date</th><th>From</th><th>To</th><th>Requested By</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>
  ${rows.length?rows.map(x=>{const i=db.invoices.indexOf(x);return `<tr><td>${esc(x.invoiceNo)}</td><td>${esc(x.date)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td>${esc(x.requestedBy)}</td><td>${money(invoiceTotal(x))}</td><td>${esc(x.status||'Unpaid')}</td>
  <td><button class="btn blue" onclick="previewInvoice(db.invoices[${i}])">Preview</button> <button class="btn orange" onclick="editInvoice(${i})">Edit</button> <button class="btn red" onclick="deleteInvoice(${i})">Delete</button></td></tr>`}).join(''):'<tr><td colspan="8" class="empty">No invoices</td></tr>'}</tbody></table>`;
}
function invoiceTotal(inv){return (inv?.items||[]).reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.unitPrice)||0),0)}
function editInvoice(i){__invoiceDraft=clone(db.invoices[i]);__invoiceDraft.__index=i;invoiceForm();}
function invoiceForm(){
  const x=__invoiceDraft||{invoiceNo:'INV-'+Date.now(),date:today(),from:db.settings.labName,to:'',requestedBy:'',patientRef:'',notes:'',status:'Unpaid',items:[]};
  __invoiceDraft=x;
  openModal(x.__index!==undefined?'Edit Invoice':'New Invoice',`<div class="formgrid">
    <div class="field"><label>Invoice No.</label><input id="ivNo" value="${esc(x.invoiceNo)}"></div>
    <div class="field"><label>Date</label><input id="ivDate" type="date" value="${esc(x.date||today())}"></div>
    <div class="field"><label>From</label><input id="ivFrom" value="${esc(x.from||db.settings.labName)}"></div>
    <div class="field"><label>Bill To / Requested From</label><input id="ivTo" value="${esc(x.to||'')}" placeholder="Hospital / clinic / department / client"></div>
    <div class="field"><label>Requested By</label><input id="ivReq" value="${esc(x.requestedBy||'')}" placeholder="Person requesting the tests/items"></div>
    <div class="field"><label>Patient / Reference</label><input id="ivPatient" value="${esc(x.patientRef||'')}"></div>
    <div class="field"><label>Status</label><select id="ivStatus"><option ${x.status==='Unpaid'?'selected':''}>Unpaid</option><option ${x.status==='Paid'?'selected':''}>Paid</option><option ${x.status==='Partial'?'selected':''}>Partial</option><option ${x.status==='Cancelled'?'selected':''}>Cancelled</option></select></div>
    <div class="field" style="grid-column:1/-1"><label>Notes</label><textarea id="ivNotes" rows="2">${esc(x.notes||'')}</textarea></div>
  </div>
  <div class="section-title">Invoice Lines</div>
  <div class="toolbar"><select id="ivTest" class="search">${testOptions()}</select><button class="btn blue" onclick="invoiceAddTest()">+ Add Test</button><button class="btn purple" onclick="invoiceAddItem()">+ Add Item</button></div>
  <div id="invoiceLines"></div>
  <div class="right" style="margin-top:8px;font-size:16px"><b>Grand Total: <span id="invoiceGrandTotal">${money(invoiceTotal(x))}</span></b></div>`,
  '<button class="btn outline" onclick="renderInvoices(document.getElementById(&quot;content&quot;))">Cancel</button><button class="btn blue" onclick="saveInvoice(true)">Save & Preview</button><button class="btn green" onclick="saveInvoice(false)">Save Invoice</button>');
  drawInvoiceLines();
}
function invoiceAddTest(){
  const id=$('ivTest')?.value,t=db.tests.find(x=>String(x.id)===String(id));if(!t)return alert('Select a test first.');
  syncInvoiceForm();__invoiceDraft.items.push({kind:'test',refId:t.id,description:t.name,qty:1,unitPrice:Number(t.price)||0});drawInvoiceLines();
}
function invoiceAddItem(){
  syncInvoiceForm();__invoiceDraft.items.push({kind:'item',refId:'',description:'',qty:1,unitPrice:0});drawInvoiceLines();
}
function syncInvoiceForm(){
  if(!$('ivNo'))return;
  __invoiceDraft.invoiceNo=$('ivNo').value.trim()||('INV-'+Date.now());
  __invoiceDraft.date=$('ivDate').value||today();__invoiceDraft.from=$('ivFrom').value.trim();
  __invoiceDraft.to=$('ivTo').value.trim();__invoiceDraft.requestedBy=$('ivReq').value.trim();
  __invoiceDraft.patientRef=$('ivPatient').value.trim();__invoiceDraft.status=$('ivStatus').value;__invoiceDraft.notes=$('ivNotes').value;
  [...document.querySelectorAll('#invoiceLines .inv-line')].forEach((r,i)=>{const it=__invoiceDraft.items[i];if(!it)return;it.description=r.querySelector('.inv-desc')?.value.trim()||'';it.qty=Math.max(0,Number(r.querySelector('.inv-qty')?.value)||0);it.unitPrice=Math.max(0,Number(r.querySelector('.inv-price')?.value)||0);});
}
function drawInvoiceLines(){
  const b=$('invoiceLines');if(!b)return;
  b.innerHTML=`<table><thead><tr><th>#</th><th>Type</th><th>Test / Item</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead><tbody>
  ${(__invoiceDraft.items||[]).map((it,i)=>`<tr class="inv-line"><td>${i+1}</td><td>${it.kind==='test'?'Test':'Item'}</td><td><input class="inv-desc" value="${esc(it.description||'')}" placeholder="${it.kind==='item'?'e.g. Serum tube / Vacutainer':'Test name'}"></td>
  <td><input class="inv-qty" type="number" min="0" step="1" value="${Number(it.qty)||0}" oninput="updateInvoiceTotal()"></td>
  <td><input class="inv-price" type="number" min="0" step="0.01" value="${Number(it.unitPrice)||0}" oninput="updateInvoiceTotal()"></td>
  <td class="inv-amt">${money((Number(it.qty)||0)*(Number(it.unitPrice)||0))}</td><td><button class="btn red" onclick="invoiceRemoveLine(${i})">×</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No invoice lines. Add tests or items.</td></tr>'}</tbody></table>`;
  updateInvoiceTotal();
}
function updateInvoiceTotal(){
  const rows=[...document.querySelectorAll('#invoiceLines .inv-line')];
  let total=0;rows.forEach(r=>{const a=(Number(r.querySelector('.inv-qty')?.value)||0)*(Number(r.querySelector('.inv-price')?.value)||0);total+=a;const c=r.querySelector('.inv-amt');if(c)c.textContent=money(a);});
  if($('invoiceGrandTotal'))$('invoiceGrandTotal').textContent=money(total);
}
function invoiceRemoveLine(i){syncInvoiceForm();__invoiceDraft.items.splice(i,1);drawInvoiceLines();}
function saveInvoice(preview){
  syncInvoiceForm();
  if(!__invoiceDraft.to&&!__invoiceDraft.requestedBy)return alert('Enter Bill To or Requested By.');
  if(!__invoiceDraft.items.length)return alert('Add at least one test or item.');
  if(__invoiceDraft.__index!==undefined)db.invoices[__invoiceDraft.__index]=clone(__invoiceDraft);
  else db.invoices.unshift(clone(__invoiceDraft));
  delete __invoiceDraft.__index;save();
  const saved=__invoiceDraft;__invoiceDraft=null;
  if(preview)previewInvoice(saved);else{closeModal();renderInvoices($('content'));alert('Invoice saved.');}
}
function invoiceHTML(inv){
  const lines=(inv.items||[]).map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.kind==='test'?'Laboratory Test':'Item')}</td><td>${esc(it.description)}</td><td>${Number(it.qty)||0}</td><td>${money(it.unitPrice)}</td><td>${money((Number(it.qty)||0)*(Number(it.unitPrice)||0))}</td></tr>`).join('');
  return `<div class="bill invoice" id="invoiceDoc"><div class="bill-title"><h2>${esc(db.settings.labName)}</h2><div>${esc(db.settings.address)} | ${esc(db.settings.phone)}</div><h3>INVOICE</h3></div>
  <div class="report-meta"><div><b>Invoice No:</b> ${esc(inv.invoiceNo)}<br><b>Date:</b> ${esc(inv.date)}<br><b>From:</b> ${esc(inv.from)}</div>
  <div><b>Bill To:</b> ${esc(inv.to)}<br><b>Requested By:</b> ${esc(inv.requestedBy)}<br>${inv.patientRef?`<b>Patient / Ref:</b> ${esc(inv.patientRef)}`:''}</div></div>
  <table><thead><tr><th>#</th><th>Type</th><th>Test / Item</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table>
  <div class="bill-total">Grand Total: ${money(invoiceTotal(inv))}</div><p><b>Status:</b> ${esc(inv.status||'Unpaid')}</p>${inv.notes?`<p><b>Notes:</b> ${esc(inv.notes)}</p>`:''}
  <div class="report-sign"><div><b>Prepared by</b><br>${esc(db.settings.report.tester||'')}</div><div><b>Approved / Requested by</b><br>${esc(inv.requestedBy||'')}</div></div>
  <div class="report-footer">Computer generated invoice</div></div>`;
}
function previewInvoice(inv){
  window.__currentInvoice=inv;
  openModal('Invoice Preview',invoiceHTML(inv),
    '<button class="btn blue" onclick="saveInvoicePDFDirect()">Save to PDF</button><button class="btn green" onclick="printInvoiceNow()">Print</button><button class="btn outline" onclick="closeModal()">Close</button>');
}
function printInvoiceNow(){const d=$('invoiceDoc'),inv=window.__currentInvoice;if(!d||!inv)return;nativePrintDocument('invoice',invoiceFileName(inv));}
function saveInvoicePDF(){saveInvoicePDFDirect();}
function deleteInvoice(i){if(confirm('Delete this invoice?')){db.invoices.splice(i,1);save();drawInvoices();}}


/* V12.9 Voucher module */
let __voucherDraft=null;
function voucherManager(){renderVouchers($('content'));}
function renderVouchers(c){c.innerHTML=`<div class="card"><h3>Voucher</h3><div class="toolbar"><button class="btn green" onclick="newVoucher()">+ New Voucher</button><input id="voSearch" class="search" placeholder="Voucher No / recipient / reference"></div><div id="voucherList"></div></div>`;drawVouchers();$('voSearch').oninput=drawVouchers;}
function voucherTotal(v){return (v.items||[]).reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.unitPrice)||0),0)}
function drawVouchers(){const b=$('voucherList');if(!b)return;const q=String($('voSearch')?.value||'').toLowerCase();const rows=(db.vouchers||[]).filter(v=>[v.voucherNo,v.to,v.requestedBy,v.reference].join(' ').toLowerCase().includes(q));b.innerHTML=`<table><tr><th>Voucher</th><th>Date</th><th>To</th><th>Requested By</th><th>Total</th><th>Action</th></tr>${rows.map(v=>{const i=db.vouchers.indexOf(v);return `<tr><td>${esc(v.voucherNo)}</td><td>${esc(v.date)}</td><td>${esc(v.to)}</td><td>${esc(v.requestedBy)}</td><td>${money(voucherTotal(v))}</td><td><button class="btn blue" onclick="previewVoucher(db.vouchers[${i}])">Preview</button><button class="btn red" onclick="db.vouchers.splice(${i},1);save();drawVouchers()">×</button></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">No vouchers</td></tr>'}</table>`;}
function newVoucher(){__voucherDraft={voucherNo:'VCH-'+Date.now().toString().slice(-8),date:today(),from:db.settings.labName,to:'',requestedBy:'',reference:'',purpose:'',items:[]};voucherForm();}
function voucherForm(){const x=__voucherDraft;openModal('New Voucher',`<div class="formgrid"><div class="field"><label>Voucher No.</label><input id="voNo" value="${esc(x.voucherNo)}"></div><div class="field"><label>Date</label><input id="voDate" type="date" value="${esc(x.date)}"></div><div class="field"><label>From</label><input id="voFrom" value="${esc(x.from)}"></div><div class="field"><label>To / Recipient</label><input id="voTo" value="${esc(x.to)}"></div><div class="field"><label>Requested By</label><input id="voReq" value="${esc(x.requestedBy)}"></div><div class="field"><label>Reference</label><input id="voRef" value="${esc(x.reference)}"></div><div class="field" style="grid-column:1/-1"><label>Purpose / Notes</label><textarea id="voPurpose" rows="2">${esc(x.purpose)}</textarea></div></div><div class="section-title">Voucher Items</div><div class="toolbar"><button class="btn purple" onclick="voucherAddItem()">+ Add Item</button></div><div id="voucherLines"></div><div class="right"><b>Total: <span id="voucherTotal">${money(voucherTotal(x))}</span></b></div>`,`<button class="btn outline" onclick="closeModal()">Cancel</button><button class="btn green" onclick="saveVoucher()">Save Voucher</button>`);drawVoucherLines();}
function voucherAddItem(){syncVoucher();__voucherDraft.items.push({description:'',qty:1,unitPrice:0});drawVoucherLines();}
function syncVoucher(){if(!$('voNo'))return;__voucherDraft.voucherNo=$('voNo').value.trim();__voucherDraft.date=$('voDate').value||today();__voucherDraft.from=$('voFrom').value.trim();__voucherDraft.to=$('voTo').value.trim();__voucherDraft.requestedBy=$('voReq').value.trim();__voucherDraft.reference=$('voRef').value.trim();__voucherDraft.purpose=$('voPurpose').value;document.querySelectorAll('#voucherLines .vo-line').forEach((r,i)=>{const it=__voucherDraft.items[i];if(it){it.description=r.querySelector('.vo-desc').value.trim();it.qty=Number(r.querySelector('.vo-qty').value)||0;it.unitPrice=Number(r.querySelector('.vo-price').value)||0;}})}
function drawVoucherLines(){const b=$('voucherLines');if(!b)return;b.innerHTML=`<table><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr>${(__voucherDraft.items||[]).map((it,i)=>`<tr class="vo-line"><td>${i+1}</td><td><input class="vo-desc" value="${esc(it.description||'')}" placeholder="Item / test / consumable"></td><td><input class="vo-qty" type="number" min="0" value="${Number(it.qty)||0}" oninput="updateVoucherTotal()"></td><td><input class="vo-price" type="number" min="0" value="${Number(it.unitPrice)||0}" oninput="updateVoucherTotal()"></td><td class="vo-amt">${money((Number(it.qty)||0)*(Number(it.unitPrice)||0))}</td><td><button class="btn red" onclick="syncVoucher();__voucherDraft.items.splice(${i},1);drawVoucherLines()">×</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No items</td></tr>'}</table>`;updateVoucherTotal();}
function updateVoucherTotal(){let total=0;document.querySelectorAll('#voucherLines .vo-line').forEach(r=>{const a=(Number(r.querySelector('.vo-qty').value)||0)*(Number(r.querySelector('.vo-price').value)||0);total+=a;r.querySelector('.vo-amt').textContent=money(a)});if($('voucherTotal'))$('voucherTotal').textContent=money(total)}
function saveVoucher(){syncVoucher();if(!__voucherDraft.to&&!__voucherDraft.requestedBy)return alert('Enter To / Recipient or Requested By.');if(!__voucherDraft.items.length)return alert('Add at least one item.');db.vouchers.unshift(clone(__voucherDraft));save();const v=clone(__voucherDraft);__voucherDraft=null;previewVoucher(v);}
function voucherHTML(v){return `<div class="voucher" id="voucherDoc"><div class="voucher-title"><h2>${esc(v.from||db.settings.labName)}</h2><div>${esc(db.settings.address)} | ${esc(db.settings.phone)}</div><h3>VOUCHER</h3></div><div class="report-meta"><div><b>Voucher No:</b> ${esc(v.voucherNo)}<br><b>Date:</b> ${esc(v.date)}<br><b>To:</b> ${esc(v.to)}</div><div><b>Requested By:</b> ${esc(v.requestedBy)}<br><b>Reference:</b> ${esc(v.reference||'')}</div></div><table><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>${(v.items||[]).map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.description)}</td><td>${Number(it.qty)||0}</td><td>${money(it.unitPrice)}</td><td>${money((Number(it.qty)||0)*(Number(it.unitPrice)||0))}</td></tr>`).join('')}</table><div class="voucher-total">Total: ${money(voucherTotal(v))}</div>${v.purpose?`<p><b>Purpose:</b> ${esc(v.purpose)}</p>`:''}<div class="report-footer">${esc(db.settings.report.footerText||'')}</div></div>`;}
function previewVoucher(v){window.__currentVoucher=clone(v);openModal('Voucher Preview',voucherHTML(v),'<button class="btn blue" onclick="saveVoucherPDF()">Save to PDF / Print</button><button class="btn green" onclick="printVoucherNow()">Print</button><button class="btn outline" onclick="closeModal()">Close</button>');}

/* V12.9 — true offline voucher PDF export. This does NOT depend on window.print,
   html2pdf, CDN files, internet, or a browser print service. It creates a small
   standards-compliant PDF directly in JavaScript and downloads it as .pdf. */
function pdfEscape(s){return String(s??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\r?\n/g,' ');}
function makeSimplePDF(lines){
  const W=595.28,H=841.89,margin=42,leading=14,maxChars=92;
  const wrapped=[];
  (lines||[]).forEach(line=>{
    let t=String(line??'').replace(/\t/g,'    ');
    if(!t){wrapped.push('');return;}
    while(t.length>maxChars){wrapped.push(t.slice(0,maxChars));t=t.slice(maxChars);}
    wrapped.push(t);
  });
  const perPage=Math.floor((H-margin*2)/leading);
  const pages=[];
  for(let i=0;i<wrapped.length;i+=perPage) pages.push(wrapped.slice(i,i+perPage));
  if(!pages.length) pages.push(['']);
  const objs=[];
  objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
  const pageNums=[],contentNums=[];
  let next=3;
  for(let i=0;i<pages.length;i++){pageNums.push(next++);contentNums.push(next++);}
  const fontNum=next++;
  objs[2]=`<< /Type /Pages /Kids [${pageNums.map(n=>n+' 0 R').join(' ')}] /Count ${pages.length} >>`;
  pages.forEach((pg,i)=>{
    const cmds=['BT','/F1 10 Tf',`${margin} ${H-margin} Td`];
    pg.forEach((line,j)=>{cmds.push(`(${pdfEscape(line)}) Tj`);if(j<pg.length-1)cmds.push(`0 -${leading} Td`);});
    cmds.push('ET');
    const stream=cmds.join('\n');
    objs[contentNums[i]]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objs[pageNums[i]]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontNum} 0 R >> >> /Contents ${contentNums[i]} 0 R >>`;
  });
  objs[fontNum]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  let pdf='%PDF-1.4\n%âãÏÓ\n',offsets=[0];
  for(let i=1;i<objs.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`;}
  const xref=pdf.length;pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objs.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf],{type:'application/pdf'});
}
async function downloadPDFBlob(blob,filename){
  if(!blob)return false;
  try{
    /* Preferred: native file picker when the installed app/browser exposes it. */
    if(typeof window.showSaveFilePicker==='function'){
      const h=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'PDF file',accept:{'application/pdf':['.pdf']}}]});
      const w=await h.createWritable();await w.write(blob);await w.close();return true;
    }
  }catch(e){if(e?.name==='AbortError')return false;console.warn('File picker unavailable',e);}
  try{
    /* Standard offline download path. This is supported by normal PWA/TWA containers. */
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.rel='noopener';a.target='_blank';a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    return true;
  }catch(e){console.error('PDF download failed',e);}
  try{
    /* Mobile fallback: hand the real PDF file to the native share sheet (Files/Drive/etc.). */
    const file=new File([blob],filename,{type:'application/pdf'});
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({title:filename,files:[file]});return true;}
  }catch(e){if(e?.name==='AbortError')return false;console.warn('PDF share failed',e);}
  return false;
}
function reportPDFLines(p){
  const lines=[];
  lines.push(db.settings.labName||'LIMS');
  lines.push('LABORATORY REPORT'); lines.push('');
  lines.push('Patient: '+((p?.title||'')+' '+(p?.name||'')).trim());
  lines.push('Patient ID: '+(p?.patientId||''));
  lines.push('Lab ID: '+(p?.labId||''));
  lines.push('Date: '+(p?.date||''));
  if(p?.doctor) lines.push('Doctor: '+p.doctor);
  lines.push('');
  lines.push('Test Description | Results | Reference | Unit | Status | Remark');
  (p?.tests||[]).forEach(t=>{
    const m=db.tests.find(x=>String(x.id)===String(t.testId))||t||{};
    if(Array.isArray(t.fields)&&t.fields.length){
      lines.push(String(t.name||m.name||''));
      t.fields.filter(f=>String(f?.value??'').trim()!=='').forEach(f=>{
        const st=calcStatus(f.value,f.ref||m.ref||'',m);
        lines.push(`${f.n||''} | ${f.value??''} | ${f.ref||m.ref||''} | ${f.unit||m.unit||''} | ${st||''} | ${f.remark||''}`);
      });
    }else if(String(t.result??'').trim()!==''){
      const st=calcStatus(t.result,t.ref||m.ref||'',m);
      lines.push(`${t.name||m.name||''} | ${t.result??''} | ${t.ref||m.ref||''} | ${t.unit||m.unit||''} | ${st||''} | ${t.remark||''}`);
    }
  });
  const interpretationLines=[];(p?.tests||[]).forEach(t=>{const m=db.tests.find(x=>String(x.id)===String(t.testId))||{};const has=Array.isArray(t.fields)?t.fields.some(f=>String(f?.v??'').trim()!==''):String(t.value??'').trim()!=='';const txt=String(t.interpretation||m.interpretation||'').trim();if(has&&txt)interpretationLines.push((t.name||m.name||'Test')+': '+txt);});
  const rp=db.settings.report||{};
  if(p?.comment||interpretationLines.length)lines.push((rp.commentTitle||'Comment')+': '+(p?.comment||''),...interpretationLines);
  if(rp.footerText)lines.push(rp.footerText);
  return lines;
}
function nativePrintDocument(kind,filename){
  if(window.__limsPrintBusy)return;
  window.__limsPrintBusy=true;
  const body=document.body, cls='printing-'+kind, oldTitle=document.title;
  document.title=String(filename||'LIMS').replace(/\.pdf$/,'');
  body.classList.add(cls);
  let done=false;
  const cleanup=()=>{if(done)return;done=true;body.classList.remove(cls);document.title=oldTitle;window.removeEventListener('afterprint',cleanup);window.__limsPrintBusy=false;};
  window.addEventListener('afterprint',cleanup,{once:true});
  setTimeout(()=>{
    try{if(typeof window.print!=='function')throw new Error('print unavailable');window.print();setTimeout(cleanup,2500);}
    catch(e){cleanup();alert('Print / Save as PDF is not available in this app container.');}
  },120);
}
async function saveReportPDFDirect(){const p=window.__previewPatient;if(!p)return alert('Report data is missing.');nativePrintDocument('report',reportFileName(p));}
async function saveBillPDFDirect(){const p=window.__billPatient;if(!p)return alert('Voucher data is missing.');nativePrintDocument('voucher',voucherFileName({voucherNo:p.labId||p.name,date:p.date}));}
async function saveInvoicePDFDirect(){const inv=window.__currentInvoice;if(!inv)return alert('Invoice data is missing.');nativePrintDocument('invoice',invoiceFileName(inv));}
function voucherPDFLines(v){
  const lines=[];
  lines.push(v.from||db.settings.labName||'LIMS');lines.push('VOUCHER');lines.push('');
  lines.push('Voucher No: '+(v.voucherNo||''));lines.push('Date: '+(v.date||''));lines.push('To / Recipient: '+(v.to||''));lines.push('Requested By: '+(v.requestedBy||''));lines.push('Reference: '+(v.reference||''));lines.push('');
  lines.push('# | Description | Qty | Unit Price | Amount');
  (v.items||[]).forEach((it,i)=>{const q=Number(it.qty)||0,u=Number(it.unitPrice)||0;lines.push(`${i+1} | ${it.description||''} | ${q} | ${money(u)} | ${money(q*u)}`);});
  lines.push('',`TOTAL: ${money(voucherTotal(v))}`);if(v.purpose)lines.push('Purpose / Notes: '+v.purpose);if(db.settings?.report?.footerText)lines.push(db.settings.report.footerText);
  return lines;
}
async function saveVoucherPDF(){
  const v=window.__currentVoucher;if(!v)return alert('Voucher data is missing.');
  nativePrintDocument('voucher',voucherFileName(v));
}
function printVoucherNow(){
  const v=window.__currentVoucher;if(!v)return alert('Voucher data is missing.');
  nativePrintDocument('voucher',voucherFileName(v));
}

/* V12.8 Report Layouts */
const REPORT_LAYOUT_PRESETS={
  clean:{name:'Clean — no divider lines',showCategory:false,showSeparators:false,showFooter:false},
  classic:{name:'Classic — light table',showCategory:false,showSeparators:true,showFooter:true},
  compact:{name:'Compact — results focused',showCategory:false,showSeparators:false,showFooter:false},
  detailed:{name:'Detailed — category + remarks',showCategory:true,showSeparators:true,showFooter:true},
  modern:{name:'Modern — soft grouped rows',showCategory:false,showSeparators:false,showFooter:false},
  boxed:{name:'Boxed — full borders',showCategory:false,showSeparators:true,showFooter:true},
  minimal:{name:'Minimal — maximum result space',showCategory:false,showSeparators:false,showFooter:false},
  twocolumn:{name:'Two-column — report friendly',showCategory:false,showSeparators:false,showFooter:false}
};
function reportLayoutManager(){
  const r=db.settings.report||{};const cur=r.layoutStyle||'clean';
  openModal('Report Layouts',`<div class="alert">Choose the appearance of the final report. This changes presentation only; it does not change patient results.</div><div class="theme-swatches">${Object.entries(REPORT_LAYOUT_PRESETS).map(([k,v])=>`<div class="theme-swatch ${cur===k?'active':''}" onclick="applyReportLayout('${k}')"><b>${esc(v.name)}</b><div class="small" style="margin-top:6px">${k==='clean'?'No horizontal dividers.':k==='classic'?'Light separators.':k==='compact'?'Minimal result-focused.':k==='detailed'?'Grouped tests + remarks.':k==='modern'?'Soft grouped rows.':k==='boxed'?'Full table borders.':k==='minimal'?'Maximum result space.':'Wide two-column friendly.'}</div><div class="header-sample"><table style="font-size:8px;width:100%"><tr><th>Test</th><th>Result</th><th>Ref</th></tr><tr><td>Electrolytes</td><td>138</td><td>135–145</td></tr></table></div></div>`).join('')}</div><div class="section-title">Current settings</div><div class="formgrid"><div class="field"><label>Show Category</label><select id="rlCategory"><option value="0">Hide</option><option value="1">Show</option></select></div><div class="field"><label>Show separator lines</label><select id="rlLines"><option value="0">Hide</option><option value="1">Show</option></select></div><div class="field"><label>Show Footer</label><select id="rlFooter"><option value="0">Hide</option><option value="1">Show</option></select></div></div><div id="layoutSample" class="report" style="margin-top:8px"><table><tr><th>Test Description</th><th>Results</th><th>Reference</th><th>Unit</th><th>Status</th></tr><tr><td>Electrolytes</td><td></td><td></td><td></td><td></td></tr><tr><td>&nbsp;&nbsp;Sodium</td><td>138</td><td>135–145</td><td>mmol/L</td><td>Normal</td></tr><tr><td>&nbsp;&nbsp;Potassium</td><td>4.2</td><td>3.5–5.1</td><td>mmol/L</td><td>Normal</td></tr></table></div>`, '<button class="btn outline" onclick="closeModal()">Close</button><button class="btn green" onclick="saveReportLayoutSettings()">Save Layout</button>');
  $('rlCategory').value=r.showCategory?'1':'0';$('rlLines').value=r.showSeparators?'1':'0';$('rlFooter').value=r.showFooter?'1':'0';
}
function applyReportLayout(k){const v=REPORT_LAYOUT_PRESETS[k];if(!v)return;db.settings.report.layoutStyle=k;db.settings.report.showCategory=v.showCategory;db.settings.report.showSeparators=v.showSeparators;db.settings.report.showFooter=v.showFooter;reportLayoutManager();}
function saveReportLayoutSettings(){db.settings.report.showCategory=$('rlCategory').value==='1';db.settings.report.showSeparators=$('rlLines').value==='1';db.settings.report.showFooter=$('rlFooter').value==='1';save();closeModal();alert('Report layout saved.');}
function reportLayoutChooser(){reportLayoutManager();}

/* V12.8 QC Manager — manual IQC + Levey-Jennings + configurable rules */
function qcManager(){
  openModal('QC Manager',`<div class="toolbar"><button class="btn green" onclick="addIQCRecord()">+ Add IQC</button><button class="btn blue" onclick="showQCChart()">Levey-Jennings Chart</button><button class="btn purple" onclick="qcRules()">QC Rules</button><button class="btn orange" onclick="printQCReport()">Print QC Report</button></div><div class="alert">Enter validated target mean and SD for the control material. The system calculates z-score and provides configurable rule flags; final acceptance/rejection remains under your laboratory QC procedure.</div><div id="qcManagerList"></div>`, '<button class="btn outline" onclick="closeModal()">Close</button>');drawQCManagerList();}
function drawQCManagerList(){const b=$('qcManagerList');if(!b)return;const a=db.qc||[];b.innerHTML=`<table><tr><th>Date</th><th>Test</th><th>Level</th><th>Value</th><th>Mean</th><th>SD</th><th>Z</th><th>Rule</th><th></th></tr>${a.map((q,i)=>{const z=Number(q.sd)?((Number(q.value)-Number(q.mean))/Number(q.sd)):0;return `<tr><td>${esc(q.date)}</td><td>${esc(q.test)}</td><td>${esc(q.level)}</td><td>${esc(q.value)}</td><td>${esc(q.mean)}</td><td>${esc(q.sd)}</td><td>${z.toFixed(2)}</td><td>${esc(q.rule||'')}</td><td><button class="btn red" onclick="db.qc.splice(${i},1);save();drawQCManagerList()">×</button></td></tr>`}).join('')||'<tr><td colspan="9" class="empty">No IQC records</td></tr>'}</table>`;}
function addIQCRecord(){openModal('Add IQC Record',`<div class="formgrid"><div class="field"><label>Test</label><input id="iqTest" placeholder="e.g. Glucose"></div><div class="field"><label>Control Level</label><select id="iqLevel"><option>Level 1</option><option>Level 2</option><option>Level 3</option></select></div><div class="field"><label>Value</label><input id="iqValue" type="number" step="any"></div><div class="field"><label>Target Mean</label><input id="iqMean" type="number" step="any"></div><div class="field"><label>SD</label><input id="iqSD" type="number" step="any"></div><div class="field"><label>Rule / Comment</label><input id="iqRule" placeholder="e.g. In control / 1_2s warning"></div></div>`, '<button class="btn green" onclick="saveIQCRecord()">Save</button>');}
function saveIQCRecord(){db.qc.unshift({date:today(),test:$('iqTest').value.trim(),level:$('iqLevel').value,value:$('iqValue').value,mean:$('iqMean').value,sd:$('iqSD').value,rule:$('iqRule').value.trim()});save();closeModal();qcManager();}
function showQCChart(){const a=(db.qc||[]).slice(0,30).reverse();const vals=a.map(q=>Number(q.value)||0),mean=vals.length?(vals.reduce((x,y)=>x+y,0)/vals.length):0;const sd=Math.sqrt(vals.reduce((x,y)=>x+(y-mean)**2,0)/(Math.max(1,vals.length-1)));const W=760,H=300,pad=40;const max=Math.max(...vals,mean+3*sd,1),min=Math.min(...vals,mean-3*sd,0);const y=v=>H-pad-(v-min)/(max-min)*(H-2*pad);const pts=vals.map((v,i)=>`${pad+i*((W-2*pad)/Math.max(1,vals.length-1))},${y(v)}`).join(' ');const lines=[['+3SD',mean+3*sd],['+2SD',mean+2*sd],['Mean',mean],['-2SD',mean-2*sd],['-3SD',mean-3*sd]];openModal('Levey-Jennings Chart',`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;border:1px solid var(--bd);background:#fff"><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#777"/><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#777"/>${lines.map(([n,v])=>`<line x1="${pad}" y1="${y(v)}" x2="${W-pad}" y2="${y(v)}" stroke="#bbb" stroke-dasharray="4 4"/><text x="4" y="${y(v)-3}" font-size="10">${n}</text>`).join('')}<polyline fill="none" stroke="#0b8ecf" stroke-width="2" points="${pts}"/>${vals.map((v,i)=>`<circle cx="${pad+i*((W-2*pad)/Math.max(1,vals.length-1))}" cy="${y(v)}" r="3" fill="#0b8ecf"/>`).join('')}</svg><div class="small">This chart is a visualization aid. Use your validated QC plan and laboratory policy for acceptance decisions.</div>`, '<button class="btn outline" onclick="closeModal()">Close</button>');}
function qcRules(){openModal('QC Rules Reference',`<div class="alert">Common Westgard-style rules available for recording/flagging: 1_2s warning, 1_3s, 2_2s, R_4s, 4_1s and 7T. Configure which rules your laboratory actually uses in its validated QC plan.</div><table><tr><th>Rule</th><th>Meaning</th></tr><tr><td>1_2s</td><td>One control beyond ±2 SD — commonly a warning.</td></tr><tr><td>1_3s</td><td>One control beyond ±3 SD.</td></tr><tr><td>2_2s</td><td>Two consecutive controls beyond the same ±2 SD side.</td></tr><tr><td>R_4s</td><td>Within-run difference spanning 4 SD.</td></tr><tr><td>4_1s</td><td>Four consecutive controls beyond the same ±1 SD side.</td></tr><tr><td>7T</td><td>Seven consecutive results trending in one direction.</td></tr></table>`, '<button class="btn outline" onclick="closeModal()">Close</button>');}
function printQCReport(){const a=db.qc||[];openModal('QC Report Preview',`<div id="qcPrint"><h2>IQC Report</h2><p>Date: ${today()}</p><table><tr><th>Date</th><th>Test</th><th>Level</th><th>Value</th><th>Mean</th><th>SD</th><th>Rule</th></tr>${a.map(q=>`<tr><td>${esc(q.date)}</td><td>${esc(q.test)}</td><td>${esc(q.level)}</td><td>${esc(q.value)}</td><td>${esc(q.mean)}</td><td>${esc(q.sd)}</td><td>${esc(q.rule||'')}</td></tr>`).join('')}</table></div>`, '<button class="btn green" onclick="window.print()">Print</button><button class="btn outline" onclick="closeModal()">Close</button>');}

/* EQA / PT */
function eqaManager(){openModal('EQA / PT',`<div class="toolbar"><button class="btn green" onclick="addEQA()">+ Add EQA</button><button class="btn blue" onclick="printEQAReport()">Print EQA Report</button></div><div id="eqaList"></div>`,'<button class="btn outline" onclick="closeModal()">Close</button>');drawEQA();}
function drawEQA(){const b=$('eqaList');if(!b)return;b.innerHTML=`<table><tr><th>Provider</th><th>Scheme / Cycle</th><th>Test</th><th>Expected</th><th>Your Result</th><th>Status</th><th></th></tr>${(db.eqa||[]).map((q,i)=>`<tr><td>${esc(q.provider)}</td><td>${esc(q.cycle)}</td><td>${esc(q.test)}</td><td>${esc(q.expected)}</td><td>${esc(q.result)}</td><td>${esc(q.status)}</td><td><button class="btn red" onclick="db.eqa.splice(${i},1);save();drawEQA()">×</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No EQA records</td></tr>'}</table>`;}
function addEQA(){openModal('Add EQA / PT Result',`<div class="formgrid"><div class="field"><label>Provider</label><input id="eqProvider"></div><div class="field"><label>Scheme / Cycle</label><input id="eqCycle"></div><div class="field"><label>Test</label><input id="eqTest"></div><div class="field"><label>Expected / Assigned</label><input id="eqExpected"></div><div class="field"><label>Your Result</label><input id="eqResult"></div><div class="field"><label>Status</label><select id="eqStatus"><option>Satisfactory</option><option>Unsatisfactory</option><option>Pending Review</option></select></div><div class="field" style="grid-column:1/-1"><label>Comment / Corrective Action</label><textarea id="eqComment"></textarea></div></div>`, '<button class="btn green" onclick="db.eqa.unshift({date:today(),provider:eqProvider.value.trim(),cycle:eqCycle.value.trim(),test:eqTest.value.trim(),expected:eqExpected.value.trim(),result:eqResult.value.trim(),status:eqStatus.value,comment:eqComment.value.trim()});save();closeModal();eqaManager()">Save</button>');}
function printEQAReport(){openModal('EQA Report',`<div id="eqaPrint"><h2>EQA / PT Report</h2><table><tr><th>Provider</th><th>Cycle</th><th>Test</th><th>Expected</th><th>Result</th><th>Status</th></tr>${(db.eqa||[]).map(q=>`<tr><td>${esc(q.provider)}</td><td>${esc(q.cycle)}</td><td>${esc(q.test)}</td><td>${esc(q.expected)}</td><td>${esc(q.result)}</td><td>${esc(q.status)}</td></tr>`).join('')}</table></div>`, '<button class="btn green" onclick="window.print()">Print</button><button class="btn outline" onclick="closeModal()">Close</button>');}

/* Protocol / SOP Library */
const PROTOCOL_TEMPLATES=[
 {name:'Kinetic — general chemistry template',category:'Chemistry',method:'Kinetic',tat:'',principle:'Record the validated kinetic reaction principle used by the laboratory.',steps:['Specimen acceptance','Reagent preparation according to manufacturer IFU','Instrument setup','Run controls','Run patient samples','Review QC and flags','Release result'],references:'Laboratory validated SOP / reagent IFU'},
 {name:'Endpoint — general chemistry template',category:'Chemistry',method:'Endpoint',tat:'',principle:'Record the validated endpoint reaction principle used by the laboratory.',steps:['Specimen acceptance','Reagent preparation according to manufacturer IFU','Instrument setup','Run controls','Run patient samples','Review QC and flags','Release result'],references:'Laboratory validated SOP / reagent IFU'},
 {name:'Two-point — general chemistry template',category:'Chemistry',method:'Two-point',tat:'',principle:'Record the validated two-point reaction principle and calculation used by the laboratory.',steps:['Specimen acceptance','Reagent preparation according to manufacturer IFU','Instrument setup','Run controls','Run patient samples','Review QC and flags','Release result'],references:'Laboratory validated SOP / reagent IFU'},
 {name:'Malaria thick/thin film',category:'Microscopy',method:'Microscopy',tat:'',principle:'Detection and identification of malaria parasites in stained thick and thin blood films.',steps:['Specimen identification','Prepare thick and thin films','Stain according to validated SOP','Microscopic examination','Identify parasite/species/stages','Record and report findings','Quality review'],references:'WHO malaria microscopy SOP series'},
 {name:'Giemsa stain record',category:'Stain',method:'Staining',tat:'',principle:'Record stain lot, working solution preparation, buffer/pH checks, staining run and QC.',steps:['Record reagent/stain lot','Record preparation date','Record buffer/pH verification','Record staining run','Record QC observation','Record storage/expiry'],references:'WHO malaria microscopy SOP series / local validated SOP'},
 {name:'Humanlyzer Primus — analyzer method template',category:'Instrument',method:'Semi-auto chemistry analyzer',tat:'',principle:'Configurable instrument method record. Enter values only from the current reagent IFU and analyzer manual.',steps:['Test number / program ID','Reaction type','Wavelength / wavelengths','Aspirate volume','Reagent/sample volumes','Incubation / reaction timing','Calculation / factor','Calibration','QC limits','Maintenance note'],references:'Humanlyzer Primus operator manual + reagent IFU'}
];
function protocolManager(){openModal('Protocols / SOP Library',`<div class="toolbar"><button class="btn green" onclick="addProtocol()">+ Add Protocol</button><input id="prSearch" class="search" placeholder="Search protocol / test / category"></div><div class="alert">Protocol entries are editable templates. Analyzer settings, reagent volumes, wavelengths and timings must be taken from the current manufacturer IFU/manual and your validated laboratory SOP; the system does not invent instrument-specific parameters.</div><div id="protocolList"></div>`,'<button class="btn outline" onclick="closeModal()">Close</button>');drawProtocols();$('prSearch').oninput=drawProtocols;}
function drawProtocols(){const b=$('protocolList');if(!b)return;const q=String($('prSearch')?.value||'').toLowerCase();const a=(db.protocols||[]).filter(x=>[x.name,x.category,x.method].join(' ').toLowerCase().includes(q));b.innerHTML=`<table><tr><th>Protocol</th><th>Category</th><th>Method</th><th>TAT</th><th>Action</th></tr>${a.map(x=>{const i=db.protocols.indexOf(x);return `<tr><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${esc(x.method)}</td><td>${esc(x.tat||'')}</td><td><button class="btn orange" onclick="editProtocol(${i})">Edit</button><button class="btn blue" onclick="viewProtocol(${i})">View</button><button class="btn red" onclick="db.protocols.splice(${i},1);save();drawProtocols()">×</button></td></tr>`}).join('')||'<tr><td colspan="5" class="empty">No protocols</td></tr>'}</table>`;}
function addProtocol(){const p={name:'',category:'Chemistry',method:'',tat:'',principle:'',steps:[],references:''};__protocolDraft=p;editProtocolForm();}
function editProtocol(i){__protocolDraft=clone(db.protocols[i]);__protocolDraft.__index=i;editProtocolForm();}
function editProtocolForm(){const p=__protocolDraft;openModal(p.__index!==undefined?'Edit Protocol':'Add Protocol',`<div class="formgrid"><div class="field"><label>Protocol Name</label><input id="pnm" value="${esc(p.name)}"></div><div class="field"><label>Category</label><input id="pcat" value="${esc(p.category)}"></div><div class="field"><label>Method / Reaction Type</label><input id="pmethod" value="${esc(p.method)}"></div><div class="field"><label>TAT</label><input id="ptat" value="${esc(p.tat)}"></div><div class="field" style="grid-column:1/-1"><label>Principle</label><textarea id="ppr">${esc(p.principle)}</textarea></div><div class="field" style="grid-column:1/-1"><label>Steps — one per line</label><textarea id="psteps" rows="9">${esc((p.steps||[]).join('\n'))}</textarea></div><div class="field" style="grid-column:1/-1"><label>References / SOP / IFU</label><textarea id="prefs">${esc(p.references||'')}</textarea></div></div>`, '<button class="btn outline" onclick="protocolManager()">Cancel</button><button class="btn green" onclick="saveProtocol()">Save</button>');}
function saveProtocol(){const p={name:$('pnm').value.trim(),category:$('pcat').value.trim(),method:$('pmethod').value.trim(),tat:$('ptat').value.trim(),principle:$('ppr').value.trim(),steps:$('psteps').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),references:$('prefs').value.trim()};if(__protocolDraft.__index!==undefined)db.protocols[__protocolDraft.__index]=p;else db.protocols.unshift(p);save();closeModal();protocolManager();}
function viewProtocol(i){const p=db.protocols[i];openModal(p.name,`<p><b>Category:</b> ${esc(p.category)} &nbsp; <b>Method:</b> ${esc(p.method)} &nbsp; <b>TAT:</b> ${esc(p.tat)}</p><p><b>Principle:</b> ${esc(p.principle)}</p><ol>${(p.steps||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p><b>Reference:</b> ${esc(p.references||'')}</p>`, '<button class="btn outline" onclick="closeModal()">Close</button>');}

/* Dashboard */
function renderDashboard(c){
  const revenue=db.archives.reduce((a,p)=>a+p.tests.reduce((s,t)=>s+(db.tests.find(x=>x.id===t.testId)?.price||0),0),0);
  const todayN=[...db.waiting,...db.archives].filter(p=>p.date===today()).length;
  const cats={};db.tests.forEach(t=>cats[t.category]=(cats[t.category]||0)+1);
  c.innerHTML=`<div class="kpis">
  <div class="kpi">Today<b>${todayN}</b>Patients</div><div class="kpi">Waiting<b>${db.waiting.length}</b>Patients</div>
  <div class="kpi">Archives<b>${db.archives.length}</b>Reports</div><div class="kpi">Tests<b>${db.tests.length}</b>Available</div>
  <div class="kpi">Revenue<b>${money(revenue)}</b></div></div>
  <div class="grid2"><div class="card"><h3>Departments</h3><table><tr><th>Department</th><th>Tests</th></tr>
  ${Object.entries(cats).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</table></div>
  <div class="card"><h3>Offline System</h3><div class="alert">All records are stored locally on this device. Internet is not required for registration, results, archive, QC or backup.</div>
  <p>Patients: ${db.patients.length}</p><p>QC records: ${db.qc.length}</p><p>Database key: ${KEY}</p></div></div>`;
}

/* QC */
function renderQC(c){
  c.innerHTML=`<div class="card"><h3>Quality Control</h3><div class="toolbar"><button class="btn green" onclick="addQC()">+ Add QC</button></div>
  <table><tr><th>Date</th><th>Test</th><th>Level</th><th>Value</th><th>Target</th><th>Status</th><th></th></tr>
  ${db.qc.map((q,i)=>`<tr><td>${esc(q.date)}</td><td>${esc(q.test)}</td><td>${esc(q.level)}</td><td>${esc(q.value)}</td><td>${esc(q.target)}</td>
  <td><span class="badge ${q.status==='Pass'?'normal':'high'}">${esc(q.status)}</span></td>
  <td><button class="btn red" onclick="db.qc.splice(${i},1);save();renderQC($('content'))">×</button></td></tr>`).join('')||
  '<tr><td colspan="7" class="empty">No QC records</td></tr>'}</table></div>`;
}
function addQC(){
  openModal('Add QC',`<div class="formgrid"><div class="field"><label>Test</label><input id="qTest"></div>
  <div class="field"><label>Level</label><select id="qLevel"><option>Level 1</option><option>Level 2</option><option>Level 3</option></select></div>
  <div class="field"><label>Value</label><input id="qValue"></div><div class="field"><label>Target</label><input id="qTarget"></div>
  <div class="field"><label>Status</label><select id="qStatus"><option>Pass</option><option>Fail</option></select></div></div>`,
  '<button class="btn green" onclick="saveQC()">Save</button>');
}
function saveQC(){
  db.qc.unshift({date:today(),test:$('qTest').value,level:$('qLevel').value,value:$('qValue').value,target:$('qTarget').value,status:$('qStatus').value});
  save();closeModal();renderQC($('content'));
}

/* Setup */
function renderSetup(c){
  c.innerHTML=`<div class="setup-grid">
  <div class="setup-card" onclick="testManager()"><div class="big">🧪</div><h3>Test Definition</h3><small>Test name, category, fields, specimen</small></div>
  <div class="setup-card" onclick="referenceManager()"><div class="big">📐</div><h3>Reference & Units</h3><small>Reference, unit, critical limits and display</small></div>
  <div class="setup-card" onclick="packageManager()"><div class="big">🧩</div><h3>Test Packages</h3><small>Bundle multiple tests into one registration</small></div>
  <div class="setup-card" onclick="molecularManager()"><div class="big">🧬</div><h3>Molecular Tests</h3><small>PCR / molecular test master</small></div>
  <div class="setup-card" onclick="priceManager()"><div class="big">💰</div><h3>Test Pricing</h3><small>Prices / billing managed separately</small></div>
  <div class="setup-card" onclick="doctorManager()"><div class="big">👨‍⚕️</div><h3>Doctors</h3><small>Referral doctors and fees</small></div>
  <div class="setup-card" onclick="labSettings()"><div class="big">⚙️</div><h3>Lab / Report Settings</h3><small>Laboratory identity, report mode and signatures</small></div>
  <div class="setup-card" onclick="themeSettings()"><div class="big">🎨</div><h3>Theme Settings</h3><small>Main color, appearance — Left Sidebar fixed</small></div>
  <div class="setup-card" onclick="reportOrderManager()"><div class="big">↕️</div><h3>Report Test Order</h3><small>Choose the exact test sequence in reports</small></div>
  <div class="setup-card" onclick="securitySettings()"><div class="big">🔐</div><h3>Security</h3><small>Username, password, login and auto-lock</small></div>
  <div class="setup-card" onclick="systemHealth()"><div class="big">🩺</div><h3>System Health</h3><small>Check login, storage and offline PWA</small></div>
  <div class="setup-card" onclick="offlineDiagnostics()"><div class="big">📶</div><h3>Offline Diagnostics</h3><small>Check local storage, app mode and offline readiness</small></div>
  <div class="setup-card" onclick="monthlyReport()"><div class="big">📅</div><h3>Monthly PDF</h3><small>Export monthly activity / revenue report</small></div><div class="setup-card" onclick="renderInvoices(document.getElementById(&quot;content&quot;))"><div class="big">🧾</div><h3>Invoice Manager</h3><small>Create generic invoices for tests and items</small></div><div class="setup-card" onclick="auditLog()"><div class="big">🧾</div><h3>Audit Log</h3><small>Track result and system changes</small></div><div class="setup-card" onclick="criticalSettings()"><div class="big">🚨</div><h3>Critical Values</h3><small>Review critical result configuration</small></div>
  <div class="setup-card" onclick="reportLayoutManager()"><div class="big">🖨️</div><h3>Report Layouts</h3><small>Choose report page style, lines, category and spacing</small></div>
  <div class="setup-card" onclick="qcManager()"><div class="big">📈</div><h3>QC Manager</h3><small>IQC, Levey-Jennings, rules and QC reports</small></div>
  <div class="setup-card" onclick="eqaManager()"><div class="big">🎯</div><h3>EQA / PT</h3><small>Enter, review and print external quality assessment results</small></div>
  <div class="setup-card" onclick="prefixManager()"><div class="big">👤</div><h3>Patient Titles</h3><small>U, Daw, Ko, Ma etc.</small></div>
  <div class="setup-card" onclick="quickManager()"><div class="big">⚡</div><h3>Quick Results</h3><small>Configurable result buttons</small></div>
  <div class="setup-card" onclick="backup()"><div class="big">💾</div><h3>Backup</h3><small>Export complete database</small></div>
  <div class="setup-card" onclick="restore()"><div class="big">📥</div><h3>Restore</h3><small>Import database backup</small></div>
  <div class="setup-card" onclick="resetDemo()"><div class="big">♻️</div><h3>Reset</h3><small>Reset local database</small></div>
  </div>`;
}

function offlineDiagnostics(){const storage=(typeof localStorage!=='undefined');const sw=('serviceWorker' in navigator);const mode=location.protocol==='file:'||location.protocol==='content:'?'Local App Container':(navigator.onLine===false?'Offline':'Online');openModal('Offline Diagnostics',`<div class="card"><b>App mode:</b> ${esc(mode)}<br><b>Local database:</b> ${storage?'Available':'Unavailable'}<br><b>Service Worker API:</b> ${sw?'Available':'Not available in this container'}<br><b>Offline PWA cache:</b> ${window.__offlinePWAReady?'Ready':'Not registered / not required for local container'}<br><b>Internet required for core LIMS:</b> No</div><div class="alert">Your patient data and settings are stored locally on this device. Keep regular Backup exports because clearing browser/app storage can remove local data.</div>`,`<button class="btn outline" onclick="closeModal()">Close</button>`);}

/* Test manager */
function testManager(){
  openModal('Test Management',
    '<div class="toolbar"><button class="btn green" onclick="testForm()">+ Add Test</button><input id="tm" class="search" placeholder="Search test"></div><div id="testList"></div>',
    '<button class="btn outline" onclick="closeModal()">Close</button>');
  drawTests();$('tm').oninput=drawTests;
}
function drawTests(){
  const s=String($('tm')?.value||'').toLowerCase();
  const rows=db.tests.filter(t=>String(t.name||'').toLowerCase().includes(s)||String(t.category||'').toLowerCase().includes(s));
  let h='<table><tr><th>Test</th><th>Category</th><th>Type</th><th>Unit</th><th>Range</th><th>Price</th><th>Action</th></tr>';
  rows.forEach(t=>{const i=db.tests.indexOf(t);h+=`<tr><td>${esc(t.name)}</td><td>${esc(t.category)}</td><td>${esc(t.type)}</td><td>${esc(t.unit)}</td><td>${esc(t.range)}</td><td>${money(t.price)}</td>
  <td><button class="btn orange" onclick="testForm(${i})">Edit</button> <button class="btn red" onclick="delTest(${i})">×</button></td></tr>`});
  h+='</table>';if(!rows.length)h='<div class="empty">No tests found</div>';$('testList').innerHTML=h;
}
function testForm(i){
  const fresh=i===undefined;
  const t=fresh?{name:'',category:'Chemistry',type:'numeric',unit:'',range:'',refMode:'custom',showReference:true,criticalLow:'',criticalHigh:'',tube:'Yellow',sample:'0.5',price:0,tat:'1 hour',fields:[]}:db.tests[i];
  const types=['numeric','qualitative','text','panel','urine','stool','fluid'];
  const opts=types.map(x=>`<option value="${x}" ${t.type===x?'selected':''}>${x}</option>`).join('');
  const fields=clone(t.fields||[]);
  openModal(fresh?'Add Test':'Edit Test',`<div class="formgrid">
  <div class="field"><label>Name *</label><input id="tn" value="${esc(t.name)}"></div>
  <div class="field"><label>Category</label><input id="tc" value="${esc(t.category)}"></div>
  <div class="field"><label>Result Type</label><select id="tt">${opts}</select></div>
  <div class="field"><label>Default Unit</label><input id="tu" value="${esc(t.unit)}"></div>
  <div class="field" style="grid-column:1/-1"><label>Default Reference Range / Text</label><textarea id="tr" class="reference-scroll" rows="4" placeholder="e.g. 70–110, &lt;5, Negative">${esc(t.range)}</textarea></div>
  <div class="field"><label>Reference Display</label><select id="tref"><option value="custom">Show configured reference</option><option value="blank">Blank reference</option></select></div>
  <div class="field"><label>Show Reference</label><select id="tsref"><option value="1">Show</option><option value="0">Hide</option></select></div>
  <div class="field"><label>Critical Low</label><input id="tcl" type="number" value="${esc(t.criticalLow||'')}"></div>
  <div class="field"><label>Critical High</label><input id="tch" type="number" value="${esc(t.criticalHigh||'')}"></div>
  <div class="field"><label>Price</label><input id="tp" type="number" value="${Number(t.price)||0}"></div>
  <div class="field"><label>Tube / Container</label><input id="tube" value="${esc(t.tube)}"></div>
  <div class="field"><label>Sample Volume</label><input id="sam" value="${esc(t.sample)}"></div>
  <div class="field"><label>TAT</label><input id="tat" value="${esc(t.tat)}"></div>
  <div class="field" style="grid-column:1/-1"><label>Test Remark / Additional Remark</label><textarea id="tremark" rows="2" placeholder="Optional remark template for this test">${esc(t.remarkTemplate||"")}</textarea></div>
  <div class="field" style="grid-column:1/-1"><label>Interpretation of Result / Comment</label><textarea id="tinterpret" rows="4" placeholder="Optional interpretation. It will appear in the report comment area when this test has a result.">${esc(t.interpretation||"")}</textarea></div></div>
  <div class="section-title">Result Fields — each parameter has its own Unit / Reference</div>
  <div class="toolbar"><button class="btn blue" onclick="addResultFieldRow()">+ Add Result Field</button><button class="btn gray" onclick="clearResultFieldRows()">Clear fields</button></div>
  <div class="small" style="margin-bottom:5px">Example LFT: Serum Bilirubin | mg/dL | 0.2–1.2, ALP | U/L | 40–130, GPT/ALT | U/L | 0–40, GOT/AST | U/L | 0–40. Add GGT only when needed.</div>
  <div id="fieldBuilder"></div>
  <div class="alert" style="margin-top:8px">You can add, edit, remove and reorder every result field independently. Each row stores its own reference and unit. Qualitative tests may keep the reference blank.</div>`,
  `<button class="btn outline" onclick="testManager()">Cancel</button><button class="btn green" onclick="saveTest(${fresh?'null':i})">Save Test</button>`);
  $('tref').value=t.refMode||((t.type==='qualitative')?'blank':'custom');
  $('tsref').value=t.showReference===false?'0':'1';
  window.__fieldDraft=fields;
  drawFieldBuilder();
}
function drawFieldBuilder(){
  const box=$('fieldBuilder'); if(!box)return;
  const rows=window.__fieldDraft||[];
  box.innerHTML=`<div class="result-field-row" style="background:var(--p2);color:#fff;font-weight:900"><span>#</span><span>Parameter</span><span>Type</span><span>Unit</span><span>Reference</span><span>Ref</span><span>Action</span></div>`+
    (rows.map((f,i)=>`<div class="result-field-row" data-i="${i}">
      <span class="field-order">${i+1}</span><input class="fn" value="${esc(f.n||'')}" placeholder="Parameter name">
      <select class="ft"><option value="numeric" ${f.type==='numeric'?'selected':''}>Numeric</option><option value="qualitative" ${f.type==='qualitative'?'selected':''}>Qualitative</option><option value="text" ${f.type==='text'?'selected':''}>Text</option></select>
      <input class="fu" value="${esc(f.unit||'')}" placeholder="Unit">
      <textarea class="fr reference-scroll" rows="1" placeholder="Reference">${esc(f.ref||'')}</textarea>
      <input class="fs" type="checkbox" ${f.showReference!==false?'checked':''} title="Show reference">
      <span style="display:flex;gap:2px"><button class="order-btn" onclick="moveResultField(${i},-1)">↑</button><button class="order-btn" onclick="moveResultField(${i},1)">↓</button><button class="order-btn" onclick="removeResultField(${i})">×</button></span>
    </div>`).join('')||'<div class="empty">No result fields. Add one for panel / urine / LFT-style tests.</div>');
}
function syncFieldDraft(){
  const box=$('fieldBuilder'); if(!box)return;
  [...box.querySelectorAll('.result-field-row[data-i]')].forEach((r,i)=>{const f=window.__fieldDraft[i]||{};f.n=r.querySelector('.fn')?.value.trim()||'';f.type=r.querySelector('.ft')?.value||'text';f.unit=r.querySelector('.fu')?.value.trim()||'';f.ref=r.querySelector('.fr')?.value.trim()||'';f.showReference=!!r.querySelector('.fs')?.checked;window.__fieldDraft[i]=f;});
}
function addResultFieldRow(){syncFieldDraft();window.__fieldDraft.push({n:'',unit:'',ref:'',v:'',type:'text',showReference:true});drawFieldBuilder();}
function removeResultField(i){syncFieldDraft();window.__fieldDraft.splice(i,1);drawFieldBuilder();}
function moveResultField(i,d){syncFieldDraft();const j=i+d;if(j<0||j>=window.__fieldDraft.length)return;[window.__fieldDraft[i],window.__fieldDraft[j]]=[window.__fieldDraft[j],window.__fieldDraft[i]];drawFieldBuilder();}
function clearResultFieldRows(){if(confirm('Clear all result fields?')){window.__fieldDraft=[];drawFieldBuilder();}}
function addPresetFieldRows(){syncFieldDraft();const preset=[['Serum Bilirubin','numeric','mg/dL','0.2–1.2'],['Alkaline Phosphatase','numeric','U/L','40–130'],['GPT / ALT','numeric','U/L','0–40'],['GOT / AST','numeric','U/L','0–40']];preset.forEach(x=>{if(!window.__fieldDraft.some(f=>String(f.n).toLowerCase()===x[0].toLowerCase()))window.__fieldDraft.push({n:x[0],type:x[1],unit:x[2],ref:x[3],v:'',showReference:true})});drawFieldBuilder();}
function saveTest(i){
  syncFieldDraft();
  const fields=(window.__fieldDraft||[]).filter(f=>f.n.trim()).map(f=>({...f,v:f.v??''}));
  const name=$('tn').value.trim();if(!name)return alert('Test name is required.');
  const o={id:i===null?Date.now():db.tests[i].id,name,category:$('tc').value.trim()||'General',type:$('tt').value,unit:$('tu').value.trim(),range:$('tr').value.trim(),
    refMode:$('tref').value,showReference:$('tsref').value==='1',criticalLow:$('tcl').value.trim(),criticalHigh:$('tch').value.trim(),tube:$('tube').value.trim(),sample:$('sam').value.trim(),price:Number($('tp').value)||0,tat:$('tat').value.trim()||'1 hour',remarkTemplate:$('tremark').value.trim(),interpretation:$('tinterpret')?.value.trim()||'',fields};
  if(i===null)db.tests.push(o);else db.tests[i]={...db.tests[i],...o};
  save();window.__fieldDraft=[];testManager();
}
function delTest(i){if(confirm('Delete "'+db.tests[i].name+'"?')){db.tests.splice(i,1);save();testManager()}}

function referenceManager(){openModal('Reference & Units Management','<div class="toolbar"><input id="rfm" class="search" placeholder="Search test"></div><div id="rfl"></div>','<button class="btn outline" onclick="closeModal()">Close</button>');drawReferenceList();$('rfm').oninput=drawReferenceList;}
function drawReferenceList(){const q=String($('rfm')?.value||'').toLowerCase();const rows=db.tests.filter(t=>(t.name+' '+t.category).toLowerCase().includes(q));$('rfl').innerHTML='<table><tr><th>Test</th><th>Unit</th><th>Reference</th><th>Show</th><th></th></tr>'+rows.map(t=>`<tr><td>${esc(t.name)}</td><td><input id="ru_${t.id}" value="${esc(t.unit||'')}"></td><td><input id="rr_${t.id}" value="${esc(t.range||'')}"></td><td><select id="rs_${t.id}"><option value="1" ${t.showReference!==false?'selected':''}>Show</option><option value="0" ${t.showReference===false?'selected':''}>Hide</option></select></td><td><button class="btn green" onclick="saveReference(${db.tests.indexOf(t)})">Save</button></td></tr>`).join('')+'</table>';}
function saveReference(i){const t=db.tests[i];t.unit=$('ru_'+t.id).value.trim();t.range=$('rr_'+t.id).value.trim();t.showReference=$('rs_'+t.id).value==='1';save();drawReferenceList();}
function packageManager(){openModal('Test Packages','<div class="toolbar"><button class="btn green" onclick="packageForm()">+ Add Package</button></div><div id="pkgList"></div>','<button class="btn outline" onclick="closeModal()">Close</button>');drawPackages();}
function drawPackages(){$('pkgList').innerHTML='<table><tr><th>Package</th><th>Tests in saved order</th><th>Price</th><th></th></tr>'+db.packages.map((p,i)=>`<tr><td>${esc(p.name)}</td><td>${p.tests.map(id=>db.tests.find(t=>String(t.id)===String(id))?.name).filter(Boolean).map(esc).join(' → ')}</td><td>${money(p.price||p.tests.reduce((a,id)=>a+(Number(db.tests.find(t=>String(t.id)===String(id))?.price)||0),0))}</td><td><button class="btn orange" onclick="packageForm(${i})">Edit</button> <button class="btn red" onclick="db.packages.splice(${i},1);save();drawPackages()">×</button></td></tr>`).join('')+'</table>';}
function packageForm(i){
  const p=i===undefined?{name:'',price:0,tests:[]}:db.packages[i];window.__pkgDraft=clone(p.tests||[]);
  openModal(i===undefined?'Add Package':'Edit Package',`<div class="formgrid"><div class="field"><label>Package Name</label><input id="pkn" value="${esc(p.name)}"></div><div class="field"><label>Package Price (0 = sum of tests)</label><input id="pkp" type="number" value="${Number(p.price)||0}"></div></div>
  <div class="section-title">Package Test Order</div>
  <div class="toolbar"><select id="pkgAddTest" class="search">${testOptions()}</select><button class="btn blue" onclick="addPackageTest()">+ Add Test</button><button class="btn gray" onclick="clearPackageDraft()">Clear order</button></div>
  <div class="small">The order below is the exact order used during registration and report output. Add tests one by one; then use ↑ / ↓.</div><div id="pkgOrder" class="pkg-order"></div>`,
  `<button class="btn outline" onclick="packageManager()">Cancel</button><button class="btn green" onclick="savePackage(${i===undefined?'null':i})">Save Package</button>`);drawPackageDraft();}
function drawPackageDraft(){const box=$('pkgOrder');if(!box)return;const ids=window.__pkgDraft||[];box.innerHTML=ids.map((id,i)=>{const t=db.tests.find(x=>String(x.id)===String(id));return t?`<div class="pkg-item"><span class="field-order">${i+1}</span><span class="name">${esc(t.name)}</span><button class="order-btn" onclick="movePackageTest(${i},-1)">↑</button><button class="order-btn" onclick="movePackageTest(${i},1)">↓</button><button class="order-btn" onclick="removePackageTest(${i})">×</button></div>`:''}).join('')||'<div class="empty">No tests in this package yet.</div>';}
function addPackageTest(){const id=$('pkgAddTest')?.value;if(!id)return alert('Select a test first.');window.__pkgDraft=window.__pkgDraft||[];if(!window.__pkgDraft.some(x=>String(x)===String(id)))window.__pkgDraft.push(id);drawPackageDraft();$('pkgAddTest').value='';}
function removePackageTest(i){window.__pkgDraft.splice(i,1);drawPackageDraft();}
function movePackageTest(i,d){const j=i+d;if(j<0||j>=window.__pkgDraft.length)return;[window.__pkgDraft[i],window.__pkgDraft[j]]=[window.__pkgDraft[j],window.__pkgDraft[i]];drawPackageDraft();}
function clearPackageDraft(){if(confirm('Clear package test order?')){window.__pkgDraft=[];drawPackageDraft();}}
function savePackage(i){const ids=(window.__pkgDraft||[]).slice();const obj={id:i===null?'PKG'+Date.now():db.packages[i].id,name:$('pkn').value.trim(),price:Number($('pkp').value)||0,tests:ids};if(!obj.name)return alert('Package name is required.');if(!ids.length)return alert('Add at least one test to the package.');if(i===null)db.packages.push(obj);else db.packages[i]=obj;save();window.__pkgDraft=[];packageManager();}
function reportOrderManager(){
  const known=db.settings.report.testOrder||[];
  const ids=[...known.filter(id=>db.tests.some(t=>String(t.id)===String(id))),...db.tests.map(t=>t.id).filter(id=>!known.some(x=>String(x)===String(id)))];
  window.__reportOrderDraft=ids;
  openModal('Report Test Order',`<div class="alert">Choose which test appears first, second, third, etc. This order is used for report output whenever those tests are present.</div><div class="toolbar"><button class="btn gray" onclick="resetReportOrder()">Reset to Test Definition order</button></div><div id="reportOrderList" class="report-order-list"></div>`, '<button class="btn outline" onclick="closeModal()">Cancel</button><button class="btn green" onclick="saveReportOrder()">Save Order</button>');drawReportOrder();
}
function drawReportOrder(){const b=$('reportOrderList');if(!b)return;b.innerHTML=(window.__reportOrderDraft||[]).map((id,i)=>{const t=db.tests.find(x=>String(x.id)===String(id));return t?`<div class="report-order-item"><span class="field-order">${i+1}</span><span class="name">${esc(t.name)}</span><button class="order-btn" onclick="moveReportOrder(${i},-1)">↑</button><button class="order-btn" onclick="moveReportOrder(${i},1)">↓</button></div>`:''}).join('');}
function moveReportOrder(i,d){const a=window.__reportOrderDraft,j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];drawReportOrder();}
function resetReportOrder(){window.__reportOrderDraft=db.tests.map(t=>t.id);drawReportOrder();}
function saveReportOrder(){db.settings.report.testOrder=(window.__reportOrderDraft||[]).slice();save();closeModal();alert('Report test order saved.');}

function molecularManager(){const rows=db.tests.filter(t=>t.category==='Molecular');openModal('Molecular / PCR Tests','<div class="toolbar"><button class="btn green" onclick="testForm()">+ Add Molecular Test</button></div><table><tr><th>Test</th><th>Type</th><th>Unit</th><th>Reference</th></tr>'+rows.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.type)}</td><td>${esc(t.unit||'')}</td><td>${esc(t.range||'')}</td></tr>`).join('')+'</table>','<button class="btn outline" onclick="closeModal()">Close</button>');}
function priceManager(){
  openModal('Test Pricing — Separate Module',
    '<div class="toolbar"><input id="pm" class="search" placeholder="Search test"><button class="btn green" onclick="saveAllPrices()">Save Prices</button></div><div id="priceList"></div>',
    '<button class="btn outline" onclick="closeModal()">Close</button>');
  drawPrices();$('pm').oninput=drawPrices;
}
function drawPrices(){
  const s=String($('pm')?.value||'').toLowerCase();
  const rows=db.tests.filter(t=>(t.name+' '+t.category).toLowerCase().includes(s));
  $('priceList').innerHTML='<table><tr><th>Test</th><th>Category</th><th>Current Price</th><th>New Price</th></tr>'+
    rows.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.category)}</td><td>${money(t.price)}</td>
    <td><input id="price_${t.id}" type="number" min="0" value="${Number(t.price)||0}"></td></tr>`).join('')+'</table>';
}
function saveAllPrices(){
  db.tests.forEach(t=>{const e=$('price_'+t.id);if(e)t.price=Number(e.value)||0});
  save();alert('Test prices updated.');priceManager();
}

function securitySettings(){
  const a=db.settings.auth;
  openModal('Security Settings',`<div class="formgrid">
    <div class="field"><label>Username</label><input id="su" value="${esc(a.username)}"></div>
    <div class="field"><label>Password</label><input id="sp" type="password" value="${esc(a.password)}"></div>
    <div class="field"><label>Enable Login</label><select id="sen"><option value="1">Yes</option><option value="0">No</option></select></div>
    <div class="field"><label>Auto-lock minutes (0 = off)</label><input id="sal" type="number" min="0" value="${Number(db.settings.app.autoLockMinutes)||0}"></div>
  </div>`,
  '<button class="btn green" onclick="saveSecurity()">Save</button>');
  $('sen').value=a.enabled?'1':'0';
}
function saveSecurity(){
  const u=$('su').value.trim()||'adm',p=$('sp').value||'adm';
  db.settings.auth={username:u,password:p,enabled:$('sen').value==='1'};
  db.settings.app.autoLockMinutes=Math.max(0,Number($('sal').value)||0);
  save();closeModal();alert('Security settings saved.');
}
function toggleLoginPassword(){
  const e=$('loginPass'); if(e)e.type=$('showLoginPass')?.checked?'text':'password';
}
function toggleLoginPassword(){const e=$('loginPass');if(e)e.type=$('showLoginPass')?.checked?'text':'password';}
function doLogin(){if(!storageReady){alert('Local database is still loading. Please wait a moment and try again.');return;} normalize();const a=db.settings.auth||{};const u=String($('loginUser')?.value||'').trim();const p=String($('loginPass')?.value||'');const au=String(a.username||'adm').trim();const ap=String(a.password??'adm');if(!a.enabled||(u===au&&p===ap)){sessionSet('lims_logged_in','1');$('loginScreen').style.display='none';$('userTop').textContent=(au||'adm')+' 👤';audit('Login');save();startAutoLock();nav('registration');}else{$('loginPass').select();alert('Invalid username or password. First setup is adm / adm.');}}
function logout(){audit('Logout');save();sessionRemove('lims_logged_in');$('loginPass').value='';$('loginScreen').style.display='flex';}
let autoLockTimer=null;
function startAutoLock(){
  clearTimeout(autoLockTimer);
  const mins=Number(db.settings.app.autoLockMinutes)||0;
  if(mins>0)autoLockTimer=setTimeout(logout,mins*60000);
}
['click','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(sessionGet('lims_logged_in'))startAutoLock()},{passive:true}));

function systemHealth(){
  let storage='OK',bytes=0;
  try{const raw=storageGetSync(KEY)||'';bytes=raw.length;if(!raw && storageBackend==='IndexedDB')storage='IndexedDB';else if(!raw)storage='EMPTY';}catch(e){storage='ERROR'}
  const a=db.settings.auth||{};
  openModal('System Health',`<table><tr><th>Check</th><th>Status</th></tr>
    <tr><td>Login</td><td>${a.username&&a.password?'OK':'Repair needed'}</td></tr>
    <tr><td>Credentials</td><td>${a.username==='adm'&&a.password==='adm'?'adm / adm':'Custom credentials'}</td></tr>
    <tr><td>Local storage</td><td>${storage} (${Math.round(bytes/1024)} KB)</td></tr>
    <tr><td>Patients</td><td>${db.patients.length}</td></tr>
    <tr><td>Waiting</td><td>${db.waiting.length}</td></tr>
    <tr><td>Archives</td><td>${db.archives.length}</td></tr>
    <tr><td>Tests</td><td>${db.tests.length}</td></tr>
    <tr><td>PWA</td><td>V12.8 — Full Offline PWA</td></tr><tr><td>Offline cache</td><td id="swHealth">Checking…</td></tr></table>`, '<button class="btn outline" onclick="closeModal()">Close</button>');
}
function monthlyReport(){
  openModal('Monthly PDF Report',`<div class="formgrid">
    <div class="field"><label>Year</label><input id="my" type="number" value="${new Date().getFullYear()}"></div>
    <div class="field"><label>Month</label><select id="mm">${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></div>
  </div><div class="alert">Creates an offline A4 report containing patient count, test count, revenue and test-wise activity.</div>`,
  '<button class="btn green" onclick="generateMonthlyReport()">Generate PDF</button>');
  $('mm').value=new Date().getMonth()+1;
}
function generateMonthlyReport(){
  const y=Number($('my').value),m=Number($('mm').value);
  const pad=n=>String(n).padStart(2,'0'),prefix=`${y}-${pad(m)}`;
  const rows=db.archives.filter(p=>String(p.date).startsWith(prefix));
  const testCounts={};let revenue=0;
  rows.forEach(p=>p.tests.forEach(t=>{testCounts[t.name]=(testCounts[t.name]||0)+1;revenue+=Number(db.tests.find(x=>x.id===t.testId)?.price||0)}));
  const h=`<div class="report" id="monthlyReport"><div class="report-title"><h2>${esc(db.settings.labName)}</h2>
    <div>${esc(db.settings.address)} | ${esc(db.settings.phone)}</div><h3>MONTHLY LABORATORY ACTIVITY REPORT — ${prefix}</h3></div>
    <div class="kpis"><div class="kpi">Patients<b>${rows.length}</b></div><div class="kpi">Tests<b>${rows.reduce((a,p)=>a+p.tests.length,0)}</b></div><div class="kpi">Revenue<b>${money(revenue)}</b></div></div>
    <table><thead><tr><th>Test</th><th>Count</th><th>Revenue</th></tr></thead><tbody>
    ${Object.entries(testCounts).map(([n,c])=>{const t=db.tests.find(x=>x.name===n);return `<tr><td>${esc(n)}</td><td>${c}</td><td>${money(c*(t?.price||0))}</td></tr>`}).join('')||'<tr><td colspan="3" class="empty">No archived activity for this month.</td></tr>'}
    </tbody></table><div class="report-footer">${esc(db.settings.report.footer)}</div></div>`;
  openModal('Monthly Report',h,'<button class="btn green" onclick="printMonthly()">Print / Save PDF</button><button class="btn outline" onclick="closeModal()">Close</button>');
}
function printMonthly(){
  const old=document.title;document.title='Monthly_LIMS_Report_'+Date.now();setTimeout(()=>{window.print();setTimeout(()=>document.title=old,500)},100);
}


function auditLog(){
  const rows=(db.audit||[]).slice().reverse().slice(0,200);
  openModal('Audit Log',`<div class="toolbar"><button class="btn red" onclick="db.audit=[];save();auditLog()">Clear Log</button></div>
  <table><tr><th>Date/Time</th><th>Action</th><th>Lab ID</th><th>User</th></tr>
  ${rows.map(a=>`<tr><td>${esc(a.time)}</td><td>${esc(a.action)}</td><td>${esc(a.labId||'')}</td><td>${esc(a.user||db.settings.auth.username)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No audit entries</td></tr>'}</table>`,
  '<button class="btn outline" onclick="closeModal()">Close</button>');
}
function audit(action,labId=''){
  db.audit=db.audit||[];db.audit.push({time:new Date().toLocaleString(),action,labId,user:db.settings.auth.username||'adm'});
  if(db.audit.length>500)db.audit.shift();
}
function criticalSettings(){
  const rows=db.tests.filter(t=>t.criticalLow!==''||t.criticalHigh!=='');
  openModal('Critical Value Configuration',`<div class="alert">Critical values are configuration thresholds only. Confirm your laboratory's validated limits before use.</div>
  <table><tr><th>Test</th><th>Critical Low</th><th>Critical High</th></tr>
  ${rows.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.criticalLow||'—')}</td><td>${esc(t.criticalHigh||'—')}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">No critical thresholds configured.</td></tr>'}</table>`,
  '<button class="btn outline" onclick="closeModal()">Close</button>');
}

/* Doctors */
function doctorManager(){
  openModal('Doctors',`<div class="toolbar"><button class="btn green" onclick="addDoctor()">+ Add Doctor</button></div>
  <table><tr><th>Name</th><th>Contact</th><th>Fee</th><th></th></tr>
  ${db.doctors.map((d,i)=>`<tr><td>${esc(d.name)}</td><td>${esc(d.contact)}</td><td>${money(d.fee)}</td>
  <td><button class="btn red" onclick="db.doctors.splice(${i},1);save();doctorManager()">×</button></td></tr>`).join('')}</table>`);
}
function addDoctor(){
  openModal('Add Doctor',`<div class="formgrid"><div class="field"><label>Name</label><input id="dn"></div>
  <div class="field"><label>Contact</label><input id="dc"></div><div class="field"><label>Fee</label><input id="df" type="number"></div></div>`,
  '<button class="btn green" onclick="db.doctors.push({id:Date.now(),name:dn.value,contact:dc.value,fee:+df.value||0});save();doctorManager()">Save</button>');
}

/* Prefixes */
function prefixManager(){
  openModal('Patient Titles',`<div class="toolbar"><button class="btn green" onclick="addPrefix()">+ Add Title</button></div>
  <table><tr><th>Title</th><th>Gender</th><th></th></tr>${db.prefixes.map((p,i)=>`<tr><td>${esc(p.title)}</td><td>${esc(p.gender)}</td>
  <td><button class="btn red" onclick="db.prefixes.splice(${i},1);save();prefixManager()">×</button></td></tr>`).join('')}</table>`);
}
function addPrefix(){
  openModal('Add Patient Title',`<div class="formgrid"><div class="field"><label>Title</label><input id="pn"></div>
  <div class="field"><label>Gender</label><select id="pg"><option>Male</option><option>Female</option><option>Other</option></select></div></div>`,
  '<button class="btn green" onclick="db.prefixes.push({id:Date.now(),title:pn.value.trim(),gender:pg.value});save();prefixManager()">Save</button>');
}

/* Quick results */
function quickManager(){
  openModal('Quick Results',`<div class="field"><label>One result per line</label><textarea id="qt" rows="12">${esc(db.settings.quick.join('\n'))}</textarea></div>`,
  '<button class="btn green" onclick="db.settings.quick=qt.value.split(/\\r?\\n|,/).map(x=>x.trim()).filter(Boolean);save();closeModal()">Save</button>');
}

/* Dedicated Theme Settings */
const THEME_PRESETS={
  Ocean:{primary:'#0b8ecf',secondary:'#28b6ef',dark:'#12304a',background:'#eaf6fb',navButton:'#a9e4fa'},
  Midnight:{primary:'#6d5dfc',secondary:'#241b4b',dark:'#17122f',background:'#f3f1ff',navButton:'#ddd8ff'},
  Slate:{primary:'#475569',secondary:'#64748b',dark:'#1e293b',background:'#f1f5f9',navButton:'#dbe4ee'},
  Graphite:{primary:'#334155',secondary:'#0f172a',dark:'#020617',background:'#e5e7eb',navButton:'#cbd5e1'},
  Aurora:{primary:'#0f766e',secondary:'#0891b2',dark:'#083344',background:'#ecfeff',navButton:'#a5f3fc'},
  Cyber:{primary:'#7c3aed',secondary:'#0f172a',dark:'#09090b',background:'#f5f3ff',navButton:'#ddd6fe'},
  Forest:{primary:'#166534',secondary:'#15803d',dark:'#052e16',background:'#f0fdf4',navButton:'#bbf7d0'},
  Rose:{primary:'#c44569',secondary:'#e86a92',dark:'#4b1f2d',background:'#fff2f6',navButton:'#ffd7e4'},
  Violet:{primary:'#7c3aed',secondary:'#a855f7',dark:'#2e1065',background:'#f6f0ff',navButton:'#e9d5ff'},
  Sand:{primary:'#a16207',secondary:'#d97706',dark:'#451a03',background:'#fffbeb',navButton:'#fde68a'},
  Arctic:{primary:'#0369a1',secondary:'#38bdf8',dark:'#082f49',background:'#f0f9ff',navButton:'#bae6fd'}
};
function themeSettings(){
  const tc=db.settings.themeConfig||THEME_PRESETS.Ocean; const current=tc.preset||'Custom';
  openModal('Theme Settings',`<div class="alert"><b>Navigation:</b> Left Sidebar is fixed for LIMS. Navigation position is not configurable in this version to keep the interface stable on Android, desktop and installed PWA mode.</div>
  <div class="section-title">Theme Presets</div><div class="theme-swatches">${Object.entries(THEME_PRESETS).map(([n,v])=>`<div class="theme-swatch ${current===n?'active':''}" onclick="applyThemePreset('${n}')"><div class="theme-dot" style="background:linear-gradient(135deg,${v.primary},${v.secondary})"></div><b>${n}</b><div class="small">${v.primary}</div></div>`).join('')}</div>
  <div class="section-title">Custom Colors</div><div class="formgrid">
  <div class="field"><label>Main / Primary Color</label><input id="thPrimary" type="color" value="${tc.primary||'#0b8ecf'}"></div>
  <div class="field"><label>Secondary / Top Bar Color</label><input id="thSecondary" type="color" value="${tc.secondary||'#28b6ef'}"></div>
  <div class="field"><label>Dark / KPI Color</label><input id="thDark" type="color" value="${tc.dark||'#12304a'}"></div>
  <div class="field"><label>App Background</label><input id="thBg" type="color" value="${tc.background||'#eaf6fb'}"></div>
  <div class="field"><label>Navigation Button Color</label><input id="thNav" type="color" value="${tc.navButton||'#a9e4fa'}"></div>
  </div>
  <div class="theme-preview"><div id="thPrevHead" class="theme-preview-head">LIMS — Preview</div><div id="thPrevBody" class="theme-preview-body"><div id="thPrevNav" class="theme-preview-nav"></div><button class="btn blue">Primary Button</button> <button class="btn outline">Outline</button></div></div>`,
  '<button class="btn gray" onclick="resetThemePreset()">Reset Ocean</button><button class="btn outline" onclick="closeModal()">Cancel</button><button class="btn green" onclick="saveThemeSettings()">Save Theme</button>');
  ['thPrimary','thSecondary','thDark','thBg','thNav'].forEach(id=>$(id).oninput=previewTheme);
  previewTheme();
}
function previewTheme(){
  const p=$('thPrimary')?.value||'#0b8ecf',s=$('thSecondary')?.value||'#28b6ef',d=$('thDark')?.value||'#12304a',bg=$('thBg')?.value||'#eaf6fb',n=$('thNav')?.value||'#a9e4fa';
  if($('thPrevHead'))$('thPrevHead').style.background=s; if($('thPrevBody'))$('thPrevBody').style.background=bg; if($('thPrevNav'))$('thPrevNav').style.background=n;
  document.querySelectorAll('#modal .btn.blue').forEach(x=>x.style.background=p);
}
function applyThemePreset(name){const v=THEME_PRESETS[name];if(!v)return;Object.entries(v).forEach(([k,val])=>{const map={primary:'thPrimary',secondary:'thSecondary',dark:'thDark',background:'thBg',navButton:'thNav'};if($(map[k]))$(map[k]).value=val});previewTheme();}
function resetThemePreset(){applyThemePreset('Ocean');}
function saveThemeSettings(){
  db.settings.themeConfig={preset:'Custom',primary:$('thPrimary').value,secondary:$('thSecondary').value,dark:$('thDark').value,background:$('thBg').value,navButton:$('thNav').value};
  db.settings.theme=db.settings.themeConfig.primary;
  db.settings.app.navLayout='sidebar';
  save(); closeModal(); renderSetup($('content')); alert('Theme saved. Left Sidebar navigation remains fixed and the new theme is active offline.');
}

/* Lab settings */
function labSettings(){
  const rp=db.settings.report;
  openModal('Laboratory / Report & Display Settings',`<div class="formgrid">
  <div class="field"><label>Laboratory Name</label><input id="ln" value="${esc(db.settings.labName)}"></div>
  <div class="field"><label>Phone</label><input id="lp" value="${esc(db.settings.phone)}"></div>
  <div class="field"><label>Address</label><textarea id="la">${esc(db.settings.address)}</textarea></div>
  <div class="field"><label>Currency</label><input id="lc" value="${esc(db.settings.currency)}"></div>
  <div class="field"><label>Page Size / Orientation</label><select id="ll"><option>A4 Portrait</option><option>A4 Landscape</option></select></div><div class="field"><label>Report Page Style</label><select id="rls"><option value="clean">Clean — no divider lines</option><option value="classic">Classic — light table</option><option value="compact">Compact — result focused</option><option value="detailed">Detailed — category + remarks</option></select></div>
  <div class="field"><label>Performed by</label><input id="rtester" value="${esc(rp.tester||'Laboratory Technician')}"></div>
  <div class="field"><label>Verified by</label><input id="rverifier" value="${esc(rp.verifier||'Laboratory Technician')}"></div>
  <div class="field"><label>Authorized by</label><input id="rdoctor" value="${esc(rp.doctor||'Consultant / Pathologist')}"></div>
  <div class="field"><label>Report Footer</label><input id="rfooter" value="${esc(rp.footer||'Computer generated report')}"></div>
  <div class="field"><label>Show Header</label><select id="rheader"><option value="1">Show</option><option value="0">Hide</option></select></div>
  <div class="field"><label>Show Reference</label><select id="rref"><option value="1">Show</option><option value="0">Hide</option></select><label>Show Unit</label><select id="runit"><option value="1">Show</option><option value="0">Hide</option></select><label>Show Status (High / Low / Normal only)</label><select id="rstatus"><option value="1">Show</option><option value="0">Hide</option></select></div>
  <div class="field"><label>Show Performed by</label><select id="rtest"><option value="1">Show</option><option value="0">Hide</option></select></div>
  <div class="field"><label>Show Verified by</label><select id="rver"><option value="1">Show</option><option value="0">Hide</option></select></div>
  <div class="field"><label>Show Authorized by</label><select id="rdoct"><option value="1">Show</option><option value="0">Hide</option></select></div>
  <div class="field"><label>Show Doctor Info</label><select id="rdinfo"><option value="1">Show</option><option value="0">Hide</option></select></div>
  <div class="field"><label>Show Remark</label><select id="rremark"><option value="1">Show</option><option value="0">Hide</option></select></div>
  <div class="field"><label>Comment Heading</label><input id="rcommentTitle" value="${esc(rp.commentTitle||'Comment')}" placeholder="Comment / Interpretation / Impression"></div>
  <div class="field"><label>Show Footer</label><select id="rfoot"><option value="1">Show</option><option value="0">Hide</option></select></div><div class="field"><label>Show Custom Footer Text</label><select id="rfootTextShow"><option value="1">Show</option><option value="0">Hide</option></select></div><div class="field"><label>Show Category</label><select id="rcat"><option value="0">Hide</option><option value="1">Show</option></select></div><div class="field"><label>Result divider lines</label><select id="rlines"><option value="0">Hide</option><option value="1">Show</option></select></div>
  </div>
  <div class="section-title">Report Header</div><div class="header-choice-grid">${['blank','text','image','both'].map(m=>`<div class="header-choice ${rp.headerMode===m?'active':''}" onclick="selectHeaderMode('${m}')" id="hm_${m}"><b>${m}</b><div class="small">${m==='blank'?'No header':m==='text'?'Text + lab details':m==='image'?'Image only':'Image + text'}</div></div>`).join('')}</div><div class="formgrid" style="margin-top:7px"><div class="field"><label>Header Text</label><input id="rheaderText" value="${esc(rp.headerText||db.settings.labName)}" placeholder="Clinic / company / custom header"></div><div class="field"><label>Header Image</label><input id="rheaderFile" type="file" accept="image/*" onchange="loadHeaderImage(this)"><input id="rheaderImage" type="hidden" value="${esc(rp.headerImage||'')}"></div><div class="field"><label>Header Image Width (px)</label><input id="rheaderW" type="number" min="40" max="1000" value="${Number(rp.headerImageWidth||180)}"></div><div class="field"><label>Header Image Height (px)</label><input id="rheaderH" type="number" min="20" max="300" value="${Number(rp.headerImageHeight||60)}"></div><div class="field"><label>Blank Header Space (px)</label><input id="rheaderBlank" type="number" min="20" max="300" value="${Number(rp.headerBlankSpace||70)}"></div><div class="field" style="grid-column:1/-1"><label>Footer Text</label><input id="rfooterText" value="${esc(rp.footerText||'')}" placeholder="Thanks for choosing us"></div></div>
  <div class="alert" style="margin-top:8px">Header image is resized to the configured width/height while keeping its place in the normal header area. Blank header keeps a reserved blank space so pre-printed A4 stationery can be used. Report modes can hide the header and signatures so only patient data and entered results are printed. Numeric results automatically receive High / Low / Normal flags when a numeric reference range is configured; Entered/Pending are never printed as report status.</div>`,
  '<button class="btn green" onclick="saveLabSettings()">Save</button>');
  $('ll').value=rp.layout||'A4 Portrait';
  $('rheader').value=rp.showHeader!==false?'1':'0';
  $('rref').value=rp.showReference?'1':'0';
  $('rremark').value=rp.showRemark?'1':'0';if($('rcommentTitle'))$('rcommentTitle').value=rp.commentTitle||'Comment';
  $('rtest').value=rp.showTester?'1':'0';
  $('rver').value=rp.showVerifier?'1':'0';
  $('rdoct').value=rp.showDoctor?'1':'0';
  $('rdinfo').value=rp.showDoctorInfo?'1':'0';
  $('rfoot').value=rp.showFooter?'1':'0';if($('runit'))$('runit').value=rp.showUnit!==false?'1':'0';if($('rstatus'))$('rstatus').value=rp.showStatus!==false?'1':'0';$('rfootTextShow').value=rp.showFooterText?'1':'0';$('rcat').value=rp.showCategory?'1':'0';$('rlines').value=rp.showSeparators?'1':'0';$('rls').value=rp.layoutStyle||'clean';selectHeaderMode(rp.headerMode||'text');
}
function selectHeaderMode(mode){db.settings.report.headerMode=mode;document.querySelectorAll('.header-choice').forEach(x=>x.classList.remove('active'));$('hm_'+mode)?.classList.add('active');}
function loadHeaderImage(input){const f=input?.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('rheaderImage').value=r.result;db.settings.report.headerImage=r.result;};r.readAsDataURL(f);}
function saveLabSettings(){
  db.settings.labName=$('ln').value.trim()||'BioTech Laboratory';
  db.settings.phone=$('lp').value;db.settings.address=$('la').value;
  db.settings.currency=$('lc').value;db.settings.report.layout=$('ll').value;
  db.settings.report.tester=$('rtester').value;db.settings.report.verifier=$('rverifier').value;db.settings.report.doctor=$('rdoctor').value;db.settings.report.footer=$('rfooter').value;
  db.settings.report.showHeader=$('rheader').value==='1';db.settings.report.showReference=$('rref').value==='1';db.settings.report.showUnit=$('runit')?.value!=='0';db.settings.report.showStatus=$('rstatus')?.value!=='0';
  db.settings.report.showTester=$('rtest').value==='1';db.settings.report.showVerifier=$('rver').value==='1';db.settings.report.showDoctor=$('rdoct').value==='1';
  db.settings.report.showDoctorInfo=$('rdinfo').value==='1';db.settings.report.showRemark=$('rremark').value==='1';db.settings.report.commentTitle=$('rcommentTitle')?.value.trim()||'Comment';db.settings.report.showFooter=$('rfoot').value==='1';db.settings.report.showCategory=$('rcat').value==='1';db.settings.report.showSeparators=$('rlines').value==='1';db.settings.report.layoutStyle=$('rls').value;db.settings.report.showFooterText=$('rfootTextShow')?.value==='1';db.settings.report.headerText=$('rheaderText')?.value||db.settings.labName;db.settings.report.headerImage=$('rheaderImage')?.value||db.settings.report.headerImage||'';db.settings.report.headerImageWidth=Math.max(40,Math.min(1000,Number($('rheaderW')?.value||180)));db.settings.report.headerImageHeight=Math.max(20,Math.min(300,Number($('rheaderH')?.value||60)));db.settings.report.headerBlankSpace=Math.max(20,Math.min(300,Number($('rheaderBlank')?.value||70)));db.settings.report.footerText=$('rfooterText')?.value||'';
  save();closeModal();renderSetup($('content'));alert('Laboratory and report settings saved.');
}

/* Backup / Restore */

function backup(){
  const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='BioTech_LIMS_Backup_'+today()+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function restore(){
  openModal('Restore Backup',`<div class="alert">Choose a JSON backup previously exported from LIMS.</div>
  <input id="file" type="file" accept=".json,application/json" style="margin-top:9px">`,
  '<button class="btn green" onclick="restoreFile()">Restore</button>');
}
function restoreFile(){
  const f=$('file').files[0];if(!f)return alert('Select backup file.');
  const r=new FileReader();
  r.onload=()=>{
    try{
      const imported=JSON.parse(r.result);
      if(!imported.settings||!Array.isArray(imported.tests))throw new Error('Invalid');
      db=imported;normalize();save();alert('Backup restored successfully.');location.reload();
    }catch(e){alert('Invalid or damaged LIMS backup.')}
  };
  r.readAsText(f);
}
function resetDemo(){
  if(confirm('Reset ALL local LIMS data? This cannot be undone.')){
    storageRemove(KEY);location.reload();
  }
}

/* Boot */
applyTheme();
if(sessionGet('lims_logged_in')==='1'){
  $('loginScreen').style.display='none';$('userTop').textContent=(db.settings.auth.username||'adm')+' 👤';startAutoLock();nav('registration');
}else{
  $('loginScreen').style.display='flex';
  $('loginUser').value='adm'; $('loginPass').value='adm';
  $('loginPass').type='password';
}
async function registerOfflineServiceWorker(){
  if(!('serviceWorker' in navigator))return;
  try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;window.__offlinePWAReady=true;document.documentElement.dataset.offlineReady='1';updateOfflineStatus();console.log('LIMS offline cache ready',reg.scope);}catch(e){console.warn('Offline cache registration unavailable:',e)}
}
if(location.protocol==='http:'||location.protocol==='https:'){window.addEventListener('load',registerOfflineServiceWorker)}

let deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;setTimeout(()=>{if(!sessionGet('install_seen'))$('installBanner').style.display='block'},1500)});
function installApp(){
  if(deferredInstall){deferredInstall.prompt();deferredInstall.userChoice.finally(()=>{deferredInstall=null;hideInstall()});}
  else alert('On Android Chrome: menu (⋮) → Add to Home screen / Install app. This build is PWA-ready and works offline after installation.');
}
function hideInstall(){ $('installBanner').style.display='none';sessionSet('install_seen','1'); }


hydratePersistentStore();
