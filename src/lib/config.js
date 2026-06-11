// ============================================================
// Flags de configuração da app
// ============================================================

// Mostrar opções de pagamento / planos.
//
// Enquanto o Stripe NÃO estiver configurado, mantém isto a FALSE. Com FALSE,
// em nenhum ecrã aparece opção de pagar:
//   - a página de planos mostra "renovação em breve" em vez de preços;
//   - o header e a página da conta não mostram "Ver planos".
//
// Quando o Stripe estiver pronto (ver PAGAMENTOS.md), muda para true e republica.
// Por segurança, só fica ligado se também existirem os Price IDs nas variáveis
// de ambiente do Vercel — assim nunca aparece um botão de pagar sem checkout real.
const MASTER_SWITCH = false;

export const PAYMENTS_ENABLED =
  MASTER_SWITCH &&
  Boolean(import.meta.env.VITE_STRIPE_PRICE_ONE_OFF_6M) &&
  Boolean(import.meta.env.VITE_STRIPE_PRICE_ONE_OFF_12M);
