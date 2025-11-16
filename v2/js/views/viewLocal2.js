import { api } from '../services/apiService.js';
// [CORREÇÃO] Importa todos os helpers
import { horaParaMinutos, iniciarRelogio, iniciarCronometro } from '../utils/helpers.js'; 

// --- ESTADO GLOBAL DO MÓDULO ---
let supervisaoAtual = null;
let localAtual = null;
// let intervaloTimerProntidao = null; // REMOVIDO (Bug Crítico)
let intervaloPollingTabela = null;
// const CHAVE_ARMAZENAMENTO_LOCAL = 'empregadoAtivoLocal'; // REMOVIDO (Bug Crítico)
// let empregadoAtivoLocal = null; // REMOVIDO (Bug Crítico)

// --- PONTO DE ENTRADA ---

export const viewLocal = {
    init: init,
    // [NOVO] Expõe a função de 'tick' para o 'helpers.js'
    atualizarTodosOsTimers: atualizarTodosOsTimers 
};

async function init(supervisao, local) {
    supervisaoAtual = supervisao;
    localAtual = local;

    // [CORREÇÃO] Coloca o objeto 'viewLocal' no 'window' para que
    // o 'iniciarRelogio' (que não é um módulo) possa chamá-lo.
    window.viewLocal = viewLocal;

    montarLayout();
    habilitarApresentacao();
    
    // Vincula listeners delegados da tabela (só roda 1 vez)
    listenersDinamicos(); 
    
    await carregarEMontarTabela(); // Carga inicial
    
    if (intervaloPollingTabela) clearInterval(intervaloPollingTabela);
    intervaloPollingTabela = setInterval(() => carregarEMontarTabela(), 40000);

    // [CORREÇÃO] Inicia o relógio E o "Master Tick"
    iniciarRelogio(true); 
}

// --- RENDERIZAÇÃO DA UI PRINCIPAL ---

