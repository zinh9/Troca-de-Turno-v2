import { api } from '../services/apiService.js';
import { horaParaMinutos } from '../utils/helpers.js';
import { iniciarRelogio } from '../utils/helpers.js';

let supervisaoAtual = null;
let intervaloPollingTabela = null;

export const viewCCP = {
    init: init
};

async function init(supervisao) {
    supervisaoAtual = supervisao;

    montarLayout();
    listenersDinamicos();

    await carregarEMontarTabela();

    if (intervaloPollingTabela) clearInterval(intervaloPollingTabela);
    intervaloPollingTabela = setInterval(() => carregarEMontarTabela(), 40000);

    iniciarRelogio();
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

    if (dados && dados.success) {
        const ultimaEl = document.getElementById('ultima-atualizacao');
        if (ultimaEl) ultimaEl.innerHTML = dados.info.ultimaAtualizacao;

        montarLinhasTabela(dados.empregados);

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
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

    if (!empregados || empregados.lenght === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-danger">Nenhuma apresentação registrada</td></tr>';
        return;
    }

    empregados.forEach(emp => {
        let nomeHtml = `<span class="text-white" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.matricula}">${emp.nome}</span>`;
        let apresentacaoHtml = `<span class="text-white">${emp.apresentacao}</span>`;

        let prontidaoHtml = '<span>Aguardando...</span>'
        if (emp.statusProntidao === 'Pronto') {
            prontidaoHtml = `<span class="text-success">${emp.prontidao}</span>`
        } else if (emp.statusProntidao === 'Pronto com atraso') {
            prontidaoHtml = `<span class="text-warning">${emp.prontidao}</span>`
        }

        const linha = document.createElement('tr');
        linha.className = "text-center";
        linha.innerHTML = `
            <td>${nomeHtml}</td>
            <td>${emp.cargo}</td>
            <td>${emp.local}</td>
            <td>${apresentacaoHtml}</td>
            <td>${prontidaoHtml}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
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
}

function atualizarQueryString(pares) {
    const url = new URL(window.location.href);
    Object.entries(pares).forEach(([k, v]) => {
        if (v == null || v === '') url.searchParams.delete(k);
        else url.searchParams.set(k, v);
    });
    window.history.replaceState({}, '', url.toString());
}
