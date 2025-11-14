import { api } from '../services/apiService.js';
// [CORREÇÃO] Importa todos os helpers
import { horaParaMinutos, iniciarRelogio, iniciarCronometro } from '../utils/helpers.js'; 

// --- ESTADO GLOBAL DO MÓDULO ---
let supervisaoAtual = null;
let localAtual = null;
let intervaloTimerProntidao = null;
let intervaloPollingTabela = null;
const CHAVE_ARMAZENAMENTO_LOCAL = 'empregadoAtivoLocal';

// --- PONTO DE ENTRADA ---
export const viewLocal = {
    init: init
};

async function init(supervisao, local) {
    supervisaoAtual = supervisao;
    localAtual = local;

    montarLayout();
    habilitarApresentacao();
    
    // Vincula listeners delegados da tabela (só roda 1 vez)
    vincularListenersDeTabela(); 
    
    await carregarEMontarTabela(); // Carga inicial
    
    if (intervaloPollingTabela) clearInterval(intervaloPollingTabela);
    intervaloPollingTabela = setInterval(() => carregarEMontarTabela(), 40000);

    iniciarRelogio();
}

// --- RENDERIZAÇÃO DA UI PRINCIPAL ---

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

    // [CORRIGIDO] Colunas corretas (6)
    contentContainer.innerHTML = `
        <table class="table table-hover table-striped table-dark table-sm border-rounded">
            <thead class="table-light text-center fs-4 fw-bold">
                <tr>
                    <th><span><i class="fa fa-user" aria-hidden="true"></i> Nome</span></th>
                    <th><span id="th-apresentacao">Apresentação</span></th>
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

function habilitarApresentacao() {
    const actionsContainer = document.getElementById('page-actions');
    // ... (HTML do seu formulário de apresentação está OK) ...
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
                <div class="col-auto">
                    <button type="button" class="btn btn-secondary" onclick="window.open('https://efvmworkplace/dss/login_form.asp', '_blank')">
                        <i class="fas fa-shield"></i> Assinar DSS
                    </button>
                </div>
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

// --- LÓGICA DE DADOS E RENDERIZAÇÃO ---

async function carregarEMontarTabela() {
    const dados = await api.getLocalData(supervisaoAtual, localAtual);
    // console.log("Dados: ", dados);

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
        
        montarLinhasTabela(dados.empregados, dados.info.horarioReferencia);

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        // Inicia os timers (se houver)
        verificarEstadoLocal();
    } else {
        document.getElementById('tabelaApresentacoes').innerHTML = `
            <tr><td colspan="6" class="text-danger">Falha ao carregar dados: ${dados ? dados.message : 'sem resposta'}</td></tr>
        `;
    }
}

function montarLinhasTabela(empregados, horarioReferencia) {
    const tbody = document.getElementById('tabelaApresentacoes');
    tbody.innerHTML = '';
    tbody.className = "fs-5 fw-bold text-center";

    const fragmento = document.createDocumentFragment();
    const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
    const empregadoArmazenado = empregadoArmazenadoJSON ? JSON.parse(empregadoArmazenadoJSON) : null;

    if (!empregados || empregados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-danger">Nenhuma apresentação registrada</td></tr>';
        return;
    }

    empregados.forEach(emp => {
        const empregadoAtivo = empregadoArmazenado && String(emp.matricula) === String(empregadoArmazenado.matricula);
        
        const statusApresentacao = (empregadoAtivo && empregadoArmazenado.statusApresentacao) 
            ? empregadoArmazenado.statusApresentacao 
            : emp.statusApresentacao;
        
        // [CORREÇÃO] Pega o status do lanche/refeição do localStorage (se ativo) ou do banco
        const lancheStatus = (empregadoAtivo && empregadoArmazenado.lancheStatus) 
            ? empregadoArmazenado.lancheStatus 
            : emp.lancheStatus;
            
        const refeicaoStatus = (empregadoAtivo && empregadoArmazenado.refeicaoStatus) 
            ? empregadoArmazenado.refeicaoStatus 
            : emp.refeicaoStatus;

        // --- 1. APRESENTAÇÃO ---
        let apresentacaoHtml = '';
        // [CORREÇÃO] A lógica do 'else' (fallback) estava atribuindo a uma 'const'
        if (statusApresentacao === 'OK') {
            apresentacaoHtml =`<span class="text-white">${emp.apresentacao}</span>`;
        } else if (statusApresentacao === 'JUSTIFICATIVA_OK') {
            apresentacaoHtml =  `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao}">${emp.apresentacao}</span>`;
        } else if (statusApresentacao === 'JUSTIFICAR') {
            apresentacaoHtml = renderizarFormJustificativaApresentacao(emp.matricula);
        } else {
            const horaApresentacao = horaParaMinutos(emp.apresentacao);
            const horaReferencia = horaParaMinutos(horarioReferencia);
            apresentacaoHtml = (horaApresentacao <= horaReferencia || !emp.justificativaApresentacao)
            ? `<span class="text-white">${emp.apresentacao}</span>`
            : `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao}">${emp.apresentacao}</span>`;
        }

        // --- 2. PRONTIDÃO ---
        let prontidaoHtml = 'Aguardando...';
        // [CORREÇÃO] Lógica de prontidão não deve rodar se estiver justificando
        if (empregadoAtivo && !emp.prontidao && statusApresentacao !== 'JUSTIFICAR') {
            prontidaoHtml = '<div id="prontidao-dinamica-container"></div>'; // Placeholder do Timer
        } else if (emp.statusProntidao === 'Pronto com atraso') {
            prontidaoHtml = `<span class="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaProntidao}">${emp.prontidao}</span>`;
        } else if (emp.statusProntidao === 'Pronto') {
            prontidaoHtml = `<span class="text-success">${emp.prontidao}</span>`;
        }

        // --- 3. LANCHE ---
        let lancheHtml = '--:--';
        if (emp.prontidao) { // Só mostra lanche se estiver pronto
            if (lancheStatus && lancheStatus.startsWith('TIMER_LANCHE:')) {
                lancheHtml = `<div class="cronometro-lanche" data-starttime="${lancheStatus.split(':')[1]}"></div>`;
            } else if (lancheStatus && lancheStatus.startsWith('ACAO_')) {
                lancheHtml = `<button class="btn btn-sm btn-info btn-lanche" data-matricula="${emp.matricula}">Lanche</button>`;
            } else {
                lancheHtml = `<span class="text-muted">${lancheStatus}</span>`; // "08:00 às 10:30", "Não Solicitado", etc.
            }
        }

        // --- 4. REFEIÇÃO ---
        let refeicaoHtml = '--:--';
        if (emp.prontidao) {
            if (refeicaoStatus && refeicaoStatus.startsWith('TIMER_REFEICAO:')) {
                refeicaoHtml = `<div class="cronometro-refeicao" data-starttime="${refeicaoStatus.split(':')[1]}"></div>`;
            } else if (refeicaoStatus && refeicaoStatus.startsWith('ACAO_')) {
                refeicaoHtml = `<button class="btn btn-sm btn-warning btn-refeicao" data-matricula="${emp.matricula}">Refeição</button>`;
            } else {
                refeicaoHtml = `<span class="text-muted">${refeicaoStatus}</span>`;
            }
        }

        // --- 5. FIM DE JORNADA ---
        let fimJornadaHtml = '--:--';
        if (emp.fimJornada) {
            fimJornadaHtml = emp.justificativaFimJornada
                ? `<span class="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaFimJornada}">${emp.fimJornada}</span>`
                : `<span class="text-success">${emp.fimJornada}</span>`;
        } else if (emp.prontidao && statusApresentacao !== 'JUSTIFICAR') { // [CORREÇÃO] Não pode encerrar se justifica
            fimJornadaHtml = renderizarFormFimJornada(emp.matricula, emp.statusFimJornada); // statusFimJornada é true/false
        }

        const linha = document.createElement('tr');
        linha.className = 'text-center';
        linha.innerHTML = `
            <td><span class="text-white" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Mat. ${emp.matricula}">${emp.nome}</span></td>
            <td class="text-center">${apresentacaoHtml}</td>
            <td class="text-center">${prontidaoHtml}</td>
            <td class="text-center">${lancheHtml}</td>
            <td class="text-center">${refeicaoHtml}</td>
            <td class="text-center">${fimJornadaHtml}</td>
        `;
        fragmento.appendChild(linha);
    });
    tbody.appendChild(fragmento);
}

