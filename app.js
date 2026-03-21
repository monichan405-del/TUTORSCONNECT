/* ============================================================
   TutorConnect — app.js  (Supabase Cloud Database Version)
   Owner / Admin : Monisha S

   ⚡ This version uses SUPABASE as the database.
   All data is saved permanently in the cloud.
   Password changes, bookings, registrations — saved forever.
   Works on GitHub Pages, Netlify, anywhere.

   ══ SETUP (one time only) ══════════════════════════════════
   Step 1: Go to supabase.com → sign up free
   Step 2: Click "New project" → give it a name → create
   Step 3: Go to Settings → API
   Step 4: Copy "Project URL" and "anon public" key
   Step 5: Paste them below replacing the placeholder text
   Step 6: Go to SQL Editor → New query → paste the SQL
           from the bottom of this file → click RUN
   ============================================================ */

// ══ PASTE YOUR SUPABASE KEYS HERE ═══════════════════════════
const SUPABASE_URL = 'https://ivpdqxtzeumgrosnjscx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SO11vhc0bmNOayJpJLGovQ_Gl78RIp6';
// ════════════════════════════════════════════════════════════


/* ────────────────────────────────────────────────────────────
   DATABASE LAYER — all reads and writes go through DB object
   ──────────────────────────────────────────────────────────── */
