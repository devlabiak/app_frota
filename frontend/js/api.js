class API {
    constructor() {
        this.base = window.location.origin;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    headers() {
        return {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }

    async req(method, path, body = null) {
        const opts = { method, headers: this.headers() };
        if (body) opts.body = JSON.stringify(body);
        
        console.log(`[API] ${method} ${path}`, body);
        
        const res = await fetch(this.base + path, opts);
        if (!res.ok) {
            const err = await res.json();
            console.error(`[API ERROR] ${res.status}`, err);
            throw new Error(err.detail || 'Erro');
        }
        return res.json();
    }

    // AUTH
    login(usuario_id, senha) { return this.req('POST', '/api/auth/login', { usuario_id, senha }); }

    // COLETA
    getVeiculos() { return this.req('GET', '/api/coleta/veiculos'); }
    retirar(veiculo_id, km, obs) { return this.req('POST', `/api/coleta/retirar/${veiculo_id}`, { km, observacoes: obs }); }
    ativa() { return this.req('GET', '/api/coleta/ativa'); }
    devolver(coleta_id, km, obs) { return this.req('POST', `/api/coleta/${coleta_id}/devolver`, { km, observacoes: obs }); }

    // ADMIN
    usuarios() { return this.req('GET', '/api/admin/usuarios'); }
    criarUsuario(id, nome, senha, admin) { return this.req('POST', '/api/admin/usuarios', { usuario_id: id, nome, senha, is_admin: admin }); }
    deletarUsuario(id) { return this.req('DELETE', `/api/admin/usuarios/${id}`); }
    alterarSenha(id, senha) { return this.req('PUT', `/api/admin/usuarios/${id}/senha`, { nova_senha: senha }); }
    atualizarPrivilegio(id, isAdmin) { return this.req('PUT', `/api/admin/usuarios/${id}/admin`, { is_admin: isAdmin }); }

    veiculos() { return this.req('GET', '/api/admin/veiculos'); }
    criarVeiculo(placa, marca, modelo, ano) { return this.req('POST', '/api/admin/veiculos', { placa, marca, modelo, ano }); }
    deletarVeiculo(id) { return this.req('DELETE', `/api/admin/veiculos/${id}`); }

    relatorios() { return this.req('GET', '/api/admin/relatorios'); }
    relatorioUsuario(usuarioId, periodo, dataInicio, dataFim) {
        let url = `/api/admin/relatorios/usuario/${usuarioId}?periodo=${periodo || 'mes'}`;
        if (dataInicio) url += `&data_inicio=${dataInicio}`;
        if (dataFim) url += `&data_fim=${dataFim}`;
        return this.req('GET', url);
    }
    relatorioPeriodo(periodo, dataInicio, dataFim) {
        let url = `/api/admin/relatorios/periodo?periodo=${periodo}`;
        if (dataInicio) url += `&data_inicio=${dataInicio}`;
        if (dataFim) url += `&data_fim=${dataFim}`;
        return this.req('GET', url);
    }
    relatorioVeiculo(veiculoId, periodo, dataInicio, dataFim) {
        let url = `/api/admin/relatorios/veiculo/${veiculoId}?periodo=${periodo}`;
        if (dataInicio) url += `&data_inicio=${dataInicio}`;
        if (dataFim) url += `&data_fim=${dataFim}`;
        return this.req('GET', url);
    }
    getFotosUsuario(usuarioId) { return this.req('GET', `/api/admin/fotos/${usuarioId}`); }
    
    // FOTOS
    async uploadFoto(coletaId, arquivo) {
        try {
            console.log(`[API] Preparando upload - Coleta: ${coletaId}, Arquivo: ${arquivo.name} (${arquivo.size} bytes)`);
            
            const formData = new FormData();
            formData.append('file', arquivo);
            
            const opts = { 
                method: 'POST',
                headers: {
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                body: formData
            };
            
            console.log(`[API] POST ${this.base}/api/coleta/${coletaId}/upload-foto`);
            console.log(`[API] FormData enviado com arquivo: ${arquivo.name} (${arquivo.type})`);
            
            const res = await fetch(this.base + `/api/coleta/${coletaId}/upload-foto`, opts);
            
            console.log(`[API] Resposta recebida: ${res.status} ${res.statusText}`);
            
            if (!res.ok) {
                let err;
                try {
                    err = await res.json();
                } catch {
                    err = { detail: await res.text() };
                }
                console.error(`[API ERROR] ${res.status}`, err);
                throw new Error(err.detail || `Erro HTTP ${res.status}`);
            }
            
            const resultado = await res.json();
            console.log(`[API] Upload bem-sucedido:`, resultado);
            return resultado;
        } catch (e) {
            console.error(`[API] Erro no upload:`, e.message);
            throw e;
        }
    }

    async editarKmColeta(coletaId, kmRetirada, kmDevolucao) {
        const res = await fetch(this.base + `/api/admin/coleta/${coletaId}/editar-km`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({
                km_retirada: kmRetirada,
                km_devolucao: kmDevolucao
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Erro ao editar KM' }));
            throw new Error(err.detail);
        }
        return await res.json();
    }
}

const api = new API();
