// ============================================================
// ARQUIVO NOVO: Notificacoes.gs  — BateCaixa Backend
// Crie no Apps Script: Arquivo → Novo script → Notificacoes
// ============================================================
//
// ⏰ CONFIGURAR ACIONADOR DIÁRIO (TRIGGER):
//   1. No editor do Apps Script, clique no ícone de relógio ⏱️ (Acionadores)
//   2. Clique em "+ Adicionar acionador"
//   3. Função: verificarTrialsEEnviarEmail
//   4. Implantação: Head
//   5. Origem: Baseado em tempo
//   6. Tipo: Acionador de dia
//   7. Horário: entre 7h e 8h (Brasília) — avisa antes do cliente abrir a loja
//   8. Clique em Salvar
//
// Essa função roda automaticamente todo dia de manhã e dispara
// o e-mail apenas para quem vence amanhã.
// ============================================================

function verificarTrialsEEnviarEmail() {
  try {
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Clientes");
    const dados = aba.getDataRange().getValues();

    const hoje   = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = Utilities.formatDate(amanha, "America/Sao_Paulo", "yyyy-MM-dd");

    let enviados = 0;

    for (let i = 1; i < dados.length; i++) {
      const email      = toStr(dados[i][0]).toLowerCase().trim();
      const nome       = toStr(dados[i][1]) || "Cliente";
      const status     = toStr(dados[i][2]).toLowerCase();
      const vencimento = toStr(dados[i][3]).trim(); // formato "yyyy-MM-dd"

      if (!email || !vencimento) continue;

      // Dispara SOMENTE para Trial que vence exatamente amanhã
      const ehTrial    = status === "ativo" || status === "trial";
      const venceAmanha = vencimento === amanhaStr;

      if (!ehTrial || !venceAmanha) continue;

      _enviarEmailExpiracaoTrial(email, nome);
      enviados++;
      registrarEvento(email, "emailTrialExpira", "Enviado para " + email);
    }

    console.log("verificarTrialsEEnviarEmail: " + enviados + " e-mail(s) enviado(s).");
  } catch (err) {
    console.error("verificarTrialsEEnviarEmail ERRO:", err.message);
    registrarEvento("sistema", "emailTrialExpira:ERRO", err.message);
  }
}

// ── Envia o e-mail HTML de aviso de expiração ─────────────────────────────────
function _enviarEmailExpiracaoTrial(email, nome) {
  const primeiroNome = nome.split(" ")[0] || "Cliente";
  const horaEnvio    = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm");

  MailApp.sendEmail({
    to:       email,
    name:     "BateCaixa",
    subject:  "⏳ Seu teste gratuito termina amanhã — BateCaixa",
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1565C0,#0D47A1);padding:28px 30px;border-radius:16px 16px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:-0.5px;">🧾 BateCaixa</h1>
          <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px;">Seu caixa. Simples assim.</p>
        </div>

        <!-- Body -->
        <div style="background:#fff;padding:28px 30px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 16px 16px;">

          <p style="font-size:16px;color:#333;margin:0 0 12px;">Olá, <strong>${primeiroNome}</strong>! 👋</p>

          <p style="font-size:14px;color:#546E7A;margin:0 0 20px;line-height:1.6;">
            Seu período de teste gratuito de 7 dias termina <strong style="color:#E65100;">amanhã</strong>.
            Para não perder o acesso ao seu histórico de vendas, relatórios e equipe, assine agora e continue no controle do seu negócio.
          </p>

          <!-- Destaque urgência -->
          <div style="background:#FFF3E0;border-left:4px solid #FF8F00;border-radius:0 10px 10px 0;padding:14px 16px;margin-bottom:24px;">
            <p style="font-size:14px;color:#E65100;margin:0;font-weight:700;">
              ⚠️ Amanhã seu acesso será suspenso caso não assine.
            </p>
            <p style="font-size:13px;color:#E65100;margin:6px 0 0;opacity:.85;">
              Seus dados ficam salvos por 30 dias após a suspensão.
            </p>
          </div>

          <!-- Benefícios rápidos -->
          <p style="font-size:13px;font-weight:700;color:#333;margin:0 0 10px;">O que você continua tendo com o plano:</p>
          <ul style="font-size:13px;color:#546E7A;line-height:2;padding-left:18px;margin:0 0 24px;">
            <li>✅ Lançamento de vendas (individual e fechamento de caixa)</li>
            <li>✅ Relatórios mensais com gráficos</li>
            <li>✅ Controle de compras e estoque</li>
            <li>✅ Acesso para funcionários com código OTP</li>
            <li>✅ Histórico completo de movimentações</li>
          </ul>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:20px;">
            <a href="${URL_APP}" style="display:inline-block;background:linear-gradient(135deg,#FF8F00,#E65100);color:#fff;text-decoration:none;padding:16px 36px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:-.2px;">
              ⭐ Assinar Agora — Ver Planos
            </a>
          </div>

          <p style="font-size:12px;color:#90A4AE;text-align:center;margin:0;">
            Dúvidas? Fale direto pelo WhatsApp:
            <a href="https://wa.me/${WHATSAPP_SUPORTE}" style="color:#25D366;font-weight:700;">📱 Suporte BateCaixa</a>
          </p>

        </div>

        <!-- Footer -->
        <p style="font-size:10px;color:#CFD8DC;text-align:center;margin-top:14px;">
          Enviado em ${horaEnvio} (horário de Brasília). Você recebeu este e-mail pois está em período de trial no BateCaixa.
        </p>

      </div>
    `
  });
}

// ── Função de teste manual (rode no editor para verificar o e-mail) ───────────
// Substitua pelo e-mail desejado e execute manualmente uma vez.
function testarEmailTrial() {
  _enviarEmailExpiracaoTrial("danilobertolani@gmail.com", "Danilo");
  return "E-mail de teste enviado!";
}