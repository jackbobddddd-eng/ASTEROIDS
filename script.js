const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const attract = document.getElementById('attract');
const gameOver = document.getElementById('game-over');
const scoreEl = document.getElementById('score');
const livesDisplay = document.getElementById('lives-display');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let state = 'ATTRACT', score = 0, hiScore = localStorage.getItem('ast_hi') || 5000;
let lives = 3, ship, asteroids = [], bullets = [], particles = [], saucer = null;
const keys = {};

function spawnAsteroid(x, y, r = 55, lvl = 3) {
    asteroids.push({
        x: x || Math.random() * canvas.width,
        y: y || Math.random() * canvas.height,
        r, lvl, xv: (Math.random() - 0.5) * (4 - lvl) * 2.5, yv: (Math.random() - 0.5) * (4 - lvl) * 2.5,
        v: 10, off: Array.from({length: 12}, () => Math.random() * 0.4 + 0.8), a: Math.random() * Math.PI * 2, rot: Math.random() * 0.02
    });
}

function initGame() {
    state = 'PLAYING';
    attract.style.display = 'none';
    gameOver.style.display = 'none';
    score = 0; lives = 3;
    ship = { x: canvas.width/2, y: canvas.height/2, r: 10, a: -Math.PI/2, xv: 0, yv: 0, blink: 90 };
    asteroids = []; bullets = [];
    updateLivesUI();
    for(let i=0; i<4; i++) spawnAsteroid();
}

function die() {
    for(let i=0; i<15; i++) particles.push({x: ship.x, y: ship.y, xv: (Math.random()-0.5)*8, yv: (Math.random()-0.5)*8, life: 40});
    lives--;
    updateLivesUI();
    if (lives <= 0) {
        state = 'GAME_OVER';
        document.getElementById('final-score').innerText = score;
        gameOver.style.display = 'block';
        saveScore(score);
    } else {
        ship = { x: canvas.width/2, y: canvas.height/2, r: 10, a: -Math.PI/2, xv: 0, yv: 0, blink: 90 };
    }
}

function updateLivesUI() {
    livesDisplay.innerHTML = '';
    for(let i=0; i<lives; i++) {
        const icon = document.createElement('div');
        icon.className = 'life-icon';
        livesDisplay.appendChild(icon);
    }
}

function wrap(o) {
    if (o.x < -20) o.x = canvas.width + 20; if (o.x > canvas.width + 20) o.x = -20;
    if (o.y < -20) o.y = canvas.height + 20; if (o.y > canvas.height + 20) o.y = -20;
}

function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;

    // Background drifting asteroids
    asteroids.forEach((ast, i) => {
        ast.x += ast.xv; ast.y += ast.yv; wrap(ast);
        ctx.beginPath();
        for(let j=0; j<ast.v; j++) {
            let ang = ast.a + j * (Math.PI*2/ast.v);
            ctx.lineTo(ast.x + ast.r * ast.off[j] * Math.cos(ang), ast.y + ast.r * ast.off[j] * Math.sin(ang));
        }
        ctx.closePath(); ctx.stroke();

        if (state === 'PLAYING' && ship.blink === 0 && Math.hypot(ship.x - ast.x, ship.y - ast.y) < ast.r + 8) die();
    });

    if (state === 'PLAYING') {
        if (keys.KeyW) { ship.xv += Math.cos(ship.a) * 0.15; ship.yv += Math.sin(ship.a) * 0.15; }
        if (keys.KeyA) ship.a -= 0.09;
        if (keys.KeyD) ship.a += 0.09;
        ship.xv *= 0.99; ship.yv *= 0.99;
        ship.x += ship.xv; ship.y += ship.yv;
        wrap(ship);

        if (ship.blink === 0 || Math.floor(Date.now()/80)%2) {
            ctx.beginPath();
            ctx.moveTo(ship.x + 15*Math.cos(ship.a), ship.y + 15*Math.sin(ship.a));
            ctx.lineTo(ship.x + 10*Math.cos(ship.a+2.4), ship.y + 10*Math.sin(ship.a+2.4));
            ctx.lineTo(ship.x + 10*Math.cos(ship.a-2.4), ship.y + 10*Math.sin(ship.a-2.4));
            ctx.closePath(); ctx.stroke();
        }
        if (ship.blink > 0) ship.blink--;
        scoreEl.innerText = score;
        if (asteroids.length === 0) for(let i=0; i<6; i++) spawnAsteroid();
    }

    // Bullets (Lasers)
    bullets.forEach((b, i) => {
        b.x += b.xv; b.y += b.yv; wrap(b);
        asteroids.forEach((ast, ai) => {
            if (Math.hypot(b.x - ast.x, b.y - ast.y) < ast.r) {
                if (ast.lvl > 1) { spawnAsteroid(ast.x, ast.y, ast.r/2, ast.lvl-1); spawnAsteroid(ast.x, ast.y, ast.r/2, ast.lvl-1); }
                score += (ast.lvl === 3 ? 20 : 100); bullets.splice(i, 1); asteroids.splice(ai, 1);
            }
        });
        ctx.fillStyle = "#fff"; ctx.fillRect(b.x-1, b.y-1, 2, 2);
        if (--b.life <= 0) bullets.splice(i, 1);
    });

    // Particles
    particles.forEach((p, i) => {
        p.x += p.xv; p.y += p.yv; ctx.fillRect(p.x, p.y, 1, 1);
        if (--p.life <= 0) particles.splice(i, 1);
    });

    requestAnimationFrame(draw);
}

function saveScore(s) {
    let scores = JSON.parse(localStorage.getItem('ast_scores') || "[]");
    scores.push(s); scores.sort((a,b) => b-a);
    localStorage.setItem('ast_scores', JSON.stringify(scores.slice(0, 5)));
    if (s > hiScore) { hiScore = s; localStorage.setItem('ast_hi', s); }
    document.getElementById('hi-score').innerText = hiScore;
}

window.addEventListener('keydown', e => {
    if (state === 'ATTRACT') initGame();
    else if (state === 'GAME_OVER') { state = 'ATTRACT'; gameOver.style.display = 'none'; attract.style.display = 'block'; }
    else {
        keys[e.code] = true;
        if (e.code === 'Space' && bullets.length < 4) 
            bullets.push({ x: ship.x, y: ship.y, xv: Math.cos(ship.a)*10, yv: Math.sin(ship.a)*10, life: 60 });
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

document.getElementById('leaderboard-btn').onclick = (e) => {
    e.stopPropagation();
    const list = document.getElementById('score-list');
    const scores = JSON.parse(localStorage.getItem('ast_scores') || "[5000, 2000, 1000]");
    list.innerHTML = scores.map((s, i) => `<li>${i+1}. ${s}</li>`).join('');
    document.getElementById('leaderboard-modal').style.display = 'block';
};

document.getElementById('close-btn').onclick = (e) => {
    e.stopPropagation(); document.getElementById('leaderboard-modal').style.display = 'none';
};

for(let i=0; i<6; i++) spawnAsteroid();
draw();