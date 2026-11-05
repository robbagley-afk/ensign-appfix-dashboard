const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','app.js'),'utf8');
const registry=source.slice(source.indexOf('const SLUG_TO_APP'),source.indexOf('// One week'));
const fn=source.slice(source.indexOf('async function fetchLiveIssues'),source.indexOf('// Render cards'));
function issue(n,extra={}){return {number:n,title:'Issue '+n,body:'Approved public summary',labels:[{name:'appfix'}],assignees:[{login:'Rodrigomoll'}],html_url:'https://github.com/example/issues/'+n,created_at:'2026-11-04T00:00:00Z',state:'open',...extra}}
async function run(fetch,previous=[]){const ctx={document:{getElementById(){return null}},console:{warn(){}},state:{issues:previous},refreshBtn:{style:{}},fetch,render(){},extractStatus:i=>i.state==='closed'?'done':'backlog',extractUrgency:()=> 'medium',SEED_ISSUES:[{repo:'fake',number:999}],URL};vm.createContext(ctx);vm.runInContext(registry+'\n'+fn,ctx);await vm.runInContext('fetchLiveIssues()',ctx);return ctx;}
(async()=>{
const calls=[];const ctx=await run(async url=>{calls.push(url);const u=new URL(url);assert.equal(u.hostname,'api.github.com');assert.equal(u.searchParams.get('labels'),'appfix');const page=u.searchParams.get('page')||'1';if(u.pathname.includes('ENS-101-Guide'))return {ok:true,json:async()=>page==='1'?[...Array.from({length:99},(_,i)=>issue(i+1)),issue(100,{pull_request:{}})]:[issue(101)]};return {ok:true,json:async()=>[]}});
assert.equal(ctx.state.issues.length,100);assert(ctx.state.issues.some(x=>x.number===101));assert(!ctx.state.issues.some(x=>x.number===100));assert(calls.some(x=>x.includes('page=2')));assert(!ctx.refreshBtn.disabled);
const empty=await run(async()=>({ok:true,json:async()=>[]}));assert.equal(empty.state.issues.length,0,'Do not resurrect seeds');
const previous=[{repo:'robbagley-afk/ENS-101-Guide',number:7,title:'previous'}];
const partial=await run(async url=>url.includes('ENS-101-Guide')?{ok:false,status:403}:{ok:true,json:async()=>[]},previous);assert.equal(partial.state.issues.length,1);assert.match(partial.refreshBtn.title,/ENS-101-Guide|403/);
const tracker=await run(async url=>({ok:true,json:async()=>url.includes('/ensign-appfix-dashboard/')?[issue(8,{body:'Approved summary\n<!-- appfix-app: mentor-explorer -->'})]:[]}));assert.equal(tracker.state.issues.length,1);assert(!tracker.state.issues[0].description.includes('<!--')); assert.match(tracker.state.issues[0].app,/Mentor/);
const unknown=await run(async url=>({ok:true,json:async()=>url.includes('/ensign-appfix-dashboard/')?[issue(9,{body:'<!-- appfix-app: constructor -->'})]:[]}));assert.equal(unknown.state.issues.length,0,'Only own allowlisted app slugs');
const docRule=source.match(/const docFile =[\s\S]*?;/)[0];assert.equal(vm.runInNewContext(docRule+'docFile',{item:{number:28,repo:'robbagley-afk/ENS-101-Guide'}}),'ens101-issue-28.md');assert.equal(vm.runInNewContext(docRule+'docFile',{item:{number:28,repo:'robbagley-afk/ensign-appfix-dashboard'}}),'appfix-dispatch.md');
const unassigned=await run(async url=>({ok:true,json:async()=>url.includes('ENS-101-Guide')?[issue(12,{assignees:[],assignee:null})]:[]}));assert.equal(unassigned.state.issues[0].assignee,'Unassigned');assert(!unassigned.state.issues[0].assigneeAvatar.includes('Rodrigomoll'));
console.log('PASS pagination, PR exclusion, empty truth, partial errors, approved tracker app mapping, no legacy API calls');
})().catch(e=>{console.error(e);process.exit(1)});
