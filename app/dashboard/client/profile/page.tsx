"use client";
import { useEffect, useState } from "react";
import { createClientSupabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { Bell, Lock, LogOut, Save, CheckCircle2, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const inp: React.CSSProperties = {
  width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(224,30,30,0.15)",
  borderRadius:8, color:"#F5EDED", padding:"11px 14px",
  fontFamily:"var(--font-montserrat,sans-serif)", fontWeight:500, fontSize:14, outline:"none",
};

function Sec({title,children}:{title:string;children:React.ReactNode}) {
  return (
    <div style={{background:"linear-gradient(135deg,#1A0101 0%,#0D0000 100%)",border:"1px solid rgba(224,30,30,0.12)",borderRadius:14,padding:20,marginBottom:16}}>
      <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase" as const,color:"rgba(224,30,30,0.6)",marginBottom:16}}>{title}</p>
      {children}
    </div>
  );
}

function Row({label,value}:{label:string;value:string|null|undefined}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(224,30,30,0.08)"}}>
      <span style={{fontSize:12,color:"rgba(245,237,237,0.4)"}}>{label}</span>
      <span style={{fontSize:13,fontWeight:600,color:"#F5EDED"}}>{value||"non renseigne"}</span>
    </div>
  );
}

export default function ClientProfilePage() {
  const router = useRouter();
  const sb = createClientSupabase();
  const [profile, setProfile] = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [push, setPush] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [weeks, setWeeks] = useState<number|null>(null);

  useEffect(() => {
    sb.auth.getUser().then(async ({data:{user}}) => {
      if (!user) { router.push("/"); return; }
      const {data:p} = await sb.from("profiles").select("*").eq("id",user.id).single();
      if (p) {
        const prof = p as Record<string,unknown>;
        setProfile(prof);
        setFullName((prof.full_name as string) ?? "");
        setPhone((prof.phone as string) ?? "");
        if (prof.start_date) {
          const w = Math.floor((Date.now()-new Date((prof.start_date as string)+"T12:00:00").getTime())/(7*24*60*60*1000));
          setWeeks(w);
        }
      }
      const {data:sub} = await sb.from("push_subscriptions").select("id").eq("user_id",user.id).maybeSingle();
      setPush(!!sub);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    await sb.from("profiles").update({full_name:fullName,phone}).eq("id",profile.id as string);
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  async function signOut() {
    await sb.auth.signOut();
    router.push("/auth/client");
  }

  async function resetPwd() {
    const email = profile?.email as string;
    if (!email) return;
    await sb.auth.resetPasswordForEmail(email, {redirectTo:`${window.location.origin}/auth/client`});
    setResetSent(true);
  }

  if (loading) return (
    <div style={{padding:"32px 20px",maxWidth:560,margin:"0 auto"}}>
      {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-36 mb-4 rounded-xl"/>)}
    </div>
  );

  const startFmt = (profile?.start_date as string|null)
    ? new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",year:"numeric"}).format(new Date((profile!.start_date as string)+"T12:00:00"))
    : null;

  return (
    <div style={{padding:"24px 20px 80px",maxWidth:560,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(224,30,30,0.6)",margin:"0 0 4px"}}>Mon espace</p>
        <h1 style={{fontWeight:800,fontSize:28,letterSpacing:"-0.04em",color:"#F5EDED",margin:0}}>Mon profil</h1>
      </div>

      <Sec title="Mes informations">
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase" as const,color:"rgba(224,30,30,0.7)",marginBottom:7}}>Prenom et Nom</label>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} style={inp} placeholder="Jean Dupont"/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase" as const,color:"rgba(224,30,30,0.7)",marginBottom:7}}>Email</label>
          <input value={(profile?.email as string)??"" } readOnly style={{...inp,opacity:0.5,cursor:"not-allowed"}}/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase" as const,color:"rgba(224,30,30,0.7)",marginBottom:7}}>Telephone</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} style={inp} placeholder="06 XX XX XX XX"/>
        </div>
        <button onClick={save} disabled={saving} className="ep-btn-primary" style={{width:"100%",marginTop:4}}>
          {saved ? <><CheckCircle2 size={14}/> Sauvegarde</> : saving ? "Sauvegarde..." : <><Save size={14}/> Sauvegarder</>}
        </button>
      </Sec>

      <Sec title="Mon coaching">
        <Row label="Date de debut" value={startFmt}/>
        {weeks !== null && <Row label="Semaines de coaching" value={`${weeks} semaines`}/>}
        <Row label="Objectif" value={profile?.goal as string|null}/>
        <Row label="Poids de depart" value={(profile?.weight_start as number|null) != null ? `${profile!.weight_start} kg` : null}/>
        {(profile?.competition_category as string) && <Row label="Categorie" value={profile!.competition_category as string}/>}
      </Sec>

      <Sec title="Notifications">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <p style={{fontSize:14,fontWeight:600,color:"#F5EDED",margin:"0 0 3px"}}>Notifications push</p>
            <p style={{fontSize:12,color:"rgba(245,237,237,0.35)",margin:0}}>{push ? "Activees sur cet appareil" : "Non activees"}</p>
          </div>
          {push
            ? <span style={{fontSize:11,fontWeight:700,color:"#4ade80",padding:"4px 10px",background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:20}}>Activees</span>
            : <button onClick={async()=>{
                try {
                  if (!("serviceWorker" in navigator)) return;
                  const reg = await navigator.serviceWorker.register("/sw.js");
                  await navigator.serviceWorker.ready;
                  if (await Notification.requestPermission() !== "granted") return;
                  const b64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
                  const pad = "=".repeat((4 - b64.length % 4) % 4);
                  const raw = window.atob((b64+pad).replace(/-/g,"+").replace(/_/g,"/"));
                  const key = Uint8Array.from([...raw].map(c=>c.charCodeAt(0))).buffer as ArrayBuffer;
                  const sub = await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
                  await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscription:sub.toJSON()})});
                  setPush(true);
                } catch(e) { console.error(e); }
              }} className="ep-btn-primary" style={{fontSize:11,padding:"8px 14px"}}>
              <Bell size={12}/> Activer
            </button>
          }
        </div>
      </Sec>

      <Sec title="Compte">
        <button onClick={resetPwd} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"12px 0",background:"none",border:"none",cursor:"pointer",borderBottom:"1px solid rgba(224,30,30,0.08)",marginBottom:4}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Lock size={15} style={{color:"rgba(245,237,237,0.4)"}}/>
            <span style={{fontSize:14,color:"#F5EDED",fontWeight:500}}>{resetSent ? "Email envoye !" : "Changer mon mot de passe"}</span>
          </div>
          <ChevronRight size={14} style={{color:"rgba(245,237,237,0.2)"}}/>
        </button>
        <button onClick={signOut} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",marginTop:8,background:"rgba(224,30,30,0.12)",border:"1px solid rgba(224,30,30,0.3)",borderRadius:8,padding:"12px 20px",color:"#E01E1E",fontWeight:800,fontSize:13,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer"}}>
          <LogOut size={14}/> Se deconnecter
        </button>
      </Sec>
    </div>
  );
}
