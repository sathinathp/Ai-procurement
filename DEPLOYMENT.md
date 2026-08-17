# Complete Guide: Hosting Multiple Applications on a Single VPS

This guide details how to host 2 or 3 independent applications on your virtual private server (VPS) with the IP address **`52.144.45.25`** using **Docker**, **Nginx**, and **Let's Encrypt SSL**.

---

## 1. System Architecture

```mermaid
graph TD
    Client[Users / Browsers] -->|HTTPS Requests| Nginx[Nginx Reverse Proxy on Server]
    
    Nginx -->|app1.yourdomain.com| App1_FE[App 1 Frontend - Port 5173]
    Nginx -->|api1.yourdomain.com| App1_BE[App 1 Backend - Port 8000]
    
    Nginx -->|app2.yourdomain.com| App2_FE[App 2 Frontend - Port 5174]
    Nginx -->|api2.yourdomain.com| App2_BE[App 2 Backend - Port 8001]
```

---

## 2. DNS Configuration

For the server to route traffic correctly, map your domains or subdomains to your server's IP address (`52.144.45.25`) in your domain registrar's DNS panel (GoDaddy, Namecheap, Route53, etc.).

Add **A Records** pointing to your server:

| Type | Name / Host | Value (IP Address) | Description |
| :--- | :--- | :--- | :--- |
| **A** | `app1` | `52.144.45.25` | Frontend for App 1 (e.g. `app1.yourdomain.com`) |
| **A** | `api1` | `52.144.45.25` | Backend for App 1 (e.g. `api1.yourdomain.com`) |
| **A** | `app2` | `52.144.45.25` | Frontend for App 2 (e.g. `app2.yourdomain.com`) |
| **A** | `api2` | `52.144.45.25` | Backend for App 2 (e.g. `api2.yourdomain.com`) |

---

## 3. Server Setup & Dependencies

Connect to your server via SSH:
```bash
ssh root@52.144.45.25
```

Install Docker, Docker Compose, Nginx, and Certbot:
```bash
# 1. Update packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Install Nginx & Certbot
sudo apt install nginx certbot python3-certbot-nginx -y
```

---

## 4. Application Docker Configurations

Each application must bind to a **unique port** on the host server to prevent conflicts.

### App 1: AI Procurement
Place your files in `/var/www/app1`.
Create `/var/www/app1/docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: app1_backend
    restart: always
    ports:
      - "8000:8000" # Host Port 8000
    environment:
      - DATABASE_URL=postgresql://user:pass@host/db
      # Other variables...

  frontend:
    build: ./frontend
    container_name: app1_frontend
    restart: always
    ports:
      - "5173:5173" # Host Port 5173
    environment:
      - VITE_API_URL=https://api1.yourdomain.com
```

### App 2: Second Application
Place your files in `/var/www/app2`.
Create `/var/www/app2/docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: app2_backend
    restart: always
    ports:
      - "8001:8000" # Host Port 8001 (Maps to container's 8000)
    environment:
      - DATABASE_URL=postgresql://user:pass@host/db2
      # Other variables...

  frontend:
    build: ./frontend
    container_name: app2_frontend
    restart: always
    ports:
      - "5174:5173" # Host Port 5174 (Maps to container's 5173)
    environment:
      - VITE_API_URL=https://api2.yourdomain.com
```

---

## 5. Nginx Reverse Proxy Configuration

Nginx will receive all requests on ports `80` (HTTP) and `443` (HTTPS) and route them to the correct Docker port based on the domain name.

Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/multi-apps
```

Paste the following configuration (replace `yourdomain.com` with your actual domain):

```nginx
# ==========================================
# APPLICATION 1 (AI Procurement)
# ==========================================

# Frontend
server {
    listen 80;
    server_name app1.yourdomain.com;

    location / {
        proxy_pass http://localhost:5173; # Routes to App 1 Frontend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend
server {
    listen 80;
    server_name api1.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000; # Routes to App 1 Backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}

# ==========================================
# APPLICATION 2 (Second App)
# ==========================================

# Frontend
server {
    listen 80;
    server_name app2.yourdomain.com;

    location / {
        proxy_pass http://localhost:5174; # Routes to App 2 Frontend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend
server {
    listen 80;
    server_name api2.yourdomain.com;

    location / {
        proxy_pass http://localhost:8001; # Routes to App 2 Backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

Enable the configuration and restart Nginx:
```bash
# Link config to enabled sites
sudo ln -s /etc/nginx/sites-available/multi-apps /etc/nginx/sites-enabled/

# Test syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 6. Obtain Free SSL Certificates (HTTPS)

Run Certbot to fetch SSL certificates for all your subdomains. Certbot will automatically edit your Nginx files to enforce secure connections.

```bash
sudo certbot --nginx -d app1.yourdomain.com -d api1.yourdomain.com -d app2.yourdomain.com -d api2.yourdomain.com
```

Select **Redirect** (usually option `2`) when asked to redirect all HTTP traffic to HTTPS.

---

## 7. Starting and Managing Applications

### Start App 1:
```bash
cd /var/www/app1
docker-compose up -d --build
```

### Start App 2:
```bash
cd /var/www/app2
docker-compose up -d --build
```

### Useful Maintenance Commands:
```bash
# View container status
docker ps

# View backend logs for App 1
cd /var/www/app1 && docker-compose logs -f backend

# Restart Nginx after adding a 3rd application
sudo systemctl restart nginx
```
