# Guia de Deploy — grátis, 24/7, com HTTPS (sem comprar domínio)

Objetivo: pôr o `poc-strat` a correr num servidor sempre ligado, acessível pela
internet em `https://<nome>.duckdns.org`, para o TradingView poder enviar os
webhooks. Custo: **0€**.

> **Porquê um "nome" e não só o IP?** O TradingView exige HTTPS (porta 443) com
> certificado válido, e certificados grátis não se emitem para IPs — só para
> nomes. O DuckDNS dá-te um nome grátis. Não estás a comprar domínio nenhum.

Fases:
- **Fase 0** — arranjar um servidor Linux grátis (Oracle Cloud **ou** PC em casa)
- **Fase 1** — nome grátis com DuckDNS
- **Fase 2** — abrir as portas 80 e 443
- **Fase 3** — instalar a app
- **Fase 4** — serviço sempre ligado (systemd)
- **Fase 5** — HTTPS com nginx + Certbot
- **Fase 6** — ligar o TradingView e testar

---

## Fase 0 — Servidor Linux grátis

### Opção A (recomendada): Oracle Cloud Always Free
Grátis para sempre. Pede cartão só para verificar identidade — **não cobra**.

1. Cria conta em https://www.oracle.com/cloud/free/ (escolhe a *Home Region*
   mais perto de ti, ex. Frankfurt/London — **não muda depois**).
2. Menu → **Compute → Instances → Create Instance**.
3. Image: **Canonical Ubuntu 22.04**. Shape: **VM.Standard.A1.Flex** (ARM Ampere,
   Always Free — mete 1 OCPU / 6 GB) ou **VM.Standard.E2.1.Micro** (AMD, também free).
4. Em **Add SSH keys**: escolhe *Generate a key pair for me* e **descarrega a
   chave privada** (guarda o ficheiro `.key`).
5. Cria. Anota o **Public IP address** da instância.

Liga-te por SSH (do teu PC):
```bash
chmod 600 ssh-key.key
ssh -i ssh-key.key ubuntu@SEU_IP_PUBLICO
```

### Opção B (sem cartão): PC/portátil/Raspberry Pi em casa
Serve qualquer máquina com Ubuntu/Debian que possas deixar ligada 24/7.
- Instala Ubuntu Server (ou usa um Pi).
- Precisas de fazer **port forwarding** no teu router: encaminhar as portas
  **80** e **443** do router para o IP local da máquina.
- O teu IP público de casa muda de vez em quando — o DuckDNS (Fase 1) trata disso
  com um updater automático.

A partir daqui os passos são iguais nas duas opções ("o teu servidor" = a máquina Ubuntu).

---

## Fase 1 — Nome grátis com DuckDNS

1. Vai a https://www.duckdns.org e entra (login com Google/GitHub — grátis).
2. Cria um subdomínio, ex.: `optica13poc` → ficas com `optica13poc.duckdns.org`.
3. No topo copia o teu **token**.
4. Aponta o subdomínio ao IP do servidor: no campo *current ip* mete o IP público
   e carrega em **update ip** (ou usa o comando abaixo no servidor).

No servidor, instala um updater automático (mantém o nome a apontar ao IP certo,
útil sobretudo na Opção B onde o IP de casa muda):
```bash
mkdir -p ~/duckdns
cat > ~/duckdns/duck.sh <<'EOF'
echo url="https://www.duckdns.org/update?domains=SEU_SUBDOMINIO&token=SEU_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF
chmod +x ~/duckdns/duck.sh
~/duckdns/duck.sh && cat ~/duckdns/duck.log   # deve dizer "OK"
# corre de 5 em 5 min
( crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1" ) | crontab -
```

---

## Fase 2 — Abrir as portas 80 e 443

### Na Opção A (Oracle) — DOIS sítios (é o erro mais comum!)
1. **Firewall da cloud (Security List):** Networking → Virtual Cloud Networks →
   a tua VCN → Security Lists → Default → **Add Ingress Rules**:
   - Source `0.0.0.0/0`, IP Protocol TCP, Destination Port `80`
   - outra regra igual para a porta `443`
