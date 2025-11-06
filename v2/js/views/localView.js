import { api } from '../services/apiService.js';

let supervisaoAtual = null;
let localAtual = null;
let intervaloTimerProntidao = null;
let intervaloPollingTabela = null; // mantemos referência para poder limpar se necessário
const CHAVE_ARMAZENAMENTO_LOCAL = 'empregadoAtivoLocal';

export const viewLocal = {
    init: async (supervisao, local) => {
        supervisaoAtual = supervisao;
        localAtual = local;

        viewLocal.montarLayout();

        viewLocal.habilitarApresentacao();
        
        await viewLocal.carregarEMontarTabela();

        viewLocal.verificarEstadoLocal();

        // CORREÇÃO: não chamar a função imediatamente. passar referência/função.
        if (intervaloPollingTabela) clearInterval(intervaloPollingTabela);
        intervaloPollingTabela = setInterval(() => viewLocal.carregarEMontarTabela(), 40000);

        viewLocal.iniciarRelogio();
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
    verificarEstadoLocal: () => {
        const empregadoArmazenado = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        if (empregadoArmazenado) {
            try {
                const { matricula, horarioApresentacao, supervisao, local } = JSON.parse(empregadoArmazenado);

                if (supervisao === supervisaoAtual && local === localAtual) {
                    // Se o container existir, habilita prontidão (normalmente criado pela montagem da tabela)
                    if (document.getElementById('prontidao-dinamica-container')) {
                        viewLocal.habilitarProntidao(matricula, horarioApresentacao);
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
            console.log("cheguei aqui");
            viewLocal.habilitarApresentacao();
        }
    },
    habilitarProntidao: (matricula, horarioApresentacao) => {
        const containerAcoes = document.getElementById('prontidao-dinamica-container');
        const horaInicio = new Date(horarioApresentacao);

        if (!containerAcoes) {
            console.log('Container de prontidão não encontrado.');
            return;
        }

        if (intervaloTimerProntidao) clearInterval(intervaloTimerProntidao);

        containerAcoes.innerHTML = `
            <div id="prontidao-message" class="fs-6 text-center my-2"></div>
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

        intervaloTimerProntidao = setInterval(() => {
            const agora = new Date();
            const diffSegundos = Math.floor((agora - horaInicio) / 1000);

            const displayMessage = document.getElementById('prontidao-message');
            const botao = document.getElementById('botaoProntidao');
            const containerJustificativa = document.getElementById('justificativas-prontidao-container');

            // [CORRIGIDO] Verifica todos os elementos antes de continuar
            if (!displayMessage || !botao || !containerJustificativa) {
                clearInterval(intervaloTimerProntidao);
                return;
            }

            // FASE 1: (0 a 5 minutos) - Mostra Mensagem
            if (diffSegundos <= 300) {
                displayMessage.style.display = 'block'; // Garante que está visível
                displayMessage.innerHTML = 'Faça sua <span class="text-warning"><strong>Boa Jornada</strong></span>, assine o <span class="text-warning"><strong>DSS</strong></span> e realize o <span class="text-warning"><strong>TAC</strong></span>';
                botao.style.display = 'none';
                containerJustificativa.style.display = 'none';
            
            // FASE 2: (5 a 15 minutos) - Mostra Botão "Pronto"
            } else if (diffSegundos <= 900) {
                displayMessage.style.display = 'none';
                botao.style.display = 'block';
                botao.className = 'btn btn-success btn-sm w-100'; // Ajustado para 'btn-sm'
                botao.innerHTML = 'Pronto';
                containerJustificativa.style.display = 'none';
                document.getElementById('justificativaProntidao').required = false;
            
            // FASE 3: (Após 15 minutos) - Mostra Justificativa
            } else {
                displayMessage.style.display = 'none';
                botao.style.display = 'none';
                containerJustificativa.style.display = 'flex'; // 'flex' ou 'block' (input-group usa flex)
                document.getElementById('justificativaProntidao').required = true;
            }
        }, 1000);

        const formProntidao = document.getElementById('formProntidao');
        formProntidao.addEventListener('submit', viewLocal.postProntidao);
    },
    limparProntidao: () => {
        if (intervaloTimerProntidao) clearInterval(intervaloTimerProntidao);

        localStorage.removeItem(CHAVE_ARMAZENAMENTO_LOCAL);

        viewLocal.carregarEMontarTabela();
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
            
            viewLocal.montarLinhasTabela(dados.empregados);

            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });

            viewLocal.verificarEstadoLocal();
        } else {
            document.getElementById('tabelaApresentacoes').innerHTML = `
                <tr><td colspan="4" class="text-danger">Falha ao carregar dados: ${dados ? dados.message : 'sem resposta'}</td></tr>
            `;
        }
    },
    montarLinhasTabela: (empregados) => {
        const tbody = document.getElementById('tabelaApresentacoes');

        tbody.innerHTML = '';
        tbody.className = "fs-5 fw-bold text-center";

        const empregadoArmazenadoJSON = localStorage.getItem(CHAVE_ARMAZENAMENTO_LOCAL);
        const empregadoArmazenado = empregadoArmazenadoJSON ? JSON.parse(empregadoArmazenadoJSON) : null;

        if (!empregados || empregados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Nenhuma apresentação registrada</td></tr>';
            return;
        }

        empregados.forEach(emp => {
            const horaApresentacao = viewLocal.horaParaMinutos(emp.apresentacao);
            const horaReferencia = viewLocal.horaParaMinutos(`${emp.horarioRef}`);
            
            const apresentacaoHtml = horaApresentacao <= horaReferencia
            ? `<span class="text-white">${emp.apresentacao}</span>`
            : `<span class="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaApresentacao}">${emp.apresentacao}</span>`;

            let prontidaoHtml = 'Aguardando...';

            // CORREÇÃO: comparar como string para evitar mismatch number/string
            const igualMatricula = empregadoArmazenado && String(emp.matricula) === String(empregadoArmazenado.matricula);

            if (igualMatricula && !emp.prontidao) {
                prontidaoHtml = '<div id="prontidao-dinamica-container"></div>';
            } else if (emp.statusProntidao === 'Pronto com atraso') {
                prontidaoHtml = `<span class="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${emp.justificativaProntidao}">${emp.prontidao}</span>`
            } else if (emp.statusProntidao === 'Pronto') {
                prontidaoHtml = `<span class="text-success">${emp.prontidao}</span>`
            }

            const linha = `
                <tr>
                    <td>${emp.nome}</td>
                    <td>${apresentacaoHtml}</td>
                    <td>${prontidaoHtml}</td>
                    <td>
                        ${emp.fimJornada ? emp.fimJornada : "--:--"}
                    </td>
                </tr>
            `;

            tbody.innerHTML += linha;
        });

        // após montar a tabela, se localStorage tem usuário e existe o container, habilita prontidão
        if (empregadoArmazenado && document.getElementById('prontidao-dinamica-container')) {
            viewLocal.habilitarProntidao(empregadoArmazenado.matricula, empregadoArmazenado.horarioApresentacao);
        }
    },
    horaParaMinutos: (horaStr) => {
        if (!horaStr) return 0;
        const [h=0, m=0] = horaStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    },
    postApresentacao: async (evento) => {
        evento.preventDefault();

        const form = evento.target;
        const botao = document.getElementById('botaoApresentar');
        const msgContainer = document.getElementById('form-message');
        const formData = new URLSearchParams(new FormData(form));
        const matricula = formData.get('matricula');

        botao.disabled = true;
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        msgContainer.innerHTML = '';
        
        const result = await api.postApresentacao(formData);

        if (result.success) {
            const dadosEmpregado = {
                matricula: matricula,
                horarioApresentacao: result.horarioApresentacao,
                supervisao: supervisaoAtual,
                local: localAtual,
            };
            localStorage.setItem(CHAVE_ARMAZENAMENTO_LOCAL, JSON.stringify(dadosEmpregado));

            document.getElementById('matricula').value = '';
            msgContainer.innerHTML = `<span class="text-success">${result.message}</span>`;

            // Aguardamos a atualização da tabela antes de habilitar prontidão para garantir o container existir
            await viewLocal.carregarEMontarTabela();

            // Chamamos habilitarProntidao com os dados recém gravados
            viewLocal.habilitarProntidao(dadosEmpregado.matricula, dadosEmpregado.horarioApresentacao);

            setTimeout(() => { msgContainer.innerHTML = ''; }, 3000);
        } else {
            msgContainer.innerHTML = `<span class="text-danger">${result.message}</span>`;
            botao.disabled = false;
            botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
        }

        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-check"></i> Apresentar';
    },
    postProntidao: async (evento) => {
        evento.preventDefault();

        const form = evento.target;
        const botao = document.getElementById('botaoProntidao');
        const containerMessage = document.getElementById('prontidao-form-message');
        const dadosForm = new URLSearchParams(new FormData(form));

        dadosForm.append('supervisao', supervisaoAtual);
        dadosForm.append('local', localAtual);

        botao.disabled = true;
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        containerMessage.innerHTML = '';

        const result = await api.postProntidao(dadosForm);

        if (result.success) {
            containerMessage.innerHTML = `<span class="text-success">${result.message}</span>`;

            setTimeout(() => {
                viewLocal.limparProntidao();
            }, 3000);
        } else {
            containerMessage.innerHTML = `<span class="text-danger">${result.message}</span>`;
            botao.disabled = false;
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
