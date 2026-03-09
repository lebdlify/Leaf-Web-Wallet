const API_BASE = 'https://ldc.scmain.com/api/';
const COOKIE_NAME = 'ldc_api_key';
const ACCOUNTS_KEY = 'ldc_wallet_accounts';
const ACTIVE_KEY = 'ldc_wallet_active_account';
const BROWSE_KEY = 'ldc_wallet_browse_user';

const state = {
  apiKey: '',
  accounts: [],
  activeAccount: '',
  browseUser: '',
  browseBalances: null,
  browseLoans: null,
  browseDebts: null,
  pretrade: null,
};

const fullOperations = {
  getfee: { title: 'Get fee', method: 'getfee', help: 'Fetch transaction fee for token.', fields:[{name:'t',label:'Token',required:true,placeholder:'LDC'}] },
  getdec: { title: 'Get decimals', method: 'getdec', help: 'Fetch decimals for token.', fields:[{name:'t',label:'Token',required:true,placeholder:'LDC'}] },
  getbal: { title: 'Get balance', method: 'getbal', help: 'Leave token empty for full wallet.', fields:[{name:'u',label:'User',required:true,auto:'user',placeholder:'Auto user'},{name:'t',label:'Token',placeholder:'Optional'}] },
  getworth: { title: 'Get worth', method: 'getworth', help: 'Estimate worth of amount.', fields:[{name:'t',label:'Token',required:true,placeholder:'BTC'},{name:'a',label:'Amount',required:true,placeholder:'1'}] },
  price: { title: 'Get price', method: 'price', help: 'Pool price between c and e.', fields:[{name:'c',label:'Token C',required:true,placeholder:'BTC'},{name:'e',label:'Quote token',placeholder:'LDC'}] },
  loans: { title: 'Get loans', method: 'loans', help: 'User auto-fills from browse target or active account.', fields:[{name:'u',label:'User',required:true,auto:'user',placeholder:'Auto user'}] },
  debts: { title: 'Get debts', method: 'debts', help: 'Empty user means all accessible debts.', fields:[{name:'u',label:'User',auto:'userOpt',placeholder:'Optional auto user'}] },
  send: { title: 'Send payment', method: 'send', help: 'Optional max fee stays omitted if empty.', success:'Payment sent successfully.', clearOnSuccess:true, refreshBalances:true, fields:[{name:'s',label:'Sender',required:true,auto:'active',placeholder:'Active account'},{name:'t',label:'Recipient',required:true,placeholder:'ldp#user'},{name:'c',label:'Token',required:true,placeholder:'LDC'},{name:'a',label:'Amount',required:true,placeholder:'10'},{name:'f',label:'Max fee',placeholder:'Optional'}] },
  pretrade: { title: 'Pre-trade', method: 'pretrade', help: 'Preview result, then run Trade from the preview box.', pretrade:true, fields:[{name:'u',label:'User',required:true,auto:'active',placeholder:'Active account'},{name:'a',label:'Amount',required:true,placeholder:'10'},{name:'c',label:'Token',required:true,placeholder:'BTC'},{name:'t1',label:'Pair token 1',required:true,placeholder:'BTC'},{name:'t2',label:'Pair token 2',required:true,placeholder:'LDC'},{name:'d',label:'Direction',type:'select',options:['buy','sell'],required:true}] },
  trade: { title: 'Trade', method: 'trade', help: 'Execute trade directly.', success:'Trade executed successfully.', clearOnSuccess:true, refreshBalances:true, fields:[{name:'u',label:'User',required:true,auto:'active',placeholder:'Active account'},{name:'a',label:'Amount',required:true,placeholder:'10'},{name:'c',label:'Token',required:true,placeholder:'BTC'},{name:'t1',label:'Pair token 1',required:true,placeholder:'BTC'},{name:'t2',label:'Pair token 2',required:true,placeholder:'LDC'},{name:'d',label:'Direction',type:'select',options:['buy','sell'],required:true}] },
  loancreate: { title: 'Create loan', method: 'loancreate', help: 'Create pending loan offer.', success:'Loan offer created successfully.', clearOnSuccess:true, refreshBalances:true, fields:[{name:'giver',label:'Giver',required:true,auto:'active',placeholder:'Active account'},{name:'borrower',label:'Borrower',required:true,placeholder:'ldp#user'},{name:'amount',label:'Amount',required:true,placeholder:'100'},{name:'rate',label:'Daily rate %',required:true,placeholder:'0.1'}] },
  loanaccept: { title: 'Accept loan', method: 'loanaccept', help: 'Borrower accepts pending loan offer.', success:'Loan accepted successfully.', clearOnSuccess:true, refreshBalances:true, fields:[{name:'borrower',label:'Borrower',required:true,auto:'active',placeholder:'Active account'},{name:'giver',label:'Giver',required:true,placeholder:'ldp#bank'},{name:'amount',label:'Amount',required:true,placeholder:'100'},{name:'rate',label:'Daily rate %',required:true,placeholder:'0.1'}] },
  loanpay: { title: 'Repay loan', method: 'loanpay', help: 'Repay lender.', success:'Loan repaid successfully.', clearOnSuccess:true, refreshBalances:true, fields:[{name:'borrower',label:'Borrower',required:true,auto:'active',placeholder:'Active account'},{name:'giver',label:'Creditor',required:true,placeholder:'ldp#bank'},{name:'amount',label:'Amount',required:true,placeholder:'50'}] },
  loandrop: { title: 'Transfer debt', method: 'loandrop', help: 'Move chained debt to creditor.', success:'Debt transfer completed.', clearOnSuccess:true, fields:[{name:'self',label:'Self',required:true,auto:'active',placeholder:'Active account'},{name:'creditor',label:'Creditor',required:true,placeholder:'ldp#bank'},{name:'debtor',label:'Debtor',required:true,placeholder:'ldp#user'}] },
  newapi: { title: 'Create new API', method: 'newapi', help: 'Create or extend child API.', success:'API creation request completed.', clearOnSuccess:true, fields:[{name:'api',label:'New API key',required:true,placeholder:'new-secret-key'},{name:'ver',label:'Parent API key',required:true,placeholder:'parent-api-key'},{name:'dom',label:'Domains',placeholder:'ldp+swap'},{name:'us',label:'Users',placeholder:'ldp#user1+ldp#user2'},{name:'exe',label:'Executor',required:true,auto:'active',placeholder:'Active account'},{name:'maxfee',label:'Max fee',required:true,placeholder:'Required'}] },
};
const quickOps = ['send','trade','loancreate','loanaccept','loanpay','newapi'];

