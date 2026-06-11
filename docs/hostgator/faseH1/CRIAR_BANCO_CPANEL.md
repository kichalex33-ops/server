# Guia: Criação de Banco de Dados no cPanel (HostGator)

Para preparar a migração, siga os passos abaixo para criar o banco de dados no ambiente da HostGator.

## Passo 1: Criar o Banco de Dados
1. Acesse o **cPanel** da sua conta HostGator.
2. Localize a seção **Bancos de Dados**.
3. Clique em **Bancos de Dados MySQL®**.
4. Em "Criar Novo Banco de Dados", digite o nome (ex: `andrade_logistica`).
5. Clique em **Criar Banco de Dados**.

## Passo 2: Criar o Usuário do Banco
1. No mesmo menu, role até **Usuários MySQL -> Adicionar Novo Usuário**.
2. Digite um nome de usuário (ex: `andrade_admin`).
3. Gere uma senha forte e salve-a com segurança.
4. Clique em **Criar Usuário**.

## Passo 3: Vincular Usuário ao Banco
1. Role até **Adicionar Usuário ao Banco de Dados**.
2. Selecione o usuário criado e o banco de dados criado.
3. Clique em **Adicionar**.
4. Marque a opção **TODOS OS PRIVILÉGIOS**.
5. Clique em **Fazer Alterações**.

---
**Nota:** O prefixo do banco e do usuário costuma ser o nome de usuário da sua conta cPanel (ex: `usercpanel_andrade_logistica`). Utilize este nome completo nas configurações futuras.
