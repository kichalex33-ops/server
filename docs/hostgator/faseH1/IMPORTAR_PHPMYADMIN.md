# Guia: Importação via phpMyAdmin

Após criar o banco no cPanel, siga este guia para importar a estrutura e os dados de base.

## Localização dos Arquivos
Os arquivos necessários estão em: `database/hostgator/` no repositório.

## Passo 1: Importar o Schema (Estrutura)
1. No cPanel, abra o **phpMyAdmin**.
2. No menu lateral esquerdo, clique no nome do banco de dados que você criou.
3. Clique na aba **Importar** (no menu superior).
4. Clique em **Escolher arquivo** e selecione o arquivo `schema.sql`.
5. Verifique se o formato está como SQL e o Charset como UTF-8.
6. Clique no botão **Executar** ao final da página.

## Passo 2: Importar o Seed (Dados de Referência)
1. Clique novamente na aba **Importar**.
2. Selecione o arquivo `seed.sql`.
3. Clique em **Executar**.

## Passo 3: Verificação
1. Clique na aba **SQL**.
2. Copie e cole o conteúdo do arquivo `check_schema.sql` na caixa de texto.
3. Clique em **Executar**.
4. Você deve ver a lista de tabelas e a confirmação dos perfis inseridos.

---
**Sucesso!** O banco agora está pronto para receber o novo backend na Fase H2.
