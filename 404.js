const rain = document.getElementById('errorRain');
const total = 30;

for (let i = 0; i < total; i++) {
    const el = document.createElement('span');
    el.classList.add('error-word');
    el.textContent = 'ERROR';

    const left = Math.random() * 100;
    const duration = 4 + Math.random() * 6;
    const delay = Math.random() * 8;
    const size = 12 + Math.random() * 16;
    const opacity = 0.1 + Math.random() * 0.25;

    el.style.left = left + '%';
    el.style.animationDuration = duration + 's';
    el.style.animationDelay = '-' + delay + 's';
    el.style.fontSize = size + 'px';
    el.style.color = `rgba(232, 49, 42, ${opacity})`;

    rain.appendChild(el);
}