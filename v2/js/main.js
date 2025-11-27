import { viewLocal } from './views/viewLocal.js'
import { viewCCP } from './views/viewCCP.js';
import { manutencao } from './views/manutencao.js';

function app() {
    const params = new URLSearchParams(window.location.search);
    const supervisao = params.get('sup');
    const local = params.get('loc');
    const layout = params.get('layout');

    setHeaderLayout(layout);
    
    if (layout === 'patio' && supervisao && local) {
        window.viewLocal = viewLocal;
        viewLocal.init(supervisao, local);
    } else if (layout === 'CCP') {
        window.viewCCP = viewCCP;
        viewCCP.init(supervisao);
    } else {
        document.getElementById('page-header').innerHTML = `
            <h1 class="text-danger">Erro: Supervisão ou Local não especificado.</h1>
            <p class="text-white">Por favor, acesse usando uma URL válida!</p>
        `;
    }

    // manutencao.init();
}

function setHeaderLayout(layoutParam) {
    const layoutLabelEl = document.getElementById('layout-label');
    const linkMenu = document.getElementById('linkMenu');
    if (!layoutLabelEl) return;

    const layout = (layoutParam || '').toString().trim().toLowerCase();

    if (layout === 'ccp') {
        document.title = 'CCP | Controle de Apresentação';
        layoutLabelEl.textContent = 'CCP';
        layoutLabelEl.className = "text-danger";
        linkMenu.href = '#';
    } else if (layout === 'patio') {
        document.title = 'PÁTIO | Controle de Apresentação';
        layoutLabelEl.textContent = 'PÁTIO';
        linkMenu.href = 'default.html';
    } else {
        document.title = 'PÁTIO | Controle de Apresentação';
        layoutLabelEl.textContent = 'PÁTIO';
        linkMenu.href = 'default.html';
    }
}

app();
