import { api } from '../services/apiService.js';
import { horaParaMinutos } from '../utils/helpers.js';

// --- ESTADO GLOBAL DO MÓDULO ---
let supervisaoAtual = null;
let localAtual = null;
let intervaloTimerProntidao = null;
let intervaloPollingTabela = null;
const CHAVE_ARMAZENAMENTO_LOCAL = 'empregadoAtivoLocal'; // Usado APENAS para o timer de 15min

// --- RENDERIZAÇÃO DA UI PRINCIPAL ---

/**
 * Monta o layout estático da página (cabeçalho e estrutura da tabela).
 */
function montarLayout() {
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
                    <th><span id="th-apresentacao">Apresentação</span></th>
                    <th><span><i class="fas fa-clock"></i> Prontidão</span></th>
                    <th>Fim de Jornada</th>
                </tr>
            </thead>
            <tbody id="tabelaApresentacoes" class="text-center">
                <tr><td colspan="4">Carregando dados...</td></tr>
            </tbody>
        </table>
    `;
}

/**
 * Monta o formulário de apresentação e vincula o listener.
 */
function habilitarApresentacao() {
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
        formInserir.addEventListener('submit', aoEnviarApresentacao);
    }
}

// --- LÓGICA DE DADOS E RENDERIZAÇÃO DA TABELA ---

/**
 * Função principal de atualização. Busca dados da API e redesenha a tabela.
 */
async function carregarEMontarTabela() {
    const dados = await api.getLocalData(supervisaoAtual, localAtual);
    // console.log("Dados: ", dados);

    if (dados && dados.success) {
        // Atualiza informações do cabeçalho
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
        
        // 1. Monta as linhas da tabela (usando DocumentFragment)
        montarLinhasTabela(dados.empregados, dados.info.horarioReferencia);

        // 2. Inicializa os tooltips (para Apresentação, Prontidão E Fim de Jornada)
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // 3. Vincula listeners aos formulários dinâmicos (Justificativa, Prontidão, Fim Jornada)
        vincularListenersDinamicos();

        // 4. Verifica o localStorage e inicia o timer de prontidão (se aplicável)
        verificarEstadoLocal();
    } else {
        document.getElementById('tabelaApresentacoes').innerHTML = `
            <tr><td colspan="4" class="text-danger">Falha ao carregar dados: ${dados ? dados.message : 'sem resposta'}</td></tr>
        `;
    }
}

/**
 * Monta as linhas da tabela usando DocumentFragment para alta performance.
 */
function montarLinhasTabela(empregados, horarioReferencia) {
    const tbody = document.getElementById('tabelaApresentacoes');
    tbody.innerHTML = '';
    tbody.className = "fs-5 fw-bold text-center";

    const fragmento = document.createDocumentFragment();
    const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
    const empregadoArmazenado = empregadoArmazenadoJSON ? JSON.parse(empregadoArmazenadoJSON) : null;

    if (!empregados || empregados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Nenhuma apresentação registrada</td></tr>';
        return;
    }

    empregados.forEach(emp => {
        const empregadoAtivo = empregadoArmazenado && String(emp.matricula) === String(empregadoArmazenado.matricula);
        
        // Determina o status de apresentação (Prioriza localStorage SÓ para o status de 'JUSTIFICAR')
        const statusApresentacao = (empregadoAtivo && empregadoArmazenado.statusApresentacao === 'JUSTIFICAR') 
            ? 'JUSTIFICAR' 
            : emp.statusApresentacao;

        // --- 1. Lógica HTML de APRESENTAÇÃO ---
        let apresentacaoHtml = '';
        if (statusApresentacao === 'OK') {
            apresentacaoHtml =`<span class="text-white">${emp.apresentacao}</span>`;
        } else if (statusApresentacao === 'JUSTIFICATIVA_OK') {
            apresentacaoHtml =  `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao}">${emp.apresentacao}</span>`;
        } else if (statusApresentacao === 'JUSTIFICAR') {
            apresentacaoHtml = renderizarFormJustificativaApresentacao(emp.matricula);
        } else {
            // Fallback (lógica antiga)
            const horaApresentacao = horaParaMinutos(emp.apresentacao);
            const horaReferencia = horaParaMinutos(horarioReferencia);
            apresentacaoHtml = horaApresentacao <= horaReferencia
            ? `<span class="text-white">${emp.apresentacao}</span>`
            : `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao || 'Atrasado'}">${emp.apresentacao}</span>`;
        }

        // --- 2. Lógica HTML de PRONTIDÃO ---
        let prontidaoHtml = 'Aguardando...';
        // O timer de prontidão SÓ aparece para o usuário ATIVO (do localStorage),
        // se ele AINDA NÃO registrou prontidão, E se ele NÃO ESTIVER justificando a apresentação.
        if (empregadoAtivo && !emp.prontidao && statusApresentacao !== 'JUSTIFICAR') {
            prontidaoHtml = '<div id="prontidao-dinamica-container"></div>';
        } else if (emp.statusProntidao === 'Pronto com atraso') {
            prontidaoHtml = `<span class="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaProntidao}">${emp.prontidao}</span>`
        } else if (emp.statusProntidao === 'Pronto') {
            prontidaoHtml = `<span class="text-success">${emp.prontidao}</span>`
        }

        // --- 3. Lógica HTML de FIM DE JORNADA (Regra 2) ---
        let fimJornadaHtml = '--:--';
        if (emp.fimJornada) {
            // Já encerrou
            fimJornadaHtml = `<span class="text-success" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaFimJornada || 'Jornada encerrada'}">${emp.fimJornada}</span>`;
            // Se você quiser o check verde, use a linha abaixo:
            // fimJornadaHtml = '<span class="text-success"><i class="fa-solid fa-check"></i></span>';
        } else if (emp.prontidao && emp.statusFimJornada === true) {
            // Está PRONTO e está ATRASADO para sair -> Mostra formulário de justificativa
            fimJornadaHtml = renderizarFormFimJornada(emp.matricula, true);
        } else if (emp.prontidao) {
            // Está PRONTO e está NO HORÁRIO de sair -> Mostra botão "Bom Descanso"
            fimJornadaHtml = renderizarFormFimJornada(emp.matricula, false);
        }
        // Se 'emp.prontidao' for nulo, ele fica '--:--' (não pode encerrar sem estar pronto)

        // --- Montagem da Linha ---
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${emp.nome}</td>
            <td>${apresentacaoHtml}</td>
            <td>${prontidaoHtml}</td>
            <td>${fimJornadaHtml}</td>
        `;
        fragmento.appendChild(linha);
    });
    tbody.appendChild(fragmento);
}

/**
 * Renderiza o HTML para o formulário de Justificativa de Apresentação
 */
function renderizarFormJustificativaApresentacao(matricula) {
    return `
    <form id="formJustificativaApresentacao">
        <input type="hidden" name="matricula" value="${matricula}">
        <div class="input-group input-group-sm">
            <select name="justificativaApresentacao" class="form-select form-select-sm"> 
                <option value="">Justificativa…</option>
                <option value="Atraso chegada 1º ônibus">Atraso chegada 1º ônibus</option>
                <option value="Atraso chegada 2º ônibus">Atraso chegada 2º ônibus</option>
                <option value="DSS com Inspetoria">DSS com Inspetoria</option>
                </select>
            <button type="submit" class="btn btn-danger btn-sm">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    </form>
    `;
}

/**
 * Renderiza o HTML para o formulário de Fim de Jornada (Regra 2)
 */
function renderizarFormFimJornada(matricula, estaAtrasado) {
    // Se está atrasado, mostra o 'select'. Se não, esconde.
    const displayJustificativa = estaAtrasado ? 'flex' : 'none';
    // Se está atrasado, esconde o botão "Bom Descanso". Se não, mostra.
    const displayBotaoNormal = estaAtrasado ? 'none' : 'block';

    return `
        <form class="formFimJornada">
            <input type="hidden" name="matricula" value="${matricula}">
            <div class="justificativas-fimJornada-container mb-2 input-group" style="display: ${displayJustificativa};">
                <select name="justificativaFimJornada" class="form-select form-select-sm" ${estaAtrasado ? 'required' : ''}> 
                    <option value="">Justificativa (Atraso)...</option>
                    <option value="Permanência pós jornada atribuída ao CCP">Permanência pós jornada (CCP)</option>
                    <option value="Solicitação de permanência pela Supervisão de Pátio">Permanência pós jornada (Pátio)</option>
                    </select>
                <button type="submit" class="btn btn-danger btn-sm">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
            <button type="submit" class="botaoFimJornada btn btn-light btn-sm w-100" style="display: ${displayBotaoNormal};">
                Bom Descanso
            </button>
        </form>
    `;
}

// --- LÓGICA DE ESTADO (TIMERS E LOCALSTORAGE) ---

/**
 * Verifica o localStorage e inicia o timer de PRONTIDÃO (Regra 3) se aplicável.
 */
function verificarEstadoLocal() {
    const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
    if (empregadoArmazenadoJSON) {
        try {
            const empregado = JSON.parse(empregadoArmazenadoJSON);

            if (empregado.supervisao === supervisaoAtual && empregado.local === localAtual) {
                // Se o container de prontidão existe (ou seja, apresentação NÃO está pendente)
                if (document.getElementById('prontidao-dinamica-container')) {
                    habilitarProntidao(empregado.matricula, empregado.horarioApresentacao);
                }
            } else {
                // Empregado está em outro terminal/página, limpa o storage
                localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
            }
        } catch (error) {
            console.error("Erro ao ler localStorage: ", error);
            localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
        }
    }
}

/**
 * Habilita o timer de 15 minutos da Prontidão (Regra 3)
 */
function habilitarProntidao(matricula, horarioApresentacao) {
    const containerAcoes = document.getElementById('prontidao-dinamica-container');
    if (!containerAcoes) return; // Sai se não achar o container

    const horaInicio = new Date(horarioApresentacao);
    if (intervaloTimerProntidao) clearInterval(intervaloTimerProntidao);

    containerAcoes.innerHTML = `
        <div id="prontidao-message" class="fs-5 text-center"></div>
            <form id="formProntidao">
                <input type="hidden" name="matricula" value="${matricula}">
                <div id="justificativas-prontidao-container" class="mb-2 input-group" style="display: none;">
                    <select name="justificativaProntidao" id="justificativaProntidao" class="form-select form-select-sm" required> 
                        <option value="">Justificativa…</option>
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

    // Função interna do timer
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

        // FASE 1 (0-5 min)
        if (diffSegundos <= 300) { 
            displayMessage.style.display = 'block';
            displayMessage.innerHTML = 'Faça sua <span class="text-warning"><strong>Boa Jornada</strong></span>, assine o <span class="text-warning"><strong>DSS</strong></span> e realize o <span class="text-warning"><strong>TAC</strong></span>';
            botao.style.display = 'none';
            containerJustificativa.style.display = 'none';
        // FASE 2 (5-15 min)
        } else if (diffSegundos <= 900) { 
            displayMessage.style.display = 'none';
            botao.style.display = 'block';
            botao.className = 'btn btn-success btn-sm w-100';
            botao.innerHTML = 'Pronto';
            containerJustificativa.style.display = 'none';
            const select = document.getElementById('justificativaProntidao');
            if (select) select.required = false;
        // FASE 3 (>15 min)
        } else {
            displayMessage.style.display = 'none';
            botao.style.display = 'none';
            containerJustificativa.style.display = 'flex';
            const select = document.getElementById('justificativaProntidao');
            if (select) select.required = true;
        }
    };

    atualizarTimerProntidao(); // Roda imediatamente (resolve o "atraso" de 1s)
    intervaloTimerProntidao = setInterval(atualizarTimerProntidao, 1000);
}

