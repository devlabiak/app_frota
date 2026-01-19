// App Principal
let currentUser = null;
let fotosAdicionadas = [];

async function initApp() {
    // Inicializar banco de dados offline
    await offlineDB.init();

    // Restaurar sessão
    const token = localStorage.getItem('token');
    const usuarioJSON = localStorage.getItem('usuario');

    if (token && usuarioJSON) {
        try {
            currentUser = JSON.parse(usuarioJSON);
            api.setToken(token);
            mostrarMenu();
        } catch (error) {
            logout();
        }
    } else {
        mostrarLogin();
    }

    // Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('js/sw.js').catch(err => console.log('SW error:', err));
    }
    
    // Inicializar listeners de viagem
    inicializarViagenListeners();
}

function mostrarLogin() {
    showScreen('loginScreen');
}

function mostrarMenu() {
    if (currentUser?.is_admin) {
        showScreen('adminScreen');
    } else {
        showScreen('coletaScreen');
        verificarColetaAtiva();
    }
    atualizarStatusSincronizacao();
}

async function verificarColetaAtiva() {
    try {
        const coleta = await api.getColetaAtiva();
        coletaAtiva = coleta;
        
        // Se há coleta ativa, ir para devolução
        if (coleta && coleta.ativo) {
            irParaDevolucao();
        } else {
            // Carregar veículos normalmente
            carregarVeiculosDisponiveis();
        }
    } catch (error) {
        // Sem coleta ativa, carregar veículos
        console.log('Sem coleta ativa');
        carregarVeiculosDisponiveis();
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function backToMenu() {
    fotosAdicionadas = [];
    // Redirecionar de acordo com o tipo de usuário
    if (currentUser?.is_admin) {
        showScreen('adminScreen');
    } else {
        showScreen('coletaScreen');
    }
}

// Login
async function handleLogin(event) {
    event.preventDefault();
    const usuario_id = document.getElementById('usuario_id').value;
    const senha = document.getElementById('senha').value;
    const errorDiv = document.getElementById('loginError');

    try {
        errorDiv.classList.remove('show');
        const response = await api.login(usuario_id, senha);

        api.setToken(response.access_token);
        currentUser = {
            id: response.usuario_id,
            usuario_id: usuario_id,
            nome: response.usuario_nome,
            is_admin: response.is_admin
        };

        localStorage.setItem('usuario', JSON.stringify(currentUser));
        localStorage.setItem('token', response.access_token);

        document.getElementById('loginForm').reset();
        
        // Redirecionar de acordo com o tipo de usuário
        if (currentUser.is_admin) {
            showScreen('adminScreen');
        } else {
            showScreen('coletaScreen');
            verificarColetaAtiva();
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Erro ao fazer login';
        errorDiv.classList.add('show');
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    currentUser = null;
    fotosAdicionadas = [];
    document.getElementById('loginForm').reset();
    mostrarLogin();
}

document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('logoutBtn2')?.addEventListener('click', logout);

// Fotos
function addFoto() {
    document.getElementById('fotoInput').click();
}

document.getElementById('fotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (fotosAdicionadas.length >= 5) {
        alert('Máximo de 5 fotos permitidas');
        return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onload = (event) => {
        const foto = {
            data: event.target.result,
            name: file.name,
            timestamp: new Date().getTime()
        };
        fotosAdicionadas.push(foto);
        renderFotos();
    };
    reader.readAsDataURL(file);
});

function renderFotos() {
    const container = document.getElementById('fotosList');
    container.innerHTML = '';

    fotosAdicionadas.forEach((foto, index) => {
        const div = document.createElement('div');
        div.className = 'foto-item';
        div.innerHTML = `
            <img src="${foto.data}" alt="Foto">
            <button type="button" onclick="removerFoto(${index})">X</button>
        `;
        container.appendChild(div);
    });
}

function removerFoto(index) {
    fotosAdicionadas.splice(index, 1);
    renderFotos();
}

// Adicionar foto na etapa
function addFotoEtapa() {
    document.getElementById('fotoInputEtapa').click();
}

document.getElementById('fotoInputEtapa')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (fotosAdicionadas.length >= 5) {
        alert('Máximo de 5 fotos permitidas');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const foto = {
            data: event.target.result,
            name: file.name,
            timestamp: new Date().getTime()
        };
        fotosAdicionadas.push(foto);
        renderFotosEtapa();
    };
    reader.readAsDataURL(file);
});

function renderFotosEtapa() {
    const container = document.getElementById('fotosListaEtapa');
    container.innerHTML = '';

    fotosAdicionadas.forEach((foto, index) => {
        const div = document.createElement('div');
        div.className = 'foto-item';
        div.innerHTML = `
            <img src="${foto.data}" alt="Foto">
            <button type="button" onclick="removerFotoEtapa(${index})">X</button>
        `;
        container.appendChild(div);
    });
}

function removerFotoEtapa(index) {
    fotosAdicionadas.splice(index, 1);
    renderFotosEtapa();
}

// Avarias
function toggleAvaria(checkbox) {
    const container = document.getElementById('observacoesContainer');
    const temAvaria = document.querySelectorAll('input[name="avaria"]:checked').length > 0;
    
    if (temAvaria) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// Salvar Coleta
document.getElementById('coletaForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const veiculo_id = document.getElementById('veiculo_id').value;
    const km = parseFloat(document.getElementById('km').value);

    if (!veiculo_id) {
        alert('Por favor, selecione um veículo');
        return;
    }

    try {
        // Preparar dados da etapa de saída
        const etapaData = {
            horario: new Date().toISOString(),
            km: km,
            observacoes: document.getElementById('observacoes')?.value || '',
            fotos: fotosAdicionadas
        };

        // Enviar para o backend
        const response = await api.iniciarColeta(veiculo_id, etapaData);
        
        alert('Coleta iniciada! Veículo registrado para saída.');
        document.getElementById('coletaForm').reset();
        document.getElementById('veiculoDetalhes').classList.add('hidden');
        fotosAdicionadas = [];
        renderFotos();
        carregarVeiculosDisponiveis();
        
    } catch (error) {
        alert('Erro ao iniciar coleta: ' + error.message);
    }
});

async function sincronizarColeta(id, coleta) {
    try {
        const coletaData = {
            veiculo_id: coleta.veiculo_id,
            km: coleta.km,
            avarias: coleta.avarias
        };

        const response = await api.criarColeta(coletaData);

        // Upload de fotos
        for (let foto of coleta.fotos) {
            // Converter data URL para blob
            const blob = await fetch(foto.data).then(r => r.blob());
            const file = new File([blob], foto.name, { type: 'image/jpeg' });
            await api.uploadFoto(response.id, file);
        }

        await offlineDB.updateColeta(id, { ...coleta, sincronizado: true });
    } catch (error) {
        console.log('Erro na sincronização:', error);
    }
}

// Histórico
function loadHistorico() {
    showScreen('historicoScreen');
    renderHistorico();
}

async function renderHistorico() {
    const coletas = await offlineDB.getColetas();
    const container = document.getElementById('historicoList');
    container.innerHTML = '';

    if (coletas.length === 0) {
        container.innerHTML = '<p style="text-align: center; margin-top: 20px;">Nenhuma coleta realizada</p>';
        return;
    }

    coletas.reverse().forEach(coleta => {
        const div = document.createElement('div');
        div.className = `coleta-card ${coleta.sincronizado ? 'sincronizado' : 'pendente'}`;
        
        const data = new Date(coleta.criadoEm).toLocaleDateString('pt-BR');
        
        div.innerHTML = `
            <h3>Veículo: ${coleta.veiculo_id}</h3>
            <p><strong>KM:</strong> ${coleta.km}</p>
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Fotos:</strong> ${coleta.fotos?.length || 0}</p>
            <p><strong>Avarias:</strong> ${coleta.avarias?.length || 0}</p>
        `;
        
        container.appendChild(div);
    });
}

// Admin
function switchAdminTab(tab) {
    console.log('Switching to tab:', tab);
    console.log('All tabs:', document.querySelectorAll('.admin-tab').length);
    console.log('Tab element exists:', document.getElementById(tab + 'Tab'));
    
    document.querySelectorAll('.admin-tab').forEach(t => {
        console.log('Removing active from tab:', t.id);
        t.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const targetTab = document.getElementById(tab + 'Tab');
    console.log('Target tab:', targetTab);
    if (targetTab) {
        targetTab.classList.add('active');
    } else {
        console.error('Tab not found:', tab + 'Tab');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (tab === 'relatorios') {
        gerarRelatorio();
    } else if (tab === 'usuarios') {
        listarUsuarios();
    } else if (tab === 'veiculos') {
        console.log('Carregando veículos...');
        listarVeiculos();
    }
}

document.getElementById('newUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuario_id = document.getElementById('newUserId').value;
    const nome = document.getElementById('newUserName').value;
    const senha = document.getElementById('newUserPassword').value;
    const is_admin = document.getElementById('newUserAdmin').checked;

    try {
        await api.criarUsuario({ usuario_id, nome, senha, is_admin });
        alert('Usuário criado com sucesso!');
        document.getElementById('newUserForm').reset();
        listarUsuarios();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
});

async function listarUsuarios() {
    try {
        const usuarios = await api.listarUsuarios();
        const container = document.getElementById('usuariosList');
        container.innerHTML = '';

        usuarios.forEach(usuario => {
            const div = document.createElement('div');
            div.className = 'coleta-card';
            const data = new Date(usuario.criado_em).toLocaleDateString('pt-BR');
            
            div.innerHTML = `
                <h3>${usuario.nome}</h3>
                <p><strong>ID:</strong> ${usuario.usuario_id}</p>
                <p><strong>Cadastrado:</strong> ${data}</p>
                <p><strong>Tipo:</strong> ${usuario.is_admin ? 'Administrador' : 'Motorista'}</p>
                <p><strong>Status:</strong> ${usuario.ativo ? 'Ativo' : 'Inativo'}</p>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
    }
}

// Veículos
document.getElementById('newVehicleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const placa = document.getElementById('newVehiclePlaca').value.toUpperCase();
    const marca = document.getElementById('newVehicleMarca').value;
    const modelo = document.getElementById('newVehicleModelo').value;
    const ano = parseInt(document.getElementById('newVehicleAno').value);

    try {
        await api.criarVeiculo({ placa, marca, modelo, ano });
        alert('Veículo cadastrado com sucesso!');
        document.getElementById('newVehicleForm').reset();
        listarVeiculos();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
});

async function listarVeiculos() {
    try {
        const veiculos = await api.listarVeiculos();
        const container = document.getElementById('vehiclesList');
        container.innerHTML = '';

        if (veiculos.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhum veículo cadastrado</p>';
            return;
        }

        veiculos.forEach(veiculo => {
            const div = document.createElement('div');
            div.className = 'coleta-card';
            const data = new Date(veiculo.criado_em).toLocaleDateString('pt-BR');
            
            div.innerHTML = `
                <h3>${veiculo.marca} ${veiculo.modelo}</h3>
                <p><strong>Placa:</strong> ${veiculo.placa}</p>
                <p><strong>Ano:</strong> ${veiculo.ano}</p>
                <p><strong>Cadastrado:</strong> ${data}</p>
                <p><strong>Status:</strong> ${veiculo.ativo ? 'Ativo' : 'Inativo'}</p>
                <button onclick="deletarVeiculo(${veiculo.id})" class="btn btn-danger" style="margin-top: 10px; width: 100%;">🗑️ Deletar Veículo</button>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao listar veículos:', error);
    }
}

async function deletarVeiculo(veiculo_id) {
    if (!confirm('Tem certeza que deseja deletar este veículo?')) {
        return;
    }
    
    try {
        await api.deletarVeiculo(veiculo_id);
        alert('Veículo deletado com sucesso!');
        listarVeiculos();
    } catch (error) {
        alert('Erro ao deletar: ' + error.message);
    }
}

async function gerarRelatorio() {
    try {
        const relatorio = await api.getRelatorios();
        const relatorioDetalhado = await api.getRelatoriosDetalhado();
        const container = document.getElementById('relatorioContent');
        
        let html = `
            <h2>📊 Estatísticas Gerais</h2>
            <div class="relatorio-stats">
                <div class="relatorio-stat">
                    <span>Total de Coletas:</span>
                    <span class="relatorio-stat-value">${relatorio.total_coletas}</span>
                </div>
                <div class="relatorio-stat">
                    <span>Total de Usuários:</span>
                    <span class="relatorio-stat-value">${relatorio.total_usuarios}</span>
                </div>
                <div class="relatorio-stat">
                    <span>Total de Veículos:</span>
                    <span class="relatorio-stat-value">${relatorio.total_veiculos}</span>
                </div>
                <div class="relatorio-stat">
                    <span>Coletas Sincronizadas:</span>
                    <span class="relatorio-stat-value">${relatorio.coletas_sincronizadas}</span>
                </div>
                <div class="relatorio-stat">
                    <span>Coletas Pendentes:</span>
                    <span class="relatorio-stat-value">${relatorio.coletas_pendentes}</span>
                </div>
            </div>

            <h2 style="margin-top: 30px;">🚗 Relatório por Veículo</h2>
            <div class="relatorio-veiculos">
        `;
        
        // Relatório de veículos
        if (relatorioDetalhado.relatorio_veiculos.length === 0) {
            html += '<p>Nenhum veículo registrado</p>';
        } else {
            relatorioDetalhado.relatorio_veiculos.forEach(veiculo => {
                html += `
                    <div class="relatorio-veiculo-card">
                        <h3>${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}</h3>
                        <div class="km-stats">
                            <div class="km-stat">
                                <span class="km-label">Hoje</span>
                                <span class="km-value">${veiculo.km_hoje} km</span>
                            </div>
                            <div class="km-stat">
                                <span class="km-label">Semana</span>
                                <span class="km-value">${veiculo.km_semana} km</span>
                            </div>
                            <div class="km-stat">
                                <span class="km-label">Mês</span>
                                <span class="km-value">${veiculo.km_mes} km</span>
                            </div>
                            <div class="km-stat">
                                <span class="km-label">Total</span>
                                <span class="km-value">${veiculo.km_total} km</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
            </div>

            <h2 style="margin-top: 30px;">👤 Relatório por Usuário</h2>
            <div class="relatorio-usuarios">
        `;
        
        // Relatório de usuários
        if (relatorioDetalhado.relatorio_usuarios.length === 0) {
            html += '<p>Nenhum usuário registrado</p>';
        } else {
            relatorioDetalhado.relatorio_usuarios.forEach(usuario => {
                html += `
                    <div class="relatorio-usuario-card">
                        <h3>${usuario.usuario_nome} (${usuario.usuario_id})</h3>
                        <p><strong>Total de KM:</strong> ${usuario.total_km} km</p>
                        <p><strong>Total de Coletas:</strong> ${usuario.total_coletas}</p>
                        <div class="coletas-detalhes">
                `;
                
                usuario.coletas.forEach(coleta => {
                    const dataInicio = coleta.data_inicio ? new Date(coleta.data_inicio).toLocaleDateString('pt-BR') : 'N/A';
                    const dataFim = coleta.data_fim ? new Date(coleta.data_fim).toLocaleDateString('pt-BR') : 'Em andamento';
                    
                    html += `
                        <div class="coleta-item">
                            <div class="coleta-info">
                                <span class="coleta-veiculo">${coleta.veiculo_placa} - ${coleta.veiculo_marca} ${coleta.veiculo_modelo}</span>
                                <span class="coleta-km">Total: ${coleta.km} km</span>
                                <span class="coleta-datas">${dataInicio} → ${dataFim}</span>
                            </div>
                            <div class="coleta-etapas">
                    `;
                    
                    // Mostrar cada etapa
                    if (coleta.saida_1.km) {
                        html += `<span class="etapa">S1: ${coleta.saida_1.km}km</span>`;
                    }
                    if (coleta.retorno_1.km) {
                        html += `<span class="etapa">R1: ${coleta.retorno_1.km}km</span>`;
                    }
                    if (coleta.saida_2.km) {
                        html += `<span class="etapa">S2: ${coleta.saida_2.km}km</span>`;
                    }
                    if (coleta.retorno_2.km) {
                        html += `<span class="etapa">R2: ${coleta.retorno_2.km}km</span>`;
                    }
                    if (coleta.saida_3.km) {
                        html += `<span class="etapa">S3: ${coleta.saida_3.km}km</span>`;
                    }
                    if (coleta.retorno_3.km) {
                        html += `<span class="etapa">R3: ${coleta.retorno_3.km}km</span>`;
                    }
                    
                    html += `
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        document.getElementById('relatorioContent').innerHTML = '<p>Erro ao carregar relatório</p>';
    }
}

// Status de Sincronização
function atualizarStatusSincronizacao() {
    const statusDiv = document.getElementById('syncStatus');
    if (!navigator.onLine) {
        statusDiv.textContent = 'Modo Offline';
        statusDiv.classList.add('syncing');
    }
}

// Listeners de conexão
window.addEventListener('online', () => {
    atualizarStatusSincronizacao();
    sincronizarPendentes();
});

window.addEventListener('offline', () => {
    atualizarStatusSincronizacao();
});

async function sincronizarPendentes() {
    const coletas = await offlineDB.getColetasPendentes();
    for (let coleta of coletas) {
        try {
            await sincronizarColeta(coleta.id, coleta);
        } catch (error) {
            console.log('Erro ao sincronizar:', error);
        }
    }
}

// Carregar veículos disponíveis para motoristas
async function carregarVeiculosDisponiveis() {
    try {
        console.log('Carregando veículos disponíveis...');
        // Primeira, verificar se há coleta ativa
        let coletaAtiva = null;
        try {
            coletaAtiva = await api.getColetaAtiva();
            console.log('Coleta ativa encontrada:', coletaAtiva);
        } catch (err) {
            console.log('Nenhuma coleta ativa:', err.message);
            coletaAtiva = null;
        }
        
        if (coletaAtiva) {
            // Mostrar painel de próxima etapa
            console.log('Mostrando painel de viagem ativa');
            document.getElementById('painelNovaColeta').classList.add('hidden');
            document.getElementById('painelViagemAtiva').classList.remove('hidden');
            await atualizarInterfaceColeta();
        } else {
            // Mostrar painel de seleção de veículo
            console.log('Mostrando painel de nova coleta');
            document.getElementById('painelNovaColeta').classList.remove('hidden');
            document.getElementById('painelViagemAtiva').classList.add('hidden');
            
            // Carregar lista de veículos
            const veiculos = await api.listarVeiculosDisponiveis();
            const select = document.getElementById('veiculo_id_retirar');
            select.innerHTML = '<option value="">-- Selecione um veículo --</option>';
            
            if (veiculos.length === 0) {
                select.innerHTML += '<option disabled>Nenhum veículo disponível</option>';
                return;
            }
            
            veiculos.forEach(v => {
                const option = document.createElement('option');
                option.value = v.id;
                option.textContent = `${v.placa} - ${v.marca} ${v.modelo}`;
                option.dataset.marca = v.marca;
                option.dataset.modelo = v.modelo;
                option.dataset.ano = v.ano;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar veículos:', error);
        document.getElementById('painelNovaColeta').classList.remove('hidden');
        document.getElementById('painelViagemAtiva').classList.add('hidden');
    }
}

// Carregar dados do veículo selecionado

// Inicializar app
window.addEventListener('DOMContentLoaded', initApp);
