const API="https://ypedqbffumjwccqmgauo.supabase.co/functions/v1/equal-world-api-v2";
const $=id=>document.getElementById(id);
let token=sessionStorage.getItem("eqws_admin_token"), shipments=[], sessions=[], notifications=[], invites=[], selectedSession=null;
let selectedChatUpdatedAt=null, chatAutoRefresh=null, chatLoadBusy=false;

async function api(action,payload={},auth=true){
  const headers={"Content-Type":"application/json"};
  if(auth&&token) headers.Authorization="Bearer "+token;
  const r=await fetch(API,{method:"POST",headers,body:JSON.stringify({action,...payload})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.error) throw new Error(d.error||"Request failed");
  return d;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function showApp(){ $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden"); loadAll(); }
function showLogin(){ $("appView").classList.add("hidden"); $("loginView").classList.remove("hidden"); }
async function login(e){e.preventDefault();$("loginError").textContent="";try{const d=await api("admin_login",{email:$("adminEmail").value.trim(),password:$("adminPassword").value},false);token=d.token;sessionStorage.setItem("eqws_admin_token",token);$("adminPassword").value="";showApp()}catch(x){$("loginError").textContent=x.message}}
$("loginForm").addEventListener("submit",login);
$("logoutBtn").addEventListener("click",()=>{token=null;sessionStorage.removeItem("eqws_admin_token");showLogin()});

function openTab(name){
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===name));
  document.querySelectorAll(".tab-panel").forEach(x=>x.classList.add("hidden"));
  $(name+"Tab").classList.remove("hidden");
  if(name==="shipments") loadShipments();
  if(name==="messages") loadChats();
  if(name==="notifications") loadNotifications();
  if(name==="invite") loadInvites();
}
document.querySelectorAll(".tab,[data-tab]").forEach(b=>b.addEventListener("click",()=>openTab(b.dataset.tab)));

async function loadAll(){await Promise.allSettled([loadShipments(),loadChats(),loadNotifications(),loadInvites()]);renderOverview()}
async function loadShipments(){const d=await api("admin_shipments");shipments=d.shipments||[];renderShipments();updateStats();renderOverview()}
function updateStats(){
 $("statShipments").textContent=shipments.length;
 $("statTransit").textContent=shipments.filter(s=>["In Transit","Picked Up","Out for Delivery"].includes(s.status)).length;
 $("statDelivered").textContent=shipments.filter(s=>s.status==="Delivered").length;
 $("statChats").textContent=sessions.filter(s=>s.status==="open").length;
}
function renderShipments(){
 const q=$("shipmentSearch").value.trim().toLowerCase();
 const list=shipments.filter(s=>Object.values(s).some(v=>String(v??"").toLowerCase().includes(q)));
 $("shipmentList").innerHTML=list.map(s=>`<article class="shipment-card">
  <div class="shipment-top"><strong>${esc(s.tracking_code)}</strong><span class="badge">${esc(s.status)}</span></div>
  <div class="shipment-meta"><div><b>Route</b><br>${esc(s.origin||"—")} → ${esc(s.destination||"—")}</div><div><b>Receiver</b><br>${esc(s.receiver_name||"—")}<br>${esc(s.receiver_email||"")}</div><div><b>Delivery</b><br>${esc(s.estimated_delivery||"—")}<br>${esc(s.service||"—")}</div></div>
  <div class="actions"><button class="secondary" onclick="editShipment('${s.id}')">Edit</button><button onclick="maps('${encodeURIComponent(s.destination||"")}')">Destination map</button></div>
  <div id="edit-${s.id}" class="event-box hidden">
   <label>Status<select id="status-${s.id}">${["Shipment Created","Picked Up","In Transit","Out for Delivery","Delivered","Delayed"].map(x=>`<option ${x===s.status?"selected":""}>${x}</option>`).join("")}</select></label>
   <label>Estimated delivery<input id="date-${s.id}" type="date" value="${esc((s.estimated_delivery||"").slice(0,10))}"></label>
   <label class="wide">Location<input id="loc-${s.id}" value="${esc(s.destination||"")}"></label>
   <label class="wide">Description<textarea id="desc-${s.id}" rows="2"></textarea></label>
   <button onclick="saveShipment('${s.id}')">Save shipment</button>
   <button class="secondary" onclick="addEvent('${s.id}')">Add tracking event</button>
  </div></article>`).join("")||"<p class='empty'>No shipments found.</p>";
}
function editShipment(id){$("edit-"+id).classList.toggle("hidden")}
async function saveShipment(id){try{await api("update_shipment",{id,shipment:{status:$("status-"+id).value,estimated_delivery:$("date-"+id).value||null}});await loadShipments();}catch(e){alert(e.message)}}
async function addEvent(id){try{await api("add_event",{shipment_id:id,event:{status:$("status-"+id).value,location:$("loc-"+id).value,description:$("desc-"+id).value,event_time:new Date().toISOString()}});await loadShipments();alert("Tracking event added.");}catch(e){alert(e.message)}}
function maps(q){if(q)window.open("https://www.google.com/maps/search/?api=1&query="+q,"_blank","noopener")}
$("shipmentSearch").addEventListener("input",renderShipments);$("refreshShipments").addEventListener("click",loadShipments);

$("createShipmentForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target),shipment=Object.fromEntries(f.entries());try{const d=await api("create_shipment",{shipment});$("createResult").textContent="Shipment "+d.shipment.tracking_code+" created successfully.";e.target.reset();await loadShipments();openTab("shipments")}catch(x){$("createResult").textContent=x.message}});

async function loadChats(){
  if(chatLoadBusy) return;
  chatLoadBusy=true;
  try{
    const d=await api("chat_sessions");
    sessions=d.sessions||[];
    renderSessions(); updateStats(); renderOverview();
    if(selectedSession){
      const current=sessions.find(x=>x.id===selectedSession);
      if(current && current.updated_at!==selectedChatUpdatedAt) await selectChat(selectedSession,true);
    }
  } finally { chatLoadBusy=false; }
}
function renderSessions(){
  const ordered=[...sessions].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  $("chatSessions").innerHTML=ordered.map(s=>`<div class="session ${selectedSession===s.id?"active":""}" onclick="selectChat('${s.id}')">
    <div class="session-line"><b>${esc(s.visitor_name||"Visitor")}</b><span class="session-status ${s.status==="open"?"open":"closed"}">${esc(s.status||"")}</span></div>
    <small>${esc(s.visitor_email||"")}</small>
    <small>${s.updated_at?esc(new Date(s.updated_at).toLocaleString()):""}</small>
  </div>`).join("")||"<p class='empty'>No customer messages yet.</p>";
}
async function selectChat(id,silent=false){
  selectedSession=id; renderSessions();
  const s=sessions.find(x=>x.id===id);
  $("chatHeader").innerHTML=`<div>${esc(s?.visitor_name||"Customer")} <span class="chat-live-dot">● Live chat</span></div><small>${esc(s?.visitor_email||"")}</small>`;
  $("replyForm").classList.remove("hidden");
  try{
    const d=await api("admin_chat_messages",{session_id:id});
    $("adminMessages").innerHTML=(d.messages||[]).map(m=>`<div class="msg ${m.sender==="agent"?"agent":"visitor"}"><div>${esc(m.message)}</div><small>${m.sent_at?esc(new Date(m.sent_at).toLocaleString()):""}</small></div>`).join("")||"<p class='empty'>No messages.</p>";
    $("adminMessages").scrollTop=$("adminMessages").scrollHeight;
    selectedChatUpdatedAt=s?.updated_at||null;
  }catch(e){$("chatResult").textContent=e.message}
}
$("replyForm").addEventListener("submit",async e=>{e.preventDefault();if(!selectedSession)return;const input=$("replyInput");const m=input.value.trim();if(!m)return;try{await api("admin_chat_reply",{session_id:selectedSession,message:m});input.value="";await selectChat(selectedSession);await loadNotifications()}catch(x){$("chatResult").textContent=x.message}});
$("refreshChats").addEventListener("click",loadChats);
function startChatAutoRefresh(){clearInterval(chatAutoRefresh);chatAutoRefresh=setInterval(()=>loadChats().catch(()=>{}),4000)}
startChatAutoRefresh();

async function loadNotifications(){const d=await api("admin_notifications");notifications=d.notifications||[];renderNotifications();updateNotificationBadges();renderOverview()}
function updateNotificationBadges(){const unread=notifications.filter(n=>!n.is_read).length;$("notificationCount").textContent=unread;$("notificationBadge").textContent=unread;$("messageBadge").textContent=sessions.filter(s=>s.status==="open").length}
function renderNotifications(){
 $("notificationList").innerHTML=notifications.map(n=>`<article class="notification ${n.is_read?"read":"unread"}"><div class="notification-icon">${n.type==="chat"?"💬":n.type==="shipment"?"📦":n.type==="admin"?"👥":"🔔"}</div><div class="notification-body"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${n.created_at?esc(new Date(n.created_at).toLocaleString()):""}</small></div>${n.is_read?"":"<button class='secondary small' onclick='markNotification("+n.id+")'>Mark read</button>"}</article>`).join("")||"<p class='empty'>No notifications yet.</p>";
}
async function markNotification(id){try{await api("mark_notification_read",{id});await loadNotifications()}catch(e){alert(e.message)}}
$("markAllRead").addEventListener("click",async()=>{try{for(const n of notifications.filter(x=>!x.is_read)) await api("mark_notification_read",{id:n.id});await loadNotifications()}catch(e){alert(e.message)}});
$("refreshNotifications").addEventListener("click",loadNotifications);
$("notificationTopBtn").addEventListener("click",()=>openTab("notifications"));

async function loadInvites(){const d=await api("admin_invites");invites=d.invites||[];renderInvites()}
function renderInvites(){$("inviteList").innerHTML=invites.map(i=>`<div class="invite-row"><strong>${esc(i.email)}</strong><span>${esc(i.role)}</span><small>${i.accepted_at?"Accepted":"Expires "+new Date(i.expires_at).toLocaleString()}</small></div>`).join("")||"<p class='empty'>No invitations yet.</p>"}
$("inviteForm").addEventListener("submit",async e=>{e.preventDefault();$("inviteResult").textContent="Sending invitation…";try{const d=await api("invite_admin",{email:$("inviteEmail").value.trim(),role:$("inviteRole").value});$("inviteResult").innerHTML=d.emailed?"Invitation sent successfully.":"Invitation created. Email delivery is not configured yet.";if(!d.emailed&&d.invite_url)$("inviteResult").innerHTML+=" <a target='_blank' rel='noopener' href='"+esc(d.invite_url)+"'>Open invite link</a>";e.target.reset();await loadInvites();await loadNotifications()}catch(x){$("inviteResult").textContent=x.message}});

function renderOverview(){
 $("recentShipments").innerHTML=shipments.slice(0,5).map(s=>`<div class="mini-row"><strong>${esc(s.tracking_code)}</strong><span>${esc(s.status)}</span></div>`).join("")||"<p class='muted'>No shipments yet.</p>";
 $("recentNotifications").innerHTML=notifications.slice(0,5).map(n=>`<div class="mini-row"><strong>${esc(n.title)}</strong><span>${n.is_read?"":"New"}</span></div>`).join("")||"<p class='muted'>No notifications yet.</p>";
}
$("refreshAll").addEventListener("click",loadAll);

if(token)showApp();
setInterval(()=>{if(token){loadNotifications().catch(()=>{});loadChats().catch(()=>{})}},15000);
