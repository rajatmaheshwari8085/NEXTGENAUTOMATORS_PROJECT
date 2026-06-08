// ================= GRAPH DATA =================
let tempLabels=[];
let tempData=[];

let soilLabels=[];
let soilData=[];

let lastGraphUpdate=0;
const graphInterval=300000; // 5 min


// ================= AUTO MODE FLAGS =================
let pumpAutoMode = false;
let fanAutoMode = false;


// ================= INIT AFTER PAGE LOAD =================
window.onload = function(){

// Temperature Chart
const tctx=document.getElementById("tempChart");

window.tempChart=new Chart(tctx,{
type:'line',
data:{
labels:tempLabels,
datasets:[{
label:'Temperature',
data:tempData,
borderWidth:3,
tension:.4
}]
}
});


// Soil Chart
const sctx=document.getElementById("soilChart");

window.soilChart=new Chart(sctx,{
type:'line',
data:{
labels:soilLabels,
datasets:[{
label:'Soil Moisture',
data:soilData,
borderWidth:3,
tension:.4
}]
}
});


// Start data fetch
getData();
setInterval(getData,2000);

};



// ================= FETCH DATA =================
async function getData(){

try{

let res=await fetch("/data");
let data=await res.json();

const statusBadge = document.getElementById("deviceStatus");

if (data.success === false) {
  if (statusBadge) {
    statusBadge.innerText = "🔴 Offline";
    statusBadge.className = "status-badge status-offline";
  }
  
  const tempEl = document.getElementById("temp");
  const soilEl = document.getElementById("soil");
  const distEl = document.getElementById("dist");
  
  if (tempEl && (tempEl.innerText === "" || tempEl.innerText === "undefined")) tempEl.innerText = "--";
  if (soilEl && (soilEl.innerText === "" || soilEl.innerText === "undefined")) soilEl.innerText = "--";
  if (distEl && (distEl.innerText === "" || distEl.innerText === "undefined")) distEl.innerText = "--";
  
  return;
}

if (statusBadge) {
  statusBadge.innerText = "🟢 Online";
  statusBadge.className = "status-badge status-online";
}

// ================= AUTO MODE LOGIC =================

// PUMP AUTO
if(pumpAutoMode){

if(data.soil < 30){

await fetch("/relay",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
device:"pump",
state:"ON"
})
});

data.pumpStatus = "ON";

}
else{

await fetch("/relay",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
device:"pump",
state:"OFF"
})
});

data.pumpStatus = "OFF";

}

}


// FAN AUTO
if(fanAutoMode){

if(data.temperature > 30){

await fetch("/relay",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
device:"fan",
state:"ON"
})
});

data.fanStatus = "ON";

}
else{

await fetch("/relay",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
device:"fan",
state:"OFF"
})
});

data.fanStatus = "OFF";

}

}


// Update UI
document.getElementById("temp").innerText=data.temperature;
document.getElementById("soil").innerText=data.soil;
document.getElementById("dist").innerText=data.distance;

document.getElementById("pumpStatus").innerText=data.pumpStatus;
document.getElementById("fanStatus").innerText=data.fanStatus;


// ================= GRAPH UPDATE (5 min) =================
let currentTime=Date.now();

if(currentTime - lastGraphUpdate > graphInterval){

let now=new Date().toLocaleTimeString([],{
hour:'2-digit',
minute:'2-digit'
});

tempLabels.push(now);
tempData.push(data.temperature);

soilLabels.push(now);
soilData.push(data.soil);


// last 12 points
if(tempLabels.length>12){

tempLabels.shift();
tempData.shift();

soilLabels.shift();
soilData.shift();

}

tempChart.update();
soilChart.update();

lastGraphUpdate=currentTime;

}


// ================= ALERTS =================
let alerts=[];

if(data.soil<30)
alerts.push("Low Moisture Alert");

if(data.temperature>30)
alerts.push("High Temperature Alert");

if(data.distance<20)
alerts.push("Object Detected Alert");

if(alerts.length===0)
alerts.push("System Normal");

document.getElementById("alerts").innerHTML=
alerts.map(a=>"<li>"+a+"</li>").join("");

}
catch(err){
console.log("Error:",err);
}

}



