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
 * @param {string} justificativa
 * @param {string|number} matricula
 */
export function iniciarCronometro(elemento, isoStartTime, duracaoMinutos, matricula, layout) {
    const horaInicio = new Date(isoStartTime); // pega a hora do start 
    const fimBaseMs = horaInicio.getTime() + duracaoMinutos * 60000; // soma a duracao de minutos multiplicando por 60000
    const TOLERANCIA_MS = 1 * 60000; // tolerancia de 5 minutos para prontidao

    const possuiTolerancia = duracaoMinutos === 60 || duracaoMinutos === 15;
    const fimComToleranciaMs = possuiTolerancia ? fimBaseMs + TOLERANCIA_MS : fimBaseMs; // se tiver tolerancia soma o horario de fim + a tolerancia

    const arrayTipoProntidao = {
        15: "lanche",
        60: "refeicao"
    };
    const tipo = arrayTipoProntidao[duracaoMinutos];

    if (elemento.dataset.intervalId) {
        clearInterval(Number(elemento.dataset.intervalId));
    }

    const atualizarCronometro = () => { // cronometro de inicio
        const agoraMs = Date.now(); // pega o horario de agora
        const restanteBaseMs = fimBaseMs - agoraMs; // subtração de agora com o de fim
        const restanteToleranciaMs = fimComToleranciaMs - agoraMs; // 

        const strInicio = horaInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const strFim = new Date(fimBaseMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (restanteBaseMs > 0) {
            const minutos = Math.floor(restanteBaseMs / 60000);
            const segundos = Math.floor((restanteBaseMs % 60000) / 1000);
            elemento.innerHTML = `<span class="text-warning fw-bold">${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}</span>`;
            return;
        }

        if (possuiTolerancia) {
            const estaAtrasado = restanteToleranciaMs < 0;
            const displayJustificativa = estaAtrasado ? 'flex' : 'none';
            const displayBotaoNormal = estaAtrasado ? 'none' : 'block';

            if (layout === 'patio') {
                elemento.innerHTML =  `
                    <div class="d-flex align-items-center justify-content-center">
                        <span class="text-white">${strInicio}→</span>
                        <form id="formProntidaoLancheRefeicao">
                            <input type="hidden" name="matricula" value="${matricula}">
                            <input type="hidden" name="tipo" value="${tipo}">
                            <div class="justificativas-lanche-refeicao-container input-group input-group-sm w-75" style="display: ${displayJustificativa};">
                                <select name="justificativaLancheRefeicao" class="form-select form-select-sm select-compact" ${estaAtrasado ? 'required' : ''}>
                                    <option value="">Justificativa...</option>
                                    <option value="Atraso do Transporte">Atraso do transporte</option>
                                    <option value="Atraso em apontar Prontidão">Atraso em apontar Prontidão</option>
                                    <option value="Trajeto obstruído">Trajeto obstruído</option>
                                    <option value="Atendimento ao Supervisor">Atendimento ao Supervisor</option>
                                    <option value="Atendimento ao Inspetor">Atendimento ao Inspetor</option>
                                </select>
                                <button type="submit" class="btn btn-danger btn-sm" data-action="justificar">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                            <button class="btn-prontidao-lanche-refeicao btn btn-sm btn-warning" type="submit" data-action="pronto" style="display: ${displayBotaoNormal};">
                                Pronto
                            </button>
                        </form>
                    </div>
                `;
            } else if (layout === 'ccp') {
                elemento.innerHTML = `<span class="text-white">${strInicio}→</span><span class="chamada-alerta">${strFim}</span>`;
            }
            if (elemento.dataset.intervalId) clearInterval(Number(elemento.dataset.intervalId));
            return;
        }
    };

    const novoIntervalo = setInterval(atualizarCronometro, 1000);
    elemento.dataset.intervalId = String(novoIntervalo);

    atualizarCronometro();
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

export function renderJustificativaLancheRefeicao(matricula, tipo) {
    return `
        <form id="formJustificativaProntidaoLancheRefeicao" class="d-inline-flex align-items-center m-0">
            <input type="hidden" name="matricula" value="${matricula}">
            <input type="hidden" name="tipo" value="${tipo}">
            <div class="input-group input-group-sm">
                <select name="justificativaLancheRefeicao" class="form-select form-select-sm select-compact" title="">
                    <option value="">Justificativa...</option>
                    <option value="Falha CCP: não liberou no intervalo acordado">Falha CCP: não liberou no intervalo acordado</option>
                    <option value="Falha Pátio: Não apontei o início e fim do intervalo">Falha Pátio: Não apontei o início e fim do intervalo</option>
                </select>
                <button type="submit" class="btn btn-danger btn-sm">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </form>
    `;
}
