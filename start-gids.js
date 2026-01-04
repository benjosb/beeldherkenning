const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');

const PORT = 3333;
const ROOT_DIR = "/Users/dickbraam/Library/CloudStorage/OneDrive-Persoonlijk/_PROGRAMMEREN_OneDrive/_PROGRAMMEREN/Projecten/signalen/signals";
const FRONTEND_DIR = path.join(ROOT_DIR, "signals-frontend");
const API_ENV_FILE = path.join(ROOT_DIR, "docker-compose/environments/.api");
const FRONTEND_CONFIG = path.join(FRONTEND_DIR, "app.json"); 

// Hulpfunctie om lokaal IP te vinden
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-ipv4
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function backupFile(filePath) {
    const backupPath = filePath + '.bak';
    if (!fs.existsSync(backupPath) && fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        return true;
    }
    return false;
}

function restoreFile(filePath) {
    const backupPath = filePath + '.bak';
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
        fs.unlinkSync(backupPath);
        return true;
    }
    return false;
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serveer HTML
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'signalen-opstartgids.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // API: Start Backend
    if (req.url === '/api/start-backend' && req.method === 'POST') {
        exec('docker-compose up -d', { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            const output = stdout || stderr;
            const success = !error; 
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success, output }));
        });
        return;
    }

    // API: Stop Backend
    if (req.url === '/api/stop-backend' && req.method === 'POST') {
        restoreFile(API_ENV_FILE);
        restoreFile(FRONTEND_CONFIG);

        exec('docker-compose down', { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            const output = stdout || stderr;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !error, output }));
        });
        return;
    }

    // API: Check Backend Status
    if (req.url === '/api/status-backend' && req.method === 'GET') {
        exec('docker-compose ps', { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !error, output: stdout || stderr }));
        });
        return;
    }

    // API: Get Logs (Generic)
    if (req.url.startsWith('/api/logs/') && req.method === 'GET') {
        const service = req.url.split('/')[3]; // /api/logs/keycloak -> keycloak
        // Alleen veilige service namen toestaan
        if (!['keycloak', 'api', 'database'].includes(service)) {
             res.writeHead(400); res.end('Invalid service'); return;
        }
        
        exec(`docker-compose logs --tail=50 ${service}`, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, output: stdout || stderr || "Geen logs gevonden." }));
        });
        return;
    }

    // API: Create Superuser
    if (req.url === '/api/create-admin' && req.method === 'POST') {
        // We gebruiken een one-liner script om een user aan te maken via Django shell
        // Username: admin, Pass: admin, Email: admin@example.com
        const cmd = `docker-compose exec -T api python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').delete(); User.objects.create_superuser('admin', 'admin@example.com', 'admin')"`;
        
        exec(cmd, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            const output = stdout || stderr;
            const msg = error ? `Error: ${output}` : "Gebruiker 'admin' met wachtwoord 'admin' aangemaakt! Probeer nu in te loggen.";
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !error, output: msg }));
        });
        return;
    }

    // API: Start Frontend (Normal)
    if (req.url === '/api/start-frontend' && req.method === 'POST') {
        restoreFile(FRONTEND_CONFIG);
        
        // Versimpelde AppleScript aanroep
        const cmd = `cd "${FRONTEND_DIR}" && npm start`;
        const script = `tell application "Terminal" to do script "${cmd}"`;
        
        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            // We activeren Terminal ook even apart
            exec('osascript -e \'tell application "Terminal" to activate\'');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !error, output: error ? stderr : "Terminal geopend (Localhost modus)" }));
        });
        return;
    }
    
    // API: Start Docker
    if (req.url === '/api/start-docker' && req.method === 'POST') {
        exec('open -a "Docker"', (error, stdout, stderr) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !error, output: "Docker starten..." }));
        });
        return;
    }

    // API: Mobiel Modus START
    if (req.url === '/api/mobile-start' && req.method === 'POST') {
        const ip = getLocalIp();
        
        // 1. Backups maken
        backupFile(API_ENV_FILE);
        backupFile(FRONTEND_CONFIG);

        try {
            // 2. Pas Frontend Config aan
            let feConfig = fs.readFileSync(FRONTEND_CONFIG, 'utf8');
            feConfig = feConfig.replace(/localhost/g, ip);
            fs.writeFileSync(FRONTEND_CONFIG, feConfig);

            // 3. Pas Backend Env aan
            let apiEnv = fs.readFileSync(API_ENV_FILE, 'utf8');
            apiEnv = apiEnv.replace(/localhost/g, ip);
            
            if (!apiEnv.includes('CORS_ORIGIN_ALLOW_ALL')) {
                apiEnv += '\nCORS_ORIGIN_ALLOW_ALL=True';
            }
            if (!apiEnv.includes('CORS_ALLOW_ALL_ORIGINS')) {
                apiEnv += '\nCORS_ALLOW_ALL_ORIGINS=True';
            }
            if (apiEnv.match(/^ALLOWED_HOSTS=/m)) {
                apiEnv = apiEnv.replace(/^ALLOWED_HOSTS=.*/m, 'ALLOWED_HOSTS=*');
            } else {
                apiEnv += '\nALLOWED_HOSTS=*';
            }
            
            fs.writeFileSync(API_ENV_FILE, apiEnv);

            // 4. Herstart backend (api only)
            exec('docker-compose up -d --no-deps api', { cwd: ROOT_DIR });

            // 5. Start Frontend
            const cmd = `cd "${FRONTEND_DIR}" && npm start -- --host 0.0.0.0 --allowed-hosts all`;
            const script = `tell application "Terminal" to do script "${cmd}"`;
            
            exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
                exec('osascript -e \'tell application "Terminal" to activate\'');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    ip: ip,
                    output: `Mobiele modus geactiveerd op IP: ${ip}\nBackend config updated (CORS, Hosts & Auth).\nFrontend start in Terminal.` 
                }));
            });

        } catch (e) {
             res.writeHead(500, { 'Content-Type': 'application/json' });
             res.end(JSON.stringify({ success: false, output: e.message }));
             restoreFile(API_ENV_FILE);
             restoreFile(FRONTEND_CONFIG);
        }
        return;
    }

    // API: Mobiel Modus STOP
    if (req.url === '/api/mobile-stop' && req.method === 'POST') {
        try {
            restoreFile(API_ENV_FILE);
            restoreFile(FRONTEND_CONFIG);
            
            exec('docker-compose up -d --no-deps api', { cwd: ROOT_DIR });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, output: "Mobiele modus uitgeschakeld. Configs hersteld." }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, output: e.message }));
        }
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n🚀 Opstartgids server draait!`);
    console.log(`👉 Ga naar: http://localhost:${PORT}`);
    console.log(`(Druk Ctrl+C om te stoppen)\n`);
});
