// ============================================================
// ARQUIVO: Membros.js  — BateCaixa Backend
// Substitua o conteúdo completo deste arquivo
// ============================================================

// ⚠️ IMPORTANTE: a constante URL_APP está definida em Roteador.js
// Se preferir, cole aqui também:
// const URL_APP = "https://SEU_USUARIO.github.io/batecaixa/";

function gerarCodigoOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Execute esta função UMA VEZ no editor do Apps Script para autorizar MailApp.
// Depois faça uma NOVA implantação do Web App.
function testarEnvioEmail() {
  MailApp.sendEmail({
    to: "danilobertolani@gmail.com",
    name: "BateCaixa",
    subject: "✅ Teste — BateCaixa",
    htmlBody: "<p>MailApp autorizado com sucesso! Pode re-implantar o Web App.</p>"
  });
  return "Sucesso";
}

// ── NOVA: verifica se o e-mail é membro sem enviar código (passo 1 do novo UX) ──
function verificarMembroExiste(emailMembro) {
  try {
    const emailNorm = (emailMembro||"").toLowerCase().trim();
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Membros");
    const dados = aba.getDataRange().getValues();

    for (let i = 1; i < dados.length; i++) {
      if ((dados[i][0]||"").toLowerCase().trim() !== emailNorm) continue;
      const emailDono = toStr(dados[i][1]);
      const papel     = toStr(dados[i][2]);
      const nomeLoja  = buscarNomeLoja(emailDono) || emailDono;
      return { existe: true, nomeLoja, papel };
    }
    return {
      existe: false,
      mensagem: "E-mail não autorizado. Peça ao responsável pela loja para te cadastrar em Configurações → Membros."
    };
  } catch (err) {
    return { existe: false, mensagem: "Erro interno: " + err.message };
  }
}

