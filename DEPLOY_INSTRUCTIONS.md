# 🚀 Guia Completo de Deployment - App Frota VPS

## 📋 Pré-requisitos

### No VPS (Ubuntu/Debian)
- ✅ Docker instalado
- ✅ Git instalado
- ✅ Acesso SSH com permissões sudo
- ✅ Domínio `frotadpl.wlsolucoes.eti.br` configurado na Cloudflare
- ✅ Cloudflare em modo **Full** (não Full Strict)

### Na sua máquina local (já feito)
- ✅ Código pushed para GitHub
- ✅ Dockerfile e docker-compose.yml atualizados
- ✅ PORT 8000 exposto no docker-compose
- ✅ Arquivo DEPLOY_VPS.sh pronto

---

## 🔧 Passo 1: Preparação da VPS

### 1.1 Conectar via SSH
```bash
ssh usuario@seu_vps_ip
# ou
ssh -i caminho/para/chave.pem usuario@seu_vps_ip
```

### 1.2 Atualizar sistema
```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### 1.3 Instalar Docker (se não tiver)
```bash
# Instalação rápida
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## 🚀 Passo 2: Executar Script de Deployment

### 2.1 Fazer download do script (OPÇÃO A - Copia-Cola)
```bash
# Acessar home
cd ~

# Criar e editar script
nano deploy.sh

# Copiar todo o conteúdo de DEPLOY_VPS.sh e colar (Ctrl+Shift+V ou botão direito)
# Salvar: Ctrl+X, Y, Enter

# Dar permissão de execução
chmod +x deploy.sh

# Executar
./deploy.sh
```

### 2.2 Fazer download direto do GitHub (OPÇÃO B - Mais fácil)
```bash
cd ~
wget https://raw.githubusercontent.com/devlabiak/app_frota/main/DEPLOY_VPS.sh
chmod +x DEPLOY_VPS.sh
./DEPLOY_VPS.sh
```

---

## ⚙️ Passo 3: Configurar Arquivo .env

O script pedirá para editar `.env` com a senha do PostgreSQL.

### 3.1 Editar arquivo
```bash
nano ~/app_frota/.env
```

### 3.2 Alterar senha (IMPORTANTE!)
Encontre esta linha:
```
DATABASE_URL=postgresql://frota_user:MUDE_ESTA_SENHA_AQUI@db:5432/frota_db
```

Mude `MUDE_ESTA_SENHA_AQUI` para uma senha segura, ex:
```
DATABASE_URL=postgresql://frota_user:Senha#Muito@Segura2024!@db:5432/frota_db
```

### 3.3 Salvar
- Pressione: `Ctrl + X`
- Digite: `Y` (yes)
- Pressione: `Enter` (confirma nome do arquivo)

### 3.4 Atualizar docker-compose.yml com mesma senha
```bash
# Voltar ao diretório da app
cd ~/app_frota

# Editar docker-compose
nano docker-compose.yml

# Encontre a seção do serviço 'db'
# Mude POSTGRES_PASSWORD=MUDE_ESTA_SENHA_AQUI para a MESMA senha que colocou no .env
```

### 3.5 Reiniciar containers
```bash
cd ~/app_frota
docker compose down
docker compose up -d

# Aguardar 20 segundos
sleep 20

# Verificar se está tudo ok
docker compose logs db | tail -20
```

---

## ✅ Passo 4: Verificar Saúde da Aplicação

### 4.1 Health checks locais
```bash
# API deve responder
curl http://localhost:8000/health

# Response esperado:
# {"status": "ok"}
```

### 4.2 Verificar logs
```bash
cd ~/app_frota

# Logs da API
docker compose logs api -f

# Logs do Banco de Dados (em outra aba)
docker compose logs db -f

# Logs do Nginx
sudo tail -f /var/log/nginx/app_frota_error.log
```

### 4.3 Verificar containers rodando
```bash
docker compose ps

# Esperado:
# NAME                 STATUS          PORTS
# app-frota-db         Up (healthy)    5432/tcp
# app-frota-api        Up (healthy)    8000/tcp
# traefik             Up              0.0.0.0:80->80/tcp
```

---

## 🌐 Passo 5: Configurar Cloudflare

### 5.1 Verificar modo SSL/TLS
1. Acesse Dashboard do Cloudflare
2. Selecione seu domínio
3. Vá em: **SSL/TLS** → **Overview**
4. Certifique-se que está em modo **Full**
   - ✅ Full (opção correta - encripta até a origem sem validar certificado)
   - ❌ Full (Strict) - exigiria certificado válido
   - ❌ Flexible - não encripta até a origem

### 5.2 Verificar DNS
1. **SSL/TLS** → **Origin Server**
2. Verifique se o certificado é reconhecido por Cloudflare
3. Em **DNS**, certifique-se que `frotadpl.wlsolucoes.eti.br` aponta para IP da VPS
   - Deve estar com proxy ativo (nuvem laranja)

### 5.3 Testar acesso HTTPS
```bash
# De qualquer máquina com internet
curl -k https://frotadpl.wlsolucoes.eti.br/health

# Resposta esperada:
# {"status": "ok"}
```

---

## 🔗 Passo 6: Testar Acesso Completo

### 6.1 Acessar a aplicação via navegador
1. Abra: `https://frotadpl.wlsolucoes.eti.br`
2. Login:
   - **Usuário**: `admin`
   - **Senha**: `admin`
3. Você deve ver a tela de login ou dashboard

### 6.2 Testar endpoints principais
```bash
# Health check
curl https://frotadpl.wlsolucoes.eti.br/health

# Listar veículos (sem autenticação)
curl https://frotadpl.wlsolucoes.eti.br/api/veiculos

# Ver estrutura da resposta esperada
# {"detail": "Not authenticated"} - esperado se não houver JWT
```