const ui = {};

function $(id){ return document.getElementById(id); }
function esc(v){ return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function setCookie(name,value,days=365){ const exp=new Date(Date.now()+days*864e5).toUTCString(); document.cookie=`${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`; }
function getCookie(name){ const prefix=`${encodeURIComponent(name)}=`; const found=document.cookie.split('; ').find(v=>v.startsWith(prefix)); return found?decodeURIComponent(found.slice(prefix.length)):''; }
function deleteCookie(name){ document.cookie=`${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`; }
function preferredUser(){ return state.browseUser || state.activeAccount || ''; }
function numLike(v){ return !(v === '' || v === null || v === undefined); }
function formatTime(v){ const n = Number(v); if(!n) return '—'; const d = new Date(n*1000); return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleString(); }

function humanError(code, extra=''){
  const map = {
    BAD_API:'API key is invalid or missing.', NO_PERM:'You do not have permission for this action.',
    NO_PERM_DOM:'Domain is not allowed by parent API.', NO_PERM_USER:'User is not allowed by parent API.',
    BAD_AMOUNT:'Amount is invalid.', BAD_NUMBER:'Numeric value is invalid.', NO_FUNDS:'Insufficient funds.',
    NO_FUNDS_OR_FEE:'Insufficient funds or fee limit too low.', PAY_FAIL:'Payment failed.', EMPTY_PERMS:'Domains and users are both empty.',
    LOW_FEE:'Max fee is too low.', NOT_FOUND:'Requested object was not found.', NO_LOANS:'No loans found.',
    NO_GIVER:'Creditor has no loans.', NO_SELF_LOANS:'Self has no loans.', NO_CREDITOR_LOANS:'Creditor has no loans.',
    BAD_RATE:'Rate is invalid.', BAD_M:'Unknown API method.', FAIL:'Request failed.'
  };
  return `${map[code] || code}${extra ? `\nExtra: ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`;
}
function setResponse(message, bad=false){ ui.responseBox.textContent = typeof message === 'string' ? message : JSON.stringify(message,null,2); ui.responseBox.classList.toggle('bad', !!bad); ui.responseBox.classList.toggle('ok', !bad); }

function loadState(){
  state.apiKey = getCookie(COOKIE_NAME) || '';
  try { state.accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]'); } catch { state.accounts = []; }
  state.activeAccount = localStorage.getItem(ACTIVE_KEY) || (state.accounts[0]?.name || '');
  state.browseUser = localStorage.getItem(BROWSE_KEY) || '';
}
function saveAccounts(){ localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts)); localStorage.setItem(ACTIVE_KEY, state.activeAccount || ''); }
function saveBrowse(){ localStorage.setItem(BROWSE_KEY, state.browseUser || ''); }

function collectUi(){
  ['apiForm','apiInput','showApiBtn','clearApiBtn','apiStatusText','apiStateText','accountForm','accountNameInput','accountAliasInput','accountsList','activeAccountName','activeAccountAlias','activeAccountMeta','accountCountText','accountStateText','accountDropdownToggle','accountDropdownMenu','dashboardTitle','dashboardText','responseBox','clearResponseBtn','loadBalancesBtn','loadLoansBtn','loadDebtsBtn','refreshActiveBtn','reloadLowerBalancesBtn','balancesTableBody','loansTableBody','debtsTableBody','activeBalancesBody','operationType','dynamicOperationForm','operationTitle','operationHelp','logoutBtn','mobileLogoutBtn','browseForm','browseUserInput','browseResetBtn','browseTokenInput','browseTargetText','browseStateText','browseBalancesBtn','browseLoansBtn','browseDebtsBtn','browseRefreshAllBtn','mobileNavToggle','headerNav','headerApiBtn','mobileApiBtn','apiCard','pretradeResult','hideZeroLoansToggle','exportBalancesBtn','exportLoansBtn','exportDebtsBtn'].forEach(id=>ui[id]=$(id));
}

function updateApiView(){
  const logged = !!state.apiKey;
  ui.apiInput.value = logged ? state.apiKey : '';
  ui.apiInput.type = 'password';
  ui.showApiBtn.textContent = 'Show';
  ui.apiStatusText.textContent = logged ? 'Ready' : 'Missing';
  ui.apiStateText.textContent = logged ? 'Saved in cookie' : 'Missing';
  ui.apiStatusText.classList.toggle('ready', logged);
  ui.apiCard.classList.toggle('hidden', logged);
}
function updateAccountState(){
  const active = state.accounts.find(a=>a.name===state.activeAccount);
  ui.accountCountText.textContent = String(state.accounts.length);
  ui.activeAccountName.textContent = active?.name || 'No account';
  ui.activeAccountAlias.textContent = active?.alias || (state.accounts.length ? 'Choose account' : 'Open to add one');
  ui.activeAccountMeta.textContent = active ? `Using ${active.name}` : 'No active account.';
  ui.accountStateText.textContent = active?.name || 'None';
  ui.browseStateText.textContent = state.browseUser || 'None';
  ui.browseTargetText.textContent = state.browseUser ? `Target: ${state.browseUser}` : 'No browse target yet.';
  ui.dashboardTitle.textContent = active ? active.name : 'No account selected';
  ui.dashboardText.textContent = active ? 'Run operations, browse balances and manage loans with a cleaner web wallet.' : 'Save an API key, add an account, then start using the wallet.';
  ui.browseUserInput.value = state.browseUser || '';
  const openByDefault = !(state.accounts.length && state.activeAccount);
  ui.accountDropdownMenu.classList.toggle('open', openByDefault);
  ui.accountDropdownToggle.setAttribute('aria-expanded', String(openByDefault));
}
function renderAccounts(){
  if(!state.accounts.length){ ui.accountsList.innerHTML = '<div class="account-row"><div class="subtle">No accounts saved yet.</div></div>'; return; }
  ui.accountsList.innerHTML = state.accounts.map(acc => `
    <div class="account-row ${acc.name===state.activeAccount ? 'active' : ''}">
      <div class="account-top"><div><strong>${esc(acc.name)}</strong><div class="account-alias">${esc(acc.alias || 'No label')}</div></div></div>
      <div class="account-actions">
        <button type="button" class="ghost-btn compact-btn" data-switch-account="${esc(acc.name)}">Use</button>
        <button type="button" class="ghost-btn compact-btn" data-browse-account="${esc(acc.name)}">Browse</button>
        <button type="button" class="ghost-btn compact-btn" data-remove-account="${esc(acc.name)}">Remove</button>
      </div>
    </div>`).join('');
  ui.accountsList.querySelectorAll('[data-switch-account]').forEach(btn=>btn.onclick=()=>{ state.activeAccount=btn.dataset.switchAccount; saveAccounts(); updateAccountState(); renderAccounts(); renderOperationForm(); loadActiveBalances(); setResponse(`Active account: ${state.activeAccount}`); ui.accountDropdownMenu.classList.remove('open'); });
  ui.accountsList.querySelectorAll('[data-browse-account]').forEach(btn=>btn.onclick=()=>{ state.browseUser=btn.dataset.browseAccount; saveBrowse(); updateAccountState(); setResponse(`Browse target: ${state.browseUser}`); switchPanel('browsePanel'); ui.accountDropdownMenu.classList.remove('open'); });
  ui.accountsList.querySelectorAll('[data-remove-account]').forEach(btn=>btn.onclick=()=>{ state.accounts = state.accounts.filter(a=>a.name!==btn.dataset.removeAccount); if(state.activeAccount===btn.dataset.removeAccount) state.activeAccount = state.accounts[0]?.name || ''; saveAccounts(); updateAccountState(); renderAccounts(); renderOperationForm(); setResponse('Account removed.'); });
}
function fillOperationOptions(){
  ui.operationType.innerHTML = Object.entries(fullOperations).map(([k,v])=>`<option value="${esc(k)}">${esc(v.title)}</option>`).join('');
}
function valueForAuto(kind){ if(kind==='active') return state.activeAccount || ''; if(kind==='user') return preferredUser(); if(kind==='userOpt') return preferredUser() || ''; return ''; }

function renderOperationForm(){
  const key = ui.operationType.value || 'send';
  const cfg = fullOperations[key];
  ui.operationTitle.textContent = cfg.title;
  ui.operationHelp.textContent = cfg.help;
  ui.pretradeResult.classList.add('hidden');
  let buttons = `<button type="submit" class="primary-btn">Run ${esc(cfg.title)}</button><button type="button" class="ghost-btn" id="fillAutoBtn">Fill active user</button>`;
  const html = cfg.fields.map(field=>{
    const value = valueForAuto(field.auto);
    if(field.type==='select') return `<label><span>${esc(field.label)}</span><select name="${esc(field.name)}">${field.options.map(opt=>`<option value="${esc(opt)}">${esc(opt)}</option>`).join('')}</select></label>`;
    return `<label><span>${esc(field.label)}${field.required?' *':''}</span><input name="${esc(field.name)}" ${field.required?'required':''} value="${esc(value)}" placeholder="${esc(field.placeholder||'')}"></label>`;
  }).join('');
  ui.dynamicOperationForm.innerHTML = `${html}<div class="form-actions">${buttons}</div>`;
  $('fillAutoBtn').onclick = () => renderOperationForm();
}

function switchPanel(id){ document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id===id)); document.querySelectorAll('.nav-chip,[data-panel-target]').forEach(b=>b.classList.toggle('active', b.dataset.panelTarget===id)); if(window.innerWidth<=768){ ui.headerNav.classList.remove('open'); ui.mobileNavToggle.setAttribute('aria-expanded','false'); } }

async function apiRequest(method, params={}){
  if(!state.apiKey) throw new Error('API key is missing.');
  const query = new URLSearchParams({ m: method, api: state.apiKey });
  Object.entries(params).forEach(([k,v])=>{ if(v !== '' && v !== null && v !== undefined) query.set(k, String(v)); });
  const res = await fetch(`${API_BASE}?${query.toString()}`, { method:'GET', mode:'cors' });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { return text; }
  if(parsed.ok === 1) return parsed.data;
  const err = new Error(humanError(parsed.err, parsed.extra)); err.raw = parsed; throw err;
}

function renderBalances(body, data){
  state.browseBalances = data;
  let rows = [];
  if(data && typeof data === 'object' && !Array.isArray(data)) rows = Object.entries(data).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`);
  else if(numLike(data)) rows = [`<tr><td>LDC</td><td>${esc(data)}</td></tr>`];
  body.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="2">No balances returned.</td></tr>';
}
function renderLoans(data){
  state.browseLoans = Array.isArray(data) ? data : [];
  let rows = state.browseLoans;
  if(ui.hideZeroLoansToggle.checked) rows = rows.filter(r => Number(r.amount||0) !== 0);
  ui.loansTableBody.innerHTML = rows.length ? rows.map(item=>`<tr><td>${esc(item.borrower||'')}</td><td>${esc(item.amount||'')}</td><td>${esc(item.rate||'')}</td><td>${formatTime(item.time)}</td></tr>`).join('') : '<tr><td colspan="4">No loans loaded.</td></tr>';
}
function renderDebts(data){
  state.browseDebts = Array.isArray(data) ? data : [];
  ui.debtsTableBody.innerHTML = state.browseDebts.length ? state.browseDebts.map(item=>`<tr><td>${esc(item.creditor||'')}</td><td>${esc(item.borrower||'')}</td><td>${esc(item.debt||'')}</td><td>${esc(item.rate||'')}</td></tr>`).join('') : '<tr><td colspan="4">No debts loaded.</td></tr>';
}
function downloadCsv(name, rows){
  if(!rows.length){ setResponse('Nothing to export.', true); return; }
  const csv = rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

async function runOperation(cfg, params, form=null){
  try {
    setResponse('Loading…');
    const result = await apiRequest(cfg.method, params);
    let msg = cfg.success || `${cfg.title} completed successfully.`;
    if(cfg.method==='getbal'){ renderBalances(ui.balancesTableBody, result); msg = 'Balances loaded successfully.'; if((params.u||'') === preferredUser()) renderBalances(ui.activeBalancesBody, result); }
    if(cfg.method==='loans'){ renderLoans(result); msg = 'Loans loaded successfully.'; }
    if(cfg.method==='debts'){ renderDebts(result); msg = 'Debts loaded successfully.'; }
    if(cfg.method==='getfee' || cfg.method==='getdec' || cfg.method==='getworth' || cfg.method==='price') msg = `${cfg.title}: ${typeof result === 'string' ? result : JSON.stringify(result)}`;
    if(cfg.pretrade){
      state.pretrade = { params, result };
      ui.pretradeResult.innerHTML = `<strong>Pre-trade ready</strong><div>${esc(JSON.stringify(result))}</div><button type="button" class="primary-btn" id="executeTradeBtn">Execute trade</button>`;
      ui.pretradeResult.classList.remove('hidden');
      $('executeTradeBtn').onclick = async ()=>{
        const tradeCfg = fullOperations.trade;
        await runOperation(tradeCfg, params, ui.dynamicOperationForm);
      };
      setResponse('Pre-trade loaded. Use Execute trade to continue.');
      return;
    }
    setResponse(typeof result === 'string' && !cfg.success ? result : msg, false);
    if(cfg.clearOnSuccess && form){ form.querySelectorAll('input').forEach(inp=>{ if(!inp.name) return; const field = cfg.fields.find(f=>f.name===inp.name); inp.value = valueForAuto(field?.auto) || ''; }); form.querySelectorAll('select').forEach(sel=> sel.selectedIndex = 0); }
    if(cfg.refreshBalances){ await loadActiveBalances(); }
  } catch(err){ setResponse(err.message || 'Request failed.', true); }
}

async function loadActiveBalances(){ if(!state.activeAccount || !state.apiKey) return; try { const result = await apiRequest('getbal', {u: state.activeAccount}); renderBalances(ui.activeBalancesBody, result); } catch(err){ setResponse(err.message || 'Could not load active balances.', true); } }
async function loadBrowseBalances(){ const user = state.browseUser || state.activeAccount; if(!user){ setResponse('Choose a browse target or active account first.', true); return; } const params={u:user}; const tok = ui.browseTokenInput.value.trim(); if(tok) params.t=tok; await runOperation(fullOperations.getbal, params); }
async function loadBrowseLoans(){ const user = state.browseUser || state.activeAccount; if(!user){ setResponse('Choose a browse target or active account first.', true); return; } await runOperation(fullOperations.loans, {u:user}); }
async function loadBrowseDebts(){ const user = state.browseUser || state.activeAccount || ''; await runOperation(fullOperations.debts, user?{u:user}:{}) }
async function loadBrowseAll(){ await loadBrowseBalances(); await loadBrowseLoans(); await loadBrowseDebts(); }

function bindEvents(){
  document.querySelectorAll('[data-panel-target]').forEach(btn=>btn.addEventListener('click',()=>switchPanel(btn.dataset.panelTarget)));
  document.querySelectorAll('.quick-action[data-operation]').forEach(btn=>btn.addEventListener('click',()=>{ ui.operationType.value = btn.dataset.operation; renderOperationForm(); switchPanel('opsPanel'); }));
  document.querySelector('[data-show-all]')?.addEventListener('click',()=>{ switchPanel('opsPanel'); });

  ui.mobileNavToggle.onclick = ()=>{ const open = ui.headerNav.classList.toggle('open'); ui.mobileNavToggle.setAttribute('aria-expanded', String(open)); };
  ui.accountDropdownToggle.onclick = ()=>{ const open = ui.accountDropdownMenu.classList.toggle('open'); ui.accountDropdownToggle.setAttribute('aria-expanded', String(open)); };
  ui.headerApiBtn.onclick = ()=> ui.apiCard.classList.toggle('hidden');
  ui.mobileApiBtn.onclick = ()=> ui.apiCard.classList.toggle('hidden');

  ui.apiForm.onsubmit = e=>{ e.preventDefault(); const val = ui.apiInput.value.trim(); if(!val){ setResponse('Enter API key first.', true); return; } state.apiKey = val; setCookie(COOKIE_NAME, val); updateApiView(); setResponse('API key saved successfully.'); };
  ui.showApiBtn.onclick = ()=>{ ui.apiInput.type = ui.apiInput.type === 'password' ? 'text' : 'password'; ui.showApiBtn.textContent = ui.apiInput.type === 'password' ? 'Show' : 'Hide'; };
  ui.clearApiBtn.onclick = ()=>{ state.apiKey=''; deleteCookie(COOKIE_NAME); updateApiView(); setResponse('API key cleared.'); };
  const doLogout = ()=>{ state.apiKey=''; deleteCookie(COOKIE_NAME); updateApiView(); setResponse('Logged out. API cookie removed.'); };
  ui.logoutBtn.onclick = doLogout; ui.mobileLogoutBtn.onclick = doLogout;

  ui.accountForm.onsubmit = e=>{ e.preventDefault(); const name = $('accountNameInput').value.trim(); const alias = $('accountAliasInput').value.trim(); if(!name){ setResponse('Account name is required.', true); return; } const ex = state.accounts.find(a=>a.name===name); if(ex) ex.alias = alias || ex.alias; else state.accounts.unshift({name, alias}); state.activeAccount = name; saveAccounts(); $('accountNameInput').value=''; $('accountAliasInput').value=''; updateAccountState(); renderAccounts(); renderOperationForm(); loadActiveBalances(); setResponse(`Account ${name} saved.`); };

  ui.clearResponseBtn.onclick = ()=> setResponse('No requests yet.');
  ui.loadBalancesBtn.onclick = loadActiveBalances;
  ui.loadLoansBtn.onclick = loadBrowseLoans;
  ui.loadDebtsBtn.onclick = loadBrowseDebts;
  ui.refreshActiveBtn.onclick = loadActiveBalances;
  ui.reloadLowerBalancesBtn.onclick = loadActiveBalances;

  ui.browseForm.onsubmit = e=>{ e.preventDefault(); state.browseUser = ui.browseUserInput.value.trim(); saveBrowse(); updateAccountState(); setResponse(state.browseUser ? `Browse target set to ${state.browseUser}.` : 'Browse target cleared.'); };
  ui.browseResetBtn.onclick = ()=>{ state.browseUser=''; ui.browseUserInput.value=''; saveBrowse(); updateAccountState(); setResponse('Browse target reset.'); };
  ui.browseBalancesBtn.onclick = loadBrowseBalances; ui.browseLoansBtn.onclick = loadBrowseLoans; ui.browseDebtsBtn.onclick = loadBrowseDebts; ui.browseRefreshAllBtn.onclick = loadBrowseAll;
  ui.hideZeroLoansToggle.onchange = ()=> renderLoans(state.browseLoans || []);
  ui.exportBalancesBtn.onclick = ()=> downloadCsv(`${preferredUser() || 'balances'}.csv`, [['token','balance'], ...Object.entries(state.browseBalances || {})]);
  ui.exportLoansBtn.onclick = ()=> downloadCsv(`${preferredUser() || 'loans'}.csv`, [['borrower','amount','rate','time'], ...(state.browseLoans||[]).filter(r=>!ui.hideZeroLoansToggle.checked || Number(r.amount||0)!==0).map(r=>[r.borrower,r.amount,r.rate,formatTime(r.time)])]);
  ui.exportDebtsBtn.onclick = ()=> downloadCsv(`${preferredUser() || 'debts'}.csv`, [['creditor','borrower','debt','rate'], ...(state.browseDebts||[]).map(r=>[r.creditor,r.borrower,r.debt,r.rate])]);

  ui.operationType.onchange = renderOperationForm;
  ui.dynamicOperationForm.onsubmit = async e=>{
    e.preventDefault();
    const cfg = fullOperations[ui.operationType.value];
    const fd = new FormData(ui.dynamicOperationForm);
    const params = {};
    for(const field of cfg.fields){
      let val = (fd.get(field.name) || '').toString().trim();
      if(!val && field.auto) val = valueForAuto(field.auto);
      if(field.required && !val){ setResponse(`${field.label} is required.`, true); return; }
      if(val) params[field.name] = val;
    }
    await runOperation(cfg, params, ui.dynamicOperationForm);
  };
}

function init(){
  collectUi();
  loadState();
  fillOperationOptions();
  ui.operationType.value = 'send';
  updateApiView();
  updateAccountState();
  renderAccounts();
  renderOperationForm();
  bindEvents();
  if(state.activeAccount && state.apiKey) loadActiveBalances();
}

init();