function renderizarFormJustificativaApresentacao(matricula) {
    // ... (HTML do seu formJustificativaApresentacao) ...
    return `
        <form id="formJustificativaApresentacao">
            <input type="hidden" name="matricula" value="${matricula}">
            <div class="input-group input-group-sm">
                <select name="justificativaApresentacao" class="form-select form-select-sm" required> 
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
}

function renderizarFormFimJornada(matricula, estaAtrasado) {
    // ... (HTML do seu formFimJornada) ...
    const displayJustificativa = estaAtrasado ? 'flex' : 'none';
    const displayBotaoNormal = estaAtrasado ? 'none' : 'block';

    return `
    <center>
        <form class="formFimJornada">
            <input type="hidden" name="matricula" value="${matricula}">
            <div class="justificativas-fimJornada-container mb-2 input-group" style="display: ${displayJustificativa};">
                <select name="justificativaFimJornada" class="form-select form-select-sm" ${estaAtrasado ? 'required' : ''}> 
                    <option value="">Justificativa...</option>
                    <option value="Permanência pós jornada atribuída ao CCP">Permanência pós jornada (CCP)</option>
                    <option value="Solicitação de permanência pela Supervisão de Pátio">Solicitação de permanência (Pátio)</option>
                    <option value="Alinhamento de DBO">Alinhamento de DBO</option>
                    <option value="Indisponibilidade do Totem">Indisponibilidade do totem</option>
                    <option value="Atendimento à Incidentes Operacionais">Atendimento à incidentes</option>
                    <option value="DSS com Inspetoria">DSS com Inspetoria</option>
                    <option value="DSS com Supervisor">DSS com Supervisor</option>
                    <option value="Distração/Desatenção no apontamento da saída">Distração/Desatenção</option>
                    <option value="Manifestações de Terceiros">Manifestações de Terceiros</option>
                    <option value="Eventos de ACT">Eventos de ACT</option>
                    <option value="Atraso de Transporte">Atraso de Transporte</option>
                    <option value="Teste ou Instrução de uso">Teste ou Instrução de uso</option>
                    <option value="Obstrução de Acesso ao Posto de Trabalho">Obstrução de Acesso</option>
                    <option value="Horário ADM">Horário ADM</option>
                </select>
                <button type="submit" class="btn btn-danger btn-sm">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
            <button type="submit" class="botaoFimJornada btn btn-light btn-sm" style="display: ${displayBotaoNormal};">
                Bom Descanso
            </button>
        </form>
    </center>
    `;
}

// --- LÓGICA DE ESTADO (TIMERS E LOCALSTORAGE) ---

function verificarEstadoLocal() {
    const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
    if (empregadoArmazenadoJSON) {
        try {
            const empregado = JSON.parse(empregadoArmazenadoJSON);

            if (empregado.supervisao !== supervisaoAtual || empregado.local !== localAtual) {
                localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
                return;
            }
            
            // Inicia o timer de PRONTIDÃO (se o placeholder existir)
            const contProntidao = document.getElementById('prontidao-dinamica-container');
            if (contProntidao) {
                habilitarProntidao(empregado.matricula, empregado.horarioApresentacao);
            }
            
            // Inicia o timer de LANCHE (se o placeholder existir)
            const contLanche = document.querySelector('.cronometro-lanche');
            if (contLanche) {
                // [CORREÇÃO] Inicia o helper de cronômetro (Regra 3)
                iniciarCronometro(contLanche, contLanche.dataset.starttime, 15); // 15 minutos
            }
            
            // Inicia o timer de REFEIÇÃO (se o placeholder existir)
            // [CORREÇÃO] Bug de seletor (querySelector)
            const contRefeicao = document.querySelector('.cronometro-refeicao');
            if (contRefeicao) {
                // [CORREÇÃO] Inicia o helper de cronômetro (Regra 3)
                iniciarCronometro(contRefeicao, contRefeicao.dataset.starttime, 60); // 60 minutos
            }
        } catch (error) {
            console.error("Erro ao ler localStorage: ", error);
            localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
        }
    }
}

function habilitarProntidao(matricula, horarioApresentacao) {
    const containerAcoes = document.getElementById('prontidao-dinamica-container');
    if (!containerAcoes) return; 

    // [CORREÇÃO] Previne que o polling de 40s recrie o timer
    if (containerAcoes.innerHTML.includes('formProntidao')) return; 

    const horaInicio = new Date(horarioApresentacao);
    if (intervaloTimerProntidao) clearInterval(intervaloTimerProntidao);

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
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
            <button type="submit" id="botaoProntidao" class="btn btn-success btn-sm w-100" style="display: none;">
                Pronto
            </button>
        </form>
        <div id="prontidao-form-message" class="mt-1 text-center small"></div>
    `;

    // Função interna do timer (Tick)
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
        
        // [CORREÇÃO] Teste de 10s (para debug) -> 300s (5 min)
        // FASE 1 (0-5 min)
        if (diffSegundos <= 300) { 
            displayMessage.style.display = 'block';
            displayMessage.innerHTML = 'Faça sua <span class="text-warning"><strong>Boa Jornada</strong></span>...'; // (seu texto)
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
 * Limpa o timer e o status local de Prontidão.
 */
function limparProntidao() {
    if (intervaloTimerProntidao) clearInterval(intervaloTimerProntidao);
    
    // [CORREÇÃO] Atualiza o localStorage, não o apaga
    const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
    if (empregadoArmazenadoJSON) {
        const empregado = JSON.parse(empregadoArmazenadoJSON);
        empregado.statusProntidao = 'Pronto'; // Atualiza o status local
        localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(empregado));
    }
    carregarEMontarTabela(); // Recarrega a tabela
}

// --- MANIPULADORES DE EVENTOS (EVENT HANDLERS) ---

/**
 * Vincula todos os listeners dos formulários dinâmicos da tabela.
 */
function vincularListenersDeTabela() {
    const tbody = document.getElementById('tabelaApresentacoes');

    // Listener para SUBMIT (formulários)
    tbody.addEventListener('submit', (evento) => {
        const form = evento.target;
        
        // [CORREÇÃO] IDs/Classes precisam bater com o HTML renderizado
        if (form.id === 'formJustificativaApresentacao') {
            aoEnviarJustificativaApresentacao(evento);
        }
        if (form.id === 'formProntidao') {
            aoEnviarProntidao(evento);
        }
        if (form.classList.contains('formFimJornada')) {
            aoEnviarFimJornada(evento);
        }
    });

    // Listener para CLICK (botões Lanche/Refeição)
    tbody.addEventListener('click', (evento) => {
        const target = evento.target.closest('button');
        if (!target) return; // Não foi um botão
        
        const matricula = target.dataset.matricula;
        if (!matricula) return; // Botão não tem matrícula
        
        if (target.classList.contains('btn-lanche')) {
            aoEnviarLanche(target, matricula);
        }
        if (target.classList.contains('btn-refeicao')) {
            aoEnviarRefeicao(target, matricula);
        }
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

    // [CORREÇÃO] Verifica booleano, não string
    if (result.success === true) { 
        const matricula = formData.get("matricula");
        const dadosEmpregado = {
            matricula: matricula,
            horarioApresentacao: result.horarioApresentacao,
            supervisao: supervisaoAtual,
            local: localAtual,
            statusApresentacao: result.status, // Salva "OK" ou "JUSTIFICAR"
        };
        // [CORREÇÃO] Salva o objeto inteiro
        localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(dadosEmpregado));

        document.getElementById("matricula").value = '';
        msgContainer.innerHTML = `<span class="text-success">${result.message || 'Apresentação registrada!'}</span>`;

        await carregarEMontarTabela();

        setTimeout(() => { msgContainer.innerHTML = ''; }, 3000);

        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
    } else {
        // Falha (Confirmação ou Erro)
        switch (result.code) {
            case "CONFIRM_SUPERVISAO":
                if (confirm(result.message)) {
                    formData.append('confirmarSupervisao', '1'); 
                    const novoResult = await api.postApresentacao(formData);
                    await processarRespostaApresentacao(novoResult, formData);
                } else {
                    botao.disabled = false;
                    botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
                }
                break;
            case "CONFIRM_TURNO":
                if (confirm(result.message)) {
                    formData.append('confirmarTurno', '1');
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

    dadosForm.append('supervisao', supervisaoAtual);
    dadosForm.append('local', localAtual);

    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const result = await api.postJustificativaApresentacao(dadosForm);

    if (result.success === true) { // Verificação explícita
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
        empregado.statusApresentacao = 'JUSTIFICATIVA_OK';
        localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(empregado));
    }
    carregarEMontarTabela();
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

    if (evento.submitter && evento.submitter.id === 'botaoProntidao') {
        if(botaoPronto) botaoPronto.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    } else if (botaoJustificar) {
        botaoJustificar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    if (containerMessage) containerMessage.innerHTML = '';

    const result = await api.postProntidao(dadosForm);

    if (result.success === true) { // Verificação explícita
        if (containerMessage) containerMessage.innerHTML = `<span class="text-success">Prontidão registrada!</span>`;
        setTimeout(() => {
            // [CORREÇÃO] Chama a função correta
            limparProntidao(); // Atualiza o localStorage e recarrega a tabela
        }, 1000);
    } else {
        if (containerMessage) containerMessage.innerHTML = `<span class="text-danger">${result.message}</span>`;
        if (botaoPronto) botaoPronto.disabled = false;
        if (botaoJustificar) botaoJustificar.disabled = false;
        if (select) select.disabled = false;
    }
}

/**
 * [NOVO] Handler: Clique no botão Lanche
 */
async function aoEnviarLanche(botao, matricula) {
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const formData = new URLSearchParams();
    formData.append('matricula', matricula);

    // [CORREÇÃO] Adicionado 'await'
    const result = await api.postLanche(formData); 

    // [CORREÇÃO] Verificação explícita
    if (result.success === true) { 
        const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        if (empregadoArmazenadoJSON) {
            const empregado = JSON.parse(empregadoArmazenadoJSON);
            // [CORREÇÃO] Comparação correta
            if (String(empregado.matricula) === String(matricula)) {
                // 'horarioApresentacao' é o nome do campo que a API retorna
                empregado.lancheStatus = "TIMER_LANCHE:" + result.horarioApresentacao; 
                localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(empregado));
            }
        }
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao registrar lanche.');
        botao.disabled = false;
        botao.innerHTML = 'Solicitar Lanche';
    }
}

/**
 * [NOVO] Handler: Clique no botão Refeição
 */
async function aoEnviarRefeicao(botao, matricula) {
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const formData = new URLSearchParams();
    formData.append('matricula', matricula);

    // [CORREÇÃO] Adicionado 'await'
    const result = await api.postRefeicao(formData); 

    // [CORREÇÃO] Verificação explícita
    if (result.success === true) { 
        const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        if (empregadoArmazenadoJSON) {
            const empregado = JSON.parse(empregadoArmazenadoJSON);
            // [CORREÇÃO] Comparação correta
            if (String(empregado.matricula) === String(matricula)) {
                empregado.refeicaoStatus = "TIMER_REFEICAO:" + result.horarioApresentacao;
                localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(empregado));
            }
        }
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao registrar Refeição.');
        botao.disabled = false;
        botao.innerHTML = 'Solicitar Refeição';
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
    
    // [CORREÇÃO] Adiciona contexto para o ASP
    dadosForm.append('supervisao', supervisaoAtual);
    dadosForm.append('local', localAtual);
    
    if (botaoNormal) botaoNormal.disabled = true;
    if (botaoJustificativa) botaoJustificativa.disabled = true;
    const select = form.querySelector('select');
    if (select) select.disabled = true;

    if (evento.submitter && evento.submitter.classList.contains('botaoFimJornada')) {
        botaoNormal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Encerrando...';
    } else if (botaoJustificativa) {
        botaoJustificativa.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    const result = await api.postFimJornada(dadosForm);

    // [CORREÇÃO] Verificação explícita
    if (result.success === true) {
        const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        if (empregadoArmazenadoJSON) {
            const empregado = JSON.parse(empregadoArmazenadoJSON);
            if (String(empregado.matricula) === String(dadosForm.get('matricula'))) {
                // Limpa o storage pois a jornada deste usuário terminou
                localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);
            }
        }
        await carregarEMontarTabela();
    } else {
        alert(`Erro ao encerrar jornada: ${result.message}`);
        if (botaoNormal) botaoNormal.disabled = false;
        if (botaoJustificativa) botaoJustificativa.disabled = false;
        if (select) select.disabled = false;
    }
}
