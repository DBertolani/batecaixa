// ============================================================
// ARQUIVO: MercadoPago.gs  — BateCaixa Backend
// Substitua o conteúdo completo deste arquivo no Apps Script.
// ============================================================
//
// CONFIGURAÇÃO INICIAL (faça apenas uma vez):
//   1. Apps Script → menu ⚙️ Projeto → Propriedades do script
//   2. Clique em "Adicionar propriedade":
//        Nome:  MP_ACCESS_TOKEN
//        Valor: seu access token de PRODUÇÃO do Mercado Pago
//   3. Para receber webhooks: MP → Suas integrações → Webhooks → URL do Web App
// ============================================================

// Nota: a constante PLANOS_MP foi removida intencionalmente.
// Todos os valores de plano (preço, nome, frequência) são lidos
// EXCLUSIVAMENTE da aba Config_Planos da Planilha Motor.


// ── Auxiliar: lê planos sempre frescos, invalida cache antes ─────────────────
//
// O Apps Script pode manter resultados antigos em cache por horas.
// Ex: dono muda R$ 29,90 → R$ 1,00 na planilha, mas o sistema continua
// cobrando R$ 29,90 enquanto o cache não expira.
// Esta função limpa o cache ANTES de chamar buscarPlanosAtivos(), garantindo
// leitura imediata da planilha a cada requisição de pagamento.
//
function _planosAtualizados() {
  try {
    // Remove qualquer entrada de planos do cache de script
    CacheService.getScriptCache().removeAll(["planos_ativos", "config_planos"]);
  } catch (e) {
    // Silencioso — limpeza de cache nunca deve bloquear a busca
  }

  // Busca direta na planilha — definida em Acesso.js
  const planos = buscarPlanosAtivos();

  if (!planos || planos.length === 0) {
    throw new Error(
      "Nenhum plano ativo na planilha Config_Planos. " +
      "Execute verificarPlanilhaMotor() no editor do Apps Script para criar a aba."
    );
  }

  return planos;
}


// ── Infere a frequência em meses a partir do ID do plano ─────────────────────
// Regra: "tri" → 3 meses | "sem" → 6 meses | "anu" → 12 meses | qualquer outro → 1 mês
function _frequenciaDoPlano(idPlano) {
  const id = String(idPlano || "").toLowerCase();
  if (id.includes("tri")) return 3;
  if (id.includes("sem")) return 6;
  if (id.includes("anu")) return 12;
  return 1;
}


