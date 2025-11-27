export function horaParaMinutos(horaStr) {
    if (!horaStr || typeof horaStr !== 'string') return 0;
    const [h, m] = horaStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

export function iniciarRelogio(iniciarMasterTick = false) {
    const clockEl = document.getElementById('clock-display');
    const tickRelogio = () => {
        const d = new Date();
        let displayDate;
        if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
            displayDate = d.toLocaleTimeString('pt-BR');
        } else {
            displayDate = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Belem' });
        }
        const clockEl = document.getElementById('clock-display');
        if (clockEl) {
            clockEl.innerHTML = displayDate;
        }
    };

    tickRelogio();
    setInterval(tickRelogio, 1000);

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

    const intervaloAntigo = elemento.dataset.intervalId;
    if (intervaloAntigo) {
        clearInterval(intervaloAntigo);
    }

    const atualizarCronometro = () => {
        const agora = new Date();
        const restante = horaFim - agora;

        if (restante <= 0) {
            const strInicio = horaInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const strFim = horaFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            elemento.innerHTML = `<span class="text-white">${strInicio}→</span><span class="text-warning chamada-alerta">${strFim}</span>`;
        } else {
            const minutos = Math.floor(restante / 60000);
            const segundos = Math.floor((restante % 60000) / 1000);
            elemento.innerHTML = `<span class="text-warning fw-bold">${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}</span>`;
        }
    };

    atualizarCronometro();
    const novoIntervalo = setInterval(atualizarCronometro, 1000);
    elemento.dataset.intervalId = novoIntervalo;
}

export function iniciarCronometroManutencao() {
    const now = new Date();
    const countDownDate = new Date(now.getTime() + (1.5 * 60 * 60 * 1000));

    const countdownTimer = setInterval(function () {
        const currentTime = new Date().getTime();

        const distance = countDownDate - currentTime;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("horas").innerHTML = hours.toString().padStart(2, '0');
        document.getElementById("minutos").innerHTML = minutes.toString().padStart(2, '0');
        document.getElementById("segundos").innerHTML = seconds.toString().padStart(2, '0');

        if (distance < 0) {
            clearInterval(countdownTimer);
            document.getElementById("horas").innerHTML = "00";
            document.getElementById("minutos").innerHTML = "00";
            document.getElementById("segundos").innerHTML = "00";
        }
    }, 1000);
}

export function atualizarQueryString(pares) {
    const url = new URL(window.location.href);
    Object.entries(pares).forEach(([k, v]) => {
        if (v == null || v === '') url.searchParams.delete(k);
        else url.searchParams.set(k, v);
    });
    window.history.replaceState({}, '', url.toString());
}
