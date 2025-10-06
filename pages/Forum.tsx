import { useEffect, useState } from "react";
import api from "../api/axios";
import { getToken } from "../utils/auth";

type Post = { id:number; title:string; content:string; author?:{name?:string}; createdAt?:string };
type Comment = { id:number; content:string; author?:{name?:string}; createdAt?:string };

export default function Forum(){
  const [posts,setPosts]=useState<Post[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [newTitle,setNewTitle]=useState("");
  const [newContent,setNewContent]=useState("");
  const [quickComment,setQuickComment]=useState<Record<number,string>>({});

  const token = getToken();

  const loadPosts = async ()=>{
    setLoading(true); setError("");
    try{
      const res = await api.get<Post[]|{content:Post[]}>("/api/forum/posts?page=0&size=20&sort=createdAt,desc");
      const data = res.data as any;
      setPosts(Array.isArray(data)?data:(data?.content ?? []));
    }catch(e:any){ setError(e?.message||"Nem sikerült betölteni a posztokat."); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ loadPosts(); },[]);

  const createPost = async ()=>{
    if(!token) return alert("Bejelentkezés szükséges.");
    if(!newTitle.trim() || !newContent.trim()) return;
    try{
      await api.post("/api/forum/posts",{ title:newTitle.trim(), content:newContent.trim(), category:"GENERAL", rating:null });
      setNewTitle(""); setNewContent("");
      await loadPosts();
    }catch(e:any){ alert(e?.response?.data?.error || "Nem sikerült létrehozni a posztot."); }
  };

  const addComment = async (postId:number)=>{
    if(!token) return alert("Bejelentkezés szükséges.");
    const text = (quickComment[postId]||"").trim();
    if(!text) return;
    try{
      await api.post(`/api/forum/posts/${postId}/comments`,{ content:text });
      setQuickComment(s=>({ ...s, [postId]:"" }));
      await loadPosts();
    }catch(e:any){ alert(e?.response?.data?.error || "Nem sikerült kommentelni."); }
  };

  return (
    <div style={{padding:16}}>
      <h2>Fórum</h2>

      {/* gyors poszt mező (chatbox jelleg) */}
      <div style={box}>
        <div style={{fontWeight:700,marginBottom:8}}>Új bejegyzés</div>
        <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Cím" style={inp}/>
        <textarea value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="Mit szeretnél megosztani?" rows={3} style={ta}/>
        <button onClick={createPost} style={btn} disabled={!token}>Küldés</button>
        {!token && <div style={{marginTop:6,opacity:.8,fontSize:12}}>Bejelentkezve tudsz posztolni.</div>}
      </div>

      {loading && <p>Betöltés…</p>}
      {error && <p style={{color:"#ff9f9f"}}>{error}</p>}

      <div style={{display:"grid",gap:12,marginTop:12}}>
        {posts.map(p=>(
          <div key={p.id} style={box}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontWeight:700}}>{p.title}</div>
              <div style={{opacity:.7,fontSize:12}}>{p.author?.name || "ismeretlen"} · {p.createdAt?.slice(0,16) || ""}</div>
            </div>
            <div style={{whiteSpace:"pre-wrap"}}>{p.content}</div>

            {/* gyors komment sáv */}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <input
                value={quickComment[p.id]||""}
                onChange={e=>setQuickComment(s=>({...s,[p.id]:e.target.value}))}
                placeholder="Írj hozzászólást…"
                style={{...inp,flex:1}}
              />
              <button onClick={()=>addComment(p.id)} style={btn} disabled={!token}>Küldés</button>
            </div>
            {!token && <div style={{marginTop:6,opacity:.8,fontSize:12}}>Bejelentkezve tudsz kommentelni.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

const box:React.CSSProperties={ background:"rgba(17,17,17,.9)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:12 };
const inp:React.CSSProperties={ width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"#fff",outline:"none",marginBottom:8 };
const ta:React.CSSProperties={ ...inp, height:96, resize:"vertical" };
const btn:React.CSSProperties={ background:"linear-gradient(90deg,#6c5ce7,#a66cff)",border:"none",color:"#fff",fontWeight:700,padding:"10px 14px",borderRadius:10,cursor:"pointer" };
