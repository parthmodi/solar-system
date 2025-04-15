const canvas = document.getElementById('solarSystemCanvas');
const ctx = canvas.getContext('2d');

const SUN_RADIUS = 40;
const PLANETS = [
  { name: 'Mercury', color: '#888888', radius: 4, orbit: 60, speed: 0.024 }, // dark gray
  { name: 'Venus', color: '#e6d8ad', radius: 7, orbit: 90, speed: 0.018 }, // pale yellow/beige
  { name: 'Earth', color: '#3d9cff', radius: 8, orbit: 130, speed: 0.015 }, // blue
  { name: 'Mars', color: '#c1440e', radius: 6, orbit: 170, speed: 0.012 }, // reddish-orange
  { name: 'Jupiter', color: '#d2b48c', radius: 18, orbit: 220, speed: 0.008 }, // tan with pale bands
  { name: 'Saturn', color: '#f6e58d', radius: 16, orbit: 280, speed: 0.006 }, // pale gold
  { name: 'Uranus', color: '#7fdbff', radius: 12, orbit: 340, speed: 0.004 }, // cyan/blue-green
  { name: 'Neptune', color: '#1b3b8b', radius: 12, orbit: 400, speed: 0.003 }, // deep blue
];

let time = 0;
let paused = false;
let hoveredPlanetIdx = null;
let popupPlanetIdx = null;

const popup = document.getElementById('planetPopup');
const popupTitle = document.getElementById('popupTitle');
const popupBody = document.getElementById('popupBody');
const popupClose = document.getElementById('popupClose');

function getScaleFactor() {
  // The largest planet's orbit + radius should fit within the smallest window dimension
  const maxOrbit = Math.max(...PLANETS.map(p => p.orbit + p.radius));
  const marginTop = 100; // px, enough for title
  const marginBottom = 120; // px, enough for buttons
  const minDim = Math.min(window.innerWidth, window.innerHeight - marginTop - marginBottom);
  return (minDim/2) / maxOrbit;
}

let scale = getScaleFactor();

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  scale = getScaleFactor();
  draw();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawSun() {
  ctx.save();
  ctx.scale(scale, scale);
  if (hoveredPlanetIdx === 'sun' && popupPlanetIdx === null) {
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 100 * scale;
  } else {
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 60 * scale;
  }
  const sunGradient = ctx.createRadialGradient(-SUN_RADIUS * 0.3, -SUN_RADIUS * 0.3, SUN_RADIUS * 0.3, 0, 0, SUN_RADIUS);
  sunGradient.addColorStop(0, '#fffde0');
  sunGradient.addColorStop(0.25, '#ffe066');
  sunGradient.addColorStop(0.75, '#ffb400');
  sunGradient.addColorStop(1, '#ff9600');
  ctx.beginPath();
  ctx.arc(0, 0, SUN_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = sunGradient;
  ctx.fill();
  ctx.font = `${16/scale}px Arial`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Sun', 0, -SUN_RADIUS - 12);
  ctx.restore();
}

function isPointInOrbit(x, y, planet) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  // Allow a margin for easier clicking (scaled)
  return Math.abs(r - planet.orbit * scale) < 10;
}

function drawOrbit(orbit, isHovered, planet) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, orbit, 0, Math.PI * 2);
  if (isHovered) {
    ctx.shadowColor = planet.color;
    ctx.shadowBlur = 24 * scale;
    ctx.strokeStyle = planet.color;
    ctx.lineWidth = 4/scale;
  } else {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; // More visible, semi-opaque white
    ctx.lineWidth = 2/scale;
  }
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.restore();
}

function drawPlanet(planet, angle, isHovered) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.rotate(angle);
  ctx.translate(planet.orbit, 0);
  if (isHovered) {
    ctx.shadowColor = planet.color;
    ctx.shadowBlur = 40 * scale;
  }
  const grad = ctx.createRadialGradient(-planet.radius * 0.4, -planet.radius * 0.4, planet.radius * 0.2, 0, 0, planet.radius);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.18, planet.color);
  grad.addColorStop(0.8, planet.color);
  grad.addColorStop(1, '#222');
  ctx.beginPath();
  ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawLabels(planet, angle, isHovered) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.rotate(angle);
  ctx.translate(planet.orbit, 0);
  ctx.rotate(-angle); // Undo the rotation so text is upright
  ctx.font = isHovered ? `bold ${14/scale}px Arial` : `${12/scale}px Arial`;
  ctx.fillStyle = isHovered ? '#fff' : '#aaa';
  ctx.textAlign = 'center';
  ctx.fillText(planet.name, 0, planet.radius + 16);
  ctx.restore();
}


