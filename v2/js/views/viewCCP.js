import { api } from '../services/apiService.js';
import { iniciarRelogio, atualizarQueryString, iniciarCronometro } from '../utils/helpers.js';
import { manutencao } from './manutencao.js';

let supervisaoAtual = null;
let intervaloPollingTabela = null;
let estadoManutencaoAtivo = false;
let layout = 'ccp'

export const viewCCP = {
    init: init,
    atualizarTimers: atualizarTimers 
};

async function init(supervisao) {
    supervisaoAtual = supervisao;

    window.viewCCP = viewCCP;

    montarLayout();
    listenersDinamicos();

    await carregarEMontarTabela();

    if (intervaloPollingTabela) clearInterval(intervaloPollingTabela);
    intervaloPollingTabela = setInterval(() => carregarEMontarTabela(), 40000);

    iniciarRelogio(true);
}

function montarLayout() {
    const actionsContainer = document.getElementById('page-actions');
    const contentContainer = document.getElementById('page-content');

    actionsContainer.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <!-- Filtro -->
            <select class="form-select w-auto" name="supervisao" id="filtroSup" required>
                <option value="" ${!supervisaoAtual ? 'selected' : ''}>Todos</option>
                <option value="TORRE_A" ${supervisaoAtual === 'TORRE_A' ? 'selected' : ''}>TORRE A</option>
                <option value="TORRE_B" ${supervisaoAtual === 'TORRE_B' ? 'selected' : ''}>TORRE B</option>
                <option value="TORRE_C" ${supervisaoAtual === 'TORRE_C' ? 'selected' : ''}>TORRE C</option>
                <option value="TORRE_L" ${supervisaoAtual === 'TORRE_L' ? 'selected' : ''}>TORRE L</option>
                <option value="PV_AB" ${supervisaoAtual === 'PV_AB' ? 'selected' : ''}>VPN</option>
            </select>

            <div class="text-warning fw-bold fs-2" id="clock-display"></div>
        </div>
    `;

    contentContainer.innerHTML = `
        <table class="table table-hover table-striped table-dark table-sm border-rounded">
            <thead class="table-light text-center fs-4 fw-bold">
                <tr>
                    <th><span><i class="fa fa-user" aria-hidden="true"></i> Nome</span></th>
                    <th><span>Cargo</span></th>
                    <th><span><i class="fas fa-map-marker-alt"></i> Local</span></th>
                    <th><span><i class="fas fa-clock"></i> Apresentação</span></th>
                    <th><span><i class="fas fa-clock"></i> Prontidão</span></th>
                    <th><span>Chamada</span></th>
                    <th><span><i class="fas fa-burger"></i> Lanche</span></th>
                    <th><span><i class="fas fa-utensils"></i> Refeição</span></th>
                    <th>Fim de Jornada</th>
                </tr>
            </thead>
            <tbody id="tabelaApresentacoes" class="text-center">
                <tr><td colspan="9">Carregando dados...</td></tr>
            </tbody>
        </table>
    `;
}

async function carregarEMontarTabela() {
    if (supervisaoAtual === null) supervisaoAtual = '';
    const dados = await api.getLocalData(supervisaoAtual, '');
    console.log(dados);

    if (dados && dados.info && dados.info.emManutencao === true) {
        if (!estadoManutencaoAtivo) {
            manutencao.init();
            estadoManutencaoAtivo = true;
        }
        return;
    }

    if (estadoManutencaoAtivo && dados && dados.success) {
        estadoManutencaoAtivo = false;

        montarLayout();
        listenersDinamicos();
    }

    if (dados && dados.success) {
        const ultimaEl = document.getElementById('ultima-atualizacao');
        if (ultimaEl) ultimaEl.innerHTML = dados.info.ultimaAtualizacao;

        montarLinhasTabela(dados.empregados);

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        atualizarTimers();
    } else {
        document.getElementById('tabelaApresentacoes').innerHTML = `
            <tr><td colspan="9" class="text-danger">Falha ao carregar dados: ${dados ? dados.message : 'sem resposta'}</td></tr>
        `;
    }
}

function montarLinhasTabela(empregados) {
    const tbody = document.getElementById('tabelaApresentacoes');
    tbody.innerHTML = '';
    tbody.className = "fs-5 fw-bold text-center";

    const fragmento = document.createDocumentFragment();

    if (!empregados || empregados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-danger">Nenhuma apresentação registrada</td></tr>';
        return;
    }

    empregados.forEach(emp => {
        let nomeHtml = `<span class="text-white" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.matricula}">${emp.nome}</span>`;
        let apresentacaoHtml = `<span class="text-white">${emp.apresentacao}</span>`;

        let prontidaoHtml = '<span class="text-white dots position-relative d-inline-block text-nowrap">Aguardando</span>';
        const agora = new Date();
        const horaApresentacao = new Date(emp.dataHoraApresentacaoCompleta);
        const diffSegundos = Math.floor((agora - horaApresentacao) / 1000);
        if (emp.statusProntidao === 'Pronto') {
            prontidaoHtml = `<span class="text-success">${emp.prontidao}</span>`;
        } else if (emp.statusProntidao === 'Pronto com atraso') {
            prontidaoHtml = `<span class="text-warning">${emp.prontidao}</span>`;
        } else if (diffSegundos > 900) {
            prontidaoHtml = '<span class="text-warning">EXCEDEU</span>';
        }

        let chamadaHtml = '';
        if (emp.statusProntidao && !emp.chamadaCPT) {
            chamadaHtml = `<button class="btn btn-secondary btn-sm btn-chamada chamada-alerta" data-matricula="${emp.matricula}">ACIONAR VIA RÁDIO</button>`;
        } else if (!emp.statusProntidao && diffSegundos > 900 && !emp.chamadaCPT) {
            chamadaHtml = `<button class="btn btn-secondary btn-sm btn-chamada chamada-alerta" data-matricula="${emp.matricula}">ACIONAR VIA RÁDIO</button>`;
        } else if (!emp.statusProntidao && diffSegundos < 900 && !emp.chamadaCPT) {
            chamadaHtml = '<span class="text-white dots position-relative d-inline-block text-nowrap">Aguardando</span>';
        } else if (emp.chamadaCPT) {
            // chamadaHtml = (emp.statusProntidao === 'Pronto com atraso' || !emp.statusProntidao) 
            //     ? '<span class="text-warning">ACIONADO</span>' 
            //     : '<span class="text-success">ACIONADO</span>';
            chamadaHtml = '<span class="text-white">ACIONADO</span>'
        }

        let lancheHtml = '--:--';
        if (emp.horaLanche && emp.prontidaoLanche) {
            lancheHtml = `<span class="text-white">${emp.horaLanche}→</span><span class="text-white">ACIONAR</span>`;
        } else if (emp.lancheStatus && emp.lancheStatus.startsWith('TIMER_LANCHE.')) {
            lancheHtml = `<div class="cronometro-lanche" data-starttime="${emp.lancheStatus.split('.')[1]}"></div>`;
        } else if (emp.lancheCPT) {
            lancheHtml = `<span class="text-white">${emp.lancheCPT}</span>`;
        } else if (emp.lancheStatus && emp.lancheStatus.startsWith('ACAO_')) {
            lancheHtml = `<button class="btn btn-sm btn-success btn-lanche-cpt" data-matricula="${emp.matricula}">Liberar Lanche</button>`;
        } else if (emp.lancheStatus && emp.lancheStatus.startsWith('HABILITAR_ESCOLHA')) {
            lancheHtml = `<span class="text-warning">${emp.lancheStatus.split('-')[1]}</span>`;
        } else if (emp.lancheStatus && emp.lancheStatus === 'AGUARDANDO_REFEICAO') {
            lancheHtml = `<button class="btn btn-sm btn-success btn-lanche-cpt" disabled>Liberar Lanche</button>`;
        } else if (emp.lancheStatus && emp.lancheStatus.startsWith('ATRASADO')) {
            lancheHtml = `<span class="text-warning">${emp.lancheStatus.split('_')[1]}</span>`;
        } else {
            lancheHtml = `<span class="text-warning">${emp.lancheStatus}</span>`;
        }

        let refeicaoHtml = '';
        if (emp.prontidaoRefeicao && emp.horaRefeicao) {
            refeicaoHtml = `<span class="text-white">${emp.horaRefeicao}→</span><span class="text-white">ACIONAR</span>`;
        } else if (emp.refeicaoStatus && emp.refeicaoStatus.startsWith('TIMER_REFEICAO.')) {
            refeicaoHtml = `<div class="cronometro-refeicao" data-starttime="${emp.refeicaoStatus.split('.')[1]}"></div>`
        } else if (emp.refeicaoCPT) {
            refeicaoHtml = `<span class="text-white">${emp.refeicaoCPT}</span>`;
        } else if (emp.refeicaoStatus && emp.refeicaoStatus.startsWith('ACAO_')) {
            refeicaoHtml = `<button class="btn btn-success btn-sm btn-refeicao-cpt" data-matricula="${emp.matricula}">Liberar Refeição</button>`;
        } else {
            refeicaoHtml = `<span class="text-warning">${emp.refeicaoStatus}</span>`
        }

        let fimJornadaHtml = `<button class="btn btn-light btn-sm btn-fim-jornada" data-matricula="${emp.matricula}">Bom Descanso</button>`
        if (emp.fimJornadaCPT) {
            fimJornadaHtml = `<span class="text-white">${emp.fimJornadaCPT}</span>`;
        }
        
        const linha = document.createElement('tr');
        linha.className = "text-center";
        linha.innerHTML = `
            <td>${nomeHtml}</td>
            <td>${emp.cargo}</td>
            <td>${emp.local}</td>
            <td>${apresentacaoHtml}</td>
            <td>${prontidaoHtml}</td>
            <td>${chamadaHtml}</td>
            <td>${lancheHtml}</td>
            <td>${refeicaoHtml}</td>
            <td>${fimJornadaHtml}</td>
        `;
        fragmento.appendChild(linha);
    });
    tbody.appendChild(fragmento);
}

