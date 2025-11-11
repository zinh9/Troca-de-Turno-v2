export function horaParaMinutos(horaStr) {
    if (!horaStr || typeof horaStr !== 'string') return 0;
    const [h, m] = horaStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

export function iniciarRelogio() {
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
}
