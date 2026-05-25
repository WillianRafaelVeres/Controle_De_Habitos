# Testes manuais obrigatorios

## Cenario 1 - historico preservado ao remover

1. Criar a rotina `Beber agua`.
2. Marcar a rotina como concluida em 3 dias diferentes pelo calendario.
3. Abrir Estatisticas e conferir o total do mes e o total historico.
4. Voltar em Rotinas e remover `Beber agua`.
5. Conferir que ela saiu da rotina atual no Inicio.
6. Conferir que as 3 conclusoes continuam contando em Estatisticas e no detalhe dos dias do Calendario.

## Cenario 2 - editar dia passado

1. Abrir Calendario e selecionar uma data passada.
2. Marcar uma rotina como concluida nessa data.
3. Conferir que os totais do mes, ultimos 7/30 dias quando aplicavel e historico foram atualizados.
4. Voltar ao mesmo dia e desmarcar a rotina.
5. Conferir que os numeros retornaram ao estado anterior.

## Cenario 3 - rotina arquivada nao aparece hoje

1. Remover uma rotina existente.
2. Abrir Inicio e conferir que ela nao aparece nas rotinas de hoje.
3. Abrir Calendario em um dia antigo que tinha registro dessa rotina.
4. Conferir que o registro continua aparecendo e contando.

## Cenario 4 - migracao

1. Usar uma instalacao antiga do app com rotinas e `routine_logs` sem `archived_at`, `routine_name_snapshot`, `completed_at` e `updated_at`.
2. Instalar a nova versao por cima, sem desinstalar.
3. Abrir o app para rodar a migracao automaticamente.
4. Exportar o backup em Ajustes.
5. Conferir que as rotinas foram preservadas, que `schema_version` virou `2`, que logs antigos receberam `routine_name_snapshot` e que nenhuma conclusao foi perdida.

## Cenario 5 - atualizar no celular sem perder dados

1. Gerar uma nova build mantendo `android.package` como `com.rafael.controledehabitos`.
2. Instalar o APK por cima da versao antiga, sem desinstalar e sem limpar dados/cache.
3. Abrir o app.
4. Conferir que rotinas, conclusoes antigas, estatisticas e calendario continuam disponiveis.

## Observacoes de seguranca

- Nao desinstalar o app antes de instalar a atualizacao.
- Nao limpar dados ou cache do aplicativo.
- Nao mudar `android.package`, `applicationId` ou `bundleIdentifier`.
- Nao trocar a chave de assinatura Android ao publicar/instalar sobre uma versao assinada.
- Usar Ajustes > Exportar backup antes de testar migracoes em aparelhos com dados importantes.
