let user = null;
let coleta = null;

// NOTIFICAÇÕES
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function atualizarBotaoFoto(gridId, idx, file) {
    const grid = document.getElementById(gridId);
    const botao = grid.children[idx];
    
    if (file) {
        botao.classList.add('filled');
        botao.title = file.name;
    } else {
        botao.classList.remove('filled');
        botao.title = '';
    }
}

function showWelcome(nome) {
    const popup = document.createElement('div');
    popup.className = 'welcome-popup';
    popup.innerHTML = `<div>Olá!</div><div class="user-name">${nome}</div>`;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 2000);
}

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
        user = JSON.parse(userData);
        api.setToken(token);
        await mostrarTela();
    } else {
        mostrarLogin();
    }

    // LISTENERS
    document.getElementById('loginForm').addEventListener('submit', login);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('logoutBtn2').addEventListener('click', logout);
    document.getElementById('formRetirada').addEventListener('submit', retirar);
    document.getElementById('formDevolucao').addEventListener('submit', devolver);
    document.getElementById('km_devolucao').addEventListener('input', calcKm);
    document.getElementById('formNovoUsuario').addEventListener('submit', criarUsuario);
    document.getElementById('formNovoVeiculo').addEventListener('submit', criarVeiculo);
    
    // Listeners para inputs de foto
    document.querySelectorAll('.photo-input').forEach((input, idx) => {
        input.addEventListener('change', (e) => atualizarBotaoFoto('photosGridRetirada', idx, e.target.files[0]));
    });
    
    document.querySelectorAll('.photo-input-devolucao').forEach((input, idx) => {
        input.addEventListener('change', (e) => atualizarBotaoFoto('photosGridDevolucao', idx, e.target.files[0]));
    });
});

async function login(e) {
    e.preventDefault();
    const id = document.getElementById('usuario_id').value;
    const senha = document.getElementById('senha').value;
    
    if (!id || !senha) {
        alert('Preencha todos os campos');
        return;
    }
    
    try {
        console.log('Tentando login:', id);
        const res = await api.login(id, senha);
        console.log('Login sucesso:', res);
        api.setToken(res.access_token);
        user = { id: res.usuario_id, nome: res.usuario_nome, admin: res.is_admin };
        localStorage.setItem('user', JSON.stringify(user));
        console.log('Mostrando tela...');
        showWelcome(res.usuario_nome);
        await mostrarTela();
    } catch (e) {
        console.error('Erro login:', e);
        document.getElementById('loginError').textContent = 'Erro: ' + e.message;
        document.getElementById('loginError').classList.add('show');
    }
}

function logout() {
    localStorage.clear();
    user = coleta = null;
    location.reload();
}

function mostrarLogin() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById('loginScreen').classList.add('active');
}

async function mostrarTela() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    
    if (user.admin) {
        document.getElementById('adminScreen').classList.add('active');
        carregarUsuarios();
        carregarVeiculosAdmin();
        carregarRelatorios();
        carregarUsuariosFotos();
    } else {
        try {
            coleta = await api.ativa();
            if (coleta) {
                mostraDevol();
            } else {
                mostraRet();
            }
        } catch {
            mostraRet();
        }
        document.getElementById('motoristaScreen').classList.add('active');
        carregarVeiculos();
    }
}

// MOTORISTA
function mostraRet() {
    document.getElementById('painelRetirada').style.display = 'block';
    document.getElementById('painelDevolucao').style.display = 'none';
}

function mostraDevol() {
    document.getElementById('painelRetirada').style.display = 'none';
    document.getElementById('painelDevolucao').style.display = 'block';
    document.getElementById('veiculo_info').textContent = coleta.veiculo.placa;
    document.getElementById('km_retirada_info').textContent = coleta.km_retirada + ' km';
    document.getElementById('obs_retirada_info').textContent = coleta.observacoes_retirada || '-';
}

