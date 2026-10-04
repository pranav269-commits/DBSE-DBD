const configured=(import.meta.env.VITE_API_URL||'').trim().replace(/\/$/,'')
const BASE=configured||''

async function request(path,options={}){
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),10000)
  try{
    const res=await fetch(`${BASE}${path}`,{
      headers:{'Content-Type':'application/json',...(options.headers||{})},
      ...options,
      signal:controller.signal,
    })
    const data=res.status===204?null:await res.json().catch(()=>({detail:'Unexpected server response'}))
    if(!res.ok) throw new Error(data?.detail||data?.message||`Request failed (${res.status})`)
    return data
  }catch(err){
    if(err?.name==='AbortError') throw new Error('DINE backend did not respond. Keep the FastAPI window open and restart DINE.')
    throw err
  }finally{
    clearTimeout(timeout)
  }
}

export const api={
  get:p=>request(p),
  post:(p,b)=>request(p,{method:'POST',body:JSON.stringify(b)}),
  put:(p,b)=>request(p,{method:'PUT',body:JSON.stringify(b)}),
  patch:(p,b)=>request(p,{method:'PATCH',body:JSON.stringify(b)}),
  del:p=>request(p,{method:'DELETE'}),
}
export const API_BASE=BASE||window.location.origin
