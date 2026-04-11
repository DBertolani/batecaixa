/* ==================================================================================
   ARQUIVO: Util.js
   
   ADICIONADO: toDataISO(val)
   
   PROBLEMA RAIZ de "dados não carregam":
   O Google Sheets converte automaticamente strings que parecem datas ("2025-03-20")
   para objetos JavaScript Date quando são lidas com getValues(). Assim, ao fazer
   String(v[1]) o resultado é "Thu Mar 20 2025 00:00:00 GMT-0300" em vez de
   "2025-03-20", fazendo todos os filtros de mês/dia falharem silenciosamente.
   
   SOLUÇÃO: toDataISO() detecta se o valor é Date e usa Utilities.formatDate()
   para converter corretamente. Para strings já no formato correto, usa como está.
================================================================================== */

function retornarJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function registrarEvento(email, acao, status, detalhes = "") {
  try {
    const ss  = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba = ss.getSheetByName("Logs_Acesso");
    aba.appendRow([new Date(), email, acao, status, detalhes]);
  } catch {}
}

function formatarDataBR(dataISO) {
  if (!dataISO) return "";
  try {
    const [ano, mes, dia] = String(dataISO).split("-");
    return dia + "/" + mes + "/" + ano;
  } catch { return dataISO; }
}

// ─── FIX PRINCIPAL: converte qualquer valor de data para "yyyy-MM-dd" ──────────
// O Google Sheets retorna Date objects quando a célula contém uma data válida.
// Isso quebra todos os filtros de mês/dia que usam String(v[1]).startsWith("2025-03").
function toDataISO(val) {
  if (!val) return "";
  // Se já é um objeto Date (Sheets converte automaticamente)
  if (val instanceof Date) {
    return Utilities.formatDate(val, "America/Sao_Paulo", "yyyy-MM-dd");
  }
  const s = String(val).trim();
  if (!s) return "";
  // Se está no formato dd/MM/yyyy (data brasileira em texto)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return y + "-" + m + "-" + d;
  }
  // Se já está no formato yyyy-MM-dd, retorna como está
  return s.substring(0, 10);
}

// Converte valor de número/string para string segura (evita telefone.replace error)
function toStr(val) {
  if (val === null || val === undefined) return "";
  return String(val);
}