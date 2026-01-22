import { api } from "../services/apiService.js";

let matriculaAtual = null;

export const viewHistorico = {
    init: init
};

async function init(matricula) {
    matriculaAtual = matricula;

    montarLayout();
    carregarDados(matricula);
}

function montarLayout() {
    const headerContainer = document.getElementById('page-header');
    const contentContainer = document.getElementById('page-actions');

    headerContainer.innerHTML = `
        <div class="col-12 align-items-center">
            <h5 class="card-title h1 text-white mt-1" id="nome-emp">Carregando...</h5>
            <p class="text-white mt-1" id="info-emp">Carregando...</p>
        </div>
    `;

    contentContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <h5 class="h2 text-white mt-1 mb-2">Histórico</h5>
        </div>

        <form id="formFiltroDatas" class="bg-dark bg-opacity-25 p-3 rounded-3 mb-3">
            <div class="row g-2 align-items-end">
                <div class="col-12 col-sm-4">
                    <label for="dataInicio" class="form-label text-white-50">Data inicial</label>
                    <input type="date" id="dataInicio" class="form-control">
                </div>
                <div class="col-12 col-sm-4">
                    <label for="dataFim" class="form-label text-white-50">Data final</label>
                    <input type="date" id="dataFim" class="form-control">
                </div>
                <div class="col-12 col-sm-4 d-flex gap-2">
                    <button type="button" id="btnFiltrar" class="btn btn-primary flex-grow-1">
                        <i class="fas fa-filter"></i> Filtrar
                    </button>
                    <button type="button" id="btnLimpar" class="btn btn-outline-secondary">
                        <i class="fas fa-eraser"></i> Limpar
                    </button>
                </div>
            </div>

            <div id="filtro-message" class="mt-2 text-warning small"></div>
        </form>

        <table class="table table-hover table-striped table-dark table-sm border-rounded">
            <thead class="table-light text-center fs-4 fw-bold">
                <tr>
                    <th><span></span><i class="fas fa-calendar"></i> Data</th>
                    <th><span><i class="fas fa-clock"></i> Apresentação</span></th>
                    <th><span><i class="fas fa-clock"></i> Prontidão</span></th>
                    <th><span><i class="fas fa-burger"></i> Lanche</span></th>
                    <th><span><i class="fas fa-utensils"></i> Refeição</span></th>
                    <th>Fim de Jornada</th>
                </tr>
            </thead>
            <tbody id="tabelaApresentacoes" class="text-center">
                <tr><td colspan="6">Carregando dados...</td></tr>
            </tbody>
        </table>
    `;

}

async function carregarDados() {
    const dados = await api.getDadosEmpregado(matriculaAtual);
    console.log(dados);

    if (dados && dados.success) {
        const nomeEmp = document.getElementById('nome-emp');
        const infoEmp = document.getElementById('info-emp');

        if (nomeEmp) nomeEmp.innerHTML = dados.infoEmp.nome.toUpperCase();
        if (infoEmp) infoEmp.innerHTML = `${dados.infoEmp.supervisao.replace(/_/g, ' ')} - ${dados.infoEmp.Gerencia.replace(/_/g, ' ')} | ${dados.infoEmp.cargo} (${dados.infoEmp.turno})`;
    
        montarLinhasTabela(dados.apresentacoes);

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    } else {
        document.getElementById('tabelaApresentacoes').innerHTML = `
            <tr><td colspan="6" class="text-danger">Falha ao carregar dados: ${dados ? dados.message : 'sem resposta'}</td></tr>
        `;
    }
}

function montarLinhasTabela(apresentacoes) {
    const tbody = document.getElementById('tabelaApresentacoes');
    tbody.innerHTML = '';
    tbody.className = "fs-5 fw-bold text-center";

    const fragmento = document.createDocumentFragment();

    if (!apresentacoes || apresentacoes.lenght === 0) {
        tbody.innerHTML = '';
    }

    apresentacoes.forEach(apr => {
        const statusApresentacao = apr.statusApresentacao;
        const refeicaoStatus = apr.refeicaoStatus;

        let dataApresentacaoHtml = '';
        if (apr.dataHoraApresentacaoCompleta) dataApresentacaoHtml = apr.dataHoraApresentacaoCompleta.split(' ')[0];

        let apresentacaoHtml = '';
        if (statusApresentacao === 'OK') {
            apresentacaoHtml =`<span class="text-white">${apr.apresentacao}</span>`;
        } else {
            apresentacaoHtml =  `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${apr.justificativaApresentacao}">${apr.apresentacao}</span>`;
        }

        let prontidaoHtml = '';
        if (!apr.prontidao || apr.prontidao === '') {
            prontidaoHtml = `<span class="text-danger">--:--</span>`;
        } else if (apr.statusProntidao === 'Pronto com atraso') {
            prontidaoHtml = `<span class="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${apr.justificativaProntidao}">${apr.prontidao}</span>`
        } else if (apr.statusProntidao === 'Pronto') {
            prontidaoHtml = `<span class="text-success">${apr.prontidao}</span>`;
        }

        let lancheHtml = '';
        if (!apr.lanche || apr.lanche === '') {
            lancheHtml = `<span class="text-danger">--:--</span>`;
        } else {
            lancheHtml = `<span class="text-white">${apr.lanche}</span>`;
        }

        let refeicaoHtml = '';
        if (!apr.refeicao || apr.refeicao === '') {
            refeicaoHtml = `<span class="text-danger">--:--</span>`;
        } else {
            refeicaoHtml = `<span class="text-white">${apr.refeicao}</span>`;
        }

        let fimJornadaHtml = '';
        if (apr.fimJornada && !apr.justificativaFimJornada) {
            fimJornadaHtml = '<span class="text-success"><i class="fa-solid fa-check"></i></span>';
        } else if (apr.fimJornada && apr.justificativaFimJornada) {
            fimJornadaHtml = `<span class="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${apr.justificativaFimJornada}">${apr.fimJornada}</span>`;
        } else if (!apr.fimJornada) {
            fimJornadaHtml = `<span class="text-danger">--:--</span>`;
        }

        const linha = document.createElement('tr');
        linha.className = 'text-center';
        linha.innerHTML = `
            <td>${dataApresentacaoHtml}</td>
            <td>${apresentacaoHtml}</td>
            <td>${prontidaoHtml}</td>
            <td>${lancheHtml}</td>
            <td>${refeicaoHtml}</td>
            <td>${fimJornadaHtml}</td>
        `;

        fragmento.appendChild(linha);
    });
    tbody.appendChild(fragmento);
}