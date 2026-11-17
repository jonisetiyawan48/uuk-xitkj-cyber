import { readFileSync } from 'node:fs';
import { MODULES, META, TABLES } from './config.mjs';
import { shapes } from './icons.mjs';
import { canPage, canAction, current, ROLE_MODULES } from './auth.mjs';
import { query, records, trainingSelect, INSTANCE } from './db.mjs';

export const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const PAGE_MAP = Object.fromEntries(MODULES.flatMap(([m,,,pages]) => pages.map(p => [`${m}/${slugify(p)}`,p])));
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#x27;' })[c]);
const loginTemplate = readFileSync(process.cwd() + '/src/lib/login.html','utf8');
const chartTemplate = readFileSync(process.cwd() + '/src/lib/chart.html','utf8');
export const loginScreen = (error = '') => loginTemplate.replace('__LOGIN_ERROR__',esc(error));
export const icon = name => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(shapes[name] || shapes.dashboard)+'</svg>';
export const badge = s => `<span class="badge ${['Active','Approved','Completed','Resolved','Present','Available','Done'].includes(s) ? 'good' : ['Pending','In Progress','Review','Borrowed'].includes(s) ? 'warn' : 'neutral'}">${esc(s)}</span>`;
const money = v => 'Rp '+Number(v).toLocaleString('id-ID');
export const card = (title, body, extra = '') => `<section class="card"><div class="cardhead"><h3>${esc(title)}</h3>${extra}</div>${body}</section>`;
export function documentDownloads(origin) {
  const links = [['Employee Handbook (.txt)','employee-handbook.txt'],['Security Policy (.txt)','security-policy.txt']];
  return card('Download Dokumen', '<p>Klik URL di bawah untuk membuka isi dokumen langsung di browser. Setelah terbuka, ubah nilai file pada address bar untuk latihan.</p>'+links.map(([label,file]) => {
    const endpoint = '/document/download?file='+file;
    return `<p><strong>${esc(label)}</strong><br><a class="link" style="display:inline-block;overflow-wrap:anywhere;max-width:100%" href="${endpoint}"><code>${esc(origin+endpoint)}</code></a></p>`;
  }).join(''));
}
export function table(rows, cols, links, limit = 60) {
  if (!rows.length) return '<div class="empty">No matching records. Try another filter.</div>';
  const head = cols.map(([,label]) => '<th>'+esc(label)+'</th>').join('');
  const body = rows.slice(0,limit).map(r => '<tr>'+cols.map(([key],i) => {
    let v = r[key] ?? '';
    v = ['status','priority'].includes(key) ? badge(v) : key === 'amount' ? money(v) : esc(v);
    if (links && i === 0) v = `<a class="link" href="${links(r)}">${v}</a>`;
    return '<td>'+v+'</td>';
  }).join('')+'</tr>').join('');
  return `<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
export function form(action, fields, submit = 'Save changes', hidden = '') {
  if (action.startsWith('/action/') && !canAction(action.split('/').at(-1))) return '';
  return `<form class="form" method="post" action="${esc(action)}">${hidden}`+fields.map(([name,label,type,opts]) => {
    let field;
    if (type === 'select') field = `<select name="${esc(name)}">${opts.map(x => Array.isArray(x) ? `<option value="${esc(x[0])}">${esc(x[1])}</option>` : `<option>${esc(x)}</option>`).join('')}</select>`;
    else if (type === 'textarea') field = `<textarea name="${esc(name)}" rows="3" required></textarea>`;
    else field = `<input type="${type}" name="${esc(name)}" placeholder="Enter ${esc(label.toLowerCase())}" ${name !== 'description' ? 'required' : ''}>`;
    return `<label>${esc(label)}${field}</label>`;
  }).join('')+`<button class="primary" type="submit">${esc(submit)}</button></form>`;
}
export const searchform = (action, name = 'q', label = 'Search records', value = '') => `<form class="searchbar" action="${esc(action)}" method="get">${icon('search')}<input name="${esc(name)}" value="${esc(value)}" placeholder="${esc(label)}"><button>Search</button></form>`;
const slugpath = (m,p) => `/page/${m}/${slugify(p)}`;
const pageHeader = (title,desc,action = '') => `<div class="pagetop"><div><div class="eyebrow">MOKLET DIGITAL SOLUTIONS / WORKSPACE</div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>${action}</div>`;
export function layout(title, desc, content, mod = 'dashboard', user = 'Employee', role = 'Employee') {
  const nav = MODULES.filter(([key]) => canPage(role,key)).map(([key,label]) => `<a class="navitem ${mod === key ? 'active' : ''}" href="/module/${key}">${icon(key)}<span>${esc(label)}</span></a>`).join('');
  const sidebar = `<aside class="sidebar"><a href="/" class="brand"><img src="/static/logo.svg" alt="MDS Logo"><span>MOKLET <b>DIGITAL</b><small>ENTERPRISE WORKSPACE</small></span></a><div class="navlabel">WORKSPACE</div>${nav}<div class="sidefoot"><div class="avatar">${esc(user.slice(0,1))}</div><div><b>${esc(user)}</b><small>${esc(role)} · Demo account</small></div><a href="/logout" title="Logout">↗</a></div></aside>`;
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Moklet Internal Portal</title><link rel="icon" href="/static/logo.svg"><link rel="stylesheet" href="/static/style.css"></head><body><div class="app">${sidebar}<div class="main"><header class="topbar"><div class="top-left"><span class="hamb">☰</span><span class="breadcrumb">Workspace <span>/</span> ${esc(META[mod].title)}</span></div><div class="top-right"><span class="live"><i></i> Training Environment</span><a href="/page/account/my-profile" class="topicon">♧</a><div class="avatar small">${esc(user.slice(0,1))}</div></div></header><main class="content">${pageHeader(title,desc)}${content}<footer class="footer">© 2026 Moklet Digital Solutions <span>Internal Enterprise Portal · ${esc(INSTANCE)} · Demo Data</span></footer></main></div></div></body></html>`;
}
const stat = (label,value,sub,kind = 'blue') => `<div class="stat ${kind}"><div class="stat-label">${esc(label)}</div><div class="stat-number">${esc(value)}</div><div class="stat-sub">${esc(sub)}</div></div>`;
const chart = () => chartTemplate;
export async function dashboard() {
  const stats = '<div class="stats">'+stat('Total Employees',(await query('SELECT id FROM employees')).length,'Across 6 departments')+stat('Active Projects',(await query("SELECT id FROM projects WHERE status='Active'")).length,'Cross-functional initiatives','purple')+stat('Open Tickets',(await records('tickets',"WHERE status='Open'")).length,'Helpdesk queue','orange')+stat('Assets Managed',(await query('SELECT id FROM assets')).length,'Inventory register','green')+'</div>';
  const hero = '<div class="hero"><div class="hero-copy"><div class="eyebrow light">YOUR WORKSPACE, CONNECTED</div><h2>Good morning, team! 👋</h2><p>Everything you need to collaborate, manage operations, and keep projects moving forward.</p><a href="/module/projects" class="hero-btn">Explore Projects →</a></div><img src="/static/hero.svg" alt="Team collaboration illustration"></div>';
  let body = hero+stats+'<div class="twocol">'+card('Performance Overview',chart(),'<span class="muted">2026 · Activity trend</span>')+card('Recent Activity',(await records('activity','ORDER BY id DESC LIMIT 6')).map(r => `<div class="activity"><span class="dot"></span><div><b>${esc(r.actor)}</b> ${esc(r.action.toLowerCase())}<small>${esc(r.created)}</small></div></div>`).join(''))+'</div>';
  body += card('Current Projects',table((await query('SELECT id,title,status,owner,progress FROM projects LIMIT 6')),[['title','Project'],['owner','Owner'],['status','Status'],['progress','Progress %']],r => `/record/projects/${r.id}`),'<a href="/page/projects/projects" class="link">View all →</a>');
  return body;
}
export function moduleIndex(m) {
  const cards = META[m].pages.filter(p => canPage(current().role,m,slugify(p))).map(p => `<a class="modulecard" href="${slugpath(m,p)}"><div class="modicon">${icon(m)}</div><b>${esc(p)}</b><span>Open workspace <strong>↗</strong></span></a>`).join('');
  return '<div class="modulegrid">'+cards+'</div>';
}
const documentFields = [['name','Document Name','text'],['folder','Folder','select',['General','Projects','HR','IT']],['visibility','Visibility','select',['Internal','Team']]];
export async function page(m, slug, q, user, role) {
  const key = `${m}/${slug}`, title = PAGE_MAP[key];
  const value = (name, fallback = '', limit = 90) => (q.get(name) ?? fallback).slice(0,limit);
  if (key === 'dashboard/overview') return (await dashboard());
  if (key === 'dashboard/activity-feed') return card('Activity Feed',table((await records('activity','ORDER BY id DESC')),[['actor','Team Member'],['action','Activity'],['created','Time']]));
  if (key === 'dashboard/calendar') return card('Team Calendar — November 2026','<div class="calendar">'+Array.from({length:30},(_,idx) => { const i = idx+1; return `<div class="day"><b>${i}</b>${[4,11,18,25].includes(i) ? '<small>Project review</small>' : [6,13,20,27].includes(i) ? '<small>Team sync</small>' : ''}</div>`; }).join('')+'</div>');
  if (key === 'hr/employees') {
    const term = value('q');
    const rows = (await query('SELECT id,name,department,position,email,status FROM employees WHERE name LIKE ? LIMIT 100', ['%'+term+'%']));
    return card('Employee Directory',searchform(slugpath(m,title),'q','Search records',term)+table(rows,[['name','Employee'],['department','Department'],['position','Position'],['email','Email'],['status','Status']],r => `/record/employees/${r.id}`),'<span class="muted">Search and manage staff</span>');
  }
  if (key === 'reports/report-builder') {
    const dept = value('department','Engineering');
    const rows = (await trainingSelect("SELECT id,name,department,position FROM employees WHERE department = '"+dept+"' LIMIT 100"));
    return card('Custom Employee Report',searchform(slugpath(m,title),'department','Filter by department',dept)+table(rows,[['name','Employee'],['department','Department'],['position','Position']])+'<form method="post" action="/action/export"> <input type="hidden" name="title" value="Employee Department Report"><button class="secondary">Record Export</button></form>');
  }
  if (key === 'helpdesk/tickets') return card('Service Desk Tickets',searchform('/search/helpdesk')+table((await records('tickets','ORDER BY id DESC')),[['title','Ticket'],['status','Status'],['priority','Priority'],['category','Category'],['assignee','Assigned To']],r => `/record/tickets/${r.id}`),'<a class="primary" href="/page/helpdesk/create-ticket">+ New Ticket</a>');
  if (key === 'helpdesk/create-ticket') return card('Submit New Support Ticket',form('/action/create-ticket',[['title','Subject','text'],['category','Category','select',['Network','Hardware','Software','Access']],['priority','Priority','select',['Low','Medium','High']],['description','Description','textarea']],'Submit Ticket'));
  if (key === 'helpdesk/ticket-comments') {
    const tickets = await records('tickets','ORDER BY id');
    const commentForm = tickets.length
      ? form('/action/comment',[['ticket_id','Ticket','select',tickets.map(t => [String(t.id),`#${t.id} — ${t.title}`])],['body','Add a comment','textarea']],'Post Comment')
      : '<p>Belum ada tiket yang bisa dipilih. <a class="link" href="/page/helpdesk/create-ticket">Buat tiket terlebih dahulu</a>.</p>';
    const frames = (await records('comments','ORDER BY id DESC LIMIT 20')).map(r => '<div class="comment"><div class="commenttop"><b>'+esc(r.author)+'</b><small>'+esc(r.created)+'</small></div><iframe sandbox="allow-scripts allow-modals" referrerpolicy="no-referrer" srcdoc="'+esc('<div style="font:14px system-ui;padding:12px">'+r.body+'</div>')+'"></iframe></div>').join('');
    return card('Discussion & Updates',commentForm+frames+'<p class="hint">Comments are displayed inside a restricted sandbox for training.</p>');
  }
  if (key === 'helpdesk/knowledge-base') {
    const articles = ['How to reset your corporate password','VPN troubleshooting guide','Wi-Fi and network best practices','Report a suspicious email','Laptop asset return procedure','New employee onboarding checklist'];
    return '<div class="modulegrid">'+articles.map(a => `<div class="modulecard"><div class="modicon">${icon('documents')}</div><b>${esc(a)}</b><span>Updated Nov 2026</span></div>`).join('')+'</div>';
  }
  if (key === 'documents/upload') return card('Upload Document Metadata',form('/action/document',documentFields,'Add Document')+'<p class="hint">Metadata-only demo. File contents are not uploaded.</p>');
  if (m === 'documents' && ['document-detail','folder-detail'].includes(slug)) return card('Document Details & Files',table((await records('documents','ORDER BY id DESC LIMIT 20')),[['name','Document'],['folder','Folder'],['owner','Owner'],['visibility','Access']])+'<div class="doclinks"><a href="/document/download?file=employee-handbook.txt">Employee Handbook (.txt)</a><a href="/document/download?file=security-policy.txt">Security Policy (.txt)</a></div>'+form('/action/document',documentFields,'Create Document Record'));
  if (key === 'assets/borrowing') return card('Asset Borrowing Request',form('/action/loan',[['asset_id','Asset ID','number'],['employee','Employee Name','text']],'Request Asset')+table((await records('loans','ORDER BY id DESC')),[['asset_id','Asset ID'],['employee','Employee'],['borrowed','Borrowed'],['status','Status']]));
  if (key === 'finance/expense-detail') return card('Submit Expense',form('/action/expense',[['title','Expense Description','text'],['amount','Amount (IDR)','number'],['category','Category','select',['IT','Operations','Procurement','Training']]],'Submit for Approval')+table((await records('expenses','ORDER BY id DESC LIMIT 10')),[['title','Expense'],['amount','Amount'],['status','Status']]));
  if (key === 'admin/settings') return card('Organization Settings',form('/action/settings',[['organization','Organization Name','text']],'Update Settings')+'<p class="hint">Settings in this training environment do not modify the host.</p>');
  if (key === 'admin/roles') {
    const roles = Object.entries(ROLE_MODULES).map(([role,modules]) => [role,MODULES.filter(([m]) => modules.includes(m)).map(([,title]) => title).join(', ')]);
    return '<div class="modulegrid">'+roles.map(([a,b]) => `<div class="modulecard"><div class="modicon">${icon('account')}</div><b>${esc(a)}</b><p>${esc(b)}</p></div>`).join('')+'</div>';
  }
  if (key === 'account/my-profile') return card('Profile & Preferences','<div class="profile"><img src="/static/avatar.svg" alt="Profile photo"><div><h2>'+esc(user)+'</h2><p>'+esc(role)+' · Moklet Digital Solutions</p><p>training@moklet.example</p></div></div>');
  if (m === 'account') return card(title,'<p>This demonstration uses role switching from the login page. Password reset does not send real email.</p><a class="primary" href="/login">Open Login</a>');
  if (key === 'reports/report-dashboard') return '<div class="stats">'+stat('Total Employees',(await records('employees')).length,'Active directory')+stat('Projects',(await records('projects')).length,'All workstreams','purple')+stat('Tickets',(await records('tickets')).length,'Service desk','orange')+'</div>'+card('Operations Trend',chart());
  if (key === 'projects/project-detail') return card('Project Portfolio',table((await records('projects')),[['title','Project'],['owner','Owner'],['status','Status'],['progress','Progress %']],r => `/record/projects/${r.id}`));
  if (key === 'projects/task-detail') return card('Task Management',form('/action/task',[['title','Task Title','text'],['assignee','Assignee','text'],['priority','Priority','select',['Low','Medium','High']]],'Create Task')+table((await records('tasks','ORDER BY id DESC')),[['title','Task'],['assignee','Assignee'],['status','Status'],['priority','Priority']],r => `/record/tasks/${r.id}`));
  if (key === 'hr/employee-detail') return card('Employee Profiles',table((await records('employees')),[['name','Employee'],['department','Department'],['position','Position'],['email','Email']],r => `/record/employees/${r.id}`));
  if (key === 'helpdesk/ticket-detail') return card('Ticket Detail',table((await records('tickets')),[['title','Subject'],['requester','Requester'],['status','Status'],['assignee','Assigned To']],r => `/record/tickets/${r.id}`));
  if (key === 'assets/asset-detail') return card('Asset Detail',table((await records('assets')),[['name','Asset'],['tag','Tag'],['category','Category'],['status','Status']],r => `/record/assets/${r.id}`));
  if (TABLES[key]) {
    const [tbl,cols] = TABLES[key], rows = (await records(tbl,'ORDER BY id DESC'));
    return card(title,table(rows,cols,['employees','projects','tasks','tickets','assets','expenses'].includes(tbl) ? r => `/record/${tbl}/${r.id}` : undefined),'<span class="muted">'+rows.length+' records</span>');
  }
  return card(title,'<p>Workspace operational view.</p>'+moduleIndex(m));
}
