import { viewLocal } from './views/viewLocal.js'
import { viewCCP } from './views/viewCCP.js';

function app() {
    const params = new URLSearchParams(window.location.search);
    const supervisao = params.get('sup');
    const local = params.get('loc');
    const layout = params.get('layout');

    setHeaderLayout(layout);
    
    if (layout === 'patio' && supervisao && local) {
        viewLocal.init(supervisao, local);
    } else if (layout === 'CCP') {
        viewCCP.init(supervisao);
    } else {
        document.getElementById('page-header').innerHTML = `
            <h1 class="text-danger">Erro: Supervisão ou Local não especificado.</h1>
            <p class="text-white">Por favor, acesse usando uma URL válida!</p>
        `;
    }
}

function setHeaderLayout(layoutParam) {
    const layoutLabelEl = document.getElementById('layout-label');
    if (!layoutLabelEl) return;

    const layout = (layoutParam || '').toString().trim().toLowerCase();

    if (layout === 'ccp') {
        document.title = 'CCP | Controle de Apresentação';
        layoutLabelEl.textContent = 'CCP';
        layoutLabelEl.className = "text-danger";
    } else if (layout === 'patio') {
        document.title = 'PÁTIO | Controle de Apresentação';
        layoutLabelEl.textContent = 'PÁTIO';
    } else {
        document.title = 'PÁTIO | Controle de Apresentação';
        layoutLabelEl.textContent = 'PÁTIO';
    }
}

app();
