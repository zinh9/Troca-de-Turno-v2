import { localView } from './views/localView.js'

function app() {
    const params = new URLSearchParams(window.location.search);
    const supervisao = params.get('sup');
    const local = params.get('loc');
    
    if (supervisao && local) {
        localView.init(supervisao, local);
    } else {
        document.getElementById('page-header').innerHTML = `
            <h1 class="text-danger">Erro: Supervisão ou Local não especificado.</h1>
            <p class="text-white">Por favor, acesse usando uma URL válida!</p>
        `;
    }
}

app();
