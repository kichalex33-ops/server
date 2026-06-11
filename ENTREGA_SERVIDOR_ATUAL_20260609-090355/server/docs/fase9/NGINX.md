# Nginx

## Objetivo

Publicar o dominio externo apontando para o Node.js em `localhost:3000`.

## Exemplo de site

Arquivo sugerido: `/etc/nginx/sites-available/painel-logistico`.

```nginx
server {
    listen 80;
    server_name painellogistico.seudominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Ativar

```bash
sudo ln -s /etc/nginx/sites-available/painel-logistico /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Nao aplicar sem confirmar dominio, IP e acesso ao servidor.