function listenersDinamicos() {
    const filtroSup = document.getElementById('filtroSup');
    if (!filtroSup) return;

    filtroSup.addEventListener('change', async (evento) => {
        const supSelect = evento.target.value || '';
        supervisaoAtual = supSelect;

        atualizarQueryString({ layout: 'CCP', sup: supervisaoAtual || null });

        await carregarEMontarTabela();
    });

    const tbody = document.getElementById('tabelaApresentacoes');

    tbody.addEventListener('click', (evento) => {
        const target = evento.target;

        if (target && target.classList.contains('btn-chamada')) {
            const matricula = target.dataset.matricula;
            aoEnviarChamada(target, matricula);
        }

        if (target && target.classList.contains('btn-fim-jornada')) {
            const matricula = target.dataset.matricula;
            aoEnviarFimJornadaCPT(target, matricula);
        }

        if (target.classList.contains('btn-lanche-cpt')) {
            const matricula = target.dataset.matricula;
            aoEnviarLancheCPT(target, matricula);
        }

        if (target.classList.contains('btn-refeicao-cpt')) {
            const matricula = target.dataset.matricula;
            console.log("Cheguei aqui")
            aoEnviarRefeicaoCPT(target, matricula);
        }
    });
}

function atualizarTimers() {
    document.querySelectorAll('.cronometro-lanche').forEach(el => {
        if (el && el.dataset.starttime && !el.dataset.timerIniciado) {
            iniciarCronometro(el, el.dataset.starttime, 15, null, layout);
            el.dataset.timerIniciado = 'true'; 
        }
    });

    document.querySelectorAll('.cronometro-refeicao').forEach(el => {
        if (el && el.dataset.starttime && !el.dataset.timerIniciado) {
            iniciarCronometro(el, el.dataset.starttime, 60, null, layout);
            el.dataset.timerIniciado = 'true'; // Impede de reiniciar
        }
    });
}

