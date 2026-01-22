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

            viewFormData(formData);
            

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData,
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

            viewFormData(formData);
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

            viewFormData(formData);

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

            viewFormData(formData);
            

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
    postChamadaCPT: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_chamada_CPT.asp`;

            viewFormData(formData);
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            const dados = await response.json();
            return dados;
        } catch (error) {
            console.error("Falha ao enviar dados Chamada CPT: ", error);
            alert("Erro na requisição de Chamada CPT: ", error.message);
            return { success: false, message: error.message };
        }
    },
    postLanche: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_lanche.asp`

            viewFormData(formData);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData,
            });

            const dados = await response.json();
            return dados;
        } catch (error) {
            console.error("Falha ao enviar dados Lanche: ", error);
            alert("Erro na requisição de Lanche: ", error.message);
            return { success: false, message: error.message };
        }
    },
    postEscolhaIntervalo: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_escolha_lanche.asp`

            viewFormData(formData);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData,
            });

            const dados = await response.json();
            console.log(dados);
            return dados;
        } catch (error) {
            console.error("Falha ao enviar dados Escolha: ", error);
            alert("Erro na requisição de Escolha: ", error.message);
            return { success: false, message: error.message };
        }
    },
    postRefeicao: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_refeicao.asp`

            viewFormData(formData);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData,
            });

            const dados = await response.json();
            console.log(dados);
            return dados;
        } catch (error) {
            console.error("Falha ao enviar dados Refeição: ", error);
            alert("Erro na requisição de Refeição: ", error.message);
            return { success: false, message: error.message };
        }
    },
    postFimJornadaCPT: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_fim_jornada_CPT.asp`;

            viewFormData(formData);
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            const dados = await response.json();
            return dados;
        } catch (error) {
            console.error("Falha ao enviar dados Fim de Jornada CPT: ", error);
            alert("Erro na requisição de Fim de Jornada CPT: ", error.message);
            return { success: false, message: error.message };
        }
    },
    postLancheCPT: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_lanche_cpt.asp`;

            viewFormData(formData);
            
    
            const response = await fetch(url, { method: 'POST', body: formData, });
            
            if (!response.ok) throw new Error(`Error HTTP: ${response.message}`);
    
            const dados  = await response.json();
            return dados;
        } catch (error) {  
            console.error("Falha ao enviar dados Liberação de Lanche: ", error);
            alert("Erro na requisição de Liberação de Lanche: ", error.message);
            return handleFetchError('postLancheCPT', error);
        }
    },
    postRefeicaoCPT: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_refeicao_cpt.asp`;
            
            viewFormData(formData);
            const response = await fetch(url, { method: 'POST', body: formData, });
            
            if (!response.ok) throw new Error(`Error HTTP: ${response.message}`);
    
            const dados  = await response.json();
            return dados;
        } catch (error) {  
            console.error("Falha ao enviar dados Refeicao: ", error);
            alert("Erro na requisição de Refeicao: ", error.message);
            return handleFetchError('postRefeicaoCPT', error);
        }
    },
    postProntidaoLancheRefeicao: async (formData) => {
        try {
            const url = `${API_BASE_URL}post_prontidao_lanche_refeicao.asp`;

            viewFormData(formData);

            const response = await fetch(url, { method: 'POST', body: formData });

            if (!response.ok) throw new Error(`Error HTTP: ${response.message}`);

            const dados = await response.json();
            return dados
        } catch (error) {
            console.error("Falha ao enviar dados Prontidao Lanche/Refeição: ", error);
            alert("Erro na requisição de Prontidao Lanche/Refeição: ", error.message);
            return handleFetchError('postProntidaoLancheRefeicao', error);
        }
    },
}

function viewFormData(form) {
    for (let [key, value] of form.entries()) {
        console.log(`FormData - ${key}: ${value}`);
    }
}