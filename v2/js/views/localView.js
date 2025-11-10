import { api } from '../services/apiService.js';
import { horaParaMinutos  } from '../utils/helpers.js';

let supervisaoAtual = null;
let localAtual = null;
let intervaloTimerProntidao = null;
let intervaloPollingTabela = null;
const CHAVE_ARMAZENAMENTO_LOCAL = 'empregadoAtivoLocal';

export const viewLocal = {
    init: async (supervisao, local) => {
        supervisaoAtual = supervisao;
        localAtual = local;

        viewLocal.montarLayout();

        viewLocal.habilitarApresentacao();
        
        await viewLocal.carregarEMontarTabela();

        viewLocal.verificarEstadoLocal();

        if (intervaloPollingTabela) clearInterval(intervaloPollingTabela);
        intervaloPollingTabela = setInterval(() => viewLocal.carregarEMontarTabela(), 40000);

        viewLocal.iniciarRelogio();
    },
    montarLayout: () => {
        const headerContainer = document.getElementById('page-header');
        const contentContainer = document.getElementById('page-content');

        headerContainer.innerHTML = `
            <div class="col-12 d-flex align-items-center">
                <h5 class="card-title h1 text-white mt-1" id="local-title">Carregando...</h5>
                <div class="ms-auto text-white fs-2">
                    <div class="text-warning fw-bold" id="clock-display"></div>
                </div>
            </div>
        `;

        contentContainer.innerHTML = `
            <table class="table table-hover table-striped table-dark table-sm border-rounded">
                <thead class="table-light text-center fs-4 fw-bold">
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
    habilitarApresentacao: () => {
        const actionsContainer = document.getElementById('page-actions');

        actionsContainer.innerHTML = `
            <div class="row">
                <div class="col-md-auto">
                    <form method="post" id="formInserir">
                        <div class="row g-3 align-items-center">
                            <div class="col-auto">
                                <input type="text" id="matricula" name="matricula" class="form-control" placeholder="Digite sua Matrícula" required>
                                <input type="hidden" name="supervisao" value="${supervisaoAtual}">
                                <input type="hidden" name="local" value="${localAtual}">
                            </div>
                            <div class="col-auto">
                                <button type="submit" class="btn btn-primary mr-5" id="botaoApresentar">
                                    <i class="fas fa-check"></i> Apresentar
                                </button>
                            </div>
                        </div>
                        <div class="col-auto" id="form-message"></div>
                    </form>
                </div>
                <div class="col-md-auto">
                    <button type="button" class="btn btn-secondary" onclick="window.open('https://efvmworkplace/dss/login_form.asp', '_blank')">
                        <i class="fas fa-shield"></i> Assinar DSS
                    </button>
                </div>
                <div class="col-md-auto ms-auto">
                    <button type="button" class="btn btn-secondary">
                        <i class="fas fa-bars"></i> Menu
                    </button>
                </div>
            </div>
        `;
        const formInserir = document.getElementById('formInserir');
        if (formInserir) {
            formInserir.addEventListener('submit', viewLocal.postApresentacao);
        }
    },
    carregarEMontarTabela: async () => {
        const dados = await api.getLocalData(supervisaoAtual, localAtual);
        console.log("Dados: ", dados);

        if (dados && dados.success) {
            const ultimaEl = document.getElementById('ultima-atualizacao');
            if (ultimaEl) ultimaEl.innerHTML = dados.info.ultimaAtualizacao;
            const localTitle = document.getElementById('local-title');
            if (localTitle) localTitle.innerHTML = dados.info.nomeFormatado;

            const thApresentacao = document.getElementById('th-apresentacao');
            thApresentacao.innerHTML = `
                <i class="fas fa-clock"
                id="infoButton" 
                data-bs-toggle="tooltip" 
                data-bs-placement="bottom" 
                data-bs-html="true" 
                title="TEMPO REFERENCIAL: ${dados.info.horarioReferencia}"></i> Apresentação
            `;

            const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
            if (empregadoArmazenadoJSON) {
                const empregadoLocal = JSON.parse(empregadoArmazenadoJSON);

                const empNoBanco = dados.empregados.find(e => String(e.matricula) === String(empregadoLocal.matricula));

                if (empNoBanco) {
                    let mudou = false;
                    if (empNoBanco.statusFimJornada && !empregadoLocal.statusFimJornada) {
                        empregadoLocal.statusFimJornada = empNoBanco.statusFimJornada;
                        mudou = true;
                    }

                    if (mudou) {
                        localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(empregadoLocal));
                    }
                }
            }
            
            viewLocal.montarLinhasTabela(dados.empregados, dados.info.horarioReferencia);

            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });

            viewLocal.habilitarJustificativaApresentacao();

            viewLocal.verificarEstadoLocal();

            viewLocal.habilitarFimJornada();
        } else {
            document.getElementById('tabelaApresentacoes').innerHTML = `
                <tr><td colspan="4" class="text-danger">Falha ao carregar dados: ${dados ? dados.message : 'sem resposta'}</td></tr>
            `;
        }
    },
    verificarEstadoLocal: () => {
        const empregadoArmazenado = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        if (empregadoArmazenado) {
            try {
                const { matricula, horarioApresentacao, supervisao, local } = JSON.parse(empregadoArmazenado);

                if (supervisao === supervisaoAtual && local === localAtual) {
                    if (document.getElementById('prontidao-dinamica-container')) {
                        viewLocal.habilitarProntidao(matricula, horarioApresentacao);
                    }
                } else {
                    localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
                    viewLocal.habilitarApresentacao();
                }

                if (supervisao === supervisaoAtual && local === localAtual) {
                    if (document.getElementById('fimJornada-dinamica-container')) {
                        viewLocal.habilitarFimJornada(matricula);
                    }
                } else {
                    localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
                    viewLocal.habilitarApresentacao();
                }
            } catch (error) {
                localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
                viewLocal.habilitarApresentacao();
            }
        } else {
            viewLocal.habilitarApresentacao();
        }
    },
    montarLinhasTabela: (empregados, horarioReferencia) => {
        const tbody = document.getElementById('tabelaApresentacoes');

        tbody.innerHTML = '';
        tbody.className = "fs-5 fw-bold text-center";

        const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        const empregadoArmazenado = empregadoArmazenadoJSON ? JSON.parse(empregadoArmazenadoJSON) : null;

        if (!empregados || empregados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Nenhuma apresentação registrada</td></tr>';
            return;
        }

        const fragment = document.createDocumentFragment();
        empregados.forEach(emp => {
            const empregadoAtivo = empregadoArmazenado && String(emp.matricula) === String(empregadoArmazenado.matricula);
            const statusApresentacao = empregadoAtivo ? (empregadoArmazenado.statusApresentacao || emp.statusApresentacao) : emp.statusApresentacao;

            let apresentacaoHtml = '';
            if (statusApresentacao === 'OK') {
                apresentacaoHtml =`<span class="text-white">${emp.apresentacao}</span>`;
            } else if (statusApresentacao === 'JUSTIFICATIVA_OK') {
                apresentacaoHtml =  `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao}">${emp.apresentacao}</span>`;
            } else if (statusApresentacao === 'JUSTIFICAR') {
                apresentacaoHtml = viewLocal.formJustificativaApresentacao(emp.matricula);
            } else {
                const horaApresentacao = horaParaMinutos(emp.apresentacao);
                const horaReferencia = horaParaMinutos(horarioReferencia);
                apresentacaoHtml = horaApresentacao <= horaReferencia
                ? `<span class="text-white">${emp.apresentacao}</span>`
                : `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao}">${emp.apresentacao}</span>`;
            }

            let prontidaoHtml = 'Aguardando...';
            if (empregadoAtivo && emp.prontidao === '') {
                prontidaoHtml = '<div id="prontidao-dinamica-container"></div>';
            } else if (emp.statusProntidao === 'Pronto com atraso') {
                prontidaoHtml = `<span class="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaProntidao}">${emp.prontidao}</span>`
            } else if (emp.statusProntidao === 'Pronto') {
                prontidaoHtml = `<span class="text-success">${emp.prontidao}</span>`
            }

            let fimJornadaHtml = '--:--';
            console.log(typeof emp.fimJornada);
            if (emp.fimJornada) {
                fimJornadaHtml = '<span class="text-success"><i class="fa-solid fa-check"></i></span>';
            } else if (empregadoAtivo || emp.fimJornada === '') {
                fimJornadaHtml = `<div id="fimJornada-dinamica-container"></div>`;
            }

            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td>${emp.nome}</td>
                <td>${apresentacaoHtml}</td>
                <td>${prontidaoHtml}</td>
                <td>${fimJornadaHtml}</td>
            `;
            fragment.appendChild(linha);
        });
        tbody.appendChild(fragment);
    },
    postApresentacao: async (evento) => {
        evento.preventDefault();

        const form = evento.target;
        const botao = document.getElementById('botaoApresentar');
        const msgContainer = document.getElementById('form-message');
        const formData = new URLSearchParams(new FormData(form));

        botao.disabled = true;
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        msgContainer.innerHTML = '';
        
        const result = await api.postApresentacao(formData);

        await viewLocal.processarPostApresentacao(result, formData);
    },
    processarPostApresentacao: async (result, formData) => {
        const botao = document.getElementById("botaoApresentar");
        const msgContainer = document.getElementById("form-message");


        if (result.success === "true") {
            const matricula = formData.get("matricula");
            const dadosEmpregado = {
                matricula: matricula,
                horarioApresentacao: result.horarioApresentacao,
                supervisao: supervisaoAtual,
                local: localAtual,
                statusApresentacao: result.status,
            };
            localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(dadosEmpregado));

            document.getElementById("matricula").value = '';
            
            msgContainer.innerHTML = result.message !== 'Apresentação registrada com sucesso!' 
            ? '<span class="text-success">Apresentação registrada com sucesso!</span>'
            : `<span class="text-success">${result.message}</span>`;

            await viewLocal.carregarEMontarTabela();
            viewLocal.habilitarProntidao(dadosEmpregado.matricula, dadosEmpregado.horarioApresentacao);

            setTimeout(() => {
                msgContainer.innerHTML = '';
            }, 3000);

            botao.disabled = false;
            botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
        } else {
            switch (result.code) {
                case "CONFIRM_SUPERVISAO":
                    if (confirm(result.message)) {
                        formData.append('confirmarSupervisao', '1');
                        const novoResult = await api.postApresentacao(formData);
                        
                        await viewLocal.processarPostApresentacao(novoResult, formData);
                    } else {
                        botao.disabled = false;
                        botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
                    }
                    break;
                case "CONFIRM_TURNO":
                    if (confirm(result.message)) {
                        formData.append('confirmarTurno', '1');
                        const novoResult = await api.postApresentacao(formData);
                        
                        await viewLocal.processarPostApresentacao(novoResult, formData);
                    } else {
                        botao.disabled = false;
                        botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
                    }
                    break;
                default:
                    msgContainer.innerHTML = `<span class="text-danger">${result.message}</span>`;
                    botao.disabled = false;
                    botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
                    break;
            }
        }
    },
    formJustificativaApresentacao: (matricula) => {
        return `
        <form id="formJustificativaApresentacao">
            <input type="hidden" name="matricula" value="${matricula}">
            <div class="input-group input-group-sm">
                <select name="justificativaApresentacao" id="justificativaApresentacao" class="form-select form-select-sm"> 
                    <option value="">Justificativa…</option>
                    <option value="Atraso chegada 1º ônibus">Atraso chegada 1º ônibus</option>
                    <option value="Atraso chegada 2º ônibus">Atraso chegada 2º ônibus</option>
                    <option value="DSS com Inspetoria">DSS com Inspetoria</option>
                    <option value="DSS com Supervisor">DSS com Supervisor</option>
                    <option value="Desatento/Distração">Desatento/Distração</option>
                    <option value="Necessidade Pessoal">Necessidade Pessoal</option>
                    <option value="PM - Exame Periódico">PM - Exame Periódico</option>
                    <option value="PM - Exame de Retorno">PM - Exame de Retorno</option>
                    <option value="Atraso do Táxi">Atraso do Táxi</option>
                    <option value="Totem Ocupado">Totem Ocupado</option>
                    <option value="Horário ADM">Horário ADM</option>
                    <option value="Manifestações de Terceiros">Manifestações de Terceiros</option>
                    <option value="Obstrução de Acesso ao Posto de Trabalho">Obstrução de Acesso ao Posto de Trabalho</option>
                    <option value="Teste ou Instrução de uso">Teste ou Instrução de uso</option>
                </select>
                <button type="submit" class="btn btn-danger btn-sm">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </form>
        `;
    },
    habilitarJustificativaApresentacao: () => {
        const form = document.getElementById("formJustificativaApresentacao");
        if (form) {
            form.addEventListener("submit", viewLocal.postJustificativaApresentacao);
        }
    },
    postJustificativaApresentacao: async (evento) => {
        evento.preventDefault();
        const form = evento.target;
        const botao = form.querySelector('button[type="submit"]');
        const dadosForm = new URLSearchParams(new FormData(form));

        botao.disabled = true;
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const result = await api.postJustificativaApresentacao(dadosForm);

        if (result.success) {
            viewLocal.settarJustificativaOK();
        } else {
            alert(`Erro ao enviar justificativa da apresentação: ${result.message}`);
            botao.disabled = false;
            botao.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    },
    settarJustificativaOK: () => {
        const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        if (empregadoArmazenadoJSON) {
            const empregado = JSON.parse(empregadoArmazenadoJSON);
            empregado.statusApresentacao = 'JUSTIFICATIVA_OK';
            localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(empregado));
        }
        viewLocal.carregarEMontarTabela();
    },
    habilitarProntidao: (matricula, horarioApresentacao) => {
        const containerAcoes = document.getElementById('prontidao-dinamica-container');
        const horaInicio = new Date(horarioApresentacao);

        if (!containerAcoes) {
            console.log('Container de prontidão não encontrado.');
            return;
        }

        //if (intervaloTimerProntidao) clearInterval(intervaloTimerProntidao);

        containerAcoes.innerHTML = `
            <div id="prontidao-message" class="fs-5 text-center"></div>
                <form id="formProntidao">
                    <input type="hidden" name="matricula" value="${matricula}">
                    <div id="justificativas-prontidao-container" class="mb-2 input-group" style="display: none;">
                        <select name="justificativaProntidao" id="justificativaProntidao" class="form-select form-select-sm" required> 
                            <option value="">Justificativa…</option>
                            <option value="DSS com Inspetoria">DSS com Inspetoria</option>
                            <option value="DSS com Supervisor">DSS com Supervisor</option>
                            <option value="Totem Ocupado">Totem Ocupado</option>
                            <option value="Falta de EPI">Falta de EPI</option>
                            <option value="Indisponibilidade DSS">Indisponibilidade DSS</option>
                            <option value="Necessidade Pessoal">Necessidade Pessoal</option>
                            <option value="Perda no TAC">Perda no TAC</option>
                            <option value="Teste ou Instrução de uso">Teste ou Instrução de uso</option>
                        </select>
                        <button type="submit" class="btn btn-danger btn-sm">
                            <i class='fas fa-paper-plane'></i>
                        </button>
                    </div>
                    <button type="submit" id="botaoProntidao" class="btn btn-success btn-sm w-100" style="display: none;">
                        Pronto
                    </button>
                </form>
            <div id="prontidao-form-message" class="mt-1 text-center small"></div>
        `;

        const atualizarTimerProntidao = () => {
            const agora = new Date();
            const diffSegundos = Math.floor((agora - horaInicio) / 1000);

            const displayMessage = document.getElementById('prontidao-message');
            const botao = document.getElementById('botaoProntidao');
            const containerJustificativa = document.getElementById('justificativas-prontidao-container');

            if (!displayMessage || !botao || !containerJustificativa) {
                clearInterval(intervaloTimerProntidao);
                return;
            }

            if (diffSegundos <= 100) { // 300
                displayMessage.style.display = 'block';
                displayMessage.innerHTML = 'Faça sua <span class="text-warning"><strong>Boa Jornada</strong></span>, assine o <span class="text-warning"><strong>DSS</strong></span> e realize o <span class="text-warning"><strong>TAC</strong></span>';
                botao.style.display = 'none';
                containerJustificativa.style.display = 'none';
            
            } else if (diffSegundos <= 300) { // 900
                displayMessage.style.display = 'none';
                botao.style.display = 'block';
                botao.className = 'btn btn-success btn-sm w-100';
                botao.innerHTML = 'Pronto';
                containerJustificativa.style.display = 'none';
                document.getElementById('justificativaProntidao').required = false;
            
            } else {
                displayMessage.style.display = 'none';
                botao.style.display = 'none';
                containerJustificativa.style.display = 'flex';
                document.getElementById('justificativaProntidao').required = true;
            }
        };

        atualizarTimerProntidao();
        intervaloTimerProntidao = setInterval(atualizarTimerProntidao, 1000);
        const formProntidao = document.getElementById('formProntidao');
        formProntidao.addEventListener('submit', viewLocal.postProntidao);
    },
    postProntidao: async (evento) => {
        evento.preventDefault();

        const form = evento.target;
        const botaoPronto = document.getElementById('botaoProntidao');
        const botaoJustificativa = document.querySelector('.btn-danger');
        const containerMessage = document.getElementById('prontidao-form-message');
        const dadosForm = new URLSearchParams(new FormData(form));

        dadosForm.append('supervisao', supervisaoAtual);
        dadosForm.append('local', localAtual);

        if (botaoPronto) botaoPronto.disabled = true;
        if (botaoJustificativa) botaoJustificativa.disabled = true;
        const select = form.querySelector('#justificativaProntidao');
        if (select) select.disabled = true;

        if (evento.submitter && evento.submitter.id === 'botaoProntidao') {
            botaoPronto.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        } else if (botaoJustificativa) {
            botaoJustificativa.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        if (containerMessage) containerMessage.innerHTML = '';
 
        const result = await api.postProntidao(dadosForm);
 
        if (result.success === 'true') {
            setTimeout(() => {
                viewLocal.settarProntidaoOK();
            }, 1000);
        } else {
            if (containerMessage) containerMessage.innerHTML = `<span class="text-danger">${result.message}</span>`;
            if (botaoPronto) botaoPronto.disabled = false;
            if (botaoJustificativa) botaoJustificativa.disabled = false;
            if (select) select.disabled = false;
        }
    },
    settarProntidaoOK: () => {
        const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        if (empregadoArmazenadoJSON) {
            const empregado = JSON.parse(empregadoArmazenadoJSON);
            empregado.statusProntidao = 'Pronto';
            localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(empregado));
        } else {
            viewLocal.carregarEMontarTabela();
        }
    },
    limparProntidao: () => {
        if (intervaloTimerProntidao) clearInterval(intervaloTimerProntidao);

        localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);

        viewLocal.carregarEMontarTabela();
    },
    habilitarFimJornada: (matricula) => {
        const conatinerFimJornada = document.getElementById('fimJornada-dinamica-container');
        if (!conatinerFimJornada) {
            // console.log('Container de fim de jornada não encontrado!');
            return;
        }
    
        const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        const empregadoArmazenado = JSON.parse(empregadoArmazenadoJSON);
        const statusFimJornada = empregadoArmazenado.statusFimJornada === 'true';
    
        conatinerFimJornada.innerHTML = `
            <form id="formFimJornada">
                <input type="hidden" name="matricula" value="${matricula}">
                <div id="justificativas-fimJornada-container" class="mb-2 input-group" style="display: ${statusFimJornada ? 'flex' : 'none'};">
                    <select name="justificativaFimJornada" id="justificativaFimJornada" class="form-select form-select-sm"> 
                        <option value="">Justificativa…</option>
                        <option value="Permanência pós jornada atribuída ao CCP">Permanência pós jornada atribuída ao CCP</option>
                        <option value="Solicitação de permanência pela Supervisão de Pátio">Solicitação de permanência pela Supervisão de Pátio</option>
                        <option value="Alinhamento de DBO">Alinhamento de DBO</option>
                        <option value="Indisponibilidade do Totem">Indisponibilidade do totem</option>
                        <option value="Atendimento à Incidentes Operacionais">Atendimento à incidentes Operacionais</option>
                        <option value="DSS com Inspetoria">DSS com Inspetoria</option>
                        <option value="DSS com Supervisor">DSS com Supervisor</option>
                        <option value="Distração/Desatenção no apontamento da saída">Distração/Desatenção no apontamento da saída</option>
                        <option value="Manifestações de Terceiros">Manifestações de Terceiros</option>
                        <option value="Eventos de ACT">Eventos de ACT</option>
                        <option value="Atraso de Transporte">Atraso de Transporte</option>
                        <option value="Teste ou Instrução de uso">Teste ou Instrução de uso</option>
                        <option value="Obstrução de Acesso ao Posto de Trabalho">Obstrução de Acesso ao Posto de Trabalho</option>
                        <option value="Horário ADM">Horário ADM</option>
                    </select>
                    <button type="submit" class="btn btn-danger btn-sm">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <button type="submit" id="botaoFimJornada" class="btn btn-light btn-sm w-100" style="display: ${statusFimJornada ? 'none' : 'block'};">
                    Bom Descanso
                </button>
            </form>
        `;
    
        const formFimJornada = document.getElementById('formFimJornada');
        const botaoFimJornada = document.getElementById('botaoFimJornada');
    
        formFimJornada.addEventListener('submit', (evento) => {
            if (statusFimJornada) {
                evento.preventDefault();
                const confirmar = confirm("Deseja realmente encerrar a jornada?");
                if (confirmar) {
                    viewLocal.postFimJornada(evento);
                }
            } else {
                viewLocal.postFimJornada(evento);
            }
        });
    },
    postFimJornada: async (evento) => {
        evento.preventDefault(); // Evita o envio padrão do formulário

        const form = evento.target;
        const botaoFimJornada = document.getElementById('botaoFimJornada');
        const botaoJustificativa = document.querySelector('.btn-danger');
        const dadosForm = new URLSearchParams(new FormData(form));    
        
        if (botaoFimJornada) botaoFimJornada.disabled = true;
        if (botaoJustificativa) botaoJustificativa.disabled = true;
        const select = form.querySelector('#justificativaFimJornada');
        if (select) select.disabled = true;

        if (evento.submitter && evento.submitter.id === 'botaoFimJornada') {
            botaoFimJornada.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        } else if (botaoJustificativa) {
            botaoJustificativa.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
 
        const result = await api.postFimJornada(dadosForm);

        if (result.success === 'true') {
            setTimeout(() => {
                viewLocal.carregarEMontarTabela();
            }, 1000);
        } else {
            console.log(result.message);
            if (botaoFimJornada) botaoFimJornada.disabled = false;
            if (botaoJustificativa) botaoJustificativa.disabled = false;
            if (select) select.disabled = false;
        }
    },
    iniciarRelogio: () => {
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
    },
}