async function carregarVeiculos() {
    try {
        const veics = await api.getVeiculos();
        const sel = document.getElementById('veiculo');
        sel.innerHTML = '<option value="">-- Selecione --</option>';
        veics.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.placa} - ${v.marca} ${v.modelo}`;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error(e);
    }
}

async function retirar(e) {
    e.preventDefault();
    const veiculo_id = document.getElementById('veiculo').value;
    const km = document.getElementById('km').value;
    const obs = document.getElementById('observacoes').value;
    
    if (!veiculo_id) return alert('Selecione um veículo');
    
    try {
        console.log('Retirar:', { veiculo_id, km, obs });
        coleta = await api.retirar(veiculo_id, km, obs);
        console.log('Coleta retornada:', coleta);
        
        // Fazer upload das fotos da retirada
        const fotoInputs = document.querySelectorAll('.photo-input');
        let fotosUpload = 0;
        let fotosErro = 0;
        
        for (let input of fotoInputs) {
            if (input.files && input.files[0]) {
                try {
                    await api.uploadFoto(coleta.id, input.files[0]);
                    fotosUpload++;
                    showNotification(`📸 ${input.files[0].name} carregado com sucesso!`, 'success');
                    console.log('Foto enviada:', input.files[0].name);
                } catch (e) {
                    fotosErro++;
                    showNotification(`Erro ao enviar ${input.files[0].name}`, 'error');
                    console.error('Erro ao enviar foto:', e);
                }
            }
        }
        
        mostraDevol();
        document.getElementById('formRetirada').reset();
        
        if (fotosUpload > 0) {
            showNotification(`✓ ${fotosUpload} foto(s) carregada(s)!`, 'success');
            console.log('Retirada: ' + fotosUpload + ' fotos enviadas');
        }
        if (fotosErro > 0) {
            showNotification(`⚠ ${fotosErro} foto(s) falharam`, 'error');
        }
    } catch (e) {
        console.error('Erro retirada:', e);
        showNotification('Erro: ' + e.message, 'error');
    }
}

function calcKm() {
    if (!coleta) return;
    const kmDev = parseFloat(document.getElementById('km_devolucao').value) || 0;
    const kmRet = parseFloat(coleta.km_retirada) || 0;
    if (kmDev >= kmRet) {
        document.getElementById('kmRodado').style.display = 'block';
        document.getElementById('kmRodadoValor').textContent = (kmDev - kmRet).toFixed(1);
    }
}

async function devolver(e) {
    e.preventDefault();
    const km = document.getElementById('km_devolucao').value;
    const obs = document.getElementById('obs_devolucao').value;
    
    console.log('=== DEVOLVER ===');
    console.log('Coleta object:', coleta);
    console.log('Coleta ID:', coleta?.id);
    console.log('Coleta ID type:', typeof coleta?.id);
    console.log('KM:', km, 'Obs:', obs);
    
    if (!km || parseFloat(km) < parseFloat(coleta.km_retirada)) {
        return alert('KM final inválido');
    }
    
    if (!confirm('Confirmar devolução?')) return;
    
    try {
        console.log('Chamando API devolver com:', coleta.id, km, obs);
        const res = await api.devolver(coleta.id, km, obs);
        console.log('Devolução realizada:', res);
        
        // Fazer upload das fotos
        const fotoInputs = document.querySelectorAll('.photo-input-devolucao');
        let fotosUpload = 0;
        let fotosErro = 0;
        
        for (let input of fotoInputs) {
            if (input.files && input.files[0]) {
                try {
                    await api.uploadFoto(coleta.id, input.files[0]);
                    fotosUpload++;
                    showNotification(`📸 ${input.files[0].name} carregado com sucesso!`, 'success');
                    console.log('Foto enviada:', input.files[0].name);
                } catch (e) {
                    fotosErro++;
                    showNotification(`Erro ao enviar ${input.files[0].name}`, 'error');
                    console.error('Erro ao enviar foto:', e);
                }
            }
        }
        
        coleta = null;
        document.getElementById('formDevolucao').reset();
        mostraRet();
        await carregarVeiculos();
        
        if (fotosUpload > 0 || fotosErro === 0) {
            showNotification('✓ Veículo devolvido com sucesso!', 'success');
        }
        if (fotosUpload > 0) {
            showNotification(`📷 ${fotosUpload} foto(s) carregada(s)!`, 'success');
        }
        if (fotosErro > 0) {
            showNotification(`⚠ ${fotosErro} foto(s) falharam`, 'error');
        }
    } catch (e) {
        console.error('Erro devolução:', e);
        showNotification('Erro: ' + e.message, 'error');
    }
}

// ADMIN
function switchTab(idx) {
    const tabs = document.querySelectorAll('.tab-content');
    const btns = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    btns.forEach(b => b.classList.remove('active'));
    tabs[idx].classList.add('active');
    btns[idx].classList.add('active');
}

async function carregarUsuarios() {
    try {
        const users = await api.usuarios();
        const div = document.getElementById('listaUsuarios');
        div.innerHTML = '';
        users.forEach(u => {
            div.innerHTML += `
                <div class="list-item">
                    <div class="list-item-info">
                        <strong>${u.usuario_id}</strong> - ${u.nome}
                        ${u.is_admin ? '<span class="badge">Admin</span>' : ''}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-small" onclick="editarUsuario('${u.usuario_id}')">Editar</button>
                        <button class="btn btn-small btn-danger" onclick="delUsuario('${u.usuario_id}')">Deletar</button>
                    </div>
                </div>
            `;
        });
    } catch (e) { console.error(e); }
}

async function criarUsuario(e) {
    e.preventDefault();
    const id = document.getElementById('novo_usuario_id').value;
    const nome = document.getElementById('novo_usuario_nome').value;
    const senha = document.getElementById('novo_usuario_senha').value;
    const admin = document.getElementById('novo_usuario_admin').checked;
    
    try {
        await api.criarUsuario(id, nome, senha, admin);
        document.getElementById('formNovoUsuario').reset();
        await carregarUsuarios();
        alert('Usuário criado!');
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function editarUsuario(id) {
    // Buscar dados do usuário atual
    const usuarios = await api.usuarios();
    const usuario = usuarios.find(u => u.usuario_id === id);
    if (!usuario) {
        alert('Usuário não encontrado');
        return;
    }

    // Criar modal de edição
    const modalHTML = `
        <div class="modal-overlay" id="editModal" onclick="fecharModalEdicao(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>Editar Usuário: ${usuario.nome}</h3>
                <div class="form-group">
                    <label>Nova Senha (deixe em branco para não alterar):</label>
                    <input type="password" id="editSenha" placeholder="Nova senha">
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="editAdmin" ${usuario.is_admin ? 'checked' : ''}>
                        <span>Tornar Admin</span>
                    </label>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="salvarEdicaoUsuario('${id}')">Salvar</button>
                    <button class="btn" onclick="fecharModalEdicao()">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function salvarEdicaoUsuario(id) {
    const novaSenha = document.getElementById('editSenha').value;
    const novoAdmin = document.getElementById('editAdmin').checked;
    
    try {
        if (novaSenha) {
            await api.alterarSenha(id, novaSenha);
        }
        await api.atualizarPrivilegio(id, novoAdmin);
        alert('Usuário atualizado!');
        fecharModalEdicao();
        await carregarUsuarios();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

function fecharModalEdicao(event) {
    if (event && event.target.id !== 'editModal') return;
    const modal = document.getElementById('editModal');
    if (modal) modal.remove();
}

async function delUsuario(id) {
    if (!confirm('Deletar usuário?')) return;
    try {
        await api.deletarUsuario(id);
        await carregarUsuarios();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function carregarVeiculosAdmin() {
    try {
        const veics = await api.veiculos();
        const div = document.getElementById('listaVeiculos');
        div.innerHTML = '';
        veics.forEach(v => {
            div.innerHTML += `
                <div class="list-item">
                    <div class="list-item-info">
                        <strong>${v.placa}</strong> - ${v.marca} ${v.modelo} (${v.ano})
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-small btn-danger" onclick="delVeiculo(${v.id})">Deletar</button>
                    </div>
                </div>
            `;
        });
    } catch (e) { console.error(e); }
}

async function criarVeiculo(e) {
    e.preventDefault();
    const placa = document.getElementById('novo_veiculo_placa').value;
    const marca = document.getElementById('novo_veiculo_marca').value;
    const modelo = document.getElementById('novo_veiculo_modelo').value;
    const ano = document.getElementById('novo_veiculo_ano').value;
    
    try {
        await api.criarVeiculo(placa, marca, modelo, ano);
        document.getElementById('formNovoVeiculo').reset();
        await carregarVeiculosAdmin();
        alert('Veículo criado!');
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function delVeiculo(id) {
    if (!confirm('Deletar veículo?')) return;
    try {
        await api.deletarVeiculo(id);
        await carregarVeiculosAdmin();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

let relatorioData = null;
let relatorioPeriodoAtivo = 'dia';
let usuarioSelecionado = null;
let usuariosDisponiveis = [];
let fotosUsuarioSelecionado = null;

async function carregarUsuariosFotos() {
    try {
        const select = document.getElementById('filtroUsuarioFotos');
        if (!select) return;
        const users = await api.usuarios();
        select.innerHTML = '<option value="">-- Escolha um usuário --</option>';
        users.forEach(u => {
            select.innerHTML += `<option value="${u.usuario_id}">${u.usuario_id} - ${u.nome}</option>`;
        });
    } catch (e) {
        console.error('Erro ao carregar usuários para fotos:', e);
        const container = document.getElementById('fotos-container');
        if (container) container.innerHTML = '<p style="color: red;">Erro ao carregar usuários</p>';
    }
}

async function handleUsuarioFotosChange() {
    const select = document.getElementById('filtroUsuarioFotos');
    const container = document.getElementById('fotos-container');
    const usuarioId = select?.value;
    fotosUsuarioSelecionado = usuarioId || null;

    if (!usuarioId) {
        container.innerHTML = '<p>Selecione um usuário para ver as fotos.</p>';
        return;
    }

    container.innerHTML = '<p>Carregando fotos...</p>';
    try {
        const dados = await api.getFotosUsuario(usuarioId);
        renderizarFotosPorDia(dados);
    } catch (e) {
        console.error('Erro ao buscar fotos:', e);
        container.innerHTML = '<p style="color: red;">Erro ao carregar fotos: ' + e.message + '</p>';
    }
}

function renderizarFotosPorDia(dados) {
    const container = document.getElementById('fotos-container');
    if (!container) return;
    if (!dados?.fotos_por_dia || dados.fotos_por_dia.length === 0) {
        container.innerHTML = '<p>Nenhuma foto encontrada para este usuário.</p>';
        return;
    }

    const formatarData = (iso) => new Date(iso).toLocaleDateString('pt-BR');
    const formatarHora = (iso) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
    const etapaLabel = (etapa) => etapa === 'saida' ? 'Saída' : etapa === 'retorno' ? 'Retorno' : (etapa || '');

    let html = `<div class="fotos-header">Mostrando fotos de ${dados.usuario_nome} (${dados.usuario_id})</div>`;
    dados.fotos_por_dia.forEach(dia => {
        html += `<div class="foto-dia"><h3>${formatarData(dia.data)}</h3><div class="fotos-grid">`;
        dia.fotos.forEach(foto => {
            const imgUrl = `${api.base}/uploads/${foto.caminho}`;
            const horario = formatarHora(foto.criado_em || foto.data_upload);
            const etapa = etapaLabel(foto.etapa);
            html += `
                <div class="foto-card">
                    <img src="${imgUrl}" alt="Foto ${etapa}" loading="lazy" onclick="openFotoModal('${imgUrl}')" />
                    <div class="foto-meta">
                        <span>${etapa}</span>
                        <span>${horario}</span>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    });

    container.innerHTML = html;
}

function openFotoModal(url) {
    const modal = document.getElementById('fotoModal');
    const img = document.getElementById('fotoModalImg');
    if (!modal || !img) return;
    img.src = url;
    modal.classList.add('open');
}

function closeFotoModal(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('fotoModal');
    const img = document.getElementById('fotoModalImg');
    if (modal) modal.classList.remove('open');
    if (img) img.src = '';
}

document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') closeFotoModal();
});

async function carregarRelatorios() {
    try {
        console.log('Carregando relatórios...');
        
        // Aguardar o elemento estar pronto
        let select = document.getElementById('filtroUsuario');
        let tentativas = 0;
        while (!select && tentativas < 10) {
            console.log('Aguardando elemento filtroUsuario...', tentativas);
            await new Promise(r => setTimeout(r, 100));
            select = document.getElementById('filtroUsuario');
            tentativas++;
        }
        
        if (!select) {
            console.error('Elemento filtroUsuario não encontrado após espera!');
            return;
        }
        
        // Carregar usuários para o filtro - a API retorna Array direto, não objeto
        const users = await api.usuarios();
        console.log('Usuários carregados:', users);
        usuariosDisponiveis = Array.isArray(users) ? users : (users.usuarios || []);
        console.log('Usuários disponíveis:', usuariosDisponiveis);
        
        select.innerHTML = '<option value="">-- Ver Todos os Veículos --</option>';
        usuariosDisponiveis.forEach(u => {
            console.log('Adicionando usuário:', u.usuario_id, u.nome);
            select.innerHTML += `<option value="${u.usuario_id}">${u.usuario_id} - ${u.nome}</option>`;
        });
        console.log('Dropdown preenchido com', usuariosDisponiveis.length, 'usuários');
        
        // Carregar relatório geral
        const rel = await api.relatorios();
        relatorioData = rel.relatorio || [];
        exibirRelatorios('dia');
    } catch (e) { 
        console.error('Erro em carregarRelatorios:', e);
        const container = document.getElementById('relatorio-container');
        if (container) {
            container.innerHTML = '<p style="color: red;">Erro ao carregar relatórios: ' + e.message + '</p>';
        }
    }
}

async function handleUsuarioChange() {
    const select = document.getElementById('filtroUsuario');
    usuarioSelecionado = select.value || null;
    
    if (usuarioSelecionado) {
        try {
            const rel = await api.relatorioUsuario(usuarioSelecionado);
            relatorioData = rel.uso_por_veiculo || [];
            document.getElementById('relatorio-container').innerHTML = '';
            exibirRelatorioUsuario(rel);
        } catch (e) {
            console.error(e);
            document.getElementById('relatorio-container').innerHTML = '<p style="color: red;">Erro ao carregar dados do usuário</p>';
        }
    } else {
        // Recarregar relatório geral
        const rel = await api.relatorios();
        relatorioData = rel.relatorio || [];
        exibirRelatorios('dia');
    }
}

function exibirRelatorioUsuario(dados) {
    const div = document.getElementById('relatorio-container');
    div.innerHTML = '';
    
    let html = `
        <div class="usuario-relatorio-header">
            <h3>${dados.usuario_nome} (${dados.usuario_id})</h3>
            <div class="usuario-stats">
                <div class="stat-box">
                    <span class="stat-label">Total KM (Mês)</span>
                    <span class="stat-value">${dados.total_km_mes.toFixed(2)} km</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Total KM (Geral)</span>
                    <span class="stat-value">${dados.total_km.toFixed(2)} km</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Retiradas</span>
                    <span class="stat-value">${dados.total_retiradas}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Veículos Usados</span>
                    <span class="stat-value">${dados.total_veiculos_utilizados}</span>
                </div>
            </div>
        </div>
    `;
    
    dados.uso_por_veiculo.forEach(veiculo => {
        html += `
            <div class="veiculo-uso-card">
                <div class="veiculo-uso-header">
                    <h4>${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}</h4>
                </div>
                <div class="veiculo-uso-stats">
                    <div class="uso-stat">
                        <span class="uso-label">KM Total:</span>
                        <span class="uso-value">${veiculo.km_total.toFixed(2)} km</span>
                    </div>
                    <div class="uso-stat">
                        <span class="uso-label">KM Mês:</span>
                        <span class="uso-value">${veiculo.km_mes.toFixed(2)} km</span>
                    </div>
                    <div class="uso-stat">
                        <span class="uso-label">Retiradas:</span>
                        <span class="uso-value">${veiculo.total_retiradas}</span>
                    </div>
                </div>
                <div class="usos-lista">
        `;
        
        if (veiculo.usos && veiculo.usos.length > 0) {
            veiculo.usos.forEach((uso, idx) => {
                const dataRetirada = uso.data_retirada ? new Date(uso.data_retirada).toLocaleDateString('pt-BR') : '-';
                html += `
                    <div class="uso-item">
                        <span class="uso-numero">#${idx + 1}</span>
                        <span class="uso-data">${dataRetirada}</span>
                        <span class="uso-km">${uso.km_rodado} km</span>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
    });
    
    div.innerHTML = html;
}

function switchRelatorioPeriodo(periodo) {
    relatorioPeriodoAtivo = periodo;
    document.querySelectorAll('.relatorio-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    exibirRelatorios(periodo);
}

function exibirRelatorios(periodo) {
    const div = document.getElementById('relatorio-container');
    div.innerHTML = '';
    
    if (!relatorioData || relatorioData.length === 0) {
        div.innerHTML = '<p>Nenhum dado disponível</p>';
        return;
    }
    
    const periodoLabel = {
        'dia': 'Hoje',
        'semana': 'Última Semana',
        'mes': 'Último Mês',
        'total': 'Total'
    };
    
    const chaveKm = {
        'dia': 'km_hoje',
        'semana': 'km_semana',
        'mes': 'km_mes',
        'total': 'km_total'
    };
    
    let kmTotal = 0;
    let html = `<div class="relatorio-header">Período: ${periodoLabel[periodo]}</div>`;
    
    relatorioData.forEach(r => {
        const km = r[chaveKm[periodo]] || 0;
        kmTotal += km;
        
        html += `
            <div class="relatorio-card">
                <div class="relatorio-card-header">
                    <strong>${r.placa}</strong>
                    <span class="relatorio-marca">${r.marca} ${r.modelo}</span>
                </div>
                <div class="relatorio-card-km">
                    <span class="km-value">${km.toFixed(2)}</span>
                    <span class="km-label">km rodados</span>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="relatorio-total">
            <strong>Total ${periodoLabel[periodo]}:</strong>
            <span class="total-value">${kmTotal.toFixed(2)} km</span>
        </div>
    `;
    
    div.innerHTML = html;
}
