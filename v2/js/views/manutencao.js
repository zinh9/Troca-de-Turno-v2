import { iniciarCronometroManutencao } from "../utils/helpers.js";

export const manutencao = {
    init: init
}

async function init() {
    montarLayout();
    iniciarCronometroManutencao();
}

function montarLayout() {
    const contentContainer = document.getElementById('page-content');

    contentContainer.innerHTML = `
        <center>
            <div class="maintenance-container">
                <div class="maintenance-card fade-in">
                    <div class="maintenance-header">
                        <h1 class="maintenance-title">SISTEMA EM MANUTENÇÃO</h1>
                    </div>
                    
                    <div class="maintenance-content">
                        <div class="maintenance-icon pulse">
                            <i class="fas fa-cogs"></i>
                        </div>
                        
                        <p class="fs-5 mb-4">Estamos realizando melhorias no sistema para proporcionar uma melhor experiência.</p>
                        
                        <div class="row justify-content-center">
                            <div class="col-md-8">
                                <div class="info-item">
                                    <div class="info-icon">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <span><strong>Responsável:</strong> Enzo Rufino</span>
                                </div>
                                
                                <div class="info-item">
                                    <div class="info-icon">
                                        <i class="fas fa-envelope"></i>
                                    </div>
                                    <span><strong>Contato:</strong> enzo.rufino@vale.com</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="countdown-container">
                            <div class="countdown-title">Previsão de Retorno</div>
                            <div class="countdown">
                                <div class="countdown-box">
                                    <div class="countdown-number" id="horas">01</div>
                                    <div class="countdown-label">Horas</div>
                                </div>
                                <div class="countdown-box">
                                    <div class="countdown-number" id="minutos">30</div>
                                    <div class="countdown-label">Minutos</div>
                                </div>
                                <div class="countdown-box">
                                    <div class="countdown-number" id="segundos">00</div>
                                    <div class="countdown-label">Segundos</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </center>
    `;
}