/**
 * Limpa o timer, o localStorage e recarrega a tabela após a Prontidão.
 */
function limparProntidao() {
    if (intervaloTimerProntidao) clearInterval(intervaloTimerProntidao);
    // Limpa o storage pois a "sessão" (Apresentação -> Prontidão) terminou
    localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
    carregarEMontarTabela();
}

// --- MANIPULADORES DE EVENTOS (EVENT HANDLERS) ---

/**
 * Vincula todos os listeners dos formulários dinâmicos da tabela.
 */
function vincularListenersDinamicos() {
    // Vincula o form de Justificativa de Apresentação (se existir)
    const formJustApr = document.getElementById("formJustificativaApresentacao");
    if (formJustApr) {
        formJustApr.addEventListener("submit", aoEnviarJustificativaApresentacao);
    }

    // Vincula o form de Prontidão (se existir)
    const formPront = document.getElementById('formProntidao');
    if (formPront) {
        formPront.addEventListener('submit', aoEnviarProntidao);
    }

    // Vincula TODOS os formulários de Fim de Jornada (um por linha)
    const formsFimJornada = document.querySelectorAll(".formFimJornada");
    formsFimJornada.forEach(form => {
        form.addEventListener('submit', aoEnviarFimJornada);
    });
}

/**
 * Handler: Envio do formulário principal de Apresentação (Regra 1)
 */
