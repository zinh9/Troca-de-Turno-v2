const API_BASE_URL = 'asp_api/';

export const api = {
    /**
    * @param {string} supervisao
    * @param {string} local
    * @returns {Promise<object>} 
    */
    getLocalData: async (supervisao, local) => {
        try {
            const url = `${API_BASE_URL}get_local_data.asp?sup=${supervisao}&loc=${local}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Falha ao buscar dados do local: ', error);
            return { success: false, message: error.message };
        }
    },
    postApresentacao: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_apresentacao.asp`;
    
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("Resposta da API:", data);
    
            if (data.success) {
                // Sucesso na apresentação
                // document.getElementById("mensagem").innerHTML = `
                //     <div class='alert alert-success'>${data.message}</div>
                // `;
                setTimeout(() => {
                    location.reload();
                }, 5000);
            } else {
                // Tratamento de mensagens especiais
                if (data.message.startsWith("confirmar|")) {
                    const supervisaoOriginal = data.message.split("|")[1];
                    if (confirm(`Você está tentando se apresentar em outra supervisão. Sua supervisão original é: ${supervisaoOriginal}.\nDeseja continuar?`)) {
                        formData.append("confirmado", "1");
    
                        // Reenvia com confirmação
                        return await postApresentacao(formData);
                    }
                } else {
                    alert("Erro ao registrar: " + data.message);
                }
            }
    
            return data;
        } catch (error) {
            console.error("Falha ao enviar dados da apresentação:", error);
            alert("Erro na requisição: " + error.message);
            return { success: false, message: error.message };
        }
    },
    // Parte da Prontidão
}
