// Obtención de elementos del DOM y configuración del canvas
const initialContent = document.getElementById('initialContent');
const openBtn = document.getElementById('openBtn');
const rosesContainer = document.getElementById('rosesContainer');
const canvas = document.getElementById('rosesCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth * 0.9, 1000);
    canvas.height = Math.min(window.innerHeight * 0.7, 600);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Punto base donde convergen los tallos (un poco por debajo del canvas)
const basePoint = { x: canvas.width / 2, y: canvas.height + 50 };

// --- Helpers para cálculos de curvas Bézier ---
function getCubicBezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
}

function getCubicBezierTangent(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    return {
        x: -3 * uu * p0.x + 3 * uu * p1.x - 6 * u * t * p1.x + 6 * u * t * p2.x - 3 * tt * p2.x + 3 * tt * p3.x,
        y: -3 * uu * p0.y + 3 * uu * p1.y - 6 * u * t * p1.y + 6 * u * t * p2.y - 3 * tt * p2.y + 3 * tt * p3.y
    };
}

// --- Clase Rose ---
class Rose {
    constructor(x, y, size, colors, petalCount, tiltDirection, isMain) {
        this.x = x;
        this.y = y;
        this.initialX = x;
        this.initialY = y;
        this.size = size;
        this.colors = colors; // [colorCentro, colorBorde]
        this.petalCount = petalCount;
        this.tiltDirection = tiltDirection;
        this.isMain = isMain; // Determina si es rosa principal o secundaria
        
        // Configuración del florecimiento secuencial
        this.petalDelay = 300; // ms de retraso entre cada pétalo
        this.petalDuration = 500; // ms para que cada pétalo se abra completamente
        this.startTime = null; // Se asigna al iniciar la animación
        this.fullBloom = false;
        
        // Parámetros para el balanceo suave tras el florecimiento
        this.phase = Math.random() * Math.PI * 2;
        this.swayAmplitude = 10; // Desplazamiento en píxeles
        this.swayFrequency = 0.002; // Frecuencia en radianes por ms
        
        // Creación de la forma del pétalo usando Path2D
        this.petalPath = this.createPetalPath();
        
        // Cálculo de los puntos de control para el tallo (curva Bézier cúbica)
        this.stemP0 = { x: this.x, y: this.y + this.size * 0.5 };
        this.stemP3 = { x: basePoint.x, y: basePoint.y };
        this.stemP1 = { x: this.x + (Math.random() * 40 - 20), y: this.y + this.size * 1.2 };
        this.stemP2 = { x: (this.x + basePoint.x) / 2 + (Math.random() * 40 - 20), y: (this.y + basePoint.y) / 2 };
    }
    
    createPetalPath() {
        const path = new Path2D();
        // Se define la forma del pétalo con curvas Bézier para lograr un contorno natural
        path.moveTo(0, 0);
        path.bezierCurveTo(-0.4, 0.1, -0.6, 0.4, -0.3, 0.8);
        path.bezierCurveTo(-0.1, 1.1, 0.1, 1.1, 0.3, 0.8);
        path.bezierCurveTo(0.6, 0.4, 0.4, 0.1, 0, 0);
        return path;
    }
    
    update(currentTime) {
        if (!this.startTime) {
            this.startTime = currentTime;
        }
        const elapsed = currentTime - this.startTime;
        // Se determina si el florecimiento ha finalizado
        if (elapsed > this.petalCount * this.petalDelay + this.petalDuration) {
            this.fullBloom = true;
        }
    }
    
