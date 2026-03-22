function filtrar(tipo, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cards = document.querySelectorAll('.op-card-full');
    const labelAtaque = document.getElementById('label-ataque');
    const labelDefesa = document.getElementById('label-defesa');
    cards.forEach(card => {
        if (tipo === 'todos' || card.classList.contains(tipo)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
    if (tipo === 'defesa') {
        labelAtaque.style.display = 'none';
        labelDefesa.style.display = 'block';
    } else if (tipo === 'ataque') {
        labelAtaque.style.display = 'block';
        labelDefesa.style.display = 'none';
    } else {
        labelAtaque.style.display = 'block';
        labelDefesa.style.display = 'block';
    }
}