2. **Firewall dentro da VM** (as imagens Ubuntu da Oracle bloqueiam por defeito):
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### Na Opção B (casa)
Já fizeste o port forwarding no router (Fase 0). Se tiveres `ufw` ligado:
```bash
sudo ufw allow 80,443/tcp
```

---

## Fase 3 — Instalar a app

```bash
sudo apt update && sudo apt install -y python3-venv git nginx
sudo git clone https://github.com/valentimlopes81-collab/poc-strat.git /opt/poc-strat
cd /opt/poc-strat
sudo git checkout claude/crypto-poc-indicator-vic87s   # branch atual
sudo python3 -m venv .venv
sudo .venv/bin/pip install -r requirements.txt
```

Testa que arranca (Ctrl+C para sair):
```bash
sudo POC_WEBHOOK_SECRET=teste .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## Fase 4 — Serviço sempre ligado (systemd)

Edita `deploy/poc-strat.service` e muda o `POC_WEBHOOK_SECRET` para um segredo
teu (uma palavra-passe qualquer). Depois:
```bash
sudo cp /opt/poc-strat/deploy/poc-strat.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now poc-strat
sudo systemctl status poc-strat        # deve estar "active (running)"
```
A app fica a correr em `127.0.0.1:8000` (só local; o nginx expõe-a com HTTPS).

---

## Fase 5 — HTTPS com nginx + Certbot

1. Configura o nginx (mete o teu nome DuckDNS no `server_name`):
```bash
sudo cp /opt/poc-strat/deploy/nginx.conf /etc/nginx/sites-available/poc-strat
sudo sed -i 's/TEU_DOMINIO/SEU_SUBDOMINIO.duckdns.org/' /etc/nginx/sites-available/poc-strat
sudo ln -s /etc/nginx/sites-available/poc-strat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

2. Emite o certificado HTTPS grátis:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_SUBDOMINIO.duckdns.org --non-interactive --agree-tos -m TEU_EMAIL
```
O Certbot mete o HTTPS e passa a renovar sozinho. Testa no browser:
`https://SEU_SUBDOMINIO.duckdns.org` → deve abrir o dashboard.

---

## Fase 6 — Ligar o TradingView e testar

1. Primeiro testa tu o webhook (do teu PC), simulando um alerta:
```bash
curl -X POST https://SEU_SUBDOMINIO.duckdns.org/webhook \
  -H 'Content-Type: application/json' -d '{
  "ticker":"BTCUSDT.P","side":"long","price":61000,
  "zone_pocs":[60800,61000,61200],"targets_up":[62500,63500],
  "targets_down":[59000],"zone_break":60500,"secret":"O_TEU_SEGREDO"}'
```
Deve responder `{"status":"accepted",...}` e a trade aparece no dashboard.

2. No TradingView (por cada moeda, até 20 no Essential):
   - Aplica o `indicator/webhook_patch.pine` ao teu indicador (inclui o
     `"secret":"O_TEU_SEGREDO"` no JSON do alert — ver nota abaixo).
   - Cria um alerta: Condition = **"Any alert() function call"**,
     Notifications → **Webhook URL** = `https://SEU_SUBDOMINIO.duckdns.org/webhook`,
     Expiration = **Open-ended**.
   - Ativa **2FA** na tua conta TradingView (é obrigatório para webhooks).

> Nota sobre o segredo: no `webhook_patch.pine`, na linha do `payload`, acrescenta
> `,"secret":"O_TEU_SEGREDO"` antes do `}` final, para o backend aceitar só os
> teus alertas.

---

## Comandos úteis do dia a dia
```bash
sudo systemctl restart poc-strat      # reiniciar a app
sudo journalctl -u poc-strat -f       # ver logs ao vivo
cd /opt/poc-strat && sudo git pull    # atualizar; depois restart
```
