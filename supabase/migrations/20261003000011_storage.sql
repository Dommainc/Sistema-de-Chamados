-- =============================================================================
-- 0011 — Storage: bucket privado "anexos"
--
-- Upload: a FastAPI valida nome/tipo/tamanho e devolve uma URL ASSINADA DE
-- UPLOAD; o navegador envia direto ao Storage (o limite de corpo das funções da
-- Vercel é 4,5 MB, menor que os 10 MB permitidos). Depois a API confirma o
-- arquivo e grava em public.anexos. Por isso NÃO há policy de INSERT para
-- usuários: só a URL assinada permite enviar.
--
-- Os limites abaixo são uma segunda barreira, aplicada pelo próprio Storage.
-- Se mudar o limite em configuracoes.anexo_tamanho_max_mb, atualize aqui também
-- (nova migration).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos',
  'anexos',
  false,
  10485760,  -- 10 MB
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura (inclusive gerar URL assinada de download) só para quem pode ver o
-- registro do anexo. Anexos de mensagens internas ficam invisíveis ao solicitante.
create policy anexos_storage_leitura on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and app.pode_ver_anexo_path(name));