async function aoEnviarApresentacao(evento) {
    evento.preventDefault();
    const form = evento.target;
    const botao = document.getElementById('botaoApresentar');
    const msgContainer = document.getElementById('form-message');
    const formData = new URLSearchParams(new FormData(form));

    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    msgContainer.innerHTML = '';
    
    const result = await api.postApresentacao(formData);
    await processarRespostaApresentacao(result, formData);
}

/**
 * Handler: Processa a resposta da API de Apresentação (Regra 1)
 */
async function processarRespostaApresentacao(result, formData) {
    const botao = document.getElementById("botaoApresentar");
    const msgContainer = document.getElementById("form-message");

    // [CORREÇÃO] Verificação explícita (ASP envia "false" como string)
    if (result.success === true) { 
        const matricula = formData.get("matricula");
        const dadosEmpregado = {
            matricula: matricula,
            horarioApresentacao: result.horarioApresentacao,
            supervisao: supervisaoAtual,
            local: localAtual,
            statusApresentacao: result.status, // (Salva "OK" ou "JUSTIFICAR")
        };
        // Salva o objeto inteiro
        localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(dadosEmpregado));

        document.getElementById("matricula").value = '';
        msgContainer.innerHTML = `<span class="text-success">${result.message || 'Apresentação registrada!'}</span>`;

        await carregarEMontarTabela(); // Redesenha a tabela
        // 'habilitarProntidao'/'habilitarJustificativa' serão chamados por carregarEMontarTabela

        setTimeout(() => { msgContainer.innerHTML = ''; }, 3000);

        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
    } else {
        // Falha (Confirmação ou Erro)
        switch (result.code) {
            case "CONFIRM_SUPERVISAO":
                if (confirm(result.message)) {
                    formData.append('confirmarSupervisao', '1'); // Nome bate com o ASP
                    const novoResult = await api.postApresentacao(formData);
                    await processarRespostaApresentacao(novoResult, formData);
                } else {
                    botao.disabled = false;
                    botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
                }
                break;
            case "CONFIRM_TURNO":
                if (confirm(result.message)) {
                    formData.append('confirmarTurno', '1'); // Nome bate com o ASP
                    const novoResult = await api.postApresentacao(formData);
                    await processarRespostaApresentacao(novoResult, formData);
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
}

/**
 * Handler: Envio do formulário de Justificativa de Apresentação (Regra 2)
 */
async function aoEnviarJustificativaApresentacao(evento) {
    evento.preventDefault();
    const form = evento.target;
    const botao = form.querySelector('button[type="submit"]');
    const dadosForm = new URLSearchParams(new FormData(form));

    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const result = await api.postJustificativaApresentacao(dadosForm);

    if (result.success === true) {
        aoJustificativaApresentacaoOK();
    } else {
        alert(`Erro ao enviar justificativa: ${result.message}`);
        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

/**
 * Helper: Atualiza o localStorage após justificar o atraso
 */
function aoJustificativaApresentacaoOK() {
    const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
    if (empregadoArmazenadoJSON) {
        const empregado = JSON.parse(empregadoArmazenadoJSON);
        // Atualiza o status local para o app saber que a justificativa foi enviada
        empregado.statusApresentacao = 'JUSTIFICATIVA_OK';
        localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(empregado));
    }
    carregarEMontarTabela(); // Recarrega a tabela para mostrar o texto amarelo
}

/**
 * Handler: Envio do formulário de Prontidão (Regra 3)
 */
async function aoEnviarProntidao(evento) {
    evento.preventDefault();
    const form = evento.target;
    const botaoPronto = form.querySelector('#botaoProntidao');
    const botaoJustificar = form.querySelector('.btn-danger'); 
    const containerMessage = document.getElementById('prontidao-form-message');
    const dadosForm = new URLSearchParams(new FormData(form));

    dadosForm.append('supervisao', supervisaoAtual);
    dadosForm.append('local', localAtual);

    if (botaoPronto) botaoPronto.disabled = true;
    if (botaoJustificar) botaoJustificar.disabled = true;
    const select = form.querySelector('#justificativaProntidao');
    if (select) select.disabled = true;

    // Mostra 'loading' no botão clicado
    if (evento.submitter && evento.submitter.id === 'botaoProntidao') {
        if(botaoPronto) botaoPronto.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    } else if (botaoJustificar) {
        botaoJustificar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    if (containerMessage) containerMessage.innerHTML = '';

    const result = await api.postProntidao(dadosForm);

    if (result.success === true) {
        if (containerMessage) containerMessage.innerHTML = `<span class="text-success">Prontidão registrada!</span>`;
        setTimeout(() => {
            limparProntidao(); // Limpa o localStorage e recarrega a tabela
        }, 1000);
    } else {
        if (containerMessage) containerMessage.innerHTML = `<span class="text-danger">${result.message}</span>`;
        if (botaoPronto) botaoPronto.disabled = false;
        if (botaoJustificar) botaoJustificar.disabled = false;
        if (select) select.disabled = false;
    }
}

/**
 * Handler: Envio do formulário de Fim de Jornada (Regra 2)
 */
async function aoEnviarFimJornada(evento) {
    evento.preventDefault(); 
    const form = evento.target;
    const botaoNormal = form.querySelector('.botaoFimJornada');
    const botaoJustificativa = form.querySelector('.btn-danger');
    const dadosForm = new URLSearchParams(new FormData(form));    
    
    // Desabilita tudo
    if (botaoNormal) botaoNormal.disabled = true;
    if (botaoJustificativa) botaoJustificativa.disabled = true;
    const select = form.querySelector('select');
    if (select) select.disabled = true;

    // Define 'loading'
    if (evento.submitter && evento.submitter.classList.contains('botaoFimJornada')) {
        botaoNormal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Encerrando...';
    } else if (botaoJustificativa) {
        botaoJustificativa.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    const result = await api.postFimJornada(dadosForm);

    if (result.success === true) {
        // Sucesso: apenas recarrega a tabela. O 'localStorage' NÃO é limpo aqui.
        carregarEMontarTabela();
    } else {
        alert(`Erro ao encerrar jornada: ${result.message}`);
        // Reabilita em caso de erro
        if (botaoNormal) botaoNormal.disabled = false;
        if (botaoJustificativa) botaoJustificativa.disabled = false;
        if (select) select.disabled = false;
    }
}

// --- UTILITÁRIOS ---

function iniciarRelogio() {
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

// --- PONTO DE ENTRADA ---

export const viewLocal = {
    init: init
};
