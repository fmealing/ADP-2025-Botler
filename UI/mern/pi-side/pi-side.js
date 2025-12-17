const axios = require("axios");
const { spawn } = require("child_process");
const fs = require("fs");
require("dotenv").config();

const VITE_API_URL = process.env.VITE_API_URL;        // server location
const LOGIN_ROUTE = "/users/login";                   // Login rute
const DATA_GET_ROUTE = "/orders";                     // GET data route
const DATA_PATCH_ROUTE = "/orders";                   // PATCH (update database) route

// Dedicated login (see .env)
const user = process.env.ROBOTUSER;
const pass = process.env.ROBOTPASS;

// Cache in case server cannot be reached and for faster processing
const CACHE_FILE = "cache.json";
const INTERVAL = 30 * 1000;

let token = null;
let lastCache = loadLocalCache();
let loginThrottle = null;
let lastLogin = 0;

// Load cache
function loadLocalCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE));
    } catch (_) {
      return {};
    }
  }
  return {};
}

// Save cache
function saveLocalCache(data) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

async function loginIfNeeded() {

  console.log(`${VITE_API_URL}${LOGIN_ROUTE}`);

  if(token) return token;

  const dateNow = Date.now();

  if(dateNow-lastLogin < 3000){
    console.log("Login throttled, too many requests.");
    throw new Error("Login Throttled.")
  }

  lastLogin = dateNow;

  if (loginThrottle){
    return await loginThrottle;
  }

  console.log("No token or token expired, logging in.");
  loginThrottle = login();

  const outputLogin = await loginThrottle;
  loginThrottle = null;

  return outputLogin;
}

async function login() {
  try {
    const res = await axios.post(`${VITE_API_URL}${LOGIN_ROUTE}`, {
      username: user,
      password: pass,
    });

    token = res.data.token;
    console.log("Logged in successfully");
    return token;
  } catch (err) {
    console.error("Login failed:", err.message);
    return null;
  }
}

// Fetch data

async function fetchData() {
  try{
    await loginIfNeeded();
  } catch(err){
    console.log("Skipping cycle, login throttled");
    return null;
  }

  try {
    const res = await axios.get(`${VITE_API_URL}${DATA_GET_ROUTE}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;

  } catch (err) {
    if (err.response?.status === 401) {
      console.log("Token expired — reauthenticating.");
      token = null; // force login
      return await fetchData();
    }
    console.error("Fetch error:", err.message);
    return null;
  }
}

// Process python data
//
//
//
//
//
//
//
//
//
//

function runPythonScript(inputData) {
  return new Promise((resolve, reject) => {
    const python = spawn("python3", ["codecode.py"]);

    let output = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (err) => {
      console.log("Python error:", err.toString());
    });

    python.on("close", () => {
      try {
        resolve(JSON.parse(output));
      } catch (e) {
        reject("Invalid Python output");
      }
    });

    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();
  });
}

// Patch database

async function patchData(id, update) {
  try {
    await axios.patch(`${VITE_API_URL}${DATA_PATCH_ROUTE}/${id}`, update, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✔ Patched table ${id}`);
  } catch (err) {
    if (err.response?.status === 401) {
      console.log("Token expired — reauthenticating.");
      token = null;
      return await patchData(id, update);
    }
    console.error("Patch error:", err.message);
  }
}

// main

async function loop() {
  console.log("\n--- Running cycle ---");

  const fetched = await fetchData();
  if (!fetched) return;

  // Check if data changed
  const hasChanged = JSON.stringify(fetched) !== JSON.stringify(lastCache);
  // Skip
  if (!hasChanged) {
    console.log("No changes — skipping Python & patch.");
    return;
  }

  console.log("Data changed — running Python logic...");
  // Run logic
  let pythonResult;
  try {
    pythonResult = await runPythonScript(fetched);
  } catch (e) {
    console.error("Python failed:", e);
    return;
  }

  for (const item of pythonResult) {
    await patchData(item.id, item.update);
  }

  // Update local cache
  lastCache = fetched;
  saveLocalCache(fetched);

  console.log("Cycle done");
}

setInterval(loop, INTERVAL);
loop(); 