    draw(currentTime) {
        const elapsed = currentTime - this.startTime;
        ctx.save();
        
        // Si ya floreció, se aplica un balanceo suave
        let swayOffsetX = 0, swayOffsetY = 0;
        if (this.fullBloom) {
            const sway = Math.sin(currentTime * this.swayFrequency + this.phase) * this.swayAmplitude;
            swayOffsetX = sway * this.tiltDirection;
            swayOffsetY = sway * 0.3;
        }
        ctx.translate(this.x + swayOffsetX, this.y + swayOffsetY);
        
        // Dibuja cada pétalo de forma secuencial
        for (let i = 0; i < this.petalCount; i++) {
            const petalElapsed = elapsed - i * this.petalDelay;
            const growth = Math.min(Math.max(petalElapsed / this.petalDuration, 0), 1);
            if (growth > 0) {
                ctx.save();
                const angle = (i * 2 * Math.PI) / this.petalCount;
                ctx.rotate(angle + (this.tiltDirection * 0.1));
                const petalScale = this.size * 0.4 * growth;
                ctx.scale(petalScale, petalScale);
                
                // Gradiente radial para dar efecto de luz y sombra en el pétalo
                const gradient = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 0.5);
                gradient.addColorStop(0, this.colors[0]);
                gradient.addColorStop(1, this.colors[1]);
                ctx.fillStyle = gradient;
                ctx.strokeStyle = this.colors[1];
                ctx.lineWidth = 0.05;
                
                ctx.fill(this.petalPath);
                ctx.stroke(this.petalPath);
                ctx.restore();
            }
        }
        
        // Dibuja el centro de la rosa como un pequeño círculo
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.1, 0, 2 * Math.PI);
        ctx.fillStyle = this.colors[1];
        ctx.fill();
        ctx.restore();
        
        // Dibuja el tallo y las hojas
        this.drawStemAndLeaves();
    }
    
    drawStemAndLeaves() {
        // Tallo: dibujado como una curva Bézier cúbica
        ctx.beginPath();
        ctx.moveTo(this.stemP0.x, this.stemP0.y);
        ctx.bezierCurveTo(this.stemP1.x, this.stemP1.y, this.stemP2.x, this.stemP2.y, this.stemP3.x, this.stemP3.y);
        ctx.strokeStyle = "#2E8B57"; // verde marino
        ctx.lineWidth = this.size * 0.08;
        ctx.stroke();
        
        // Hojas: se colocan en dos puntos (t = 0.4 y t = 0.7) a lo largo del tallo
        [0.4, 0.7].forEach(t => {
            const point = getCubicBezierPoint(t, this.stemP0, this.stemP1, this.stemP2, this.stemP3);
            const tangent = getCubicBezierTangent(t, this.stemP0, this.stemP1, this.stemP2, this.stemP3);
            const angle = Math.atan2(tangent.y, tangent.x);
            ctx.save();
            ctx.translate(point.x, point.y);
            ctx.rotate(angle + Math.PI / 2);
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.15, this.size * 0.06, 0, 0, 2 * Math.PI);
            ctx.fillStyle = "#228B22"; // verde bosque
            ctx.fill();
            ctx.restore();
        });
    }
}

// --- Creación del ramo (bouquet) ---
let roses = [];
function createBouquet() {
    roses = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 4;
    
    // Rosas principales (3) en colores rojo, blanco y amarillo
    const mainColors = [
        ['#ffcccc', '#ff3366'], // tono rosado/rojo
        ['#ffffff', '#ff99b3'], // blanco con detalle rosa
        ['#ffffcc', '#ffcc00']  // amarillo suave
    ];
    
    for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3 - Math.PI/2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        roses.push(new Rose(x, y, 80, mainColors[i], 8, (i % 2 === 0 ? 1 : -1), true));
    }
    
    // Rosas secundarias (3) distribuidas alrededor
    for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3 - Math.PI/2 + Math.PI/6;
        const x = centerX + (radius * 1.2) * Math.cos(angle);
        const y = centerY + (radius * 1.2) * Math.sin(angle);
        roses.push(new Rose(x, y, 50, mainColors[i % 3], 6, (i % 2 === 0 ? 0.5 : -0.5), false));
    }
}

createBouquet();

// --- Bucle de animación ---
function animate(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffe6f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    roses.forEach(rose => {
        rose.update(time);
        rose.draw(time);
    });
    
    requestAnimationFrame(animate);
}

// Inicia la animación al pulsar el botón
openBtn.addEventListener('click', () => {
    initialContent.style.opacity = '0';
    setTimeout(() => {
        initialContent.style.display = 'none';
        rosesContainer.style.display = 'block';
        rosesContainer.style.opacity = '1';
        createBouquet(); // Recalcula posiciones si hay cambios de tamaño
        requestAnimationFrame(animate);
    }, 500);
});