// ── gerarLinkAssinatura: checkout com Cartão (valor vem da planilha) ──────────
// Retorna { ok: true, link, subscriptionId } ou { ok: false, erro }
function gerarLinkAssinatura(email, idPlano) {
  try {
    const accessToken = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MP_ACCESS_TOKEN não configurado nas Propriedades do Script.");

    // ─── Busca planilha (sem fallback para valores fixos) ────────────────────
    const planos      = _planosAtualizados();
    const planoConfig = planos.find(p => p.id === idPlano);

    if (!planoConfig) {
      return {
        ok:   false,
        erro: "Plano \'" + idPlano + "\' não encontrado ou Inativo na planilha Config_Planos."
      };
    }

    const valorReal  = parseFloat(planoConfig.preco || planoConfig.valor || 0);
    const nomePlano  = planoConfig.nome || "BateCaixa";
    const frequencia = _frequenciaDoPlano(idPlano);

    if (!valorReal || valorReal <= 0) {
      return { ok: false, erro: "Valor inválido (R$ " + valorReal + ") na planilha para o plano \'" + idPlano + "\'. Corrija e tente novamente." };
    }

    const payload = {
      reason:      nomePlano,        // ← nome da planilha
      payer_email: email,
      back_url:    URL_APP,          // definida em Roteador.js
      status:      "pending",
      auto_recurring: {
        frequency:          frequencia,    // ← calculado pelo ID
        frequency_type:     "months",
        transaction_amount: valorReal,     // ← valor da planilha
        currency_id:        "BRL"
      },
      payment_methods_allowed: {
        payment_types: [
          { id: "credit_card"   },
          { id: "debit_card"    },
          { id: "bank_transfer" }  // PIX
        ],
        payment_methods: []
      }
    };

    const options = {
      method:  "post",
      headers: {
        "Authorization":     "Bearer " + accessToken,
        "X-Idempotency-Key": Utilities.getUuid(),
        "Content-Type":      "application/json"
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response   = UrlFetchApp.fetch("https://api.mercadopago.com/preapproval", options);
    const httpStatus = response.getResponseCode();
    const body       = JSON.parse(response.getContentText());

    if ((httpStatus === 200 || httpStatus === 201) && body.init_point) {
      registrarEvento(email, "gerarLinkAssinatura:" + idPlano, "Sucesso:" + body.id + " val:" + valorReal);
      return { ok: true, link: body.init_point, subscriptionId: body.id };
    }

    const erroDetalhe = JSON.stringify(body).substring(0, 300);
    registrarEvento(email, "gerarLinkAssinatura:" + idPlano, "Erro:" + httpStatus + " " + erroDetalhe);
    return { ok: false, erro: body.message || "Erro " + httpStatus + " na API do Mercado Pago." };

  } catch (err) {
    registrarEvento(email || "?", "gerarLinkAssinatura:EXCECAO", err.message);
    return { ok: false, erro: err.message };
  }
}


// ── gerarPixAvulso: QR Code PIX direto no app (valor vem da planilha) ─────────
// Retorna { ok: true, qrCode, qrCodeBase64, valor, expiracao } ou { ok: false, erro }
function gerarPixAvulso(email, idPlano) {
  try {
    const accessToken = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MP_ACCESS_TOKEN não configurado nas Propriedades do Script.");

    // ─── Busca planilha (sem fallback para valores fixos) ────────────────────
    const planos      = _planosAtualizados();
    const planoConfig = planos.find(p => p.id === idPlano);

    if (!planoConfig) {
      return {
        ok:   false,
        erro: "Plano \'" + idPlano + "\' não encontrado ou Inativo na planilha Config_Planos."
      };
    }

    const valorReal    = parseFloat(planoConfig.preco || planoConfig.valor || 0);
    const nomePlano    = planoConfig.nome || "BateCaixa — " + idPlano;
    const primeiroNome = email.split("@")[0];

    if (!valorReal || valorReal <= 0) {
      return { ok: false, erro: "Valor inválido (R$ " + valorReal + ") na planilha para o plano \'" + idPlano + "\'. Corrija e tente novamente." };
    }

    const dadosPagamento = {
      transaction_amount: valorReal,      // ← valor da planilha
      description:        nomePlano,      // ← nome da planilha
      payment_method_id:  "pix",
      payer: {
        email:          email,
        first_name:     primeiroNome,
        last_name:      "BateCaixa",
        identification: { type: "CPF", number: "00000000000" }
      },
      metadata: { plano: idPlano, emailCliente: email }
    };

    const options = {
      method:  "post",
      headers: {
        "Authorization":     "Bearer " + accessToken,
        "X-Idempotency-Key": Utilities.getUuid(),  // obrigatório pela API MP
        "Content-Type":      "application/json"
      },
      payload:            JSON.stringify(dadosPagamento),
      muteHttpExceptions: true
    };

    const response   = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments", options);
    const httpStatus = response.getResponseCode();
    const body       = JSON.parse(response.getContentText());

    if ((httpStatus === 200 || httpStatus === 201) && body.point_of_interaction?.transaction_data) {
      const txData = body.point_of_interaction.transaction_data;
      registrarEvento(email, "gerarPixAvulso:" + idPlano, "Sucesso:" + body.id + " val:" + valorReal);
      return {
        ok:           true,
        pixId:        body.id,
        qrCode:       txData.qr_code,        // texto Copia e Cola
        qrCodeBase64: txData.qr_code_base64, // imagem base64 do QR Code
        valor:        valorReal,
        expiracao:    body.date_of_expiration || ""
      };
    }

    const erroDetalhe = JSON.stringify(body).substring(0, 300);
    registrarEvento(email, "gerarPixAvulso:" + idPlano, "Erro:" + httpStatus + " " + erroDetalhe);
    return { ok: false, erro: body.message || "Erro " + httpStatus + " ao gerar PIX." };

  } catch (err) {
    registrarEvento(email || "?", "gerarPixAvulso:EXCECAO", err.message);
    return { ok: false, erro: err.message };
  }
}


// ── processarWebhookMP: notificações do Mercado Pago via doPost ───────────────
function processarWebhookMP(payload) {
  try {
    const tipo = payload?.type || "";
    const id   = String(payload?.data?.id || payload?.id || "").trim();

    if (!id) return { recebido: true, ignorado: "sem id" };

    const accessToken = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
    const optGet = {
      method:             "get",
      headers:            { "Authorization": "Bearer " + accessToken },
      muteHttpExceptions: true
    };

    // ── Assinatura recorrente (Cartão) ────────────────────────────────────────
    if (tipo === "subscription_preapproval") {
      const resp  = UrlFetchApp.fetch("https://api.mercadopago.com/preapproval/" + id, optGet);
      const sub   = JSON.parse(resp.getContentText());
      const email = (sub.payer_email || "").toLowerCase().trim();
      const st    = sub.status;

      if (st === "authorized") {
        // Extrair plano do external_reference ou usar padrão
        const planoId = sub.external_reference || "mensal_premium";
        _ativarOuRenovarPorMP(email, 31, "Assinatura Cartão", planoId);
      } else if (st === "cancelled") {
        registrarEvento(email, "webhookMP:cartao:cancelado", id);
      } else if (st === "paused") {
        registrarEvento(email, "webhookMP:cartao:pausado", id);
      }
      return { recebido: true, tipo, status: st, email, metodo: "cartao" };
    }

    // ── Pagamento avulso: PIX ou cobrança de recorrência ──────────────────────
    if (tipo === "payment") {
      const resp    = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments/" + id, optGet);
      const payment = JSON.parse(resp.getContentText());
      const email   = (payment.payer?.email || "").toLowerCase().trim();
      const st      = payment.status;
      const metodo  = payment.payment_method_id || "";
      const plano   = payment.metadata?.plano || "mensal";

      if (st === "approved") {
        const planoId = payment.metadata?.plano || "mensal_premium";
        if (metodo === "pix") {
          _ativarOuRenovarPorMP(email, 31, "PIX #" + id + " (" + plano + ")", planoId);
          registrarEvento(email, "webhookMP:pix:aprovado", id);
        } else {
          _ativarOuRenovarPorMP(email, 31, "Cartão #" + id + " (" + metodo + ")", planoId);
          registrarEvento(email, "webhookMP:cartao:aprovado", id);
        }
      } else if (st === "pending" && metodo === "pix") {
        // PIX criado mas ainda não pago — não ativa, apenas loga
        registrarEvento(email, "webhookMP:pix:pendente", id);
      } else if (st === "rejected" || st === "cancelled") {
        registrarEvento(email, "webhookMP:rejeitado:" + metodo, id);
      }

      return { recebido: true, tipo, status: st, metodo, email };
    }

    return { recebido: true, tipo: "ignorado:" + tipo };

  } catch (err) {
    console.error("processarWebhookMP:", err.message);
    return { recebido: true, erro: err.message };
  }
}


// ── Ativa ou renova acesso na aba Clientes da Planilha Motor ──────────────────
function _ativarOuRenovarPorMP(email, dias, descricaoPlano, planoId) {
  try {
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Clientes");
    const dados = aba.getDataRange().getValues();

    const novoVenc = new Date();
    novoVenc.setDate(novoVenc.getDate() + dias);
    const vencStr = Utilities.formatDate(novoVenc, "America/Sao_Paulo", "yyyy-MM-dd");
    
    // ID do plano padrão se não informado
    const idPlano = planoId || "mensal_premium";

    // Atualiza cliente existente
    for (let i = 1; i < dados.length; i++) {
      if ((dados[i][0]||"").toLowerCase().trim() !== email) continue;
      aba.getRange(i+1, 3).setValue("Ativo");
      aba.getRange(i+1, 4).setValue(vencStr);
      aba.getRange(i+1, 5).setValue(descricaoPlano);
      aba.getRange(i+1, 6).setValue(idPlano);  // ← NOVO: Salvar ID do plano (coluna F)
      registrarEvento(email, "ativarPorMP", "Vence:" + vencStr + " | " + descricaoPlano + " | Plano:" + idPlano);
      return;
    }

    // Cliente novo: cria registro e planilha de dados
    aba.appendRow([email, email, "Ativo", vencStr, descricaoPlano, idPlano]);
    abrirPlanilhaBateCaixa(email);
    registrarEvento(email, "novoClienteMP", "Vence:" + vencStr + " | " + descricaoPlano + " | Plano:" + idPlano);
  } catch (err) {
    registrarEvento(email, "ativarOuRenovarPorMP:ERRO", err.message);
  }
}