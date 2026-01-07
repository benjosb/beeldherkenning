const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const PORT = 3333;
// Gebruik de huidige map als root (waar het script gestart wordt)
const ROOT_DIR = process.cwd(); 
const FRONTEND_DIR = path.join(ROOT_DIR, "signals-frontend");
const API_ENV_FILE = path.join(ROOT_DIR, "docker-compose/environments/.api");
const FRONTEND_CONFIG = path.join(FRONTEND_DIR, "app.json"); 

// Detecteer OS
const isMac = process.platform === 'darwin';
const isWsl = (() => {
    if (process.platform !== 'linux') return false;
    try {
        const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
        return version.includes('microsoft') || version.includes('wsl');
    } catch (e) { return false; }
})();

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

    // API: Start Frontend
    if (req.url === '/api/start-frontend' && req.method === 'POST') {
        restoreFile(FRONTEND_CONFIG);
        
        if (isMac) {
            // macOS: Schrijf tijdelijk script om quoting problemen te vermijden
            const tempScript = path.join(ROOT_DIR, '.tmp-start-frontend.sh');
            const scriptContent = `#!/bin/bash
cd "${FRONTEND_DIR}"
npm start
`;
            fs.writeFileSync(tempScript, scriptContent);
            fs.chmodSync(tempScript, '755');
            
            // Open script in nieuwe Terminal
            exec(`open -a Terminal "${tempScript}"`, (error, stdout, stderr) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: !error, output: error ? stderr : "Terminal geopend (macOS)" }));
            });
        } else if (isWsl) {
            // WSL: Probeer via cmd.exe een nieuw venster te openen
            // We gebruiken 'start bash -c ...' om een nieuw venster te forceren
            // Let op: paden in WSL zijn /home/..., maar Windows snapt dat soms niet direct in 'start'.
            // Beste optie: open een cmd window dat 'wsl' aanroept.
            const wslCmd = `cd '${FRONTEND_DIR}' && npm start`;
            const winCmd = `cmd.exe /c start cmd.exe /k "wsl.exe bash -c \\"${wslCmd}\\""`;
            
            exec(winCmd, (error, stdout, stderr) => {
                 res.writeHead(200, { 'Content-Type': 'application/json' });
                 res.end(JSON.stringify({ success: !error, output: error ? stderr : "Nieuw Windows Terminal venster geopend (WSL)." }));
            });
        } else {
            // Linux / Andere
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                output: "Kon geen terminal openen op dit OS. Draai handmatig:\n\ncd signals-frontend && npm start" 
            }));
        }
        return;
    }
    
    // API: Start Docker
    if (req.url === '/api/start-docker' && req.method === 'POST') {
        if (isMac) {
            exec('open -a "Docker"', (error, stdout, stderr) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: !error, output: "Docker starten..." }));
            });
        } else if (isWsl) {
            // In WSL kun je Docker Desktop voor Windows starten via het pad, maar dat is tricky.
            // We checken gewoon of het draait.
            exec('docker info', (error, stdout, stderr) => {
                if (error) {
                     res.writeHead(200, { 'Content-Type': 'application/json' });
                     res.end(JSON.stringify({ success: false, output: "Docker lijkt niet te draaien. Start Docker Desktop in Windows." }));
                } else {
                     res.writeHead(200, { 'Content-Type': 'application/json' });
                     res.end(JSON.stringify({ success: true, output: "Docker draait al (via WSL)." }));
                }
            });
        } else {
             res.end(JSON.stringify({ success: true, output: "Controleer handmatig of Docker draait." }));
        }
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
            
            if (!apiEnv.includes('CORS_ORIGIN_ALLOW_ALL')) apiEnv += '\nCORS_ORIGIN_ALLOW_ALL=True';
            if (!apiEnv.includes('CORS_ALLOW_ALL_ORIGINS')) apiEnv += '\nCORS_ALLOW_ALL_ORIGINS=True';
            if (apiEnv.match(/^ALLOWED_HOSTS=/m)) apiEnv = apiEnv.replace(/^ALLOWED_HOSTS=.*/m, 'ALLOWED_HOSTS=*');
            else apiEnv += '\nALLOWED_HOSTS=*';
            if (!apiEnv.includes('ADMIN_ENABLE_LOCAL_LOGIN')) apiEnv += '\nADMIN_ENABLE_LOCAL_LOGIN=True';
            
            fs.writeFileSync(API_ENV_FILE, apiEnv);

            // 4. Herstart backend (api only)
            exec('docker-compose up -d --no-deps api', { cwd: ROOT_DIR });

            // 5. Start Frontend
            const wslCmd = `cd '${FRONTEND_DIR}' && npm start -- --host 0.0.0.0 --allowed-hosts all`;
            
            if (isMac) {
                // Schrijf tijdelijk script om quoting problemen te vermijden
                const tempScript = path.join(ROOT_DIR, '.tmp-start-frontend-mobile.sh');
                const scriptContent = `#!/bin/bash
cd "${FRONTEND_DIR}"
npm start -- --host 0.0.0.0 --allowed-hosts all
`;
                fs.writeFileSync(tempScript, scriptContent);
                fs.chmodSync(tempScript, '755');
                exec(`open -a Terminal "${tempScript}"`);
            } else if (isWsl) {
                const winCmd = `cmd.exe /c start cmd.exe /k "wsl.exe bash -c \\"${wslCmd}\\""`;
                exec(winCmd);
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                ip: ip,
                output: `Mobiele modus geactiveerd op IP: ${ip}\nBackend config updated.\nFrontend herstart.` 
            }));

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

    // API: Git Save
    if (req.url === '/api/git-save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { message } = JSON.parse(body || '{}');
            const commitMsg = message || `Checkpoint ${new Date().toISOString()}`;
            
            // 1. Add
            exec('git add .', { cwd: ROOT_DIR }, (err, stdout, stderr) => {
                if(err) {
                    res.writeHead(500); res.end(JSON.stringify({success:false, output: stderr})); return;
                }
                // 2. Commit
                exec(`git commit -m "${commitMsg}"`, { cwd: ROOT_DIR }, (err, stdout, stderr) => {
                     // 3. Push
                     exec('git push origin main', { cwd: ROOT_DIR }, (err, stdout, stderr) => {
                         const output = stdout || stderr;
                         res.writeHead(200, { 'Content-Type': 'application/json' });
                         res.end(JSON.stringify({ 
                             success: !err, 
                             output: err ? "Commit OK, Push failed:\n" + output : "Succesvol gepusht naar GitHub!"
                         }));
                     });
                });
            });
        });
        return;
    }

    // STATIC FILE HANDLER
    const safeExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.css', '.js'];
    const ext = path.extname(req.url);
    if (safeExtensions.includes(ext)) {
        const filePath = path.join(ROOT_DIR, req.url);
        if (filePath.startsWith(ROOT_DIR) && fs.existsSync(filePath)) {
            const mimeTypes = {
                '.svg': 'image/svg+xml',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.css': 'text/css',
                '.js': 'text/javascript'
            };
            fs.readFile(filePath, (err, data) => {
                if (!err) {
                    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
                    res.end(data);
                } else {
                    res.writeHead(404); res.end('File not found');
                }
            });
            return;
        }
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n🚀 Opstartgids server draait! (OS: ${isMac ? 'macOS' : (isWsl ? 'WSL' : 'Linux')})`);
    console.log(`👉 Ga naar: http://localhost:${PORT}`);
    console.log(`(Druk Ctrl+C om te stoppen)\n`);
});
