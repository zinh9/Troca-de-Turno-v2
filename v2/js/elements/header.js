const body = document.body;
const header = document.createElement('div');

header.setAttribute('id', 'header');
header.innerHTML = `
    <header class="bg-black text-white d-flex align-items-center justify-content-between py-3 px-3 mb-3">
        <a id="linkMenu" href="default.html">
            <img class="img-fluid me-4" style="height: 60px;" src="assets/images/logo-vale.png" alt="VALE">
        </a>
        <div class="flex-grow-1 text-center">
            <div class="fs-1 fw-bold">
                <span id="layout-label" class="text-warning">PÁTIO</span> | SISTEMA TROCA DE TURNO - OP1
            </div>
        </div>
        <div class="fs-6 text-end" style="white-space: nowrap;">
            Última atualização: <br>
            <span id="ultima-atualizacao">--:--:--</span>
        </div>
    </header>
`;

body.prepend(header);
