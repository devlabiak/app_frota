# 📋 CHECKLIST DE DEPLOYMENT - App Frota VPS

## ⭐ ANTES DE COMEÇAR

- [ ] IP da VPS anotado
- [ ] Credenciais SSH anotadas (ou chave gerada)
- [ ] Domínio `frotadpl.wlsolucoes.eti.br` configurado na Cloudflare
- [ ] Cloudflare em modo **FULL** (não Full Strict)
- [ ] 10+ GB espaço em disco na VPS
- [ ] 2+ GB RAM disponível
- [ ] Portas 22, 80, 443 abertas no firewall

---

## 🚀 PASSO 1: CONECTAR AO VPS

```bash
ssh usuario@seu_vps_ip
# ou com chave
ssh -i caminho/chave.pem usuario@seu_vps_ip
```

- [ ] Conectado via SSH
- [ ] Prompt do VPS exibido
- [ ] Usuário tem sudo

---

## 📥 PASSO 2: EXECUTAR SCRIPT DE DEPLOYMENT

```bash
cd ~ && \
wget https://raw.githubusercontent.com/devlabiak/app_frota/main/DEPLOY_VPS.sh && \
chmod +x DEPLOY_VPS.sh && \
./DEPLOY_VPS.sh
```

**O script fará:**
- [ ] Limpar containers antigos
- [ ] Clonar repositório GitHub
- [ ] Configurar arquivo .env
- [ ] Instalar docker-compose plugin
- [ ] Iniciar containers (API + Database)
- [ ] Inicializar banco de dados
- [ ] Instalar Nginx
- [ ] Gerar certificados auto-assinados
- [ ] Executar health checks

⏱️ **Tempo esperado: 5-10 minutos**

---

## ⚙️ PASSO 3: CONFIGURAR VARIÁVEIS DE AMBIENTE

Durante o script, será solicitado:

```bash
nano ~/app_frota/.env
```

**O QUE MUDAR:**
- [ ] Encontre: `DATABASE_URL=postgresql://frota_user:MUDE_ESTA_SENHA_AQUI@db:5432/frota_db`
- [ ] Mude `MUDE_ESTA_SENHA_AQUI` para uma senha SEGURA
- [ ] Exemplo: `Senha#Muito@Segura2024!`

**SALVAR:**
- [ ] Pressione: `Ctrl + X`
- [ ] Digite: `Y`
- [ ] Pressione: `Enter`

**TAMBÉM ATUALIZAR:**
- [ ] Arquivo `docker-compose.yml`
- [ ] Seção `db: environment:`
- [ ] Mude `POSTGRES_PASSWORD=MUDE_ESTA_SENHA_AQUI` para a MESMA senha

**REINICIAR CONTAINERS:**
```bash
cd ~/app_frota
docker compose down
docker compose up -d
```

- [ ] Containers iniciados com sucesso
- [ ] Aguardado ~20 segundos
- [ ] Containers saudáveis (healthy)

---

## ✅ PASSO 4: VERIFICAR SAÚDE DA APLICAÇÃO

### 4.1 Verificar containers
```bash
docker compose ps
```

**Esperado:**
```
NAME                 STATUS          
app-frota-db         Up (healthy)    
app-frota-api        Up (healthy)    
traefik              Up              
```

- [ ] API em "healthy"
- [ ] Database em "healthy"
- [ ] Traefik "Up"

### 4.2 Health check local
```bash
curl http://localhost:8000/health
```

**Esperado:**
```json
{"status": "ok"}
```

- [ ] Retorno JSON com status ok
- [ ] HTTP 200 OK

### 4.3 Health check HTTPS
```bash
curl -k https://frotadpl.wlsolucoes.eti.br/health
```

**Esperado:**
```json
{"status": "ok"}
```

- [ ] Retorno JSON com status ok
- [ ] Aviso de certificado auto-assinado é OK

---

## 🌐 PASSO 5: ACESSAR A APLICAÇÃO

1. Abra no navegador:
   ```
   https://frotadpl.wlsolucoes.eti.br
   ```

   - [ ] Site carrega
   - [ ] Tela de login exibida
   - [ ] URL em HTTPS

2. Login padrão:
   - Usuário: `admin`
   - Senha: `admin`

   - [ ] Login aceito
   - [ ] Dashboard exibido

---

## 🔐 PASSO 6: SEGURANÇA ESSENCIAL

### 6.1 Mudar senha do admin
1. Na aplicação, clique no ícone de perfil (canto superior)
2. Selecione "Alterar Senha"
3. Digite nova senha SEGURA
4. Salve

- [ ] Senha de admin alterada
- [ ] Nova senha anotada com segurança

### 6.2 Configurar firewall
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

- [ ] UFW habilitado
- [ ] Portas corretas abertas
- [ ] SSH ainda funciona: `exit` e `ssh usuario@vps`

### 6.3 Verificar logs
```bash
cd ~/app_frota
docker compose logs -f api
```

- [ ] Logs sem ERROS
- [ ] Conexão com database OK
- [ ] Sem exceções Python

---