function montarLayout() {
    // ... (Seu 'montarLayout' está OK) ...
    //
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
    // ... (Seu 'habilitarApresentacao' está OK) ...
    //
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
        
        // [REMOVIDO] Bloco de sincronização do localStorage
        
        montarLinhasTabela(dados.empregados, dados.info.horarioReferencia);

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // [REMOVIDO] Chamadas 'habilitarJustificativa' e 'verificarEstadoLocal'
        // Elas agora são tratadas pelo 'listenersDinamicos' e 'atualizarTodosOsTimers'
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

    // [REMOVIDO] Não lemos mais o localStorage aqui
    // const empregadoArmazenado = null; 

    if (!empregados || empregados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-danger">Nenhuma apresentação registrada</td></tr>';
        return;
    }

    empregados.forEach(emp => {
        // [REMOVIDO] Não depende mais do 'empregadoAtivo'
        const statusApresentacao = emp.statusApresentacao;
        const lancheStatus = emp.lancheStatus;
        const refeicaoStatus = emp.refeicaoStatus;

        // --- 1. APRESENTAÇÃO ---
        let apresentacaoHtml = '';
        if (statusApresentacao === 'OK') {
            apresentacaoHtml =`<span class="text-white">${emp.apresentacao}</span>`;
        } else if (statusApresentacao === 'JUSTIFICATIVA_OK') {
            apresentacaoHtml =  `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao}">${emp.apresentacao}</span>`;
        } else if (statusApresentacao === 'JUSTIFICAR') {
            apresentacaoHtml = renderizarFormJustificativaApresentacao(emp.matricula);
        } else {
            const horaApresentacao = horaParaMinutos(emp.apresentacao);
            const horaReferencia = horaParaMinutos(horarioReferencia);
            // [CORREÇÃO] Bug de 'const' dentro do 'else'
            apresentacaoHtml = (horaApresentacao <= horaReferencia || !emp.justificativaApresentacao)
            ? `<span class="text-white">${emp.apresentacao}</span>`
            : `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao}">${emp.apresentacao}</span>`;
        }

        // --- 2. PRONTIDÃO ---
        let prontidaoHtml = 'Aguardando...';
        // [CORREÇÃO] Lógica de prontidão não deve rodar se estiver justificando
        if (!emp.prontidao && statusApresentacao !== 'JUSTIFICAR') {
            // [CORREÇÃO] Adiciona a classe e os data-attributes para o "Master Tick"
            prontidaoHtml = `<div class="prontidao-dinamica-container" 
                                  data-matricula="${emp.matricula}" 
                                  data-horario-apresentacao="${emp.dataHoraApresentacaoCompleta}">
                                  Aguardando...
                             </div>`;
        } else if (emp.statusProntidao === 'Pronto com atraso') {
            prontidaoHtml = `<span class="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaProntidao}">${emp.prontidao}</span>`
        } else if (emp.statusProntidao === 'Pronto') {
            prontidaoHtml = `<span class="text-success">${emp.prontidao}</span>`;
        }

        // --- 3. LANCHE ---
        let lancheHtml = '--:--';
        if (emp.prontidao) { // Só mostra lanche se estiver pronto
            if (lancheStatus && lancheStatus.startsWith('TIMER_LANCHE:')) {
                lancheHtml = `<div class="cronometro-lanche" data-starttime="${lancheStatus.split(':')[1]}"></div>`;
            } else if (lancheStatus === 'HABILITAR_ESCOLHA') {
                lancheHtml = renderizarEscolhaLanche(emp.matricula);
            } else if (lancheStatus && lancheStatus.startsWith('ACAO_')) {
                lancheHtml = `<button class="btn btn-sm btn-info btn-lanche" data-matricula="${emp.matricula}">Lanche</button>`;
            } else {
                lancheHtml = `<span class="text-muted">${lancheStatus}</span>`;
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
        } else if (emp.prontidao && statusApresentacao !== 'JUSTIFICAR') {
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
    
    // [CORREÇÃO] 'verificarEstadoLocal' agora é 'atualizarTodosOsTimers',
    // que é chamado pelo 'iniciarRelogio'
}

function renderizarFormJustificativaApresentacao(matricula) {
    // ... (Seu HTML está OK) ...
    return `
    <form class="formJustificativaApresentacao">
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
    // ... (Seu HTML está OK) ...
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

function renderizarEscolhaLanche(matricula) {
    // ... (Seu HTML está OK) ...
    return `
        <div class="d-flex justify-content-center">
            <div class="input-group input-group-sm shadow-sm w-100">
                <select class="form-select form-select-sm" name="escolhaIntervalo">
                    <option value="" disabled selected>Escolha...</option>
                    <option value="CEDO">MANHÃ (08:00 às 10:30)</option>
                    <option value="TARDE">TARDE (14:00 às 16:30)</option>
                </select>
                <button type="button" class="btn btn-success btn-sm btn-escolha" data-matricula="${matricula}">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
}

// --- LÓGICA DE ESTADO (TIMERS) ---

/**
 * [REMOVIDO] 'verificarEstadoLocal'
 * [REMOVIDO] 'habilitarProntidao'
 * [REMOVIDO] 'limparProntidao'
 */

/**
 * [NOVA FUNÇÃO] O "Master Tick" para timers paralelos (Regra 5).
 * Esta função é chamada a cada segundo pelo 'iniciarRelogio'.
 */
function atualizarTodosOsTimers() {
    // 1. Atualiza todos os timers de PRONTIDÃO
    const containersProntidao = document.querySelectorAll('.prontidao-dinamica-container');
    
    containersProntidao.forEach(container => {
        const horarioApresentacao = container.dataset.horarioApresentacao;
        if (!horarioApresentacao) return;

        const horaInicio = new Date(horarioApresentacao);
        const agora = new Date();
        const diffSegundos = Math.floor((agora - horaInicio) / 1000);

        // Se o timer ainda não foi renderizado, cria o HTML
        if (!container.innerHTML.includes('formProntidao')) {
            container.innerHTML = `
                <div id="prontidao-message" class="fs-5 text-center"></div>
                <form id="formProntidao">
                    <input type="hidden" name="matricula" value="${container.dataset.matricula}">
                    <div id="justificativas-prontidao-container" class="mb-2 input-group" style="display: none;">
                        <select name="justificativaProntidao" class="form-select form-select-sm" required> 
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
        }

        // Agora que o HTML existe, atualiza a UI
        const displayMessage = container.querySelector('#prontidao-message');
        const botao = container.querySelector('#botaoProntidao');
        const containerJustificativa = container.querySelector('#justificativas-prontidao-container');

        if (!displayMessage || !botao || !containerJustificativa) return;

        // Lógica das 3 Fases (Regra 3)
        if (diffSegundos <= 300) { // 5 min
            displayMessage.style.display = 'block';
            displayMessage.innerHTML = 'Faça sua <span class="text-warning"><strong>Boa Jornada</strong></span>...';
            botao.style.display = 'none';
            containerJustificativa.style.display = 'none';
        } else if (diffSegundos <= 900) { // 15 min
            displayMessage.style.display = 'none';
            botao.style.display = 'block';
            botao.className = 'btn btn-success btn-sm w-100';
            botao.innerHTML = 'Pronto';
            containerJustificativa.style.display = 'none';
            const select = container.querySelector('#justificativaProntidao');
            if (select) select.required = false;
        } else { // > 15 min
            displayMessage.style.display = 'none';
            botao.style.display = 'none';
            containerJustificativa.style.display = 'flex';
            const select = container.querySelector('#justificativaProntidao');
            if (select) select.required = true;
        }
    });

    // 2. Atualiza todos os timers de LANCHE (Regra 3)
    document.querySelectorAll('.cronometro-lanche').forEach(el => {
        if (el && el.dataset.starttime && !el.dataset.timerIniciado) {
            iniciarCronometro(el, el.dataset.starttime, 15);
            el.dataset.timerIniciado = 'true'; // Impede de reiniciar
        }
    });
    
    // 3. Atualiza todos os timers de REFEIÇÃO (Regra 3)
    document.querySelectorAll('.cronometro-refeicao').forEach(el => {
        if (el && el.dataset.starttime && !el.dataset.timerIniciado) {
            iniciarCronometro(el, el.dataset.starttime, 60);
            el.dataset.timerIniciado = 'true'; // Impede de reiniciar
        }
    });
}


// --- MANIPULADORES DE EVENTOS (EVENT HANDLERS) ---

function listenersDinamicos() {
    const tbody = document.getElementById('tabelaApresentacoes');

    // Listener para SUBMIT (formulários)
    tbody.addEventListener('submit', (evento) => {
        const form = evento.target;
        
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
        if (!target) return;
        
        const matricula = target.dataset.matricula;
        if (!matricula) return;

        if (target.classList.contains('btn-escolha')) {
            const select = target.closest('.input-group').querySelector('select');
            aoEnviarEscolhaIntervalo(target, select, matricula);
        }
        if (target.classList.contains('btn-lanche')) {
            aoEnviarLanche(target, matricula);
        }
        if (target.classList.contains('btn-refeicao')) {
            aoEnviarRefeicao(target, matricula);
        }
    });
}

async function aoEnviarApresentacao(evento) {
    evento.preventDefault();
    const form = evento.target;
    const botao = document.getElementById('botaoApresentar');
    const msgContainer = document.getElementById('form-message');
    const formData = new URLSearchParams(new FormData(form));

    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    msgContainer.innerHTML = '';
    
    console.log("Enviando Apresentação...");
    const result = await api.postApresentacao(formData);
    await processarRespostaApresentacao(result, formData);
}

async function processarRespostaApresentacao(result, formData) {
    const botao = document.getElementById("botaoApresentar");
    const msgContainer = document.getElementById("form-message");
    console.log("Processando Resposta:", result);

    // [CORREÇÃO] ASP envia string "true"
    if (result.success === "true") { 
        const matricula = formData.get("matricula");
        const dadosEmpregado = {
            matricula: matricula,
            horarioApresentacao: result.horarioApresentacao,
            supervisao: supervisaoAtual,
            local: localAtual,
            statusApresentacao: result.status, 
        };
        // [CORREÇÃO] Salva na variável local
        empregadoAtivoLocal = dadosEmpregado; 
        console.log("Empregado Ativo definido:", empregadoAtivoLocal);

        document.getElementById("matricula").value = '';
        msgContainer.innerHTML = `<span class="text-success">${result.message || 'Apresentação registrada!'}</span>`;

        await carregarEMontarTabela();

        setTimeout(() => { msgContainer.innerHTML = ''; }, 3000);

        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
    } else {
        // ... (Sua lógica de 'switch' está OK) ...
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

    if (result.success === "true") { // [CORREÇÃO] Verificação explícita
        aoJustificativaApresentacaoOK();
    } else {
        alert(`Erro ao enviar justificativa: ${result.message}`);
        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

function aoJustificativaApresentacaoOK() {
    // [CORREÇÃO] Atualiza a variável local
    if (empregadoAtivoLocal) {
        empregadoAtivoLocal.statusApresentacao = 'JUSTIFICATIVA_OK';
    }
    carregarEMontarTabela();
}

async function aoEnviarProntidao(evento) {
    evento.preventDefault();
    const form = evento.target;
    const botaoPronto = form.querySelector('#botaoProntidao');
    const botaoJustificar = form.querySelector('.btn-danger'); 
    const containerMessage = form.nextElementSibling; // [CORREÇÃO] Pega o 'prontidao-form-message'
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

    if (result.success === "true") { // [CORREÇÃO] Verificação explícita
        if (containerMessage) containerMessage.innerHTML = `<span class="text-success">Prontidão registrada!</span>`;
        
        // [CORREÇÃO] Limpa o 'empregadoAtivoLocal' da prontidão
        if (empregadoAtivoLocal && String(empregadoAtivoLocal.matricula) === String(dadosForm.get('matricula'))) {
            empregadoAtivoLocal.statusProntidao = 'Pronto'; // Atualiza o status local
        }
        
        setTimeout(() => {
            carregarEMontarTabela(); // Recarrega a tabela
        }, 1000);
    } else {
        if (containerMessage) containerMessage.innerHTML = `<span class="text-danger">${result.message}</span>`;
        if (botaoPronto) botaoPronto.disabled = false;
        if (botaoJustificar) botaoJustificar.disabled = false;
        if (select) select.disabled = false;
    }
}

async function aoEnviarEscolhaIntervalo(botao, select, matricula) {
    const valor = select.value;
    if (valor === "") {
        alert('Selecione um intervalo para lanche...');
        return;
    }

    botao.disabled = true;
    select.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    const formData = new URLSearchParams();
    formData.append('matricula', matricula); // [CORREÇÃO] Erro de digitação
    formData.append('escolhaIntervalo', valor);

    const result = await api.postEscolhaIntervalo(formData); // [CORREÇÃO] Faltava 'await'

    if (result.success === "true") { // [CORREÇÃO] Verificação explícita
        if (empregadoAtivoLocal && String(empregadoAtivoLocal.matricula) === String(matricula)) {
            empregadoAtivoLocal.lancheStatus = (valor === 'CEDO') ? "08:00 às 10:30" : "14:00 às 16:30";
        }
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao registrar Escolha');
        select.disabled = false;
        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

async function aoEnviarLanche(botao, matricula) {
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const formData = new URLSearchParams();
    formData.append('matricula', matricula);
    const result = await api.postLanche(formData); 

    if (result.success === "true") { // [CORREÇÃO] Verificação explícita
        if (empregadoAtivoLocal && String(empregadoAtivoLocal.matricula) === String(matricula)) {
            // [CORREÇÃO] 'horarioApresentacao' é o campo de retorno
            empregadoAtivoLocal.lancheStatus = "TIMER_LANCHE:" + result.horarioApresentacao; 
            console.log("Lanche salvo no estado local:", empregadoAtivoLocal);
        }
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao registrar lanche.');
        botao.disabled = false;
        botao.innerHTML = 'Lanche';
    }
}

async function aoEnviarRefeicao(botao, matricula) {
    botao.disabled = true;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const formData = new URLSearchParams();
    formData.append('matricula', matricula);
    const result = await api.postRefeicao(formData); 
    console.log("Resultado Refeição:", result); // Log de Ajuda

    if (result.success === "true") { // [CORREÇÃO] Verificação explícita
        if (empregadoAtivoLocal && String(empregadoAtivoLocal.matricula) === String(matricula)) {
            // [CORREÇÃO] 'horarioApresentacao' é o campo de retorno
            empregadoAtivoLocal.refeicaoStatus = "TIMER_REFEICAO:" + result.horarioApresentacao;
            console.log("Refeição salva no estado local:", empregadoAtivoLocal);
        }
        await carregarEMontarTabela();
    } else {
        alert(result.message || 'Erro ao registrar Refeição.');
        botao.disabled = false;
        botao.innerHTML = 'Refeição';
    }
}

async function aoEnviarFimJornada(evento) {
    evento.preventDefault(); 
    const form = evento.target;
    const botaoNormal = form.querySelector('.botaoFimJornada');
    const botaoJustificativa = form.querySelector('.btn-danger');
    const dadosForm = new URLSearchParams(new FormData(form));    
    
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
    
    // [CORREÇÃO] O nome do campo de justificativa está errado
    const justificativa = dadosForm.get('justificativaFimJornada'); 
    if (!justificativa || justificativa.trim() === '') {
        const confirmar = confirm('Tem certeza que deseja encerrar sua Jornada?');
        if (!confirmar) {
            if (botaoNormal) botaoNormal.disabled = false;
            if (botaoJustificativa) botaoJustificativa.disabled = false;
            if (select) select.disabled = false;
            return;
        }
    }

    const result = await api.postFimJornada(dadosForm);

    if (result.success === "true") { // [CORREÇÃO] Verificação explícita
        if (empregadoAtivoLocal && String(empregadoAtivoLocal.matricula) === String(dadosForm.get('matricula'))) {
            empregadoAtivoLocal = null; // Limpa o usuário ativo
            console.log("Sessão local encerrada.");
        }
        await carregarEMontarTabela();
    } else {
        alert(`Erro ao encerrar jornada: ${result.message}`);
        if (botaoNormal) botaoNormal.disabled = false;
        if (botaoJustificativa) botaoJustificativa.disabled = false;
        if (select) select.disabled = false;
    }
}
