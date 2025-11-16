export function horaParaMinutos(horaStr) {
    if (!horaStr || typeof horaStr !== 'string') return 0;
    const [h, m] = horaStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

export function iniciarRelogio(iniciarMasterTick = false) {
    setInterval(() => {
        const d = new Date();
        let displayDate;
        if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
            displayDate = d.toLocaleTimeString('pt-BR');
        } else {
            displayDate = d.toLocaleTimeString('pt-BR', {timeZone: 'America/Belem'});
        }
        const clockEl = document.getElementById('clock-display');
        if (clockEl) {
            clockEl.innerHTML = displayDate;
        }
    }, 1000);

    if (iniciarMasterTick) {
        setInterval(() => {
            if (window.viewLocal && typeof window.viewLocal.atualizarTimers === 'function') {
                window.viewLocal.atualizarTimers();
            }
        }, 1000);
    }
}

/**
 * @param {HTMLElement} elemento
 * @param {string} isoStartTime
 * @param {number} duracaoMinutos
 */
export function iniciarCronometro(elemento, isoStartTime, duracaoMinutos) {
    const horaInicio = new Date(isoStartTime);
    const horaFim = new Date(horaInicio.getTime() + duracaoMinutos * 60000);
    console.log('Cheguei aqui');

    const intervalo = setInterval(() => {
        const agora = new Date();
        const restante = horaFim - agora;

        if (restante <= 0) {
            const strInicio = horaInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const strFim = horaFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            elemento.innerHTML = `<span class="text-white">${strInicio}→</span><span class="text-warning">${strFim}</span>`;
        } else {
            const minutos = Math.floor(restante / 60000);
            const segundos = Math.floor((restante % 60000) / 1000);
            elemento.innerHTML = `<span class="text-warning fw-bold">${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}</span>`;
        }
    }, 1000);
}
