let user = null;
let coleta = null;

// NOTIFICAÇÕES
function showNotification(message, type = 'info') {
    // Criar container de notificações se não existir
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 2000; display: flex; flex-direction: column; gap: 10px; max-width: 400px;';
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = 'position: relative; top: auto; right: auto;';
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
        // Remover container se vazio
        if (container.children.length === 0) {
            container.remove();
        }
    }, 5000);
}

function atualizarBotaoFoto(gridId, idx, file) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const statusButtons = grid.querySelectorAll('.photo-status');
    const inputs = grid.querySelectorAll('input[type="file"]');
    const btn = statusButtons[idx];
    const input = inputs[idx];
    if (!btn || !input) return;

    if (file) {
        btn.classList.remove('empty');
        btn.classList.add('filled');
        btn.innerHTML = '<span class="icon">📷</span><span class="label">Ver foto</span>';
        try {
            const url = URL.createObjectURL(file);
            btn.onclick = () => openFotoModal(url);
        } catch (e) {
            btn.onclick = null;
        }
    } else {
        btn.classList.remove('filled');
        btn.classList.add('empty');
        btn.innerHTML = '<span class="icon">📷</span><span class="label">Carregar foto</span>';
        btn.onclick = () => input && input.click();
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

function atualizarDisplayUsuario() {
    if (user && user.nome) {
        const display1 = document.getElementById('userDisplay');
        const display2 = document.getElementById('userDisplay2');
        if (display1) display1.textContent = `👤 ${user.nome}`;
        if (display2) display2.textContent = `👤 ${user.nome}`;
    }
}

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
        user = JSON.parse(userData);
        api.setToken(token);
        await mostrarTela();
        atualizarDisplayUsuario();
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

    // Inicializar botões para abrir o seletor/câmera
    const retiradaGrid = document.getElementById('photosGridRetirada');
    if (retiradaGrid) {
        retiradaGrid.querySelectorAll('.photo-row').forEach((row) => {
            const input = row.querySelector('input[type="file"]');
            const btn = row.querySelector('.photo-status');
            if (btn && input) btn.onclick = () => input.click();
        });
    }
    const devolucaoGrid = document.getElementById('photosGridDevolucao');
    if (devolucaoGrid) {
        devolucaoGrid.querySelectorAll('.photo-row').forEach((row) => {
            const input = row.querySelector('input[type="file"]');
            const btn = row.querySelector('.photo-status');
            if (btn && input) btn.onclick = () => input.click();
        });
    }
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
        atualizarDisplayUsuario();
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
    
    // Limpar fotos carregadas anteriormente
    document.querySelectorAll('.photo-input').forEach(input => {
        input.value = '';
    });
    document.querySelectorAll('#photosGridRetirada .photo-status').forEach((btn, idx) => {
        btn.classList.remove('filled');
        btn.classList.add('empty');
        btn.innerHTML = '<span class="icon">📷</span><span class="label">Carregar foto</span>';
        const input = btn.parentElement.querySelector('input[type="file"]');
        if (input) btn.onclick = () => input.click();
    });
}