// ── Adiciona membro e envia e-mail de convite com código OTP ─────────────────
function adicionarMembro(emailDono, emailMembro, papel, nomeOperador, permissaoVenda) {
  try {
    const emailDonoNorm   = (emailDono  || "").toLowerCase().trim();
    const emailMembroNorm = (emailMembro|| "").toLowerCase().trim();
    if (!emailMembroNorm) return { status: "Erro", mensagem: "E-mail inválido." };
    if (!nomeOperador)    return { status: "Erro", mensagem: "Informe o nome do funcionário." };

    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Membros");
    const dados = aba.getDataRange().getValues();

    // Verifica duplicata
    for (let i = 1; i < dados.length; i++) {
      if ((dados[i][0]||"").toLowerCase().trim() === emailMembroNorm &&
          (dados[i][1]||"").toLowerCase().trim() === emailDonoNorm) {
        return { status: "Erro", mensagem: "Este e-mail já é membro da sua equipe." };
      }
    }

    const codigo    = gerarCodigoOTP();
    const expiracao = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const nomeDono  = buscarNomeLoja(emailDonoNorm) || emailDonoNorm;
    // Item 3: hora local do Brasil para o corpo do e-mail
    const horaEnvio = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm");

    // Colunas: email | emailDono | papel | status | dataCadastro | codigo | expiracao | nomeOperador | permissaoVenda
    aba.appendRow([emailMembroNorm, emailDonoNorm, papel||"Vendedor", "Pendente",
                   new Date(), codigo, expiracao, nomeOperador, permissaoVenda||"individual"]);

    MailApp.sendEmail({
      to: emailMembroNorm,
      name: "BateCaixa",
      subject: "Você foi convidado para a equipe — BateCaixa",
      htmlBody: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1565C0,#0D47A1);padding:26px 30px;border-radius:14px 14px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;">🧾 BateCaixa</h1>
          </div>
          <div style="background:#fff;padding:26px 30px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 14px 14px;">
            <p style="font-size:15px;color:#333;">Olá, <strong>${nomeOperador}</strong>! 👋</p>
            <p style="font-size:14px;color:#333;">Você foi convidado por <strong>${nomeDono}</strong> para a equipe do BateCaixa.</p>
            <p style="font-size:13px;color:#546E7A;"><strong>Papel:</strong> ${papel||"Vendedor"}</p>
            <div style="background:#E8EAF6;border-radius:14px;padding:20px;text-align:center;margin:20px 0;">
              <p style="font-size:12px;color:#3949AB;margin:0 0 10px;font-weight:700;text-transform:uppercase;">Código de acesso</p>
              <div style="font-size:46px;font-weight:900;letter-spacing:14px;color:#1565C0;line-height:1;">${codigo}</div>
              <p style="font-size:12px;color:#90A4AE;margin:10px 0 0;">⏱️ Válido por 10 minutos</p>
            </div>
            <div style="text-align:center;margin:18px 0;">
              <a href="${URL_APP}" style="display:inline-block;background:#3949AB;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">👥 Acessar como funcionário</a>
            </div>
            <ol style="font-size:13px;color:#444;line-height:2;margin:0;padding-left:18px;">
              <li>Abra o BateCaixa: <a href="${URL_APP}" style="color:#1565C0;">${URL_APP}</a></li>
              <li>Toque em <strong>"Sou funcionário"</strong></li>
              <li>Digite seu e-mail e clique em <strong>Verificar</strong></li>
              <li>Clique em <strong>Enviar Código</strong> e use o código acima</li>
            </ol>
            <p style="font-size:11px;color:#B0BEC5;margin-top:22px;text-align:center;">Não esperava este convite? Pode ignorar este e-mail.</p>
            <p style="font-size:10px;color:#CFD8DC;text-align:center;margin-top:4px;">Enviado em ${horaEnvio} (horário de Brasília)</p>
          </div>
        </div>`
    });

    return { status: "Sucesso", mensagem: "Convite enviado para " + emailMembroNorm };
  } catch (err) {
    return { status: "Erro", mensagem: "Falha: " + err.message };
  }
}

// ── NOVA: editar nome e papel de membro existente sem reenviar convite ────────
function editarNomeMembro(emailDono, emailMembro, nomeOperador, papel, permissaoVenda) {
  try {
    const emailNorm = (emailMembro||"").toLowerCase().trim();
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Membros");
    const dados = aba.getDataRange().getValues();
    for (let i = 1; i < dados.length; i++) {
      if ((dados[i][0]||"").toLowerCase().trim() !== emailNorm) continue;
      if (nomeOperador)   aba.getRange(i+1, 8).setValue(nomeOperador);
      if (papel)          aba.getRange(i+1, 3).setValue(papel);
      if (permissaoVenda) aba.getRange(i+1, 9).setValue(permissaoVenda); // Item 2
      return { status: "Sucesso" };
    }
    return { status: "Erro", mensagem: "Membro não encontrado." };
  } catch(err) { return { status: "Erro", mensagem: err.message }; }
}

// ── Envia novo código OTP para membro que já está cadastrado ──────────────────
function solicitarAcessoMembro(emailMembro) {
  try {
    const emailNorm = (emailMembro||"").toLowerCase().trim();
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Membros");
    const dados = aba.getDataRange().getValues();

    for (let i = 1; i < dados.length; i++) {
      if ((dados[i][0]||"").toLowerCase().trim() !== emailNorm) continue;

      const emailDono = dados[i][1];
      const papel     = dados[i][2];
      const nomeDono  = buscarNomeLoja(emailDono) || emailDono;

      const codigo    = gerarCodigoOTP();
      const expiracao = new Date(Date.now() + 10 * 60 * 1000);
      aba.getRange(i+1, 6).setValue(codigo);
      aba.getRange(i+1, 7).setValue(expiracao);
      // Item 3: hora BR para o e-mail
      const horaEnvio = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm");

      MailApp.sendEmail({
        to: emailNorm,
        name: "BateCaixa",
        subject: "Seu novo código de acesso — BateCaixa",
        htmlBody: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#1565C0,#0D47A1);padding:22px 26px;border-radius:14px 14px 0 0;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:22px;">🧾 BateCaixa</h1>
            </div>
            <div style="background:#fff;padding:24px 26px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 14px 14px;">
              <p style="font-size:14px;color:#333;">Código para a equipe de <strong>${nomeDono}</strong>:</p>
              <div style="background:#E8EAF6;border-radius:14px;padding:20px;text-align:center;margin:16px 0;">
                <div style="font-size:46px;font-weight:900;letter-spacing:14px;color:#1565C0;line-height:1;">${codigo}</div>
                <p style="font-size:12px;color:#90A4AE;margin:10px 0 0;">⏱️ Válido por 10 minutos</p>
              </div>
              <p style="font-size:13px;color:#546E7A;">Papel: <strong>${papel}</strong></p>
              <div style="text-align:center;margin-top:16px;">
                <a href="${URL_APP}" style="display:inline-block;background:#3949AB;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;">Abrir BateCaixa</a>
              </div>
              <p style="font-size:11px;color:#B0BEC5;margin-top:18px;text-align:center;">Não solicitou? Pode ignorar.</p>
              <p style="font-size:10px;color:#CFD8DC;text-align:center;margin-top:4px;">Enviado em ${horaEnvio} (horário de Brasília)</p>
            </div>
          </div>`
      });
      return { status: "Sucesso" };
    }
    return { status: "Erro", mensagem: "E-mail não encontrado como membro. Peça ao responsável para te cadastrar em Configurações → Membros." };
  } catch (err) {
    return { status: "Erro", mensagem: "Falha ao enviar código: " + err.message };
  }
}