## 📊 PASSO 7: VERIFICAÇÕES FINAIS

### 7.1 Testar endpoints
```bash
# Health check
curl -k https://frotadpl.wlsolucoes.eti.br/health

# API Docs (Swagger)
curl -k https://frotadpl.wlsolucoes.eti.br/docs
```

- [ ] Health check retorna ok
- [ ] API Docs acessível

### 7.2 Testar autenticação
```bash
curl -X POST https://frotadpl.wlsolucoes.eti.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  -k
```

- [ ] Token JWT retornado
- [ ] Login funciona

### 7.3 Verificar performance
```bash
docker stats
```

- [ ] CPU < 50% (em repouso)
- [ ] Memória < 1 GB (em repouso)
- [ ] Sem ações estranhas

---

## 💾 PASSO 8: BACKUP E MANUTENÇÃO

### 8.1 Criar backup imediato
```bash
docker exec app-frota-db pg_dump -U frota_user frota_db > ~/backup_inicio.sql
```

- [ ] Arquivo criado: `ls -lh ~/backup_inicio.sql`
- [ ] Tamanho > 0

### 8.2 Copiar backup para máquina local
```bash
# De sua máquina local:
scp usuario@seu_vps_ip:~/backup_inicio.sql ~/backups/
```

- [ ] Backup copiado localmente
- [ ] Armazenado com segurança

---

## 🎉 PASSO 9: STATUS FINAL

**Tudo pronto?** Marque todos os items abaixo:

### Infraestrutura ✅
- [ ] VPS conectada e acessível
- [ ] Docker rodando sem erros
- [ ] Containers saudáveis
- [ ] Banco de dados inicializado

### Aplicação ✅
- [ ] App acessível em HTTPS
- [ ] Login funciona
- [ ] Senha admin alterada
- [ ] Logs sem erros

### Segurança ✅
- [ ] Firewall configurado
- [ ] Senha PostgreSQL segura
- [ ] Cloudflare em Full mode
- [ ] Certificados gerados

### Manutenção ✅
- [ ] Backup criado
- [ ] Logs verificados
- [ ] Performance OK
- [ ] Documentação lida

---

## 🚨 SE ALGO DER ERRADO

### Erro: Connection refused
```bash
docker compose logs api
docker compose restart api
sleep 10
curl http://localhost:8000/health
```

- [ ] Erro resolvido

### Erro: Bad Gateway 502
```bash
curl http://localhost:8000/health
# Se falhar:
docker compose restart api
```

- [ ] API respondendo
- [ ] Nginx funcionando

### Erro: Banco não conecta
```bash
# Verificar credenciais:
cat .env | grep DATABASE_URL
cat docker-compose.yml | grep POSTGRES_PASSWORD

# Devem ser IDÊNTICAS
# Se não, editar ambos os arquivos:
nano .env
nano docker-compose.yml

# Depois reiniciar:
docker compose down
docker compose up -d
```

- [ ] Senhas coincidentes
- [ ] Database conectada

### Erro: SSL Certificate Error
```bash
# Esperado com certificado auto-assinado
# Usar -k em curl:
curl -k https://seu_domain.com/health

# No navegador: aceitar exceção de segurança (é OK com Cloudflare)
```

- [ ] Entendido que é normal

---

## 📞 CONTATOS E RECURSOS

| O Quê | Como |
|------|------|
| Documentação completa | [DEPLOY_INSTRUCTIONS.md](DEPLOY_INSTRUCTIONS.md) |
| Próximas ações | [NEXT_STEPS.md](NEXT_STEPS.md) |
| Status técnico | [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) |
| Script deploy | [DEPLOY_VPS.sh](DEPLOY_VPS.sh) |
| Resumo visual | [README_DEPLOYMENT.md](README_DEPLOYMENT.md) |

---

## 📝 NOTAS IMPORTANTES

```
⚠️  SENHA DO ADMIN: 
    Default = admin
    MUDE APÓS LOGIN!

⚠️  SENHA DO BANCO:
    Configurada em .env durante setup
    Não esqueça desta senha!

⚠️  CERTIFICADO SSL:
    Auto-assinado (normal com Cloudflare Full)
    Cloudflare valida de fora

⚠️  DADOS PERSISTENTES:
    Salvos em volumes Docker
    Inclusos em backups
    Sobrevivem a container restarts
```

---

## 🎯 PRÓXIMAS AÇÕES (OPCIONAL)

1. **Configurar backups automáticos** (cronjob)
2. **Implementar SMTP** para notificações
3. **Adicionar monitoramento** (Prometheus)
4. **Habilitar alertas** (Slack/Email)
5. **Otimizar Full Strict SSL** (certificado próprio)

---

## ✨ PARABÉNS!

Você completou o deployment com sucesso! 🎊

```
APP FROTA está online em:
👉 https://frotadpl.wlsolucoes.eti.br

Pronto para usar em produção! 🚀
```

---

**Data**: 2024-01-12  
**Versão**: 1.0.0  
**Status**: ✅ DEPLOYMENT COMPLETO

Bom uso! 🎉
