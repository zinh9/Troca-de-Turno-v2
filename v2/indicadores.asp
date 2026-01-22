<!--#include file='asp_api/includes/conexao.asp' -->
<!--#include file='asp_api/includes/utils.asp' -->
<%
Dim supFiltro, supWhere
supFiltro = Trim(request("sup"))
supFiltro = UCase(supFiltro)

select case supFiltro
  case "TORRE_A", "TORRE_B", "TORRE_C", "TORRE_L"
    supWhere = " AND supervisao_ra = '" & supFiltro & "' "
  case "VPN"
    supWhere = " AND supervisao_ra = 'PV_AB' "
  case else
    supWhere = ""
end select
%>
<!DOCTYPE html>
<html lang="pt-br">
<%
Dim conn
Set conn = getConexao()

' Importante comentar que essa página está sempre tendo atualizações nos indicadores, e deve ser melhorar a estrutura para melhor 
' desenvolvimentos futuros

%>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8" />
    <title>FMDS | Controle de Apresentação</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Oswald:wght@200..700&family=Parisienne&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="static/css/indicadores.css">
    <style>
        .row.flex-nowrap > .col { min-width: 0; }
        .mini-card { border-radius: 6px; padding: 12px; font-size: 0.95rem; line-height: 1.2; }
        .mini-card .title { font-weight:700; margin-bottom:6px; }
        .mini-card .small { font-size:0.88rem; color:#666; }

        .mini-card-1 { background:#f5f6f7; color:#222; border:1px solid #e6e7e8; }

        .mini-card-2 { background:#2c2c2c; border:1px solid #e9ecef; box-shadow:0 2px 6px rgba(0,0,0,0.03); display:flex; gap:12px; align-items:flex-start; }
        .mini-card-2 .accent { width:6px; background:#0d6efd; border-radius:4px; }
        .mini-card-2 .content { padding-left:6px; }

        .highlight { font-weight:700; color:#0d6efd; }

        .mini-card-3 { background:#f8f9fa; border:1px dashed #dee2e6; }
        .mini-card-3 .more { display:none; margin-top:8px; color:#333; }
        .mini-card-3 .btn-more { background:transparent; border:none; color:#0d6efd; cursor:pointer; padding:0; font-weight:700; }

        .widget-card { border-radius:10px; background:#fff; box-shadow:0 8px 20px rgba(0,0,0,0.12); border:1px solid #e9ecef; height:100%; display:flex; flex-direction:column; }
        .widget-card .chart-body { padding:14px; flex:0 0 auto; }
        .widget-card .desc-body { padding:10px 14px 18px; flex:0 0 auto; }

        .row-cards { gap:1rem; }

        [data-mode="diario"] .mensal {display: none !important;}
        [data-mode="mensal"] .diario {display: none !important;}

        .loading-spinner{
            width:30px;
            height:30px;
            border:2px solid indigo;
            border-radius:50%;
            border-top-color:#0001;
            display:inline-block;
            animation:loadingspinner .7s linear infinite;
        }

        @keyframes loadingspinner{
            0%{
                transform:rotate(0deg)
            }
            100%{
                transform:rotate(360deg)
            }
        }

    </style>
</head>

<body style="background-color: rgb(80, 80, 80);">

    <header class="bg-black text-white d-flex align-items-center justify-content-between py-3 px-3 mb-3">
        <a href="default.html">
            <img class="img-fluid me-4" style="height: 60px;" src="static/images/logo-vale.png" alt="VALE">
        </a>

        <div class="flex-grow-1 text-center">
            <div class="fs-1 fw-bold">FMDS - SMED OPERAÇÃO 1</div>
        </div>

        <div class="text-end" style="display: block;">
            <a class="btn btn-secondary" href="registros_excel.asp" target="_blank">Baixar Relatório Completo</a>
        </div>
    </header>

    <main class="container-xxl py-3">
        <ul class="nav nav-pills gap-2 mb-3" id="tabsPainel" role="tablist" aria-label="Seções do painel">
            <li class="nav-item" role="presentation">
                <button class="nav-link active bg-light" id="tab-apresentacao" data-bs-toggle="pill"
                        data-bs-target="#pane-apresentacao" type="button" role="tab" data-route="apresentacao"
                        aria-controls="pane-apresentacao" aria-selected="true">Apresentação &amp; Prontidão</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link bg-light" id="tab-turnos" data-bs-toggle="pill"
                        data-bs-target="#pane-turnos" type="button" role="tab" data-route="turnos"
                        aria-controls="pane-turnos" aria-selected="false">Turnos 06h/18h</button>
            </li>
            <!--
            <li class="nav-item" role="presentation">
                <button class="nav-link bg-light" id="tab-ccp" data-bs-toggle="pill"
                        data-bs-target="#pane-ccp" type="button" role="tab" data-route="ccp"
                        aria-controls="pane-ccp" aria-selected="false">CCP</button>
            </li>
            -->
            <li class="nav-item ms-auto" role="presentation">
                <div class="d-flex align-items-center gap-2">
                    <div class="btn-group" role="group" aria-label="Modo dos indicadores" id="modoIndicadores">
                        <input type="radio" class="btn-check" name="modo" id="modoDiario" autocomplete="off">
                        <label class="btn btn-light" for="modoDiario" title="Mostrar indicadores do dia">
                            <i class="fa-solid fa-calendar-day me-1"></i> Diário
                        </label>

                        <input type="radio" class="btn-check" name="modo" id="modoMensal" autocomplete="off">
                        <label class="btn btn-light" for="modoMensal" title="Mostrar indicadores do mês">
                            <i class="fa-solid fa-calendar-days me-1"></i> Mensal
                        </label>
                </div>

                <div class="dropdown">
                    <button class="btn btn-light" type="button" id="filtroSup" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-filter"></i> <span id="lblSup">Filtrar supervisão</span>
                    </button>

                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="filtroSup" role="menu">
                        <li><button class="dropdown-item" type="button" data-sup="">Todas</button></li>
                        <li><button class="dropdown-item" type="button" data-sup="TORRE_A">TORRE A</button></li>
                        <li><button class="dropdown-item" type="button" data-sup="TORRE_B">TORRE B</button></li>
                        <li><button class="dropdown-item" type="button" data-sup="TORRE_C">TORRE C</button></li>
                        <li><button class="dropdown-item" type="button" data-sup="TORRE_L">TORRE L</button></li>
                        <li><button class="dropdown-item" type="button" data-sup="VPN">VPN</button></li>
                    </ul>
                </div>
            </li>
        </ul>
            
        <div class="tab-content">
            <!--#include file='sections\apresentacao.asp' -->
            <!--#include file='sections\turno.asp' -->
            <!--#include file='sections\ccp.asp' -->
        </div>
    </main>

    <button id="toTop" class="btn btn-outline-secondary position-fixed bottom-0 end-0 m-3 opacity-0"
            aria-label="Voltar ao topo">↑</button>

    <!-- Modal de Loading (Bootstrap 5) -->
    <div class="modal fade" id="loadingModal" tabindex="-1"
        aria-labelledby="loadingModalLabel" aria-hidden="true"
        data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content bg-dark text-white border-0">
                <div class="modal-body text-center py-4">
                    <div class="spinner-border text-light" role="status" aria-hidden="true"></div>
                    <div id="loadingModalLabel" class="mt-3 fw-semibold">
                    Aguarde… carregando os dados
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="static/js/canvasjs.min.js"></script>
    <!--#include file='charts_indicadores.asp' -->
    <!-- Bootstrap JS (se ainda não estiver incluído) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
    (function () {
    'use strict';

    let loadingModal = null;

    function getLoadingInstance() {
        const el = document.getElementById('loadingModal');
        if (!el) return null;
        if (!loadingModal) {
        loadingModal = new bootstrap.Modal(el, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });
        }
        return loadingModal;
    }

    /** Mostra a modal de loading (mensagem opicional) */
    window.showLoading = function (message) {
        const inst = getLoadingInstance();
        if (!inst) return;

        if (message) {
        const label = document.getElementById('loadingModalLabel');
        if (label) label.textContent = message;
        }
        inst.show();
    };

    /** Esconde a modal de loading */
    window.hideLoading = function () {
        const inst = getLoadingInstance();
        if (inst) inst.hide();
    };

    /** Mostra loading e navega após pequeno atraso para renderizar a modal */
    window.navigateWithLoading = function (url, message) {
        showLoading(message || 'Aguarde… carregando os dados');
        setTimeout(() => { location.href = url; }, 75);
    };

    // Garantias para esconder quando a página terminar de carregar (ou voltar do cache do navegador)
    window.addEventListener('load', hideLoading);
    window.addEventListener('pageshow', (e) => { if (e.persisted) hideLoading(); });
    })();
    </script>
    <script>
    (function () {
    'use strict';

    const SUP_ALLOWED = ["", "TORRE_A", "TORRE_B", "TORRE_C", "TORRE_L", "VPN"];
    const MODE_KEY = 'indicadores:modo';
    const SUP_KEY  = 'sup';
    const modeScope = document.body;

    const $  = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));
    function getQS() { return new URLSearchParams(location.search); }

    function setUrl(params, {reload=false, keepHash=true} = {}) {
        const qs = getQS();
        for (const [k, v] of Object.entries(params)) {
        if (v === null || v === undefined || v === '') qs.delete(k);
        else qs.set(k, v);
        }
        const hash = keepHash ? location.hash : '';
        const url  = location.pathname + (qs.toString() ? `?${qs.toString()}` : '') + hash;
        if (reload) navigateWithLoading(url, 'Aplicand filtro...');
        else history.replaceState(null, '', url);
    }

    function getActiveRoute() {
        const el = document.querySelector('.nav-link.active[data-route]');
        return el ? el.getAttribute('data-route') : '';
    }

    function initBtnMore() {
        document.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-more');
        if (!btn) return;

        const tgtId = btn.getAttribute('data-target');
        const el    = document.getElementById(tgtId);
        if (!el) return;

        const visible = (el.style.display === 'block' || getComputedStyle(el).display !== 'none');
        if (visible) {
            el.style.display = 'none';
            btn.textContent  = 'Ver mais...';
        } else {
            el.style.display = 'block';
            btn.textContent  = 'Ver menos...';
        }
        });
    }

    function setSupUI(sup) {
        const label = $('#lblSup');
        if (label) label.textContent = sup ? sup.replace(/_/g, ' ') : 'Filtrar supervisão';
        $$('.dropdown-item[data-sup]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sup === sup);
        });
    }

    function getInitialSup() {
        const qs        = getQS();
        const fromQS    = qs.get('sup');
        const fromStore = localStorage.getItem(SUP_KEY);
        const sup       = (fromQS ?? fromStore ?? '');
        return SUP_ALLOWED.includes(sup) ? sup : '';
    }

    function initSup() {
        const sup = getInitialSup();
        setSupUI(sup);
        if (sup) localStorage.setItem(SUP_KEY, sup); else localStorage.removeItem(SUP_KEY);

        $$('.dropdown-item[data-sup]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const next = e.currentTarget.dataset.sup;
            if (!SUP_ALLOWED.includes(next)) return;

            localStorage.setItem(SUP_KEY, next);
            setSupUI(next);

            const activeRoute = getActiveRoute();
            const mode = (modeScope.getAttribute('data-mode') || localStorage.getItem(MODE_KEY) || 'diario').toLowerCase();

            const qs = getQS();
            if (next) qs.set('sup', next); else qs.delete('sup');
            qs.set('modo', mode);

            const url = location.pathname + (qs.toString() ? `?${qs.toString()}` : '') + (activeRoute ? `#${activeRoute}` : '');
            navigateWithLoading(url, 'Aplicando filtro…');
        });
        });

        const hash = location.hash.replace('#', '');
        if (hash) {
        const btn = document.querySelector(`button[data-route="${hash}"]`);
        if (btn) {
            try {
            if (window.bootstrap && bootstrap.Tab) {
                new bootstrap.Tab(btn).show();
            } else {
                btn.click();
            }
            } catch (_) {
            btn.click();
            }
        }
        }
    }

    function getInitialMode() {
        const qs         = getQS();
        const fromQS     = (qs.get('modo') || '').toLowerCase();
        const fromStore  = (localStorage.getItem(MODE_KEY) || '').toLowerCase();
        if (fromQS === 'diario' || fromQS === 'mensal') return fromQS;
        if (fromStore === 'diario' || fromStore === 'mensal') return fromStore;
        const fromAttr = (modeScope.getAttribute('data-mode') || '').toLowerCase();
        return (fromAttr === 'mensal') ? 'mensal' : 'diario';
    }

    function applyMode(mode, {persist=true, updateUrl=true, triggerResize=true} = {}) {
        modeScope.setAttribute('data-mode', mode);

        const rdDiario = $('#modoDiario');
        const rdMensal = $('#modoMensal');
        if (rdDiario && rdMensal) {
        rdDiario.checked = (mode === 'diario');
        rdMensal.checked = (mode === 'mensal');
        }

        if (persist)   localStorage.setItem(MODE_KEY, mode);
        if (updateUrl) setUrl({ modo: mode }, { reload:false, keepHash:true });

        if (triggerResize) setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        }, 60);
    }

    function initMode() {
        const initial = getInitialMode();
        applyMode(initial, { persist:false, updateUrl:true, triggerResize:false });

        const rdDiario = $('#modoDiario');
        const rdMensal = $('#modoMensal');
        if (rdDiario) rdDiario.addEventListener('change', () => applyMode('diario'));
        if (rdMensal) rdMensal.addEventListener('change', () => applyMode('mensal'));
    }

    document.addEventListener('DOMContentLoaded', () => {
        initBtnMore();
        initMode();
        initSup();
    });
    })();
    </script>
</body>
</html>