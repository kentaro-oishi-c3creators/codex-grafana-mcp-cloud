const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const envName=process.argv[2]||'grafana-cloud';
const dashboardName=process.argv[3]||'synthetic-signals';
if(!/^[a-z0-9_-]+$/.test(envName)||!/^[a-z0-9_-]+$/.test(dashboardName))throw new Error('Invalid environment/dashboard name');
const config=JSON.parse(fs.readFileSync(path.join(root,'config/environments',envName+'.json'),'utf8'));
const binding=config.dashboards[dashboardName];
if(!binding)throw new Error('Dashboard is not registered');
const checks=JSON.parse(fs.readFileSync(path.join(root,'dashboards',dashboardName,'checks.json'),'utf8'));
const output=path.join(root,'.local/browser',envName,dashboardName);
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const target=config.grafana_url.replace(/\/$/,'');
  if(!target.startsWith('https://'))throw new Error('HTTPS required');
  const token=process.env[config.token_env];
  if(!token)throw new Error('Missing token; set '+config.token_env+' securely');
  const proxyURL=process.env.HTTPS_PROXY || process.env.https_proxy;
  const options={...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']};
  if(proxyURL){
    const p=new URL(proxyURL);
    options.proxy={server:p.protocol+'//'+p.hostname+':'+p.port};
    if(p.username)options.proxy.username=decodeURIComponent(p.username);
    if(p.password)options.proxy.password=decodeURIComponent(p.password);
  }
  const browser=await chromium.launch(options);
  try{
    const context=await browser.newContext({viewport:{width:1600,height:1100}});
    await context.route('**/*',async route=>{
      const req=route.request();
      if(new URL(req.url()).origin===target){
        await route.continue({headers:{...req.headers(),authorization:'Bearer '+token}});
      }else await route.continue();
    });
    const page=await context.newPage();
    const errors=[];const failed=[];const queryResults=[];const pendingQueries=[];const queryPaths=[];
    page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));
    page.on('requestfailed',req=>{const u=new URL(req.url()); failed.push({host:u.hostname,path:u.pathname,error:req.failure()?.errorText});});
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(target))failed.push({path:new URL(r.url()).pathname,status:r.status()});});
    page.on('response',r=>{
      const path=new URL(r.url()).pathname;
      if(/query|query_range/.test(path)&&r.url().startsWith(target))queryPaths.push({path,status:r.status()});
      if((path==='/api/ds/query'||path.includes('/apis/query.grafana.app/')||path.includes('/api/v1/query'))&&r.url().startsWith(target))pendingQueries.push((async()=>{
        try {
          const data=await r.json();
          const results=data.results||data.responses||{};
          for(const [ref,result] of Object.entries(results)){
            const frames=result.frames||[];
            queryResults.push({ref,status:r.status(),error:result.error||null,
              frameCount:frames.length,values:frames.map(f=>f.data?.values||[])});
          }
        }catch{queryResults.push({status:r.status(),error:'Could not parse panel query response'});}
      })());
    });
    await page.goto(target+'/d/'+encodeURIComponent(binding.uid),{waitUntil:'domcontentloaded',timeout:60000});
    try {
      await page.getByText(checks.panel_titles[0],{exact:true}).waitFor({timeout:45000});
    } catch (error) {
      await page.screenshot({path:path.join(output,'dashboard.png'),fullPage:true});
      console.log(JSON.stringify({url:page.url(),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,2000),errors,failed},null,2));
      throw error;
    }
    const deadline=Date.now()+60000;
    while(Date.now()<deadline){
      const values=queryResults.flatMap(r=>(r.values||[]).flatMap(columns=>columns.slice(1).flat()));
      const ready=checks.expected_values.every(n=>values.some(v=>Number(v)===n))&&(!checks.require_time_series||queryResults.some(r=>(r.values||[]).some(columns=>columns[0]?.length>1)));
      if(ready){await page.waitForTimeout(2000);break;}
      await page.waitForTimeout(1000);
    }
    await Promise.all(pendingQueries);
    const body=await page.locator('body').innerText();
    const panels=checks.panel_titles;
    const visible=panels.map(title=>({title,visible:body.includes(title)}));
    const loadError=body.includes('Failed to load dashboard') || body.includes('x.links is not iterable');
    const panelError=/\bNo data\b/.test(body)||body.includes('Could not load plugin')||body.includes('plugin failed')||body.includes('Panel plugin not found')||body.includes('Loading plugin panel');
    const allValues=queryResults.flatMap(r=>(r.values||[]).flatMap(columns=>columns.slice(1).flat()));
    const dataVerified=checks.expected_values.every(n=>allValues.some(v=>Number(v)===n))&&(!checks.require_time_series||queryResults.some(r=>(r.values||[]).some(columns=>columns[0]?.length>1)));
    await page.screenshot({path:path.join(output,'dashboard.png'),fullPage:true});
    const passed=!loadError&&!panelError&&visible.every(x=>x.visible)&&!errors.length&&dataVerified&&!queryResults.some(r=>r.error||r.status>=400);
    const report={url:page.url(),passed,panels:visible,loadError,panelError,dataVerified,queryResults,queryPaths,errors,failed,body};
    fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(report,null,2));
    const failuresByHost={};for(const item of failed){const key=item.host||'instance';failuresByHost[key]=(failuresByHost[key]||0)+1;}
    console.log(JSON.stringify({passed,panels:visible,loadError,panelError,dataVerified,panelQueryResponses:queryResults.length,errors,failuresByHost},null,2));
    if(!passed)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
