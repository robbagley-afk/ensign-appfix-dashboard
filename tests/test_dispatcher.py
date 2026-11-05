import importlib.util,unittest,subprocess
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('dispatch',str(__import__('pathlib').Path(__file__).resolve().parents[1]/'skills/appfix-cis/scripts/appfix_dispatch.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Checks(unittest.TestCase):
 def test_standard_type_labels(self):
  calls=[]
  with patch.object(m,'api_slurp',return_value=[]),patch.object(m,'gh',side_effect=lambda *a,**k:calls.append(a)):
   labels=m.ensure_labels('ENS-101-Guide','medium','bug',False)
  self.assertEqual(set(labels),{'appfix','urgency:medium','bug'})
 def test_network_diagnostic_before_auth(self):
  r=subprocess.CompletedProcess([],1,'','authentication failed: dial tcp: DNS lookup failed')
  with patch.object(m.subprocess,'run',return_value=r):
   with self.assertRaises((SystemExit,RuntimeError)) as cm:m.gh('api','user')
  self.assertIn('NETWORK',str(cm.exception));self.assertNotIn('gh auth login',str(cm.exception))

# End-to-end CLI behavior is exercised through a fake gh process, never GitHub test issues.
class FakeGitHub:
 def __init__(self,private=False,fail_mirror=False):self.private=private;self.fail_mirror=fail_mirror;self.issues={};self.labels={};self.writes=[]
 def __call__(self,args,**kwargs):
  import json
  from pathlib import Path
  a=args[1:]; result=None
  def value(flag):return a[a.index(flag)+1]
  if a[:2]==['api','user']:result={'login':'approved-user'}
  elif a[0]=='api':
   endpoint=next(x for x in a[1:] if x.startswith('repos/'));tail=endpoint.split('/');repo='/'.join(tail[1:3]);private=self.private and not repo.endswith('ensign-appfix-dashboard')
   if len(tail)==3:result={'private':private,'has_issues':True,'full_name':repo}
   elif tail[3].startswith('labels'):
    if '--method' in a:
     name=next(x[5:] for x in a if x.startswith('name='));self.labels.setdefault(repo,set()).add(name);self.writes.append(('label',repo,name));result={'name':name}
    else:result=[[{'name':x} for x in self.labels.get(repo,set())]]
   elif tail[3].startswith('issues?'):result=[self.issues.get(repo,[])]
   elif tail[3]=='issues':result=next(x for x in self.issues[repo] if x['number']==int(tail[4]))
   else:raise AssertionError(a)
  elif a[:2]==['issue','create']:
   repo=value('--repo')
   if self.fail_mirror and repo.endswith('ensign-appfix-dashboard'):return subprocess.CompletedProcess(args,1,'','HTTP 503 service unavailable')
   labels=[]
   for i,x in enumerate(a):
    if x=='--label':labels.extend(a[i+1].split(','))
   number=len(self.issues.get(repo,[]))+1
   issue={'number':number,'html_url':f'https://github.com/{repo}/issues/{number}','labels':[{'name':x} for x in labels],'assignees':[{'login':value('--assignee')}],'title':value('--title'),'body':Path(value('--body-file')).read_text()}
   self.issues.setdefault(repo,[]).append(issue);self.writes.append(('issue',repo,issue));return subprocess.CompletedProcess(args,0,issue['html_url']+'\n','')
  else:raise AssertionError(a)
  return subprocess.CompletedProcess(args,0,json.dumps(result),'')

class CLITests(unittest.TestCase):
 def invoke(self,fake,app='ens101',repo='ENS-101-Guide',approved=False,dry=False):
  import tempfile,io,contextlib,json
  from pathlib import Path
  with tempfile.TemporaryDirectory() as tmp:
   body=Path(tmp)/'body.md';body.write_text('PRIVATE ONLY body for source' if fake.private else 'Public workflow repair')
   public=Path(tmp)/'public.md';public.write_text('Approved generic summary')
   args=['dispatch','--repo',repo,'--app',app,'--title','Private original title' if fake.private else 'Workflow repair','--body-file',str(body),'--request-key','workflow-20261104','--urgency','medium','--type','bug']
   if approved:args+=['--approved-public-title','Approved public title','--approved-public-body-file',str(public)]
   if dry:args+=['--dry-run']
   out=io.StringIO();code=0
   with patch.object(m.sys,'argv',args),patch.object(m.subprocess,'run',side_effect=fake),contextlib.redirect_stdout(out):
    try:m.main()
    except SystemExit as e:code=e.code
   text=out.getvalue();start=text.find('{');return code,json.loads(text[start:]) if start>=0 else {},text
 def test_public_create_and_repeat(self):
  f=FakeGitHub();_,a,_=self.invoke(f);_,b,_=self.invoke(f)
  self.assertEqual(a['source_url'],b['source_url']);self.assertEqual(len(f.issues['robbagley-afk/ENS-101-Guide']),1)
  self.assertEqual({x['name'] for x in f.issues['robbagley-afk/ENS-101-Guide'][0]['labels']},{'appfix','urgency:medium','bug'})
 def test_private_source_needs_approval(self):
  f=FakeGitHub(private=True);_,a,_=self.invoke(f,app='readiness',repo='ensign-student-readiness-hub');self.assertEqual(a['dashboard_status'],'needs_public_summary_approval');self.assertNotIn('robbagley-afk/ensign-appfix-dashboard',f.issues)
 def test_mirror_uses_only_approved_text(self):
  f=FakeGitHub(private=True);self.invoke(f,app='readiness',repo='ensign-student-readiness-hub',approved=True);self.invoke(f,app='readiness',repo='ensign-student-readiness-hub',approved=True)
  mirror=f.issues['robbagley-afk/ensign-appfix-dashboard'];self.assertEqual(len(mirror),1);self.assertEqual(mirror[0]['title'],'Approved public title');self.assertNotIn('PRIVATE ONLY',mirror[0]['body']);self.assertNotIn('ensign-student-readiness-hub',mirror[0]['body']);self.assertIn('Approved generic summary',mirror[0]['body'])
 def test_dry_run_writes_nothing(self):
  f=FakeGitHub();self.invoke(f,dry=True);self.assertEqual(f.writes,[])
 def test_partial_failure_keeps_source_receipt(self):
  f=FakeGitHub(private=True,fail_mirror=True);_,a,_=self.invoke(f,app='readiness',repo='ensign-student-readiness-hub',approved=True);self.assertTrue(a.get('source_url'));f.fail_mirror=False;self.invoke(f,app='readiness',repo='ensign-student-readiness-hub',approved=True);self.assertEqual(len(f.issues['robbagley-afk/ensign-student-readiness-hub']),1)

class EdgeCases(unittest.TestCase):
 invoke = CLITests.invoke
 def test_readback_failure_keeps_created_source_url(self):
  class FailReadback(FakeGitHub):
   def __call__(self,args,**kwargs):
    if any('/issues/1' in x for x in args):return subprocess.CompletedProcess(args,1,'','HTTP 503 readback unavailable')
    return super().__call__(args,**kwargs)
  f=FailReadback();code,a,_=self.invoke(f);self.assertEqual(code,1);self.assertTrue(a.get('source_url'),'Creation receipt must survive failed verification')
 def test_unverified_source_does_not_publish_mirror(self):
  f=FakeGitHub(private=True);self.invoke(f,app='readiness',repo='ensign-student-readiness-hub');f.issues['robbagley-afk/ensign-student-readiness-hub'][0]['assignees']=[]
  code,a,_=self.invoke(f,app='readiness',repo='ensign-student-readiness-hub',approved=True);self.assertEqual(code,1);self.assertNotIn('robbagley-afk/ensign-appfix-dashboard',f.issues)
 def test_request_key_cannot_reuse_another_app(self):
  f=FakeGitHub(private=True);self.invoke(f,app='career-explorer',repo='major-career-explorer-coach-ai');code,a,_=self.invoke(f,app='mentor-explorer',repo='major-career-explorer-coach-ai',approved=True);self.assertEqual(code,1);self.assertNotIn('robbagley-afk/ensign-appfix-dashboard',f.issues)
if __name__=='__main__':unittest.main()
