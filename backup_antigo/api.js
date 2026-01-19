// API Manager
class API {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(method, endpoint, body = null) {
        try {
            const options = {
                method,
                headers: this.getHeaders()
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Erro na requisição');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async login(usuario_id, senha) {
        return this.request('POST', '/api/auth/login', { usuario_id, senha });
    }

    async verificarToken(token) {
        return this.request('POST', '/api/auth/verificar-token', { token });
    }

    async criarColeta(coleta) {
        return this.request('POST', '/api/coleta/criar', coleta);
    }

    async uploadFoto(coletaId, file) {
        const formData = new FormData();
        formData.append('file', file);

        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        };

        const response = await fetch(`${this.baseURL}/api/coleta/upload-foto/${coletaId}`, options);
        if (!response.ok) {
            throw new Error('Erro no upload');
        }
        return await response.json();
    }

    async getMinhasColetas() {
        return this.request('GET', '/api/coleta/minhas-coletas');
    }

    // Admin - Usuários
    async criarUsuario(usuario) {
        return this.request('POST', '/api/admin/usuarios', usuario);
    }

    async listarUsuarios() {
        return this.request('GET', '/api/admin/usuarios');
    }

    // Admin - Veículos
    async criarVeiculo(veiculo) {
        return this.request('POST', '/api/admin/veiculos', veiculo);
    }

    async listarVeiculos() {
        return this.request('GET', '/api/admin/veiculos');
    }

    async deletarVeiculo(veiculo_id) {
        return this.request('DELETE', `/api/admin/veiculos/${veiculo_id}`);
    }

    // Admin - Relatórios
    async getRelatorios() {
        return this.request('GET', '/api/admin/relatorios');
    }

    async getRelatoriosDetalhado() {
        return this.request('GET', '/api/admin/relatorios/detalhado');
    }

    async getRelatorioUsuario(usuario_id) {
        return this.request('GET', `/api/admin/relatorios/usuario/${usuario_id}`);
    }

    // Coleta - Veículos disponíveis
    async listarVeiculosDisponiveis() {
        return this.request('GET', '/api/coleta/veiculos');
    }

    // Coleta - Nova estrutura de viagens ilimitadas
    
    // Retirar veículo (inicia coleta)
    async retirarVeiculo(veiculo_id, km = null, observacoes = '') {
        return this.request('POST', `/api/coleta/retirar/${veiculo_id}`, { km, observacoes });
    }

    // Sair com veículo (inicia viagem)
    async sairComVeiculo(coleta_id, km, observacoes = '') {
        return this.request('POST', `/api/coleta/${coleta_id}/sair`, { km, observacoes });
    }

    // Retornar com veículo (finaliza viagem)
    async retornarComVeiculo(coleta_id, km, observacoes = '') {
        return this.request('POST', `/api/coleta/${coleta_id}/retornar`, { km, observacoes });
    }

    // Devolver veículo (finaliza coleta)
    async devolverVeiculo(coleta_id, km = null, observacoes = '') {
        return this.request('POST', `/api/coleta/${coleta_id}/devolver`, { km, observacoes });
    }

    // Obter coleta ativa
    async getColetaAtiva() {
        return this.request('GET', '/api/coleta/ativa');
    }

    // Listar viagens de uma coleta
    async listarViagens(coleta_id) {
        return this.request('GET', `/api/coleta/${coleta_id}/viagens`);
    }
}

const api = new API();
