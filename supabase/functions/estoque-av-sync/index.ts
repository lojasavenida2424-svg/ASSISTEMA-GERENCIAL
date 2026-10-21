/**
 * ESTOQUE AV V2.0 - Ponte Supabase Edge Function para o login legado do Gerencial.
 * Deploy: supabase functions deploy estoque-av-sync --no-verify-jwt
 * Requer variaveis reservadas SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, fornecidas pelo Supabase.
 * NUNCA colocar SERVICE_ROLE no HTML. O cliente envia as credenciais existentes UMA VEZ
 * apos login normal no Gerencial, sem criar usuario em Authentication.
 * OBS: enquanto o Gerencial guardar senhas legadas em texto no cadastro, a seguranca global
 * continua limitada por esse modelo. Esta funcao nao publica o estoque por acesso anonimo.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const baseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
};
const respond = (status: number, obj: Record<string,unknown>) =>
  new Response(JSON.stringify(obj), { status, headers: {...baseHeaders,'Content-Type':'application/json; charset=utf-8'} });
const encoder=new TextEncoder();
async function sha256(value:string):Promise<string>{
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function randomToken():string{
  const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
const normaliseOperator=(v:unknown):string=>{
  const raw=String(v??'');const only=raw.replace(/\D/g,'');
  return only?String(Number(only)):'';
};
function hasStockPermission(cfg:any,operator:string):boolean{
  if(operator==='133')return true;
  const permissions=cfg?.permissoes?.[operator]||{};
  return permissions.sistemaav===true && permissions.sistemaAvLinks?.estoque===true;
}
function adminOf(operator:string){return operator==='133'}
function permittedStores(cfg:any,operator:string,state:any):string[]{
  if(adminOf(operator))return state?.stores?.map((x:any)=>x.id)||[];
  const perms=cfg?.permissoes?.[operator]||{};
  const assigned=perms.estoqueLojas||cfg?.usuarios?.find((u:any)=>normaliseOperator(u.operador)===operator)?.lojasPermitidas;
  // Secure baseline: users without store assignment are restricted to the original store 024.
  return Array.isArray(assigned)?assigned.filter((x:any)=>typeof x==='string'&&x.length<90):['store24'];
}
function validateState(state:any){
  if(!state || state.version!==1 || typeof state!=='object')throw Error('ESTADO_INVALIDO');
  const keys=['stores','products','ledger','transfers','losses','inventories','receipts'];
  if(keys.some(k=>!Array.isArray(state[k])))throw Error('ESTADO_INVALIDO');
  if(state.stores.length>200 || state.products.length>150000 || state.ledger.length>400000 || state.receipts.length>400000 || state.losses.length>400000)throw Error('LIMITE_DE_REGISTROS');
  for(const key of keys){const ids=new Set<string>();for(const row of state[key]){
    if(!row||typeof row.id!=='string'||!row.id||row.id.length>120||ids.has(row.id))throw Error('ID_DUPLICADO_OU_INVALIDO');
    ids.add(row.id);
  }}
  const stores=new Set(state.stores.map((x:any)=>x.id));
  const products=new Set(state.products.map((x:any)=>x.id));
  const barcodes=new Set<string>();
  for(const p of state.products){
    if(!p||typeof p.id!=='string')throw Error('PRODUTO_INVALIDO');
    if(p.barcode){if(barcodes.has(p.barcode))throw Error('CODIGO_DUPLICADO');barcodes.add(p.barcode)}
  }
  const balances=new Map<string,number>();
  const linkMovements=new Map<string,any[]>();
  for(const row of state.ledger){
    if(!stores.has(row.storeId)||!products.has(row.productId)||!['deposito','salao'].includes(row.location) || !Number.isSafeInteger(row.delta))throw Error('MOVIMENTACAO_INVALIDA');
    const key=`${row.storeId}|${row.location}|${row.productId}`;
    const balance=(balances.get(key)||0)+row.delta;
    if(!Number.isSafeInteger(balance)||balance<0)throw Error('SALDO_NEGATIVO');
    balances.set(key,balance);
    if(row.linkId){const k=String(row.linkId);if(!linkMovements.has(k))linkMovements.set(k,[]);linkMovements.get(k)!.push(row)}
  }
  for(const l of state.losses){
    if(!stores.has(l.storeId)||!['deposito','salao'].includes(l.location)||
       !['furto','avaria'].includes(l.reason)||!Number.isSafeInteger(l.qty)||l.qty<=0)throw Error('PERDA_INVALIDA');
    if(l.photo && (typeof l.photo!=='string'||l.photo.length>450000||
      !/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(l.photo)))throw Error('FOTO_INVALIDA');
    // Historical records without stockDebited are accepted read-only by the transition gate.
    if(l.stockDebited && (!products.has(l.productId)||!(linkMovements.get(l.id)||[]).some((m:any)=>m.kind==='loss'&&m.delta===-l.qty&&m.storeId===l.storeId&&m.productId===l.productId&&m.location===l.location)))throw Error('BAIXA_DA_PERDA_INVALIDA');
  }
  for(const t of state.transfers){
    if(!stores.has(t.storeId)||!products.has(t.productId))throw Error('TRANSFERENCIA_INVALIDA');
    if(!Number.isSafeInteger(t.qty)||t.qty<=0 || !Number.isSafeInteger(t.received)||t.received<0 || !Number.isSafeInteger(t.cancelledQty||0)||t.cancelledQty<0 ||t.received+(t.cancelledQty||0)>t.qty)throw Error('TRANSFERENCIA_INVALIDA');
    const linked=linkMovements.get(t.id)||[];
    const sum=(kind:string,location:string)=>linked.filter((m:any)=>m.kind===kind&&m.location===location&&m.storeId===t.storeId&&m.productId===t.productId).reduce((n:number,m:any)=>n+m.delta,0);
    if(sum('transfer_out','deposito')!==-t.qty||sum('transfer_in','salao')!==t.received||sum('transfer_return','deposito')!==(t.cancelledQty||0))throw Error('TRANSFERENCIA_INCONSISTENTE');
  }
  for(const r of state.receipts){
    if(!stores.has(r.storeId)||!r.quantities||typeof r.quantities!=='object'||
      !['vestuario','relogios','capacetes','malas'].every(k=>Number.isSafeInteger(r.quantities[k]||0)&&Number(r.quantities[k]||0)>=0))throw Error('RECEBIMENTO_INVALIDO');
  }
  const dataLength=encoder.encode(JSON.stringify(state)).length;
  if(dataLength>6*1024*1024)throw Error('LIMITE_DE_DADOS');
}
Deno.serve(async (req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:baseHeaders});
  if(req.method!=='POST')return respond(405,{ok:false,error:'METODO_NAO_PERMITIDO'});
  try{
    const len=Number(req.headers.get('content-length')||'0');
    if(len>7*1024*1024)return respond(413,{ok:false,error:'LIMITE_DE_DADOS'});
    const bodyText=await req.text();
    if(bodyText.length>7*1024*1024)return respond(413,{ok:false,error:'LIMITE_DE_DADOS'});
    const body=JSON.parse(bodyText||'{}');
    const action=String(body.action||'');
    const envUrl=Deno.env.get('SUPABASE_URL');
    const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!envUrl||!serviceKey)return respond(503,{ok:false,error:'SERVICO_NAO_CONFIGURADO'});
    const admin=createClient(envUrl,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
    const workspace='avenida';
    async function readConfig():Promise<any>{
      const {data,error}=await admin.from('assistencia_gerencial').select('dados').eq('id','config_global_v1').maybeSingle();
      if(error||!data?.dados?.usuarios)throw Error('CONFIG_GERENCIAL_INDISPONIVEL');
      return data.dados;
    }
    function publicConfig(cfg:any){
      const clone=structuredClone(cfg);
      if(Array.isArray(clone.usuarios))for(const u of clone.usuarios)u.senha='__CREDENCIAL_PROTEGIDA__';
      return clone;
    }
    if(action==='public_config'){
      const {data,error}=await admin.from('assistencia_gerencial').select('dados,updated_at').eq('id','config_global_v1').maybeSingle();
      if(error||!data?.dados?.usuarios)throw Error('CONFIG_GERENCIAL_INDISPONIVEL');
      return respond(200,{ok:true,config:publicConfig(data.dados),updated_at:data.updated_at});
    }
    if(action==='session'||action==='gerencial_auth'){
      const operador=normaliseOperator(body.operador);
      const senha=String(body.senha??'');
      if(!operador||operador.length>10||!senha||senha.length>200)return respond(400,{ok:false,error:'CREDENCIAIS_INVALIDAS'});
      const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'sem-ip';
      const attemptKey=await sha256(ip+'|'+operador);
      const {data:attempt}=await admin.from('estoque_av_bridge_attempts').select('tentativas,janela_inicio,bloqueado_ate').eq('chave',attemptKey).maybeSingle();
      if(attempt?.bloqueado_ate&&Date.parse(attempt.bloqueado_ate)>Date.now())return respond(429,{ok:false,error:'MUITAS_TENTATIVAS'});
      const cfg=await readConfig();
      const account=cfg.usuarios.find((u:any)=>normaliseOperator(u?.operador)===operador);
      // O Gerencial usa a mesma senha do registro global, com fallback historico `${operador}24`.
      const senhaEsperada=String(account?.senha||'').trim();
      if(!account||!senhaEsperada||senha.trim()!==senhaEsperada||(action==='session'&&!hasStockPermission(cfg,operador))){
        const fresh= !attempt || (Date.now()-Date.parse(attempt.janela_inicio)>15*60*1000);
        const count=fresh?1:Number(attempt.tentativas||0)+1;
        await admin.from('estoque_av_bridge_attempts').upsert({chave:attemptKey,tentativas:count,janela_inicio:fresh?new Date().toISOString():attempt.janela_inicio,bloqueado_ate:count>=6?new Date(Date.now()+15*60*1000).toISOString():null});
        return respond(401,{ok:false,error:'CREDENCIAIS_OU_ACESSO_INVALIDOS'});
      }
      await admin.from('estoque_av_bridge_attempts').delete().eq('chave',attemptKey);
      const token=randomToken();
      const hash=await sha256(token);
      const expires=new Date(Date.now()+10*60*60*1000).toISOString();
      const {error}=await admin.from('estoque_av_bridge_sessions').insert({token_hash:hash,operador,workspace_id:workspace,credencial_versao:Math.max(1,Number(account?.credencialVersao)||1),expira_em:expires});
      if(error)throw Error('NAO_FOI_POSSIVEL_CRIAR_SESSAO');
      return respond(200,{ok:true,token,operator:operador,is_admin:adminOf(operador),expires_at:expires});
    }
    // Exige token aleatorio emitido pelo servidor em login normal no GERENCIAL.
    const token=String(body.token||'');
    if(token.length<30||token.length>160)return respond(401,{ok:false,error:'SESSAO_ESTOQUE_OBRIGATORIA'});
    const hash=await sha256(token);
    const {data:session,error:sessError}=await admin.from('estoque_av_bridge_sessions').select('operador,workspace_id,credencial_versao,expira_em').eq('token_hash',hash).maybeSingle();
    if(sessError||!session||Date.parse(session.expira_em)<=Date.now()||session.workspace_id!==workspace)return respond(401,{ok:false,error:'SESSAO_ESTOQUE_EXPIRADA'});
    const cfg=await readConfig();
    const account=cfg.usuarios.find((u:any)=>normaliseOperator(u?.operador)===session.operador);
    if(!account||Number(account.credencialVersao||1)!==Number(session.credencial_versao))return respond(403,{ok:false,error:'ACESSO_GERENCIAL_REVOGADO'});
    if(action==='gerencial_password'){
      if(cfg.permissoes?.[session.operador]?.alterarSenha!==true&&session.operador!=='133')return respond(403,{ok:false,error:'ALTERACAO_DE_SENHA_NAO_AUTORIZADA'});
      const newPassword=String(body.password||'');
      if(newPassword.length<8||newPassword.length>160||newPassword===session.operador+'24')return respond(400,{ok:false,error:'SENHA_FRACA_OU_INVALIDA'});
      const next=structuredClone(cfg);
      const target=next.usuarios.find((u:any)=>normaliseOperator(u.operador)===session.operador);
      if(!target)return respond(403,{ok:false,error:'ACESSO_GERENCIAL_REVOGADO'});
      target.senha=newPassword;target.credencialVersao=Math.max(1,Number(target.credencialVersao)||1)+1;
      const {error}=await admin.from('assistencia_gerencial').update({dados:next,updated_at:new Date().toISOString()}).eq('id','config_global_v1');
      if(error)throw Error('CONFIG_GERENCIAL_INDISPONIVEL');
      return respond(200,{ok:true,config:publicConfig(next)});
    }
    if(action==='gerencial_config_write'){
      if(!adminOf(session.operador))return respond(403,{ok:false,error:'ADMINISTRADOR_OBRIGATORIO'});
      const provided=body.config;
      if(!provided||!Array.isArray(provided.usuarios)||provided.usuarios.length>200||typeof provided.permissoes!=='object')return respond(400,{ok:false,error:'ESTADO_INVALIDO'});
      const expected=String(body.expected_updated_at||'');
      const {data:original,error:readError}=await admin.from('assistencia_gerencial').select('dados,updated_at').eq('id','config_global_v1').maybeSingle();
      if(readError||!original)return respond(503,{ok:false,error:'CONFIG_GERENCIAL_INDISPONIVEL'});
      if(original.updated_at!==expected)return respond(409,{ok:false,error:'CONFLITO_DE_VERSAO'});
      const next=structuredClone(provided);
      const ids=new Set<string>();
      for(const u of next.usuarios){
        const id=normaliseOperator(u.operador);
        if(!id||ids.has(id))return respond(400,{ok:false,error:'OPERADOR_INVALIDO'});ids.add(id);
        const previous=original.dados.usuarios?.find((x:any)=>normaliseOperator(x.operador)===id);
        if(u.senha==='__CREDENCIAL_PROTEGIDA__'||!u.senha)u.senha=previous?.senha||'';
        if(typeof u.senha!=='string'||u.senha.length<8||u.senha.length>160){
          // Existing legacy passwords remain valid until their mandatory rotation.
          if(previous&&u.senha===previous.senha)continue;
          return respond(400,{ok:false,error:'SENHA_FRACA_OU_INVALIDA'});
        }
        if(previous&&u.senha!==previous.senha)u.credencialVersao=Math.max(1,Number(previous.credencialVersao)||1)+1;
        if(!previous&&u.senha===id+'24')return respond(400,{ok:false,error:'SENHA_FRACA_OU_INVALIDA'});
      }
      if(!ids.has('133'))return respond(400,{ok:false,error:'ADMIN_133_OBRIGATORIO'});
      // A server-recognized admin cannot be removed or have permissions revoked through the browser.
      next.permissoes['133']=original.dados.permissoes?.['133']||next.permissoes['133'];
      const updatedAt=new Date().toISOString();
      const {data:written,error}=await admin.from('assistencia_gerencial').update({dados:next,updated_at:updatedAt}).eq('id','config_global_v1').eq('updated_at',expected).select('updated_at').maybeSingle();
      if(error||!written)return respond(409,{ok:false,error:'CONFLITO_DE_VERSAO'});
      return respond(200,{ok:true,config:publicConfig(next),updated_at:written.updated_at});
    }
    if(!hasStockPermission(cfg,session.operador))return respond(403,{ok:false,error:'ACESSO_ESTOQUE_REVOGADO'});
    if(action==='revoke'){
      await admin.from('estoque_av_bridge_sessions').delete().eq('token_hash',hash);
      return respond(200,{ok:true});
    }
    if(action==='operation_status'){
      const operationId=String(body.operation_id||'');
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))return respond(400,{ok:false,error:'ID_OPERACAO_INVALIDO'});
      const {data,error}=await admin.from('estoque_av_bridge_operations').select('revisao_resultado').eq('operacao_id',operationId).eq('operador',session.operador).eq('workspace_id',workspace).maybeSingle();
      if(error)throw Error('FALHA_CONSULTA_OPERACAO');
      return respond(200,{ok:true,applied:!!data,revision:data?.revisao_resultado??null});
    }
    if(action==='load'){
      const {data,error}=await admin.from('estoque_av_cloud').select('state,revision').eq('workspace_id',workspace).maybeSingle();
      if(error||!data)return respond(503,{ok:false,error:'BANCO_ESTOQUE_INDISPONIVEL'});
      if(!adminOf(session.operador)){
        const allowed=permittedStores(cfg,session.operador,data.state);
        // Document-wide clients cannot safely receive partial state and then commit a partial revision.
        // Fail closed until an isolated per-store backend is available if the workspace has unassigned stores.
        if((data.state.stores||[]).some((st:any)=>!allowed.includes(st.id)))return respond(403,{ok:false,error:'LOJA_NAO_AUTORIZADA_CONTATE_ADMINISTRADOR'});
      }
      if(Number(body.known_revision)===data.revision)return respond(200,{ok:true,unchanged:true,revision:data.revision,operator:session.operador});
      return respond(200,{ok:true,state:data.state,revision:data.revision,operator:session.operador});
    }
    if(action==='commit'){
      const revision=Number(body.revision);
      if(!Number.isSafeInteger(revision)||revision<0)return respond(400,{ok:false,error:'REVISAO_INVALIDA'});
      const operationId=String(body.operation_id||'');
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))return respond(400,{ok:false,error:'ID_OPERACAO_INVALIDO'});
      validateState(body.state);
      const intent=String(body.intent||'operation');
      if(!['operation','stores','restore'].includes(intent))return respond(400,{ok:false,error:'OPERACAO_INVALIDA'});
      if(intent!=='operation'&&!adminOf(session.operador))return respond(403,{ok:false,error:'ADMINISTRADOR_OBRIGATORIO'});
      if(!adminOf(session.operador)){
        const allowed=permittedStores(cfg,session.operador,body.state);
        if(body.state.stores.some((st:any)=>!allowed.includes(st.id)))return respond(403,{ok:false,error:'LOJA_NAO_AUTORIZADA_CONTATE_ADMINISTRADOR'});
      }
      const {data,error}=await admin.rpc('estoque_av_bridge_commit',{p_workspace:workspace,p_expected_revision:revision,p_payload:body.state,p_operation_id:operationId,p_operador:session.operador,p_admin:adminOf(session.operador),p_intent:intent});
      if(error){
        if(/CONFLITO_DE_VERSAO/i.test(error.message))return respond(409,{ok:false,error:'CONFLITO_DE_VERSAO'});
        if(/ESTADO_INVALIDO|LIMITE_DE_DADOS|NAO_AUTORIZADO|HISTORICO_IMUTAVEL|OPERACAO_INVALIDA|PERDA_SEM_BAIXA|DADOS_REMOVIDOS|AUTORIA_INVALIDA/i.test(error.message))return respond(400,{ok:false,error:error.message});
        throw Error('FALHA_NA_GRAVACAO');
      }
      return respond(200,{ok:true,revision:data.revision,replayed:data.replayed||false});
    }
    return respond(400,{ok:false,error:'ACAO_DESCONHECIDA'});
  }catch(err){
    console.error('Estoque Sync:',err);
    const message=String((err as Error).message||'ERRO_INTERNO');
    if(['CONFIG_GERENCIAL_INDISPONIVEL','NAO_FOI_POSSIVEL_CRIAR_SESSAO','ESTADO_INVALIDO','LIMITE_DE_DADOS','LIMITE_DE_REGISTROS','MOVIMENTACAO_INVALIDA','SALDO_NEGATIVO','TRANSFERENCIA_INVALIDA','CODIGO_DUPLICADO','PRODUTO_INVALIDO','ID_DUPLICADO_OU_INVALIDO','PERDA_INVALIDA','FOTO_INVALIDA','BAIXA_DA_PERDA_INVALIDA','TRANSFERENCIA_INCONSISTENTE','RECEBIMENTO_INVALIDO'].includes(message))
      return respond(['CONFIG_GERENCIAL_INDISPONIVEL','NAO_FOI_POSSIVEL_CRIAR_SESSAO'].includes(message)?503:400,{ok:false,error:message});
    return respond(500,{ok:false,error:'ERRO_INTERNO'});
  }
});