---

## 🛠️ Troubleshooting

### Problema: "Connection refused" ao acessar a API
**Causa**: Containers não iniciaram corretamente
**Solução**:
```bash
cd ~/app_frota
docker compose logs
docker compose down
docker compose up -d
sleep 20
docker compose logs api
```

### Problema: "Bad Gateway" no Nginx/Cloudflare
**Causa**: API não está acessível em localhost:8000
**Solução**:
```bash
# Testar conexão local
curl http://localhost:8000/health

# Se falhar, reiniciar containers
docker compose restart api

# Verificar logs
docker compose logs api -f
```

### Problema: Banco de dados não conecta
**Causa**: Senha incorreta ou container não iniciou
**Solução**:
```bash
# Verificar credenciais
cat ~/app_frota/.env | grep DATABASE_URL
cat ~/app_frota/docker-compose.yml | grep -A5 "db:"

# Devem ser IDÊNTICAS!

# Se não forem, editar ambos os arquivos
nano ~/app_frota/.env
nano ~/app_frota/docker-compose.yml

# Depois:
docker compose down
docker compose up -d
```

### Problema: SSL certificate error
**Esperado**: Avisos sobre certificado auto-assinado
**Solução**: Usar `-k` em curl ou aceitar no navegador (Cloudflare valida de fora)
```bash
curl -k https://frotadpl.wlsolucoes.eti.br/health
```

---

## 📊 Monitoramento Contínuo

### Ver logs em tempo real
```bash
cd ~/app_frota

# Terminal 1: API
watch -n 1 'docker compose logs --tail=10 api'

# Terminal 2: Database
watch -n 1 'docker compose logs --tail=10 db'

# Terminal 3: Nginx
sudo watch -n 1 'tail -20 /var/log/nginx/app_frota_access.log'
```

### Verificar uso de recursos
```bash
docker stats
docker volume ls
docker network ls
```

### Backups automáticos (Recomendado)
```bash
# Fazer backup do banco
docker exec app-frota-db pg_dump -U frota_user frota_db > ~/backup_frota_$(date +%Y%m%d_%H%M%S).sql

# Copiar para máquina local via SCP
scp usuario@vps_ip:~/backup_frota*.sql ~/backups/
```

---

## 🔐 Segurança Essencial

### 1. Mude a senha de admin após primeira login
```bash
# Acessar a aplicação e usar menu de perfil
https://frotadpl.wlsolucoes.eti.br
```

### 2. Configure firewall no VPS
```bash
# Abrir portas necessárias
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Configurar rate limiting (já está pronto)
- Limitado a 60 requisições por minuto por IP
- Definido em `backend/app/config.py`

### 4. Habilitar logs detalhados
```bash
# Já está configurado como INFO em production
# Para aumentar para DEBUG:
nano ~/app_frota/.env
# Mude: LOG_LEVEL=DEBUG
docker compose restart api
```

---

## 📝 Comandos Úteis

```bash
# Reiniciar aplicação
cd ~/app_frota && docker compose restart

# Parar aplicação
cd ~/app_frota && docker compose stop

# Iniciar aplicação
cd ~/app_frota && docker compose start

# Limpar recursos não utilizados
docker system prune -a

# Ver histórico de commits
cd ~/app_frota && git log --oneline

# Atualizar código do repositório
cd ~/app_frota && git pull origin main

# Redeploar após git pull
cd ~/app_frota && docker compose down && docker compose up -d

# Ver tamanho de volumes
du -sh ~/app_frota/uploads/*
du -sh ~/app_frota/data/*
```

---

## 🎯 Checklist Final

- [ ] VPS preparado com Docker
- [ ] Script DEPLOY_VPS.sh executado com sucesso
- [ ] Arquivo .env configurado com senha segura
- [ ] docker-compose.yml atualizado com mesma senha
- [ ] Containers iniciados e saudáveis
- [ ] Banco de dados inicializado
- [ ] Nginx configurado e rodando
- [ ] Cloudflare em modo Full SSL/TLS
- [ ] https://frotadpl.wlsolucoes.eti.br acessível
- [ ] Login funcionando (admin/admin)
- [ ] Senha de admin alterada
- [ ] Firewall configurado
- [ ] Backups automatizados planejados

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs primeiro**:
   ```bash
   docker compose logs -f
   ```

2. **Comparar com documentação**:
   - [FastAPI docs](https://fastapi.tiangolo.com)
   - [Docker docs](https://docs.docker.com)
   - [Cloudflare docs](https://developers.cloudflare.com)

3. **Testar conexão local**:
   ```bash
   curl -v http://localhost:8000/health
   ```

4. **Resetar tudo (último recurso)**:
   ```bash
   cd ~/app_frota
   docker compose down -v  # Remove volumes também!
   git pull origin main
   docker compose up -d
   docker exec app-frota-api python init_db_prod.py
   ```

---

## 🎉 Próximos Passos (Opcional)

1. **Configurar SMTP** para enviar emails:
   - Editar `backend/main.py`
   - Implementar notificações automáticas

2. **Habilitar Full Strict** se quiser certificado próprio:
   - Gerar certificado Cloudflare Origin
   - Instalar em `/etc/ssl/cloudflare/`
   - Atualizar Nginx

3. **Adicionar CDN**:
   - Configurar Cloudflare Pages para static assets
   - Melhorar performance global

4. **Monitoramento**:
   - Integrar com Prometheus/Grafana
   - Setup de alertas

---

**Data de atualização**: 2024-01-12  
**Versão da app**: 1.0.0  
**Status**: Pronto para produção ✅