const DB = {
  async q(table, method='GET', body=null, filter='') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`, {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: body ? JSON.stringify(body) : null
    });
    if (!r.ok) { console.error('DB error', await r.text()); return null; }
    const t = await r.text();
    return t ? JSON.parse(t) : [];
  },

  // SETTINGS
  async getSetting(key) {
    const r = await this.q('settings','GET',null,`?key=eq.${key}&select=value`);
    return r&&r[0] ? r[0].value : null;
  },
  async getAllSettings() {
    const rows = await this.q('settings','GET',null,'?select=key,value') || [];
    const out  = {};
    rows.forEach(r => {
      if      (r.value==='1'||r.value==='true')  out[r.key]=true;
      else if (r.value==='0'||r.value==='false') out[r.key]=false;
      else if (!isNaN(r.value)&&r.value!=='')    out[r.key]=Number(r.value);
      else out[r.key]=r.value;
    });
    return out;
  },
  async setSetting(key, value) {
    const ex = await this.q('settings','GET',null,`?key=eq.${key}`);
    if (ex&&ex.length) return this.q('settings','PATCH',{value:String(value)},`?key=eq.${key}`);
    return this.q('settings','POST',{key,value:String(value)});
  },

  // USERS
  async getUsers()       { return this.q('users','GET',null,'?order=id.desc')||[]; },
  async getUserById(id)  { const r=await this.q('users','GET',null,`?id=eq.${id}`); return r&&r[0]?r[0]:null; },
  async getUserByEmail(e){ const r=await this.q('users','GET',null,`?email=eq.${encodeURIComponent(e)}`); return r&&r[0]?r[0]:null; },
  async createUser(d)    { const r=await this.q('users','POST',d); return r&&r[0]?r[0]:null; },
  async updateUser(id,p) { return this.q('users','PATCH',p,`?id=eq.${id}`); },

  // TUTORS
  parseTutor(t) {
    if (!t) return null;
    return { ...t,
      subjects:       typeof t.subjects==='string'       ? JSON.parse(t.subjects)       : (t.subjects||[]),
      studentReviews: typeof t.studentreviews==='string'  ? JSON.parse(t.studentreviews) : (t.studentreviews||[])
    };
  },
  async getTutors(all=false) {
    const f = all?'?order=id.asc':'?active=eq.true&approved=eq.true&order=id.asc';
    const r = await this.q('tutors','GET',null,f)||[];
    return r.map(t=>this.parseTutor(t));
  },
  async getTutorById(id) {
    const r=await this.q('tutors','GET',null,`?id=eq.${id}`);
    return r&&r[0]?this.parseTutor(r[0]):null;
  },
  async createTutor(d) {
    const p={...d, subjects:JSON.stringify(Array.isArray(d.subjects)?d.subjects:[d.subjects||'General']), studentreviews:JSON.stringify(d.studentReviews||[])};
    delete p.studentReviews;
    const r=await this.q('tutors','POST',p); return r&&r[0]?r[0]:null;
  },
  async updateTutor(id,p) {
    const payload={...p};
    if (p.subjects)       payload.subjects=JSON.stringify(Array.isArray(p.subjects)?p.subjects:[p.subjects]);
    if (p.studentReviews) { payload.studentreviews=JSON.stringify(p.studentReviews); delete payload.studentReviews; }
    if (typeof p.active==='boolean')   payload.active=p.active;
    if (typeof p.approved==='boolean') payload.approved=p.approved;
    if (typeof p.featured==='boolean') payload.featured=p.featured;
    if (typeof p.available==='boolean')payload.available=p.available;
    return this.q('tutors','PATCH',payload,`?id=eq.${id}`);
  },
  async deleteTutor(id) { return this.q('tutors','DELETE',null,`?id=eq.${id}`); },

  // BOOKINGS
  async getBookings(f={}) {
    let q='?order=id.desc';
    if (f.studentEmail) q+=`&studentemail=eq.${encodeURIComponent(f.studentEmail)}`;
    if (f.tutorId)      q+=`&tutorid=eq.${f.tutorId}`;
    if (f.parentEmail)  q+=`&parentemail=eq.${encodeURIComponent(f.parentEmail)}`;
    if (f.status)       q+=`&status=eq.${f.status}`;
    return this.q('bookings','GET',null,q)||[];
  },
  async createBooking(d) {
    const p={studentname:d.studentName,studentemail:d.studentEmail,parentemail:d.parentEmail||'',
      tutorid:Number(d.tutorId),tutorname:d.tutorName,subject:d.subject,date:d.date,
      time:d.time||'10:00 AM',notes:d.notes||'',referralcode:d.referralCode||'',status:'pending',adminnote:''};
    const r=await this.q('bookings','POST',p); return r&&r[0]?r[0]:null;
  },
  async updateBooking(id,p) {
    const payload={};
    if (p.status!==undefined)    payload.status=p.status;
    if (p.adminNote!==undefined) payload.adminnote=p.adminNote;
    return this.q('bookings','PATCH',payload,`?id=eq.${id}`);
  },

  // QUESTIONS
  async getQuestions(f={}) {
    let q='?order=id.desc';
    if (f.studentEmail) q+=`&studentemail=eq.${encodeURIComponent(f.studentEmail)}`;
    return this.q('questions','GET',null,q)||[];
  },
  async createQuestion(d) {
    const p={studentname:d.studentName,studentemail:d.studentEmail,subject:d.subject||'General',question:d.question,status:'open',adminreply:''};
    const r=await this.q('questions','POST',p); return r&&r[0]?r[0]:null;
  },
  async updateQuestion(id,p) {
    const payload={};
    if (p.adminReply!==undefined) payload.adminreply=p.adminReply;
    if (p.status!==undefined)     payload.status=p.status;
    return this.q('questions','PATCH',payload,`?id=eq.${id}`);
  },

  // ISSUES
  async getIssues()          { return this.q('issues','GET',null,'?order=id.desc')||[]; },
  async createIssue(d)       { const r=await this.q('issues','POST',{reporter:d.reporter||'',type:d.type||'Other',desc:d.desc,status:'open'}); return r&&r[0]?r[0]:null; },
  async updateIssue(id,p)    { return this.q('issues','PATCH',p,`?id=eq.${id}`); },
  async deleteIssue(id)      { return this.q('issues','DELETE',null,`?id=eq.${id}`); },

  // REVIEWS
  async getReviews(tid=null) {
    const f=tid?`?tutorid=eq.${tid}&order=id.desc`:'?order=id.desc';
    return this.q('reviews','GET',null,f)||[];
  },
  async createReview(d) {
    const r=await this.q('reviews','POST',{tutorid:Number(d.tutorId),author:d.author,rating:Number(d.rating)||5,text:d.text});
    const all=await this.getReviews(d.tutorId);
    if (all&&all.length) {
      const avg=all.reduce((s,r)=>s+r.rating,0)/all.length;
      const t=await this.getTutorById(d.tutorId);
      if (t) {
        const revs=[{author:d.author,text:d.text},...(t.studentReviews||[])].slice(0,10);
        await this.updateTutor(d.tutorId,{rating:Math.round(avg*10)/10,reviews:all.length,studentReviews:revs});
      }
    }
    return r&&r[0]?r[0]:null;
  },
  async deleteReview(id) { return this.q('reviews','DELETE',null,`?id=eq.${id}`); }
};


/* ────────────────────────────────────────────────────────────
   SESSION — keeps user logged in when page refreshes
   ──────────────────────────────────────────────────────────── */
let currentUser=null, adminLoggedIn=false;

function saveSession(u)   { localStorage.setItem('tc_s', JSON.stringify({id:u.id,email:u.email,role:u.role})); }
function clearSession()   { localStorage.removeItem('tc_s'); }
async function restoreSession() {
  const s=localStorage.getItem('tc_s');
  if (!s) return;
  try {
    const {id,email}=JSON.parse(s);
    const u=await DB.getUserById(id);
    if (u&&u.email===email) { currentUser=u; updateNav(); }
    else clearSession();
  } catch(e) { clearSession(); }
}


/* ────────────────────────────────────────────────────────────
   AUTH — register, login, logout, admin login
   ──────────────────────────────────────────────────────────── */
async function doRegister() {
  const name=v('regName'),email=v('regEmail'),pwd=v('regPassword'),conf=v('regConfirm'),role=v('regRole');
  if (!name||!email||!pwd)  { toast('Please fill in all required fields'); return; }
  if (pwd!==conf)           { toast('Passwords do not match'); return; }
  if (pwd.length<6)         { toast('Password must be at least 6 characters'); return; }
  if (await DB.getUserByEmail(email)) { toast('An account with this email already exists'); return; }

  const user=await DB.createUser({name,email,password:pwd,role,phone:v('regPhone')||'',grade:v('regGrade')||'',
    parentemail:v('regParentEmail')||'',qual:v('regQual')||'',subjects:v('regSubjects')||'',
    price:Number(v('regPrice'))||0,pricerange:v('regPriceRange')||'',location:v('regLocation')||'',
    bio:v('regBio')||'',childname:v('regChildName')||'',childgrade:v('regChildGrade')||'',
    status:'active',sessions:0,earnings:0});

  if (!user) { toast('Registration failed. Please try again.'); return; }

  if (role==='tutor') {
    const all=await DB.getTutors(true);
    const colors=[['#d4edda','#2d6a4f'],['#d4e8fa','#1a4d7a'],['#fce4d4','#993c1d'],['#e8d4fa','#533ab7'],['#faeacd','#854f0b']];
    const [bg,fg]=colors[all.length%colors.length];
    await DB.createTutor({id:user.id,name,role:v('regQual')||'Tutor',subjects:v('regSubjects')||'General',
      price:Number(v('regPrice'))||200,pricerange:v('regPriceRange')||'₹200/hr',
      available:false,active:false,approved:false,
      avatar:name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
      color:bg,acolor:fg,about:v('regBio')||'',phone:v('regPhone')||'',location:v('regLocation')||'',userid:user.id});
  }

  currentUser=user; saveSession(user); updateNav(); showPage('dashboard'); renderDashboard();
  toast('Welcome to TutorConnect, '+name.split(' ')[0]+'! 👋');
}

async function doLogin() {
  const email=v('loginEmail'),pwd=v('loginPassword');
  if (!email||!pwd) { toast('Please enter email and password'); return; }
  const user=await DB.getUserByEmail(email);
  if (!user||user.password!==pwd) {
    document.getElementById('loginError').style.display='block';
    document.getElementById('loginError').textContent='Incorrect email or password.'; return;
  }
  if (user.status==='suspended') { toast('Account suspended. Contact Monisha S.'); return; }
  document.getElementById('loginError').style.display='none';
  currentUser=user; saveSession(user); updateNav(); showPage('dashboard'); renderDashboard();
  toast('Welcome back, '+user.name.split(' ')[0]+'! 👋');
}

async function logout() {
  currentUser=null; adminLoggedIn=false; clearSession(); updateNav(); showPage('home');
  document.getElementById('adminBadgeNav').style.display='none';
  document.getElementById('navAdmin').style.display='none';
  toast('Logged out.');
}

async function adminLogin() {
  const pwd=v('adminPwd');
  const stored=await DB.getSetting('adminPassword')||'monisha2025';
  if (pwd===stored) {
    adminLoggedIn=true;
    document.getElementById('adminLoginWall').style.display='none';
    document.getElementById('adminContent').style.display='block';
    document.getElementById('adminBadgeNav').style.display='inline';
    document.getElementById('navAdmin').style.display='inline';
    renderAdminAll(); toast('Welcome back, Monisha S! 👋');
  } else {
    document.getElementById('adminLoginErr').style.display='block';
    document.getElementById('adminLoginErr').textContent='Incorrect password. Access denied.';
  }
}


/* ────────────────────────────────────────────────────────────
   NAVIGATION
   ──────────────────────────────────────────────────────────── */
function showPage(p) {
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  if (p==='home')      renderHome();
  if (p==='dashboard') renderDashboard();
  if (p==='admin'&&adminLoggedIn) renderAdminAll();
  window.scrollTo(0,0);
}


/* ────────────────────────────────────────────────────────────
   HOME PAGE
   ──────────────────────────────────────────────────────────── */
let allTutors=[], currentFilter='all';

async function renderHome() {
  document.getElementById('tutorGrid').innerHTML='<div class="loading">Loading tutors…</div>';
  allTutors=await DB.getTutors(false);
  const sel=document.getElementById('reviewTutorSel');
  if (sel) { sel.innerHTML='<option value="">Choose…</option>'; allTutors.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.name;sel.appendChild(o);}); }
  filterTutors();
}

function filterTutors() {
  const q=v('searchInput').toLowerCase(), price=v('priceFilter');
  let list=allTutors.filter(t=>{
    const mq=!q||t.name.toLowerCase().includes(q)||(t.subjects||[]).some(s=>s.toLowerCase().includes(q));
    let mp=true;
    if (price==='budget') mp=t.price<=150;
    if (price==='mid')    mp=t.price>150&&t.price<500;
    if (price==='premium')mp=t.price>=500;
    return mq&&mp;
  });
  if (currentFilter==='available')   list=list.filter(t=>t.available);
  if (currentFilter==='top')         list=list.filter(t=>t.rating>=4.8);
  if (currentFilter==='school')      list=list.filter(t=>(t.subjects||[]).some(s=>/class|school|maths|science/i.test(s)));
  if (currentFilter==='competitive') list=list.filter(t=>(t.subjects||[]).some(s=>/jee|neet|ielts|upsc|ca/i.test(s)));
  if (currentFilter==='tech')        list=list.filter(t=>(t.subjects||[]).some(s=>/computer|python|dsa|coding/i.test(s)));
  renderGrid(list);
}

function setFilter(btn,f) { document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentFilter=f; filterTutors(); }

function renderGrid(list) {
  const g=document.getElementById('tutorGrid');
  if (!list.length) { g.innerHTML='<div class="empty-state">No tutors found. Try adjusting your search.</div>'; return; }
  g.innerHTML=list.map(t=>`
    <div class="card" onclick="openTutor(${t.id})">
      ${t.featured?'<div class="bfeat">Top Tutor</div>':''}
      <div class="ch">
        <div class="av" style="background:${t.color};color:${t.acolor}">${t.avatar}</div>
        <div><div class="tn">${t.name}</div><div class="ts">${t.role}</div><div class="al"><span class="dot ${t.available?'on':'off'}"></span>${t.available?'Available now':'Busy today'}</div></div>
      </div>
      <div class="tags">${(t.subjects||[]).map(s=>`<span class="tag">${s}</span>`).join('')}</div>
      <div class="cm">
        <div class="rt"><strong>${t.rating}</strong> ★ · ${t.reviews} reviews<br><span style="font-size:10px">📍 ${t.location||'India'}</span></div>
        <div class="pr">${t.pricerange||t.priceRange||'₹'+t.price+'/hr'}</div>
      </div>
    </div>`).join('');
}

async function openTutor(id) {
  const t=await DB.getTutorById(id);
  document.getElementById('tutorDetailInner').innerHTML=`
    <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:1.25rem;flex-wrap:wrap">
      <div class="av" style="background:${t.color};color:${t.acolor};width:64px;height:64px;font-size:22px;flex-shrink:0">${t.avatar}</div>
      <div style="flex:1"><h2 style="font-family:var(--serif);font-size:1.5rem;margin-bottom:4px">${t.name}</h2>
      <div style="font-size:13px;color:var(--muted);margin-bottom:8px">${t.role} · 📍 ${t.location||'India'}</div>
      <div class="tags">${(t.subjects||[]).map(s=>`<span class="tag">${s}</span>`).join('')}</div></div>
    </div>
    <div class="svr">
      <div><span class="svl">${t.rating} ★</span><span class="sll">Rating</span></div>
      <div><span class="svl">${t.reviews}</span><span class="sll">Reviews</span></div>
      <div><span class="svl">${t.pricerange||t.priceRange||'₹'+t.price+'/hr'}</span><span class="sll">Rate</span></div>
      <div><span class="svl" style="color:${t.available?'#2d6a4f':'#c7521a'}">${t.available?'Open':'Busy'}</span><span class="sll">Status</span></div>
    </div>
    <div class="stit">About</div><p class="at">${t.about}</p>
    ${t.approach?`<div class="stit">Teaching approach</div><p class="at">${t.approach}</p>`:''}
    ${t.studentReviews&&t.studentReviews.length?`<div class="stit">Reviews</div><div class="revl">${t.studentReviews.map(r=>`<div class="revi"><div class="reva">${r.author}</div><div class="revt">${r.text}</div></div>`).join('')}</div>`:''}
    <div style="margin-top:1.5rem;display:flex;gap:10px;flex-wrap:wrap">
      <button class="ba" onclick="openBookModal(${t.id},'${t.name.replace(/'/g,"\\'")}')">Book a session</button>
      <button class="ba bo bf" style="width:auto;padding:9px 20px" onclick="closeModal('modalTutor')">Close</button>
    </div>`;
  openModal('modalTutor');
}


/* ────────────────────────────────────────────────────────────
   BOOKING & QUESTIONS
   ──────────────────────────────────────────────────────────── */
function openBookModal(id,name) {
  closeModal('modalTutor');
  document.getElementById('bkTutorId').value=id; document.getElementById('bkTutorName').value=name;
  document.getElementById('bkDate').min=new Date().toISOString().split('T')[0];
  if (currentUser) { document.getElementById('bkName').value=currentUser.name; document.getElementById('bkEmail').value=currentUser.email; document.getElementById('bkParent').value=currentUser.parentemail||''; document.getElementById('bkLoginHint').style.display='none'; }
  else document.getElementById('bkLoginHint').style.display='block';
  openModal('modalBook');
}

async function submitBooking() {
  const name=v('bkName'),email=v('bkEmail'),subject=v('bkSubject'),date=v('bkDate');
  if (!name||!email||!subject||!date) { toast('Please fill in all required fields'); return; }
  const b=await DB.createBooking({studentName:name,studentEmail:email,parentEmail:v('bkParent'),tutorId:v('bkTutorId'),tutorName:v('bkTutorName'),subject,date,time:v('bkTime'),notes:v('bkNotes'),referralCode:v('bkRef')});
  if (b) { if (currentUser) await DB.updateUser(currentUser.id,{sessions:(currentUser.sessions||0)+1}); closeModal('modalBook'); toast('Booking sent! Check My Dashboard for status.'); ['bkName','bkEmail','bkParent','bkSubject','bkNotes','bkRef'].forEach(i=>document.getElementById(i).value=''); }
  else toast('Error sending booking. Try again.');
}

function openAskModal() {
  if (currentUser) { document.getElementById('askName').value=currentUser.name; document.getElementById('askEmail').value=currentUser.email; }
  document.getElementById('askLoginHint').style.display=currentUser?'none':'block';
  openModal('modalAsk');
}

async function submitQuestion() {
  const name=v('askName'),email=v('askEmail'),question=v('askQuestion');
  if (!name||!email||!question) { toast('Please fill in name, email and question'); return; }
  const q=await DB.createQuestion({studentName:name,studentEmail:email,subject:v('askSubject'),question});
  if (q) { closeModal('modalAsk'); toast('Question submitted! Monisha S will reply soon.'); ['askName','askEmail','askSubject','askQuestion'].forEach(i=>document.getElementById(i).value=''); }
}


/* ────────────────────────────────────────────────────────────
   DASHBOARD
   ──────────────────────────────────────────────────────────── */
async function renderDashboard() {
  if (!currentUser) { showPage('login'); return; }
  document.getElementById('dashGreeting').textContent='Hi, '+currentUser.name.split(' ')[0]+' 👋';
  document.getElementById('dashSub').textContent=currentUser.role==='student'?'Track your bookings and study questions':currentUser.role==='tutor'?'Manage sessions and track your earnings':'Monitor your child\'s learning progress';
  ['dashStudent','dashTutor','dashParent'].forEach(id=>document.getElementById(id).style.display='none');
  if (currentUser.role==='student')      await renderStudentDash();
  else if (currentUser.role==='tutor')   await renderTutorDash();
  else if (currentUser.role==='parent')  await renderParentDash();
}

async function renderStudentDash() {
  document.getElementById('dashStudent').style.display='block';
  const [bookings,questions]=await Promise.all([DB.getBookings({studentEmail:currentUser.email}),DB.getQuestions({studentEmail:currentUser.email})]);
  document.getElementById('myBookingCount').textContent=bookings.length+' booking'+(bookings.length!==1?'s':'');
  document.getElementById('myBookingsList').innerHTML=bookings.length
    ?bookings.map(b=>`<div class="rc"><div class="ri2"><div class="rn">${b.tutorname||b.tutorName}</div><div class="rm">${b.subject}${b.notes?' · '+b.notes:''}</div></div><span class="rsub" style="background:#e8f5ee;color:#2d6a4f">${b.date}</span><span class="rtime">🕐 ${b.time}</span><span class="sb ${b.status}">${b.status}</span>${b.adminnote?`<div style="width:100%;font-size:12px;color:var(--muted);margin-top:4px;padding-top:6px;border-top:1px solid var(--border)">📝 ${b.adminnote}</div>`:''}</div>`).join('')
    :'<div class="empty-state">No bookings yet. <a style="color:var(--accent);cursor:pointer" onclick="showPage(\'home\')">Browse tutors →</a></div>';
  document.getElementById('myQuestionsList').innerHTML=questions.length
    ?questions.map(q=>`<div class="ic"><div class="ih"><div><div style="font-weight:600;font-size:14px">${q.subject||'General'}</div><div style="font-size:12px;color:var(--muted)">${new Date(q.createdat).toLocaleDateString()}</div></div><span class="sb ${q.status}">${q.status}</span></div><div style="font-size:13px;background:var(--tag);padding:10px;border-radius:8px;margin-bottom:8px;line-height:1.6">${q.question}</div>${q.adminreply?`<div style="background:var(--adl);border:1px solid var(--adb);border-radius:8px;padding:10px;font-size:13px"><strong style="color:var(--admin)">Monisha S replied:</strong><div style="margin-top:4px;line-height:1.6">${q.adminreply}</div></div>`:'<div style="font-size:12px;color:var(--muted);font-style:italic">Awaiting reply from Monisha S…</div>'}</div>`).join('')
    :'<div class="empty-state">No questions yet. Ask something and Monisha S will reply!</div>';
}

async function renderTutorDash() {
  document.getElementById('dashTutor').style.display='block';
  const allT=await DB.getTutors(true);
  const myT=allT.find(t=>t.userid===currentUser.id||t.name===currentUser.name);
  if (!myT) return;
  document.getElementById('tutorEarnings').textContent='₹'+(myT.earnings||0).toLocaleString();
  const bookings=await DB.getBookings({tutorId:myT.id});
  const accepted=bookings.filter(b=>b.status==='accepted'), pending=bookings.filter(b=>b.status==='pending');
  document.getElementById('tutorSessions').textContent=accepted.length+' sessions completed';
  document.getElementById('tutorProfileStatus').innerHTML=myT.approved?`<span class="sb accepted">✓ Profile live</span><p style="font-size:13px;color:var(--muted);margin-top:8px">Your profile is visible to students.</p>`:`<span class="sb pending">⏳ Under review</span><p style="font-size:13px;color:var(--muted);margin-top:8px">Monisha S is reviewing your profile.</p>`;
  document.getElementById('tutorReqCount').textContent=pending.length+' pending';
  document.getElementById('tutorRequestsList').innerHTML=pending.length?pending.map(b=>`<div class="rc" id="tr-${b.id}"><div class="ri2"><div class="rn">${b.studentname}</div><div class="rm">${b.subject} · ${b.notes||''}</div></div><span class="rsub">${b.date} · ${b.time}</span><div style="display:flex;gap:7px"><button class="bacc" onclick="tutorRespond(${b.id},'accepted',${myT.id},${myT.price})">Accept</button><button class="bdec" onclick="tutorRespond(${b.id},'declined',${myT.id},${myT.price})">Decline</button></div></div>`).join(''):'<div class="empty-state">No pending requests.</div>';
  document.getElementById('tutorUpcomingList').innerHTML=accepted.length?accepted.map(b=>`<div class="rc"><div class="ri2"><div class="rn">${b.studentname}</div><div class="rm">${b.subject}</div></div><span class="rsub" style="background:#e8f5ee;color:#2d6a4f">${b.date}</span><span class="rtime">🕐 ${b.time}</span><span class="sb accepted">Confirmed</span></div>`).join(''):'<div class="empty-state">No confirmed sessions yet.</div>';
}

async function tutorRespond(bid,status,tid,price) {
  await DB.updateBooking(bid,{status});
  if (status==='accepted') { const t=await DB.getTutorById(tid); if(t) await DB.updateTutor(tid,{earnings:(t.earnings||0)+price}); }
  toast(status==='accepted'?'Session accepted!':'Session declined.'); renderTutorDash();
}

async function renderParentDash() {
  document.getElementById('dashParent').style.display='block';
  const bookings=await DB.getBookings({parentEmail:currentUser.email});
  document.getElementById('parentSessionsList').innerHTML=bookings.length?bookings.map(b=>`<div class="rc"><div class="ri2"><div class="rn">${b.studentname}</div><div class="rm">with ${b.tutorname} · ${b.subject}</div></div><span class="rsub">${b.date}</span><span class="rtime">🕐 ${b.time}</span><span class="sb ${b.status}">${b.status}</span></div>`).join(''):'<div class="empty-state">No sessions found for your child yet.</div>';
}

async function submitReview() {
  const tid=v('reviewTutorSel'),text=v('reviewText');
  if (!tid||!text) { toast('Please select a tutor and write a review'); return; }
  await DB.createReview({tutorId:tid,author:currentUser.name,rating:v('reviewRating'),text});
  toast('Review submitted! Thank you.'); document.getElementById('reviewText').value='';
}


/* ────────────────────────────────────────────────────────────
   ADMIN PANEL (Monisha S only)
   ──────────────────────────────────────────────────────────── */
function adminTab(btn,id) { document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); }

async function renderAdminAll() {
  await Promise.all([renderAdminStats(),renderAdminBookings(),renderAdminQuestions(),renderAdminTutors(),renderAdminStudents(),renderAdminReviews(),renderAdminIssues(),renderAdminSettings()]);
}

async function renderAdminStats() {
  const [tutors,users,bookings,questions,issues]=await Promise.all([DB.getTutors(true),DB.getUsers(),DB.getBookings(),DB.getQuestions(),DB.getIssues()]);
  const accepted=bookings.filter(b=>b.status==='accepted');
  const revenue=accepted.reduce((s,b)=>{const t=tutors.find(t=>t.id===(b.tutorid||b.tutorId));return s+(t?t.price:0);},0);
  document.getElementById('aStat1').textContent=tutors.filter(t=>t.active&&t.approved).length;
  document.getElementById('aStat2').textContent=users.filter(u=>u.role==='student').length;
  document.getElementById('aStat3').textContent=bookings.filter(b=>b.status==='pending').length;
  document.getElementById('aStat4').textContent='₹'+revenue.toLocaleString();
  document.getElementById('aStat5').textContent=questions.filter(q=>q.status==='open').length;
}

async function renderAdminBookings() {
  const filter=v('bStatusFilter');
  const all=await DB.getBookings(filter?{status:filter}:{});
  document.getElementById('adminBookingsList').innerHTML=all.length?all.map(b=>`<div class="rc"><div class="av" style="background:#f0ede8;color:#7a7670;width:34px;height:34px;font-size:12px;flex-shrink:0">${(b.studentname||'').split(' ').map(w=>w[0]).join('')}</div><div class="ri2"><div class="rn">${b.studentname}</div><div class="rm">→ <strong>${b.tutorname}</strong> · ${b.subject}</div>${b.notes?`<div class="rm">${b.notes}</div>`:''}</div><div style="text-align:right;min-width:90px"><div style="font-size:12px;font-weight:600;color:var(--info)">${b.date}</div><div style="font-size:12px;color:var(--muted)">${b.time}</div></div><span class="sb ${b.status}">${b.status}</span><div style="display:flex;flex-direction:column;gap:5px">${b.status==='pending'?`<button class="bacc" onclick="aUpdB(${b.id},'accepted')">Accept</button><button class="bdec" onclick="aUpdB(${b.id},'declined')">Decline</button>`:`<button class="badm" onclick="aUpdB(${b.id},'pending')">Reset</button>`}<button class="badm" onclick="aNoteB(${b.id})">Note</button></div></div>`).join(''):'<div class="empty-state">No bookings found.</div>';
}
async function aUpdB(id,status)  { await DB.updateBooking(id,{status}); toast('Booking '+status+'.'); renderAdminBookings(); renderAdminStats(); }
async function aNoteB(id)        { const n=prompt('Add a note for the student:'); if(n===null)return; await DB.updateBooking(id,{adminNote:n}); toast('Note added.'); renderAdminBookings(); }

async function renderAdminQuestions() {
  const qs=await DB.getQuestions();
  document.getElementById('adminQCount').textContent=qs.filter(q=>q.status==='open').length+' open';
  document.getElementById('adminQuestionsList').innerHTML=qs.length?qs.map(q=>`<div class="ic"><div class="ih"><div><div style="font-weight:600;font-size:14px">${q.subject||'General'} — ${q.studentname} (${q.studentemail})</div><div style="font-size:12px;color:var(--muted)">${new Date(q.createdat).toLocaleDateString()}</div></div><span class="sb ${q.status==='answered'?'accepted':'pending'}">${q.status}</span></div><div style="font-size:14px;background:var(--tag);padding:10px;border-radius:8px;margin-bottom:10px;line-height:1.6">${q.question}</div>${q.adminreply?`<div style="background:var(--adl);border:1px solid var(--adb);border-radius:8px;padding:10px;font-size:13px;margin-bottom:10px"><strong style="color:var(--admin)">Your reply:</strong><div style="margin-top:4px">${q.adminreply}</div></div>`:''}<div style="display:flex;gap:8px;flex-wrap:wrap"><textarea id="qr-${q.id}" rows="2" style="flex:1;min-width:200px;border:1px solid var(--border);border-radius:8px;padding:8px;font-family:var(--sans);font-size:13px;resize:vertical" placeholder="Reply as Monisha S…">${q.adminreply||''}</textarea><div style="display:flex;flex-direction:column;gap:6px"><button class="badm" onclick="aReplyQ(${q.id})">Send reply</button>${q.status==='open'?`<button class="bacc" onclick="aCloseQ(${q.id})">Mark answered</button>`:''}</div></div></div>`).join(''):'<div class="empty-state">No questions yet.</div>';
}
async function aReplyQ(id) { const r=document.getElementById('qr-'+id).value.trim(); if(!r){toast('Write a reply first');return;} await DB.updateQuestion(id,{adminReply:r,status:'answered'}); toast('Reply sent!'); renderAdminQuestions(); }
async function aCloseQ(id) { await DB.updateQuestion(id,{status:'answered'}); toast('Marked answered.'); renderAdminQuestions(); }

async function renderAdminTutors() {
  const tutors=await DB.getTutors(true);
  document.getElementById('adminTutorsTbody').innerHTML=tutors.map(t=>`<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="av" style="background:${t.color};color:${t.acolor};width:30px;height:30px;font-size:11px">${t.avatar}</div><div><div style="font-weight:500">${t.name}</div><div style="font-size:11px;color:var(--muted)">${t.location||'—'}</div></div></div></td><td>${(t.subjects||[]).slice(0,3).join(', ')}</td><td style="font-weight:600;color:var(--accent)">${t.pricerange||t.priceRange||'₹'+t.price+'/hr'}</td><td>${t.rating} ★</td><td style="color:#1a6b3e;font-weight:600">₹${(t.earnings||0).toLocaleString()}</td><td>${t.approved?`<span class="sb ${t.active?'accepted':'declined'}">${t.active?'Active':'Suspended'}</span>`:`<span class="sb pending">Pending</span>`}</td><td><label class="ts2"><input type="checkbox" ${t.featured?'checked':''} onchange="DB.updateTutor(${t.id},{featured:this.checked}).then(()=>renderAdminTutors())"><span class="tsl"></span></label></td><td><div style="display:flex;gap:5px;flex-wrap:wrap">${!t.approved?`<button class="bacc" onclick="aApproveT(${t.id})">Approve</button>`:''}<button class="badm" onclick="aToggleT(${t.id},${t.active})">${t.active?'Suspend':'Activate'}</button><button class="bdec" onclick="aDelT(${t.id})">Remove</button></div></td></tr>`).join('');
}
async function adminAddTutor() {
  const name=v('ntN'); if(!name){toast('Enter tutor name');return;}
  const all=await DB.getTutors(true);
  const colors=[['#d4edda','#2d6a4f'],['#d4e8fa','#1a4d7a'],['#fce4d4','#993c1d'],['#e8d4fa','#533ab7'],['#faeacd','#854f0b']];
  const [bg,fg]=colors[all.length%colors.length];
  await DB.createTutor({id:Date.now(),name,role:v('ntR'),subjects:v('ntS'),price:v('ntP'),pricerange:v('ntPR'),phone:v('ntPh'),location:v('ntL'),about:v('ntA'),approach:v('ntAp'),available:true,active:true,approved:true,avatar:name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),color:bg,acolor:fg});
  closeModal('mAddTutor'); toast(name+' added!'); renderAdminTutors(); renderAdminStats();
  ['ntN','ntR','ntS','ntP','ntPR','ntPh','ntL','ntA','ntAp'].forEach(i=>document.getElementById(i).value='');
}
async function aApproveT(id) { await DB.updateTutor(id,{approved:true,active:true}); toast('Approved!'); renderAdminTutors(); }
async function aToggleT(id,active) { await DB.updateTutor(id,{active:!active}); toast('Updated.'); renderAdminTutors(); }
async function aDelT(id) { if(!confirm('Remove this tutor?'))return; await DB.deleteTutor(id); toast('Removed.'); renderAdminTutors(); renderAdminStats(); }

async function renderAdminStudents() {
  const users=await DB.getUsers();
  document.getElementById('adminStudentsTbody').innerHTML=users.map(u=>`<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="av" style="background:#f0ede8;color:#7a7670;width:28px;height:28px;font-size:11px">${u.name.split(' ').map(w=>w[0]).join('')}</div>${u.name}</div></td><td style="color:var(--muted)">${u.email}</td><td><span class="tag">${u.role}</span></td><td>${u.grade||u.qual||u.childname||'—'}</td><td style="color:var(--admin);font-size:12px">${u.parentemail||'—'}</td><td>${u.sessions||0}</td><td><span class="sb ${u.status||'active'}">${u.status||'active'}</span></td><td><button class="badm" onclick="aToggleU(${u.id},'${u.status||'active'}')">${(u.status||'active')==='active'?'Suspend':'Activate'}</button></td></tr>`).join('');
}
async function aToggleU(id,cur) { await DB.updateUser(id,{status:cur==='active'?'suspended':'active'}); toast('User updated.'); renderAdminStudents(); }

async function renderAdminReviews() {
  const [revs,tutors]=await Promise.all([DB.getReviews(),DB.getTutors(true)]);
  document.getElementById('adminReviewsList').innerHTML=revs.length?revs.map(r=>{const t=tutors.find(t=>t.id==r.tutorid); return `<div class="ic" style="display:flex;align-items:flex-start;gap:1rem;flex-wrap:wrap"><div style="flex:1;min-width:200px"><div style="font-weight:600;font-size:14px">For: ${t?t.name:'Unknown'}</div><div style="font-size:12px;color:var(--muted);margin-bottom:6px">By: ${r.author} · ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><div style="font-size:13px;color:var(--muted)">${r.text}</div></div><button class="bdec" onclick="aDelRev(${r.id})">Remove</button></div>`;}).join(''):'<div class="empty-state">No reviews yet.</div>';
}
async function aDelRev(id) { if(!confirm('Remove?'))return; await DB.deleteReview(id); toast('Removed.'); renderAdminReviews(); }

async function renderAdminIssues() {
  const iss=await DB.getIssues();
  document.getElementById('adminIssuesList').innerHTML=iss.length?iss.map(i=>`<div class="ic"><div class="ih"><div><div style="font-weight:600;font-size:14px">${i.type} — ${i.reporter}</div><div style="font-size:12px;color:var(--muted)">${new Date(i.createdat).toLocaleDateString()}</div></div><span class="sb ${i.status}">${i.status}</span></div><div style="font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.6">${i.desc}</div><div style="display:flex;gap:7px;flex-wrap:wrap">${i.status==='open'?`<button class="bacc" onclick="aResI(${i.id})">Mark resolved</button>`:''}<button class="bdec" onclick="aDelI(${i.id})">Dismiss</button></div></div>`).join(''):'<div class="empty-state">No issues logged.</div>';
}
async function adminAddIssue() { const d=v('issDesc'); if(!d){toast('Describe the issue');return;} await DB.createIssue({reporter:v('issRep'),type:v('issType'),desc:d}); closeModal('mIssue'); toast('Logged.'); renderAdminIssues(); ['issRep','issDesc'].forEach(i=>document.getElementById(i).value=''); }
async function aResI(id) { await DB.updateIssue(id,{status:'resolved'}); toast('Resolved.'); renderAdminIssues(); }
async function aDelI(id) { if(!confirm('Dismiss?'))return; await DB.deleteIssue(id); toast('Dismissed.'); renderAdminIssues(); }

async function renderAdminSettings() {
  const s=await DB.getAllSettings();
  document.getElementById('settingsGrid').innerHTML=`
    <div class="dc"><div class="stit" style="margin-top:0">Owner account</div>
      <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--adl);border:1px solid var(--adb);border-radius:10px;margin-bottom:1rem">
        <div class="av" style="background:var(--admin);color:#fff;width:52px;height:52px;font-size:17px">MS</div>
        <div><div style="font-weight:600;font-size:15px">Monisha S</div><div style="font-size:12px;color:var(--muted)">Owner & Administrator</div><div style="font-size:11px;color:var(--admin);margin-top:3px;font-weight:600">★ Full platform access</div></div>
      </div>
      <div class="frow"><label>Platform name</label><input type="text" id="sPName" value="${s.platformName||'TutorConnect'}"></div>
      <div class="frow"><label>City</label><input type="text" id="sCity" value="${s.city||'India'}"></div>
      <button class="badm" onclick="aSaveInfo()">Save info</button>
    </div>
    <div class="dc"><div class="stit" style="margin-top:0">Platform controls</div>
      ${[['registrationsOpen','New registrations','Allow new sign-ups'],['referralEnabled','Referral program','15% discount'],['maintenanceMode','Maintenance mode','Take site offline']].map(([k,l,sub])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
          <div><div style="font-size:14px;font-weight:500">${l}</div><div style="font-size:12px;color:var(--muted)">${sub}</div></div>
          <label class="ts2"><input type="checkbox" ${s[k]?'checked':''} onchange="DB.setSetting('${k}',this.checked?'1':'0').then(()=>toast('Saved!'))"><span class="tsl"></span></label>
        </div>`).join('')}
    </div>
    <div class="dc"><div class="stit" style="margin-top:0">Commission rate</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <input type="range" min="0" max="30" value="${s.commission||10}" id="sComm" oninput="document.getElementById('sCV').textContent=this.value+'%'" style="flex:1">
        <span id="sCV" style="font-weight:600;font-size:14px;color:var(--admin);min-width:36px">${s.commission||10}%</span>
      </div>
      <button class="badm" onclick="DB.setSetting('commission',document.getElementById('sComm').value).then(()=>toast('Saved!'))">Save</button>
    </div>
    <div class="dc"><div class="stit" style="margin-top:0">Change admin password</div>
      <div class="frow"><label>New password (min 6 chars)</label><input type="password" id="sNP" placeholder="New password"></div>
      <div class="frow"><label>Confirm password</label><input type="password" id="sCNP" placeholder="Confirm"></div>
      <button class="badm" onclick="aChangePwd()">Change password</button>
    </div>`;
}
async function aSaveInfo() { await Promise.all([DB.setSetting('platformName',v('sPName')),DB.setSetting('city',v('sCity'))]); toast('Saved!'); }
async function aChangePwd() {
  const np=v('sNP'),cp=v('sCNP');
  if (np!==cp)    { toast('Passwords do not match'); return; }
  if (np.length<6){ toast('Minimum 6 characters'); return; }
  await DB.setSetting('adminPassword',np);
  toast('Password changed and saved permanently! ✅');
  document.getElementById('sNP').value=''; document.getElementById('sCNP').value='';
}


/* ────────────────────────────────────────────────────────────
   NAV & REGISTER ROLE SWITCHER
   ──────────────────────────────────────────────────────────── */
function updateNav() {
  const li=!!currentUser;
  document.getElementById('navAuth').style.display=li?'none':'flex';
  document.getElementById('navUser').style.display=li?'flex':'none';
  document.getElementById('navDash').style.display=li?'inline':'none';
  if (li) {
    const i=currentUser.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const bg={student:'#d4edda',tutor:'#d4e8fa',parent:'#faeacd'}[currentUser.role]||'#f0ede8';
    const tc={student:'#2d6a4f',tutor:'#1a4d7a',parent:'#854f0b'}[currentUser.role]||'#7a7670';
    document.getElementById('userChip').innerHTML=`<div class="uav" style="background:${bg};color:${tc}">${i}</div>${currentUser.name.split(' ')[0]}`;
  }
}

function selectRegRole(r) {
  document.getElementById('regRole').value=r;
  ['Student','Tutor','Parent'].forEach(x=>{
    document.getElementById('roleOpt'+x).classList.toggle('active',r===x.toLowerCase());
    document.getElementById('extra'+x).style.display=r===x.toLowerCase()?'block':'none';
  });
}
function showTutorRegister(){showPage('register');selectRegRole('tutor');}


/* ────────────────────────────────────────────────────────────
   UTILITIES
   ──────────────────────────────────────────────────────────── */
function v(id)       { return (document.getElementById(id)||{}).value||''; }
function toast(msg)  { const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3200); }
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('DOMContentLoaded',()=>{ document.querySelectorAll('.modal-overlay').forEach(o=>{ o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}); }); });


