import { api } from '../services/apiService.js';

let currentSupervisao = null;
let currentLocal = null;
let pollingInterval = null;

export const localView = {
    init: (supervisao, local) => {
        currentSupervisao = supervisao;
        currentLocal = local;

        localView.renderLayout();

        localView.attachListeners();

        localView.loadAndRenderTable();

        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(localView.loadAndRenderTable, 40000);

        localView.startClock();
    },
    renderLayout: () => {
        const headerContainer = document.getElementById('page-header');
        const actionsContainer = document.getElementById('page-actions');
        const contentContainer = document.getElementById('page-content');

        headerContainer.innerHTML = `
            <div class="col-12 d-flex align-items-center">
                <h5 class="card-title h1 text-white mt-1" id="local-title">Carregando...</h5>
                <div class="ms-auto text-white fs-2">
                    <div class="text-warning fw-bold" id="clock-display"></div>
                </div>
            </div>
        `;

        actionsContainer.innerHTML = `
            <div class="col-md-auto">
                <form method="post" id="formInserir">
                    <div class="row g-3 align-items-center">
                        <input type="text" id="matricula" name="matricula" class="form-control" placeholder="Digite sua Matrícula" required>
                    </div>
                    <input type="hidden" name="supervisao" value="${currentSupervisao}">
                    <input type="hidden" name="local" value="${currentLocal}">
                    <div class="col-auto">
                        <button type="submit" class="btn btn-primary mr-5" id="botaoApresentar">
                            <i class="fas fa-check"></i> Apresentar
                        </button>
                    </div>
                    <div class="col-auto" id="form-message"></div>
                </form>
            </div>
            <div class="col-md-auto">
                <button type="button" class="btn btn-secondary">
                    <i class="fas fa-shield"></i> Assinar DSS
                </button>
            </div>
            <div class="col-md-auto">
                <button type="button" class="btn btn-secondary">
                    <i class="fas fa-bars"></i> Menu
                </button>
            </div>
        `;

        contentContainer.innerHTML = `
            <table class="table table-hover table-striped table-dark table-sm border-rounded">
                <thead class="table-light text-center fs-3 fw-bold">
                    <tr>
                        <th>Nome</th>
                        <th>
                            <span id="th-apresentacao">Apresentação</span>
                        </th>
                        <th>
                            <span><i class="fas fa-clock"></i> Prontidão</span>
                        </th>
                        <th>Fim de Jornada</th>
                    </tr>
                </thead>
                <tbody id="tabelaApresentacoes" class="text-center">
                    <tr>
                        <td colspan="4">Carregando dados...</td>
                    </tr>
                </tbody>
            </table>
        `;
    },
    loadAndRenderTable: async () => {
        const data = await api.getLocalData(currentSupervisao, currentLocal);
        console.log("Dados: ", data);

        if (data && data.success) {
            document.getElementById('ultima-atualizacao').innerHTML = data.info.ultimaAtualizacao;
            document.getElementById('local-title').innerHTML = data.info.nomeFormatado;

            const thApresentacao = document.getElementById('th-apresentacao');
            thApresentacao.innerHTML = `
                <i class="fas fa-clock"
                id="infoButton" 
                data-bs-toggle="tooltip" 
                data-bs-placement="bottom" 
                data-bs-html="true" 
                title="TEMPO REFERENCIAL: ${data.info.horarioReferencia}"></i> Apresentação
            `;

            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });

            localView.renderTableRows(data.empregados);
        } else {
            document.getElementById('tabelaApresentacoes').innerHTML = `
                <tr><td colspan="4" class="text-danger">Falha ao carregar dados: ${data.message}</td></tr>
            `;
        }
    },
    renderTableRows: (empregados) => {
        const tbody = document.getElementById('tabelaApresentacoes');

        tbody.innerHTML = '';

        if (empregados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Nenhuma apresentação registrada</td></tr>';
            return;
        }

        empregados.forEach(emp => {
            const apresentacaoHtml = `<span class="text-white">${emp.apresentacao}</span>`;

            const prontidaoHtml = emp.statusProntidao === "Pronto"
                ? `<span class="text-success">${emp.prontidao}</span>`
                : emp.statusProntidao === "Pronto com atraso"
                ? `<span class="text-danger">${emp.prontidao}</span>`
                : 'Aguardando...';

            const row = `
                <tr>
                    <td>${emp.nome}</td>
                    <td>${apresentacaoHtml}</td>
                    <td>${prontidaoHtml}</td>
                    <td>
                        ${emp.fimJornada ? emp.fimJornada : "--:--"}
                    </td>
                </tr>
            `;

            tbody.innerHTML += row;
        });
    },
    attachListeners: () => {
        const form = document.getElementById('formInserir');
        form.addEventListener('submit', localView.handleApresentacaoSubmit);
    },
    handleApresentacaoSubmit: async (event) => {
        event.preventDefault();

        const form = event.target;
        const botao = document.getElementById('botaoApresentar');
        const msgContainer = document.getElementById('form-message');

        const formData = new FormData(form);

        botao.disabled = true;
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        msgContainer.innerHTML = '';

        const result = await api.postApresentacao(formData);

        if (result.success) {
            msgContainer.innerHTML = `<span class="text-success">${result.message}</span>`;

            document.getElementById('matricula').value = '';

            localView.loadAndRenderTable();
        } else {
            msgContainer.innerHTML = `<span class="text-danger">${result.message}</span>`;
        }

        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-cleck"></i> Apresentar'
    },
    startClock: () => {
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
}