// ── Valida o código OTP e retorna dados da sessão ─────────────────────────────
function validarCodigoMembro(emailMembro, codigo) {
  try {
    const emailNorm = (emailMembro||"").toLowerCase().trim();
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Membros");
    const dados = aba.getDataRange().getValues();

    for (let i = 1; i < dados.length; i++) {
      if ((dados[i][0]||"").toLowerCase().trim() !== emailNorm) continue;

      const codigoSalvo  = String(dados[i][5]||"").trim();
      const expiracao    = new Date(dados[i][6]);
      const papel        = toStr(dados[i][2]);
      const emailDono    = (dados[i][1]||"").toLowerCase().trim();
      const nomeOperador = toStr(dados[i][7]) || emailNorm.split("@")[0]; // coluna H
      const permissaoVenda = toStr(dados[i][8]) || "individual"; // coluna I — Item 2

      if (!codigoSalvo) return { liberado: false, mensagem: "Código não encontrado. Use 'Enviar novo código'." };
      if (codigoSalvo !== String(codigo||"").trim()) return { liberado: false, mensagem: "Código incorreto. Verifique o e-mail." };
      if (new Date() > expiracao) return { liberado: false, mensagem: "Código expirado. Use 'Enviar novo código'." };

      aba.getRange(i+1, 4).setValue("Ativo");
      aba.getRange(i+1, 6).setValue(""); // invalida o código

      const acessoDono = verificarAcessoSaaS(emailDono, false);
      if (!acessoDono.liberado) return { liberado: false, mensagem: "A licença da loja está inativa. Fale com o responsável." };

      const dadosIniciais = carregarDadosDashboard(emailDono);
      const nomeLoja      = buscarNomeLoja(emailDono);
      registrarEvento(emailNorm, "loginMembro→"+emailDono, "Sucesso");

      return { liberado: true, papel, emailDono, nomeLoja, nome: nomeOperador, nomeOperador, permissaoVenda, dadosIniciais };
    }
    return { liberado: false, mensagem: "E-mail não encontrado como membro." };
  } catch (err) {
    return { liberado: false, mensagem: err.message };
  }
}

// ── Retorna lista de membros do dono ──────────────────────────────────────────
function buscarMembros(emailDono) {
  try {
    const emailNorm = (emailDono||"").toLowerCase().trim();
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Membros");
    const dados = aba.getDataRange().getValues();
    return dados.slice(1)
      .filter(l => (l[1]||"").toLowerCase().trim() === emailNorm)
      .map((l, idx) => ({
        email:         toStr(l[0]),
        papel:         toStr(l[2]),
        status:        toStr(l[3]),
        dataCadastro:  l[4],
        linha:         idx+2,
        nomeOperador:  toStr(l[7]),       // coluna H
        permissaoVenda:toStr(l[8]) || "individual" // coluna I — Item 2
      }));
  } catch { return []; }
}

// ── Remove membro da equipe ───────────────────────────────────────────────────
function removerMembro(emailDono, emailMembro) {
  try {
    const dono   = (emailDono  ||"").toLowerCase().trim();
    const membro = (emailMembro||"").toLowerCase().trim();
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Membros");
    const dados = aba.getDataRange().getValues();
    for (let i = dados.length-1; i >= 1; i--) {
      if ((dados[i][0]||"").toLowerCase().trim() === membro &&
          (dados[i][1]||"").toLowerCase().trim() === dono) {
        aba.deleteRow(i+1);
        return { status: "Sucesso" };
      }
    }
    return { status: "Erro", mensagem: "Membro não encontrado." };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}