/* ────────────────────────────────────────────────────────────
   INIT — runs when page loads
   ──────────────────────────────────────────────────────────── */
async function init() {
  if (SUPABASE_URL==='https://ivpdqxtzeumgrosnjscx.supabase.co ') {
    document.body.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;font-family:sans-serif;text-align:center"><div><div style="font-size:3rem;margin-bottom:1rem">⚙️</div><h2 style="margin-bottom:1rem">One-time setup needed</h2><p style="color:#666;line-height:1.8;max-width:440px">Open <strong>app.js</strong> and paste your Supabase URL and API key at the top of the file.<br><br>Get your free keys at <strong>supabase.com</strong></p></div></div>`;
    return;
  }
  await restoreSession();
  renderHome();
}

init();


/* ════════════════════════════════════════════════════════════
   SQL TO RUN IN SUPABASE (one time setup)
   
   Go to: supabase.com → your project → SQL Editor → New query
   Copy everything from CREATE TABLE below → paste → click RUN

CREATE TABLE settings  (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE users     (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT DEFAULT 'student', phone TEXT DEFAULT '', status TEXT DEFAULT 'active', sessions INTEGER DEFAULT 0, earnings REAL DEFAULT 0, grade TEXT DEFAULT '', parentemail TEXT DEFAULT '', qual TEXT DEFAULT '', subjects TEXT DEFAULT '', price REAL DEFAULT 0, pricerange TEXT DEFAULT '', location TEXT DEFAULT '', bio TEXT DEFAULT '', childname TEXT DEFAULT '', childgrade TEXT DEFAULT '', createdat TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE tutors    (id BIGINT PRIMARY KEY, name TEXT NOT NULL, role TEXT DEFAULT 'Tutor', subjects TEXT DEFAULT '[]', rating REAL DEFAULT 4.5, reviews INTEGER DEFAULT 0, price REAL DEFAULT 200, pricerange TEXT DEFAULT '', available BOOLEAN DEFAULT true, featured BOOLEAN DEFAULT false, active BOOLEAN DEFAULT true, approved BOOLEAN DEFAULT true, avatar TEXT DEFAULT '', color TEXT DEFAULT '#d4edda', acolor TEXT DEFAULT '#2d6a4f', about TEXT DEFAULT '', approach TEXT DEFAULT '', phone TEXT DEFAULT '', location TEXT DEFAULT '', earnings REAL DEFAULT 0, studentreviews TEXT DEFAULT '[]', userid BIGINT DEFAULT 0);
CREATE TABLE bookings  (id BIGSERIAL PRIMARY KEY, studentname TEXT NOT NULL, studentemail TEXT NOT NULL, parentemail TEXT DEFAULT '', tutorid BIGINT NOT NULL, tutorname TEXT NOT NULL, subject TEXT NOT NULL, date TEXT NOT NULL, time TEXT DEFAULT '10:00 AM', notes TEXT DEFAULT '', referralcode TEXT DEFAULT '', status TEXT DEFAULT 'pending', adminnote TEXT DEFAULT '', createdat TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE questions (id BIGSERIAL PRIMARY KEY, studentname TEXT NOT NULL, studentemail TEXT NOT NULL, subject TEXT DEFAULT 'General', question TEXT NOT NULL, status TEXT DEFAULT 'open', adminreply TEXT DEFAULT '', createdat TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE issues    (id BIGSERIAL PRIMARY KEY, reporter TEXT DEFAULT '', type TEXT DEFAULT 'Other', desc TEXT NOT NULL, status TEXT DEFAULT 'open', createdat TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE reviews   (id BIGSERIAL PRIMARY KEY, tutorid BIGINT NOT NULL, author TEXT NOT NULL, rating REAL DEFAULT 5, text TEXT NOT NULL, createdat TIMESTAMPTZ DEFAULT NOW());

INSERT INTO settings (key,value) VALUES ('platformName','TutorConnect'),('adminName','Monisha S'),('adminPassword','monisha2025'),('commission','10'),('registrationsOpen','1'),('referralEnabled','1'),('referralDiscount','15'),('maintenanceMode','0'),('city','India'),('contactEmail','admin@tutorconnect.app');

INSERT INTO tutors (id,name,role,subjects,rating,reviews,price,pricerange,available,featured,active,approved,avatar,color,acolor,about,approach,location,earnings,studentreviews) VALUES
(1,'Dr. Ananya Kapoor','IIT Delhi · 8 yrs exp','["Mathematics","Physics","JEE"]',4.9,142,800,'₹500–₹1000/hr',true,true,true,true,'AK','#d4edda','#2d6a4f','Ph.D. Applied Mathematics IIT Delhi. 200+ JEE top-100 students.','Strong fundamentals first.','Bengaluru',48000,'[{"author":"Rahul M.","text":"Cleared JEE AIR 87!"},{"author":"Shreya T.","text":"Finally understood integration!"}]'),
(2,'Prof. Ravi Nair','Former CBSE Examiner · 15 yrs','["Chemistry","Biology","NEET"]',4.8,89,700,'₹500–₹800/hr',true,false,true,true,'RN','#d4e8fa','#1a4d7a','Retired CBSE examiner. 15 years Chemistry & Biology for NEET.','Pattern-based learning.','Chennai',35000,'[{"author":"Aisha K.","text":"680/720 in NEET!"}]'),
(3,'Ms. Priya Menon','Cambridge Certified · English','["English","IELTS","Creative Writing"]',4.7,56,500,'₹300–₹600/hr',false,false,true,true,'PM','#fce4d4','#993c1d','Cambridge CELTA certified. IELTS and academic writing.','Communication-first.','Kochi',22000,'[{"author":"Tanvi R.","text":"Band 6 to 8 in 3 months!"}]'),
(4,'Mr. Karan Mehta','FAANG Engineer · CS Tutor','["Computer Science","DSA","Python"]',4.9,201,1000,'₹700–₹1000/hr',true,true,true,true,'KM','#e8d4fa','#533ab7','Software Engineer. 50+ FAANG interview cracks.','LeetCode-first.','Bengaluru',62000,'[{"author":"Neha B.","text":"Amazon & Microsoft offers!"}]'),
(5,'Mrs. Deepa Iyer','MA Economics · Affordable','["Economics","Commerce","Class 9-10"]',4.6,34,80,'₹50–₹100/hr',true,false,true,true,'DI','#faeacd','#854f0b','MA Economics. Affordable Class 9-10 and CA Foundation.','Story-based learning.','Hyderabad',8500,'[{"author":"Kartik P.","text":"98/100 in Economics!"}]'),
(6,'Mr. Arun Kumar','B.Ed Teacher · Primary & Middle','["Maths","Science","Class 5-8"]',4.4,18,60,'₹50–₹80/hr',true,false,true,true,'AK','#dae4c8','#3b6d11','B.Ed certified. 6 years primary and middle school.','Patient activity-based teaching.','Pune',5200,'[{"author":"Parent of Anvi","text":"So patient and helpful!"}]');

ALTER TABLE settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON settings  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON users     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON tutors    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON bookings  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON issues    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON reviews   FOR ALL USING (true) WITH CHECK (true);

   ════════════════════════════════════════════════════════════ */
