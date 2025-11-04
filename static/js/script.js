function iniciarCronometro() {
    const elementos = document.querySelectorAll(".cronometro");

    elementos.forEach(el => {
        const horarioStr = el.dataset.horarioLanchePatio;
        const horarioStrCPT = el.dataset.horarioLancheCpt;

        console.log(horarioStr + " PATIO");
        console.log(horarioStrCPT + " CCP");
        
        if (!horarioStr) return;
        
        const horarioLanche = new Date(horarioStrCPT);
        if (isNaN(horarioLanche.getTime())) return;

        const fimContagem = new Date(horarioLanche.getTime() + 15 * 60000);

        const intervalo = setInterval(() => {
            const agora = new Date();
            const restante = fimContagem - agora;

            if (restante <= 0) {
                const horaInicio = horarioLanche.getHours().toString().padStart(2, '0');
                const minutoInicio = horarioLanche.getMinutes().toString().padStart(2, '0');
                
                const horaFim = fimContagem.getHours().toString().padStart(2, '0');
                const minutoFim = fimContagem.getMinutes().toString().padStart(2, '0');
                
                el.innerHTML = `<span class='text-white'>${horaInicio}:${minutoInicio}</span> → <span class='chamada-alerta'>${horaFim}:${minutoFim}</span>`;
                clearInterval(intervalo);
            } else {
                const minutos = Math.floor(restante / 60000);
                const segundos= Math.floor((restante % 60000) / 1000);

                el.innerHTML = `<span class='text-warning fw-bold'>${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}</span>`;
            }
        }, 1000);
    });
}

window.onload = iniciarCronometro;