async function aoEnviarChamada(botao, matricula) {
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const formData = new URLSearchParams();
    formData.append('matricula', matricula);

    const result = await api.postChamadaCPT(formData);

    if (result.success) {
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao registrar chamada.');
        botao.disabled = false;
        botao.innerHTML = 'ACIONAR VIA RÁDIO';
    }
}

async function aoEnviarFimJornadaCPT(botao, matricula) {
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const formData = new URLSearchParams();
    formData.append('matricula', matricula);

    const result = await api.postFimJornadaCPT(formData);

    if (result.success) {
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao registrar chamada.');
        botao.disabled = false;
        botao.innerHTML = 'Bom Descanso';
    }
}

async function aoEnviarLancheCPT(botao, matricula) {
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const formData = new URLSearchParams();
    formData.append('matricula', matricula);

    const result = await api.postLancheCPT(formData);
    console.log(result, result.success)
    if (result.success === true) {
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao Liberar Lanche (CPT)');
        botao.disabled = false;
        botao.innerHTML = 'Liberar Lanche';
    }
}

async function aoEnviarRefeicaoCPT(botao, matricula) {
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const formData = new URLSearchParams();
    formData.append('matricula', matricula);

    const result = await api.postRefeicaoCPT(formData);

    if (result.success) {
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao Liberar Refeição (CPT)');
        botao.disabled = false;
        botao.innerHTML = 'Liberar Refeição';
    }
}