function mostraDevol() {
    document.getElementById('painelRetirada').style.display = 'none';
    document.getElementById('painelDevolucao').style.display = 'block';
    document.getElementById('veiculo_info').textContent = coleta.veiculo.placa;
    document.getElementById('km_retirada_info').textContent = coleta.km_retirada + ' km';
    document.getElementById('obs_retirada_info').textContent = coleta.observacoes_retirada || '-';

    // Limpar fotos de devolução anteriores
    document.querySelectorAll('.photo-input-devolucao').forEach(input => {
        input.value = '';
    });
    document.querySelectorAll('#photosGridDevolucao .photo-status').forEach((btn) => {
        btn.classList.remove('filled');
        btn.classList.add('empty');
        btn.innerHTML = '<span class="icon">📷</span><span class="label">Carregar foto</span>';
        const input = btn.parentElement.querySelector('input[type="file"]');
        if (input) btn.onclick = () => input.click();
    });
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
    
    // Validar se há pelo menos uma foto e guardar os arquivos em memória
    const fotoInputs = document.querySelectorAll('.photo-input');
    const arquivos = []; // GUARDAR ARQUIVOS AQUI ANTES DE FAZER QUALQUER COISA
    let arquivosSelecionados = 0;
    for (let input of fotoInputs) {
        if (input.files && input.files[0]) {
            arquivos.push(input.files[0]); // Guardar arquivo em memória
            arquivosSelecionados++;
        }
    }
    
    if (arquivosSelecionados === 0) {
        showNotification('⚠️ Selecione pelo menos uma foto para a retirada!', 'error');
        return;
    }
    
    try {
        console.log('Retirar:', { veiculo_id, km, obs });
        coleta = await api.retirar(veiculo_id, km, obs);
        console.log('Coleta retornada:', coleta);
        
        // Fazer upload das fotos da retirada (usando arquivos guardados na memória)
        let fotosUpload = 0;
        let fotosErro = 0;
        
        console.log(`[RETIRADA] Encontradas ${arquivos.length} arquivo(s) na memória`);
        
        for (let arquivo of arquivos) {
            console.log(`[RETIRADA] Tentando enviar arquivo:`, arquivo.name, `(${arquivo.size} bytes, ${arquivo.type})`);
            try {
                console.log(`[RETIRADA] Chamando api.uploadFoto(${coleta.id}, ${arquivo.name})`);
                const resultado = await api.uploadFoto(coleta.id, arquivo);
                console.log(`[RETIRADA] Resultado:`, resultado);
                fotosUpload++;
                console.log('Foto enviada:', arquivo.name);
            } catch (e) {
                fotosErro++;
                console.error('Erro ao enviar foto:', arquivo.name, e);
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
    
    // Validar se há pelo menos uma foto
    const fotoInputs = document.querySelectorAll('.photo-input-devolucao');
    let arquivosSelecionados = 0;
    for (let input of fotoInputs) {
        if (input.files && input.files[0]) {
            arquivosSelecionados++;
        }
    }
    
    if (arquivosSelecionados === 0) {
        showNotification('⚠️ Selecione pelo menos uma foto para a devolução!', 'error');
        return;
    }
    
    // Guardar arquivos em memória ANTES de fazer qualquer coisa
    const arquivos = [];
    for (let input of fotoInputs) {
        if (input.files && input.files[0]) {
            arquivos.push(input.files[0]);
        }
    }
    
    if (!confirm('Confirmar devolução?')) return;
    
    try {
        console.log('Chamando API devolver com:', coleta.id, km, obs);
        const res = await api.devolver(coleta.id, km, obs);
        console.log('Devolução realizada:', res);
        
        // Fazer upload das fotos (usando arquivos guardados em memória)
        let fotosUpload = 0;
        let fotosErro = 0;
        
        console.log(`[DEVOLUÇÃO] Encontrados ${arquivos.length} arquivo(s) na memória`);
        
        for (let arquivo of arquivos) {
            console.log(`[DEVOLUÇÃO] Tentando enviar arquivo:`, arquivo.name, `(${arquivo.size} bytes, ${arquivo.type})`);
            try {
                console.log(`[DEVOLUÇÃO] Chamando api.uploadFoto(${coleta.id}, ${arquivo.name})`);
                const resultado = await api.uploadFoto(coleta.id, arquivo);
                console.log(`[DEVOLUÇÃO] Resultado:`, resultado);
                fotosUpload++;
                console.log('Foto enviada:', arquivo.name);
            } catch (e) {
                fotosErro++;
                console.error('Erro ao enviar foto:', arquivo.name, e);
            }
        }
        
        coleta = null;
        document.getElementById('formDevolucao').reset();
        
        // Limpar estado dos botões de foto após upload
        document.querySelectorAll('#photosGridDevolucao .photo-status').forEach((btn) => {
            btn.classList.remove('filled');
            btn.classList.add('empty');
            btn.innerHTML = '<span class="icon">📷</span><span class="label">Carregar foto</span>';
        });
        
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

    // iso em formato YYYY-MM-DD (sem timezone) vindo já no fuso de SP -> formatar manual para evitar shift
    const formatarData = (iso) => {
        if (!iso) return '-';
        const [y, m, d] = iso.split('-');
        if (!d) return iso;
        return `${d}/${m}/${y}`;
    };
    const formatarHora = (iso) => {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };
    const etapaLabel = (etapa) => etapa === 'saida' ? 'Saída' : etapa === 'retorno' ? 'Retorno' : (etapa || '');

    let html = `<div class="fotos-header">Mostrando fotos de ${dados.usuario_nome} (${dados.usuario_id})</div>`;
    dados.fotos_por_dia.forEach(dia => {
        html += `<div class="foto-dia"><h3>${formatarData(dia.data)}</h3><div class="fotos-grid">`;
        // Ordenar fotos por horário (menor -> maior)
        const fotosOrdenadas = [...(dia.fotos || [])].sort((a, b) => {
            const ta = a?.criado_em || a?.data_upload || 0;
            const tb = b?.criado_em || b?.data_upload || 0;
            const da = ta ? new Date(ta).getTime() : Number.MAX_SAFE_INTEGER;
            const db = tb ? new Date(tb).getTime() : Number.MAX_SAFE_INTEGER;
            return da - db;
        });

        fotosOrdenadas.forEach(foto => {
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
        
        // Carregar relatório padrão (Hoje)
        console.log('Carregando relatório de hoje...');
        await carregarRelatorioPeriodo('hoje');
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
    
    console.log('Usuário selecionado mudou para:', usuarioSelecionado);
    
    // Recarregar o relatório do período ativo com o novo filtro de usuário
    // Verificar qual botão está ativo
    const botaoAtivo = document.querySelector('.periodo-btn.active');
    const periodoAtivo = botaoAtivo ? botaoAtivo.getAttribute('data-period') : 'hoje';
    
    console.log('Recarregando relatório de período:', periodoAtivo);
    await carregarRelatorioPeriodo(periodoAtivo);
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

function abrirFiltroPersonalizado() {
    console.log('Abrindo filtro personalizado');
    const filtroDiv = document.getElementById('filtroPersonalizadoDiv');
    
    if (filtroDiv) {
        // Pré-preencher com datas padrão (últimos 30 dias)
        const hoje = new Date();
        const treintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        document.getElementById('dataFim').value = hoje.toISOString().split('T')[0];
        document.getElementById('dataInicio').value = treintaDiasAtras.toISOString().split('T')[0];
        
        // Mostrar o filtro
        filtroDiv.style.display = 'grid';
        console.log('Filtro personalizado aberto');
    } else {
        console.error('Elemento filtroPersonalizadoDiv não encontrado');
    }
}

function fecharFiltroPersonalizado() {
    const filtroDiv = document.getElementById('filtroPersonalizadoDiv');
    if (filtroDiv) {
        filtroDiv.style.display = 'none';
        console.log('Filtro personalizado fechado');
    }
}

async function carregarRelatorioPeriodo(periodo) {
    try {
        console.log('=== INICIANDO CARREGAMENTO DE RELATÓRIO ===');
        console.log('Período selecionado:', periodo);
        console.log('Usuário selecionado:', usuarioSelecionado);
        
        // Atualizar botões ativos usando data-period
        console.log('Atualizando botões...');
        document.querySelectorAll('.periodo-btn').forEach(btn => {
            const periodo_btn = btn.getAttribute('data-period');
            console.log('Botão:', periodo_btn, 'Match:', periodo_btn === periodo);
            
            if (periodo_btn === periodo) {
                btn.classList.add('active');
                console.log('  ✓ Adicionando classe active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        let dataInicio = null, dataFim = null;
        
        if (periodo === 'personalizado') {
            dataInicio = document.getElementById('dataInicio').value;
            dataFim = document.getElementById('dataFim').value;
            
            console.log('Período personalizado:', dataInicio, 'a', dataFim);
            
            if (!dataInicio || !dataFim) {
                alert('Por favor, preencha ambas as datas');
                return;
            }
        }
        
        console.log('Chamando API com periodo:', periodo, 'datas:', dataInicio, dataFim);
        const rel = await api.relatorioPeriodo(periodo, dataInicio, dataFim);
        console.log('Resposta da API:', rel);
        console.log('Dados por veículo:', rel.por_veiculo);
        console.log('Estatísticas gerais:', rel.estatisticas_gerais);
        
        // Se houver usuário selecionado, buscar dados específicos dele
        if (usuarioSelecionado) {
            console.log('Usuário selecionado, buscando dados específicos:', usuarioSelecionado);
            
            const relUsuario = await api.relatorioUsuario(usuarioSelecionado, periodo, dataInicio, dataFim);
            console.log('Dados do usuário:', relUsuario);
            
            // Exibir relatório filtrado por usuário com veículos
            exibirRelatorioPeriodoUsuario(relUsuario);
        } else {
            // Sem filtro de usuário, mostrar tudo
            exibirRelatorioPeriodo(rel);
        }
        
        // Fechar filtro personalizado se aberto
        if (periodo === 'personalizado') {
            fecharFiltroPersonalizado();
        }
    } catch (e) {
        console.error('Erro ao carregar relatório:', e);
        console.error('Stack:', e.stack);
        document.getElementById('relatorio-container').innerHTML = 
            '<p style="color: red;">Erro ao carregar relatório: ' + e.message + '</p>';
    }
}

function exibirRelatorioPeriodo(dados) {
    console.log('=== EXIBINDO RELATÓRIO ===');
    console.log('Dados recebidos:', dados);
    
    const div = document.getElementById('relatorio-container');
    if (!div) {
        console.error('Elemento relatorio-container não encontrado!');
        return;
    }
    
    div.innerHTML = '';
    
    const periodo = dados.periodo;
    const stats = dados.estatisticas_gerais;
    
    console.log('Período:', periodo);
    console.log('Stats:', stats);
    console.log('Por veículo count:', dados.por_veiculo ? dados.por_veiculo.length : 0);
    
    let html = `
        <div class="relatorio-stats-container">
            <div class="relatorio-periodo-info">
                <p><strong>Período:</strong> ${formatarData(periodo.data_inicio)} a ${formatarData(periodo.data_fim)} (${periodo.dias} dias)</p>
            </div>
            <div class="relatorio-stats">
                <div class="stat-box">
                    <span class="stat-label">KM Total</span>
                    <span class="stat-value">${stats.km_total.toFixed(2)} km</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Usos</span>
                    <span class="stat-value">${stats.total_usos}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Média KM/Dia</span>
                    <span class="stat-value">${stats.media_km_por_dia.toFixed(2)} km</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Veículos Ativos</span>
                    <span class="stat-value">${stats.veiculos_ativos}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Motoristas Ativos</span>
                    <span class="stat-value">${stats.motoristas_ativos}</span>
                </div>
            </div>
        </div>
    `;
    
    html += '<h3>Por Veículo:</h3>';
    console.log('Renderizando veículos...');
    if (dados.por_veiculo && dados.por_veiculo.length > 0) {
        console.log('Encontrados', dados.por_veiculo.length, 'veículos');
        dados.por_veiculo.forEach((v, idx) => {
            console.log(`  Veículo ${idx}: ${v.placa} - ${v.total_usos} usos, ${v.km_periodo} km`);
            html += `
                <div class="relatorio-card">
                    <div class="relatorio-card-header">
                        <strong>${v.placa}</strong>
                        <span class="relatorio-marca">${v.marca} ${v.modelo}</span>
                    </div>
                    <div class="relatorio-card-details">
                        <div class="detail-item">
                            <span class="label">KM:</span>
                            <span class="value">${v.km_periodo.toFixed(2)} km</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Usos:</span>
                            <span class="value">${v.total_usos}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Média:</span>
                            <span class="value">${v.media_km_por_uso.toFixed(2)} km/uso</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        console.log('Nenhum dado de veículos encontrado');
        html += '<p>Nenhum dado de veículos</p>';
    }
    
    html += '<h3>Por Motorista:</h3>';
    console.log('Renderizando motoristas...');
    if (dados.por_motorista && dados.por_motorista.length > 0) {
        console.log('Encontrados', dados.por_motorista.length, 'motoristas');
        dados.por_motorista.forEach((m, idx) => {
            console.log(`  Motorista ${idx}: ${m.usuario_id} - ${m.total_coletas} coletas, ${m.km_periodo} km`);
            html += `
                <div class="relatorio-card">
                    <div class="relatorio-card-header">
                        <strong>${m.usuario_id} - ${m.nome}</strong>
                    </div>
                    <div class="relatorio-card-details">
                        <div class="detail-item">
                            <span class="label">KM:</span>
                            <span class="value">${m.km_periodo.toFixed(2)} km</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Coletas:</span>
                            <span class="value">${m.total_coletas}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Média:</span>
                            <span class="value">${m.media_km_por_coleta.toFixed(2)} km/coleta</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        console.log('Nenhum dado de motoristas encontrado');
        html += '<p>Nenhum dado de motoristas</p>';
    }
    
    console.log('HTML gerado, tamanho:', html.length);
    div.innerHTML = html;
    console.log('Relatório renderizado com sucesso');
}

function exibirRelatorioPeriodoUsuario(dados) {
    console.log('=== EXIBINDO RELATÓRIO FILTRADO POR USUÁRIO ===');
    console.log('Dados:', dados);
    
    const div = document.getElementById('relatorio-container');
    if (!div) {
        console.error('Elemento relatorio-container não encontrado!');
        return;
    }
    
    div.innerHTML = '';
    
    const periodo = dados.periodo;
    const stats = dados.estatisticas;
    const usoPorDia = dados.uso_por_dia || [];
    
    let html = `
        <div class="relatorio-stats-container">
            <div class="relatorio-periodo-info">
                <p><strong>📋 Relatório do Motorista:</strong> ${dados.usuario_id} - ${dados.usuario_nome}</p>
                <p><strong>Período:</strong> ${formatarData(periodo.data_inicio)} a ${formatarData(periodo.data_fim)} (${periodo.dias} dias)</p>
            </div>
            <div class="relatorio-stats">
                <div class="stat-box">
                    <span class="stat-label">KM Total</span>
                    <span class="stat-value">${stats.km_total.toFixed(2)} km</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Total Coletas</span>
                    <span class="stat-value">${stats.total_coletas}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Média KM/Coleta</span>
                    <span class="stat-value">${stats.media_km_por_coleta.toFixed(2)} km</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Média KM/Dia</span>
                    <span class="stat-value">${stats.media_km_por_dia.toFixed(2)} km</span>
                </div>
            </div>
        </div>
    `;
    
    // Mostrar uso por dia detalhado
    html += '<h3 style="margin-top: 30px;">📅 Uso Diário Detalhado:</h3>';
    if (usoPorDia && usoPorDia.length > 0) {
        console.log('Renderizando', usoPorDia.length, 'dias de uso');
        usoPorDia.forEach((dia, idx) => {
            console.log(`  Dia ${idx}: ${dia.data} - ${dia.total_usos} usos, ${dia.km_total_dia} km`);
            
            html += `
                <div class="dia-card">
                    <div class="dia-header">
                        <span class="dia-data">📆 ${formatarData(dia.data)}</span>
                        <div class="dia-stats">
                            <span class="dia-km">${dia.km_total_dia.toFixed(2)} km</span>
                            <span class="dia-usos">${dia.total_usos} uso(s)</span>
                        </div>
                    </div>
                    <div class="dia-usos">
            `;
            
            dia.usos.forEach((uso, usoIdx) => {
                console.log(`    Uso ${usoIdx}: ${uso.veiculo_placa} - ${uso.hora_saida} às ${uso.hora_chegada} - ${uso.km_rodado} km`);
                console.log(`    Coleta ID:`, uso.coleta_id);
                
                // Verificar se é admin e se é o mesmo dia (somente mostrar botão no dia)
                const hoje = new Date().toISOString().split('T')[0];
                const diaUso = dia.data;
                const isAdmin = user?.admin || false;
                const podeEditar = isAdmin && (hoje === diaUso);
                
                console.log(`[DEBUG EDITAR KM] User:`, user);
                console.log(`[DEBUG EDITAR KM] IsAdmin:`, isAdmin);
                console.log(`[DEBUG EDITAR KM] Hoje:`, hoje, '| Dia uso:', diaUso);
                console.log(`[DEBUG EDITAR KM] Pode editar:`, podeEditar);
                console.log(`[DEBUG EDITAR KM] Coleta ID:`, uso.coleta_id);
                
                html += `
                    <div class="uso-item">
                        <div class="uso-veiculo">
                            <strong>🚗 ${uso.veiculo_placa}</strong>
                            <span class="uso-modelo">${uso.veiculo_marca} ${uso.veiculo_modelo}</span>
                        </div>
                        <div class="uso-horarios">
                            <div class="horario-item">
                                <span class="horario-label">🕐 Saída:</span>
                                <span class="horario-valor">${uso.hora_saida}</span>
                            </div>
                            <div class="horario-item">
                                <span class="horario-label">🕐 Chegada:</span>
                                <span class="horario-valor">${uso.hora_chegada}</span>
                            </div>
                        </div>
                        <div class="uso-km">
                            <div class="km-item">
                                <span class="km-label">KM Saída:</span>
                                <span class="km-valor">${uso.km_retirada}</span>
                            </div>
                            <div class="km-item">
                                <span class="km-label">KM Chegada:</span>
                                <span class="km-valor">${uso.km_devolucao}</span>
                            </div>
                            <div class="km-item km-rodado">
                                <span class="km-label">KM Rodado:</span>
                                <span class="km-valor">${uso.km_rodado.toFixed(2)} km</span>
                            </div>
                        </div>
                        ${podeEditar ? `<button class="btn btn-secondary btn-sm" onclick="editarKmUso(${uso.coleta_id}, ${uso.km_retirada}, ${uso.km_devolucao}, '${uso.veiculo_placa}')">✏️ Editar KM</button>` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
    } else {
        console.log('Nenhum uso encontrado no período');
        html += '<p>Nenhum uso de veículo registrado no período.</p>';
    }
    
    html += `
        <div style="background: #fffbf0; padding: 15px; border-left: 4px solid #f9a825; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 0; color: #666;">
                <strong>ℹ️ Informação:</strong> Este relatório mostra os usos diários detalhados do motorista selecionado.
                Para ver todos os motoristas e veículos, selecione "Ver Todos os Veículos" no filtro acima.
            </p>
        </div>
    `;
    
    div.innerHTML = html;
}

function formatarData(dataStr) {
    if (!dataStr) return 'N/A';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
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

// ===== EDITAR KM (ADMIN) =====
async function editarKmUso(coletaId, kmRetiradaAtual, kmDevolucaoAtual, placa) {
    const novoKmRetirada = prompt(`Editar KM de Saída\nVeículo: ${placa}\nKM Atual: ${kmRetiradaAtual}`, kmRetiradaAtual);
    if (novoKmRetirada === null) return; // Cancelado
    
    const novoKmDevolucao = prompt(`Editar KM de Chegada\nVeículo: ${placa}\nKM Atual: ${kmDevolucaoAtual}`, kmDevolucaoAtual);
    if (novoKmDevolucao === null) return; // Cancelado
    
    const kmRet = parseFloat(novoKmRetirada);
    const kmDev = parseFloat(novoKmDevolucao);
    
    if (isNaN(kmRet) || isNaN(kmDev)) {
        alert('KM inválido! Use apenas números.');
        return;
    }
    
    if (kmDev < kmRet) {
        alert('KM de chegada não pode ser menor que KM de saída!');
        return;
    }
    
    if (!confirm(`Confirmar alteração?\n\nSaída: ${kmRetiradaAtual} → ${kmRet}\nChegada: ${kmDevolucaoAtual} → ${kmDev}\nNovo KM rodado: ${(kmDev - kmRet).toFixed(2)} km`)) {
        return;
    }
    
    try {
        showNotification('Atualizando KM...', 'info');
        await api.editarKmColeta(coletaId, kmRet, kmDev);
        showNotification('✅ KM atualizado com sucesso!', 'success');
        
        // Recarregar relatório do usuário
        if (usuarioSelecionado) {
            await handleUsuarioChange();
        }
    } catch (e) {
        console.error('Erro ao editar KM:', e);
        showNotification(`❌ Erro: ${e.message}`, 'error');
    }
}
