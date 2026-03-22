function buscar() {
    const val = document.getElementById('searchInput').value.trim();
    const plat = document.getElementById('platform').value;
    if (val) alert('Buscando "' + val + '" em ' + plat + '...');
}
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') buscar();
    });
}
const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('on');
            io.unobserve(e.target);
        }
    });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));