function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  PLANETS.forEach((planet, i) => {
    const angle = time * planet.speed;
    const isHovered = hoveredPlanetIdx === i && popupPlanetIdx === null;
    drawOrbit(planet.orbit, isHovered, planet);
  });
  drawSun();
  PLANETS.forEach((planet, i) => {
    const angle = time * planet.speed;
    const isHovered = hoveredPlanetIdx === i && popupPlanetIdx === null;
    drawPlanet(planet, angle, isHovered);
    drawLabels(planet, angle, isHovered);
  });
  ctx.restore();
}

// --- Animation Speed Controls ---
const speedUpBtn = document.getElementById('speed-up-btn');
const slowDownBtn = document.getElementById('slow-down-btn');
const speedIndicator = document.getElementById('speed-indicator');

let speedMultiplier = 1;
let speedInterval = null;
const SPEED_STEP = 0.25;
const SPEED_MIN = 0.1;
const SPEED_MAX = 8;

function updateSpeedIndicator() {
  speedIndicator.textContent = speedMultiplier.toFixed(2).replace(/\.00$/, '') + '×';
  speedIndicator.style.transition = 'color 0.2s';
  if (speedMultiplier > 1) {
    speedIndicator.style.color = '#7fff7f';
  } else if (speedMultiplier < 1) {
    speedIndicator.style.color = '#ffb400';
  } else {
    speedIndicator.style.color = '#ffe066';
  }
}

function setSpeedMultiplier(mult) {
  speedMultiplier = Math.max(SPEED_MIN, Math.min(SPEED_MAX, mult));
  updateSpeedIndicator();
}

function handleSpeedChange(delta) {
  setSpeedMultiplier(speedMultiplier + delta);
}

function resetSpeedGradually(duration = 800) {
  const start = performance.now();
  const initial = speedMultiplier;
  const target = 1;
  function step(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    speedMultiplier = initial + (target - initial) * t;
    updateSpeedIndicator();
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      speedMultiplier = target;
      updateSpeedIndicator();
    }
  }
  requestAnimationFrame(step);
}

function stopSpeedChange() {
  if (speedInterval) {
    clearInterval(speedInterval);
    speedInterval = null;
  }
  resetSpeedGradually(); // Gradually return to normal speed
}

function startSpeedChange(delta) {
  handleSpeedChange(delta); // instant feedback
  if (speedInterval) clearInterval(speedInterval);
  speedInterval = setInterval(() => handleSpeedChange(delta), 100);
}

speedUpBtn.addEventListener('mousedown', () => startSpeedChange(SPEED_STEP));
speedUpBtn.addEventListener('mouseup', stopSpeedChange);
speedUpBtn.addEventListener('mouseleave', stopSpeedChange);
speedUpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startSpeedChange(SPEED_STEP); });
speedUpBtn.addEventListener('touchend', stopSpeedChange);

slowDownBtn.addEventListener('mousedown', () => startSpeedChange(-SPEED_STEP));
slowDownBtn.addEventListener('mouseup', stopSpeedChange);
slowDownBtn.addEventListener('mouseleave', stopSpeedChange);
slowDownBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startSpeedChange(-SPEED_STEP); });
slowDownBtn.addEventListener('touchend', stopSpeedChange);

function animate() {
  if (!paused) time += 1 * speedMultiplier;
  draw();
  requestAnimationFrame(animate);
}
animate();

function isPointInPlanet(x, y, planet, angle, extraRadius = 0) {
  const cx = canvas.width / 2 + Math.cos(angle) * planet.orbit * scale;
  const cy = canvas.height / 2 + Math.sin(angle) * planet.orbit * scale;
  const dx = x - cx;
  const dy = y - cy;
  // Increase the click target by 6px (rendered size) in addition to scaling
  const targetRadius = planet.radius * scale + extraRadius + 6;
  return Math.sqrt(dx * dx + dy * dy) <= targetRadius;
}

function isPointInSun(x, y, extraRadius = 0) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const r = SUN_RADIUS * scale + extraRadius + 8; // slightly bigger target
  return Math.sqrt(dx * dx + dy * dy) <= r;
}

canvas.addEventListener('mousemove', (e) => {
  if (popupPlanetIdx !== null) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  hoveredPlanetIdx = null;
  if (isPointInSun(x, y)) {
    hoveredPlanetIdx = 'sun';
  } else {
    PLANETS.forEach((planet, i) => {
      const angle = time * planet.speed;
      if (isPointInPlanet(x, y, planet, angle, 6) || isPointInOrbit(x, y, planet)) {
        hoveredPlanetIdx = i;
      }
    });
  }
});

