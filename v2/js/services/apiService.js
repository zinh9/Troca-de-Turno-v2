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
    /**
     * 
     * @param {FormData} 
     * @returns {Promise<object>}
     */
    postApresentacao: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_apresentacao.asp`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });
    
            if (!response) {
                throw new Error(`Erro HTTP: ${response.message}`);
            }
    
            const data = await response.json();
            //console.log("Resposta da API:", data);
            
            return data;
        } catch (error) {
            console.error("Falha ao enviar dados da apresentação:", error);
            alert("Erro na requisição: " + error.message);
            return { success: false, message: error.message };
        }
    },
    /**
     * 
     * @param {FormData} 
     * @returns {Promise<object>}
     */
    postProntidao: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_prontidao.asp`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData,
            });

            if (!response) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const dados = await response.json();
            return dados;
        } catch (error) {
            console.error("Falha ao enviar prontidão:", error);
            alert("Erro na requisição de prontidão: " + error.message);
            return { success: false, message: error.message };
        }
    },
    /**
     * 
     * @param {FormData} 
     * @returns {Promise<object>}
     */
    postJustificativaApresentacao: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_update_just_apresentacao.asp`;

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            const dados = await response.json();
            return dados;
        } catch (error) {
            console.error("Falha ao enviar justificativa:", error);
            alert("Erro na requisição de justificativa: " + error.message);
            return { success: false, message: error.message };
        }
    },
    /**
     * @param {FormData}
     * @returns {Promise<object>}
     */
    postFimJornada: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_fim_jornada.asp`;

            for (let [key, value] of formData.entries()) {
                console.log(`FormData - ${key}: ${value}`);
            }

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            const dados = await response.json();
            return dados;
        } catch (error) {
            console.error("Falha ao enviar dados Fim de Jornada: ", error);
            alert("Erro na requisição de Fim de Jornada: ", error.message);
            return { success: false, message: error.message };
        }
    },
}