// ================= CONTROL =================
async function controlDevice(device,state){

// ================= AUTO MODE HANDLE =================

// PUMP
if(device === "pump"){

if(state === "AUTO"){

pumpAutoMode = true;

document.getElementById("pumpStatus").innerText = "AUTO";

showNotification("🤖 Pump set to AUTO Mode");

return;

}else{

pumpAutoMode = false;

}

}

// FAN
if(device === "fan"){

if(state === "AUTO"){

fanAutoMode = true;

document.getElementById("fanStatus").innerText = "AUTO";

showNotification("🤖 Fan set to AUTO Mode");

return;

}else{

fanAutoMode = false;

}

}


// ================= IMMEDIATE UI UPDATE =================

// Pump Status Instant Change
if(device === "pump"){

document.getElementById("pumpStatus").innerText = state;

}

// Fan Status Instant Change
if(device === "fan"){

document.getElementById("fanStatus").innerText = state;

}


// ================= SEND TO BACKEND =================
await fetch("/relay",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
device,
state
})
});


/* ================= PUMP ================= */

if(device === "pump" && state === "ON"){

showNotification("✅ Pump Turned ON");

}

if(device === "pump" && state === "OFF"){

showNotification("❌ Pump Turned OFF");

}


/* ================= FAN ================= */

if(device === "fan" && state === "ON"){

showNotification("🌀 Fan Turned ON");

}

if(device === "fan" && state === "OFF"){

showNotification("❌ Fan Turned OFF");

}

}

// ================= SIDEBAR =================
let sidebarOpen=false;

function toggleSidebar(){

let sidebar=document.getElementById("sidebar");
let main=document.getElementById("mainContent");

if(!sidebarOpen){

sidebar.style.left="0px";
main.classList.add("shift");
sidebarOpen=true;

}else{

sidebar.style.left="-220px";
main.classList.remove("shift");
sidebarOpen=false;

}

}



// ================= SECTION SWITCH =================
function showSection(id){

let sections=document.querySelectorAll(".section");

// hide all
sections.forEach(s=>{
s.classList.remove("active");
});

// show selected
document.getElementById(id).classList.add("active");


// ✅ BONUS: Active menu highlight
let links=document.querySelectorAll(".sidebar a");

links.forEach(link=>{
link.classList.remove("active");
});

event.target.classList.add("active");

// ❌ sidebar close REMOVE (ab open rahega)
}

/* ================= LOGIN SYSTEM ================= */

let currentRole = "";

function login(){

const username = document.getElementById("username").value;
const password = document.getElementById("password").value;
const msg = document.getElementById("loginMsg");

/* USER LOGIN */
if(username === "admin" && password === "1234"){

currentRole = "user";

// Hide login
document.getElementById("loginPage").style.display = "none";

// Show dashboard
document.getElementById("mainContent").style.display = "block";

document.body.classList.remove("viewer-mode");
document.getElementById("currentRoleText").innerText = "ADMIN";

}

/* VIEWER LOGIN */
else if(username === "viewer" && password === "0000"){

currentRole = "viewer";

document.getElementById("loginPage").style.display = "none";
document.getElementById("mainContent").style.display = "block";
document.getElementById("currentRoleText").innerText = "VIEWER";

// Viewer mode class
document.body.classList.add("viewer-mode");

// Hide all control buttons
document.querySelectorAll(".control-card button").forEach(btn => {
btn.style.display = "none";
});

}

else{
msg.innerText = "Invalid ID or Password";
}

}

function logout(){

localStorage.removeItem("savedRole");

location.reload();

}

/* ================= NOTIFICATION FUNCTION ================= */

function showNotification(message){

const notification =
document.getElementById("notification");

notification.innerText = message;

notification.classList.add("show");

/* Hide after 3 sec */

setTimeout(() => {

notification.classList.remove("show");

},3000);

}

/* ================= DARK MODE ================= */

function toggleDarkMode(){

document.body.classList.toggle("dark-mode");

/* ELEMENTS */

const themeText =
document.getElementById("themeText");

const themeIcon =
document.getElementById("themeIcon");

/* CHECK MODE */

if(document.body.classList.contains("dark-mode")){

localStorage.setItem("theme","dark");

themeText.innerText = "Dark";

themeIcon.innerText = "🌙";

}

else{

localStorage.setItem("theme","light");

themeText.innerText = "Light";

themeIcon.innerText = "☀";

}

}

/* Restore Dark Mode Safely */

document.addEventListener("DOMContentLoaded", () => {

const savedTheme = localStorage.getItem("theme");

if(savedTheme === "dark"){

document.body.classList.add("dark-mode");

}

});