canvas.addEventListener('mouseleave', () => {
  hoveredPlanetIdx = null;
});

canvas.addEventListener('click', (e) => {
  if (popupPlanetIdx !== null) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (isPointInSun(x, y)) {
    popupPlanetIdx = 'sun';
    paused = true;
    showSunPopup();
    return;
  }
  PLANETS.forEach((planet, i) => {
    const angle = time * planet.speed;
    if (isPointInPlanet(x, y, planet, angle, 6) || isPointInOrbit(x, y, planet)) {
      popupPlanetIdx = i;
      paused = true;
      showPlanetPopup(i);
    }
  });
});

canvas.addEventListener('touchstart', (e) => {
  if (popupPlanetIdx !== null) return;
  showPlanetPopupFromEvent(e.touches[0]);
});

function showPlanetPopupFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  PLANETS.forEach((planet, i) => {
    const angle = time * planet.speed;
    if (isPointInPlanet(x, y, planet, angle, 6) || isPointInOrbit(x, y, planet)) {
      popupPlanetIdx = i;
      paused = true;
      showPlanetPopup(i);
    }
  });
}

function showPlanetPopup(idx) {
  const planet = PLANETS[idx];
  const facts = PLANET_FACTS.find(f => f.name === planet.name);
  popupTitle.textContent = `${planet.name} (Planet #${facts.position})`;
  popupBody.innerHTML = `<ul>${facts.facts.map(f => `<li>${f}</li>`).join('')}</ul>`;
  popup.style.display = 'block';
}

function showSunPopup() {
  const facts = PLANET_FACTS.find(f => f.name === 'Sun');
  popupTitle.textContent = `Sun`;
  popupBody.innerHTML = `<ul>${facts.facts.map(f => `<li>${f}</li>`).join('')}</ul>`;
  popup.style.display = 'block';
}

function hidePlanetPopup() {
  popup.style.display = 'none';
  popupPlanetIdx = null;
  paused = false;
}

popupClose.onclick = () => { hidePlanetPopup(); };
popup.onclick = function(e) { if (e.target === popup) { hidePlanetPopup(); } };
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hidePlanetPopup(); } });

// --- Planet Facts Data ---
const PLANET_FACTS = [
  {
    name: 'Sun',
    position: 0,
    facts: [
      'The Sun is a G-type main-sequence star (G2V).',
      'It contains 99.86% of the mass in the solar system.',
      'Its core temperature reaches about 15 million °C (27 million °F).'
    ]
  },
  {
    name: 'Mercury',
    position: 1,
    facts: [
      'It is the smallest planet in our solar system.',
      'A year on Mercury is just 88 Earth days.',
      'It has no moons or rings.'
    ]
  },
  {
    name: 'Venus',
    position: 2,
    facts: [
      'It spins in the opposite direction to most planets.',
      'Venus is the hottest planet in our solar system.',
      'A day on Venus is longer than its year.'
    ]
  },
  {
    name: 'Earth',
    position: 3,
    facts: [
      'Earth is the only planet known to support life.',
      '70% of Earth’s surface is covered by water.',
      'Earth has one moon.'
    ]
  },
  {
    name: 'Mars',
    position: 4,
    facts: [
      'Mars is often called the "Red Planet" due to its color.',
      'It has the tallest volcano in the solar system (Olympus Mons).',
      'Mars has two moons: Phobos and Deimos.'
    ]
  },
  {
    name: 'Jupiter',
    position: 5,
    facts: [
      'Jupiter is the largest planet in our solar system.',
      'It has a giant storm called the Great Red Spot.',
      'Jupiter has at least 79 moons.'
    ]
  },
  {
    name: 'Saturn',
    position: 6,
    facts: [
      'Saturn is famous for its prominent ring system.',
      'It is mostly made of hydrogen and helium.',
      'Saturn has 83 confirmed moons.'
    ]
  },
  {
    name: 'Uranus',
    position: 7,
    facts: [
      'Uranus rotates on its side, making its seasons extreme.',
      'It has faint rings and 27 known moons.',
      'It is the coldest planet in the solar system.'
    ]
  },
  {
    name: 'Neptune',
    position: 8,
    facts: [
      'Neptune has the strongest winds in the solar system.',
      'It was the first planet found by mathematical prediction.',
      'Neptune appears blue due to methane in its atmosphere.'
    ]
  }
];

updateSpeedIndicator();
