// Todo esse script é para registrar uma apresentação
document.getElementById("formInserir").addEventListener("submit", function (event) { 
  event.preventDefault(); // Impede o envio padrão do formulário

  const matricula = document.getElementById("matricula").value.trim();
  const torre = document.getElementById("torreSelect").value.trim();
  const guarita = document.getElementById("guaritaSelect").value.trim();
  const params = new URLSearchParams(); // const onde vai ser colocados todos os parametros para serem enviados para o arquivo de 'inserir.asp'
  const btn = document.getElementById("botaoApresentar"); // const do botão de 'Apresentar' para desabilitar e habilitar

  // Desabilita e altera o texto para 'AGUARDE...'
  btn.disabled = true;
  btn.innerText = "ARGUARDE..."

  // Adiciona em params a matricula, supervisão (torre) e local (guarita)
  params.append("matricula", matricula);
  params.append("torre", torre);
  params.append("guarita", guarita);

  console.log("Formulário enviado, iniciando fetch...");

  // Fetch para enviar os dados para o arquivo 'inserir.asp' pelo método POST com os dados de params
  fetch("inserir.asp", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: params.toString()
  })
  .then(response => response.text()) // Pega a resposta do arquivo
  .then(data => {
    data = data.trim();
    console.log(data);

    if (data === "ok") { // Verifica se a resposta retornou 'ok' para assim exibir uma mensagem dizendo que o funcionário foi apresentado e recarrega a página
      setTimeout(() => {
        document.getElementById("mensagem").innerHTML = "<div class='alert alert-success'>Funcionário apresentado com sucesso!</div>";
        location.reload();
      }, 5000);
    } else if (data.startsWith("Atualizar|")) {
      const turno = data.split("|")[1];
      const turnoNovo = data.split("|")[2];
      console.log(turnoNovo)
    
      document.getElementById("turnoModalTexto").innerText = "Seu turno atual é: " + turno;
      document.getElementById("turnoAgora").innerText = turnoNovo;
      document.getElementById("turnoNovo").value = turnoNovo;
      document.getElementById("matriculaTurno").value = matricula;
    
      const modalAtualizar = new bootstrap.Modal(document.getElementById("modalAtualizarTurno"));
      modalAtualizar.show();
    } else if (data.indexOf("confirmar|") === 0) { // Se a mensagem retornar um 'confirmar|0', script exibe um alerta para confirmar que o funcionário está se apresentando em outra supervisão
      let supervisaoOriginal = data.split("|")[1];
      if (confirm("Você está tentando se apresentar em outra supervisão. Sua supervisão original é: " + supervisaoOriginal + ".\nDeseja continuar?")) {
        params.append("confirmado", "1"); // Confirmando, adiciona em params o valor de '1' em 'confirmado' para o arquivo inserir.asp' registrar aquela apresentação que foi confirmada
        
        // Faz novamente o fetch para enviar os dados com a supervisão confirmada
        fetch('inserir.asp', {
          method: 'POST',
          headers: {"Content-Type": "application/x-www-form-urlencoded"},
          body: params.toString()
        })
        .then(response => response.text())
        .then(data => {
          if (data.trim() === "ok") {
            setTimeout(() => {
              document.getElementById("mensagem").innerHTML = "<div class='alert alert-success'>Funcionário apresentado com sucesso!</div>";
              location.reload();
            }, 5000);
          } else { // ↓ DEU RUIM NO CÓDIGO DO ARQUIVO 'inserir.asp'
            alert("Erro ao registrar: " + data);
          }
        });
      }
    } else {
      alert("Erro ao registrar: " + data);
    }
  })
  .catch(error => {
    alert("Erro na requisição: " + error);
  });
});
