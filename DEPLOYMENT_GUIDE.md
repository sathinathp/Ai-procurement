# Production Deployment, Database & Domain Integration Guide

This guide provides step-by-step instructions for deploying your AI Procurement application from your local workspace to your virtual private server (VPS) at **`52.144.45.25`**, integrating your database, and linking your custom domain.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Uploading Your Code to GitHub](#step-1-uploading-your-code-to-github)
3. [Step 2: Authenticating and Cloning on the Server](#step-2-authenticating-and-cloning-on-the-server)
4. [Step 3: Database Integration Options](#step-3-database-integration-options)
5. [Step 4: Custom Domain & Nginx Configuration](#step-4-custom-domain--nginx-configuration)
6. [Step 5: Obtaining Free Let's Encrypt SSL Certificates](#step-5-obtaining-free-lets-encrypt-ssl-certificates)
7. [Step 6: Running the Application in Production](#step-6-running-the-application-in-production)
8. [Troubleshooting & Maintenance Commands](#troubleshooting--maintenance-commands)

---

## 1. Prerequisites
- A remote server (VPS) running Ubuntu 20.04/22.04 LTS (IP: `52.144.45.25`).
- SSH access to your VPS with root/sudo privileges.
- A custom domain name registered with GoDaddy, Namecheap, Route53, etc.
- A GitHub account.

---

## Step 1: Uploading Your Code to GitHub

If you have not already pushed your code to a GitHub repository, follow these steps locally:

1. **Initialize Git (if not done):**
   ```bash
   git init
   ```
2. **Add all files to staging:**
   ```bash
   git add .
   ```
3. **Commit the changes:**
   ```bash
   git commit -m "feat: Initial commit for AI Procurement deployment"
   ```
4. **Create a GitHub repository:**
   - Go to [GitHub](https://github.com) and create a new repository (e.g., `ai-procurement`).
   - Keep it private if your credentials or API keys are present (make sure `.env` is listed in your `.gitignore` so they are not leaked).
5. **Add the remote URL and push:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

---

## Step 2: Authenticating and Cloning on the Server

To securely pull your repository onto the server, use GitHub **SSH Keys** or **Deploy Keys**:

1. **SSH into your VPS:**
   ```bash
   ssh root@52.144.45.25
   ```
2. **Generate an SSH key on the server:**
   ```bash
   ssh-keygen -t ed25519 -C "server-deploy@humanattest.com"
   # Press Enter to accept default location and no passphrase.
   ```
3. **Copy the public key:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
4. **Add to GitHub:**
   - Go to your GitHub repository -> **Settings** -> **Deploy Keys** -> **Add deploy key**.
   - Paste the public key, title it "Production Server", and click **Add Key** (leave "Allow write access" unchecked for security).
5. **Clone the repository on the server:**
   Create a folder `/var/www/` if it doesn't exist, navigate to it, and clone:
   ```bash
   sudo mkdir -p /var/www
   cd /var/www
   git clone git@github.com:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git procurement
   cd procurement
   ```

---

## Step 3: Database Integration Options

Your application has two primary database architectures available:

### Option A: Use the Local Docker PostgreSQL Database (Recommended for simple setup)
The included `docker-compose.yml` automatically provisions and starts a production-ready PostgreSQL container.
- **Docker Service Name:** `db`
- **Internal Hostname:** `db` (accessible inside the Docker network)
- **Default Port:** `5432`
- **Data Persistence:** Stored in a Docker volume named `postgres_data` so data is not lost on container restarts.

To use the local PostgreSQL DB, your production `/var/www/procurement/backend/.env` should contain:
```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/procurement
```

### Option B: Use an External Managed Database (e.g. Supabase, AWS RDS, MongoDB Atlas)
If you prefer a hosted database like Supabase (PostgreSQL) or MongoDB:
1. Provision a PostgreSQL instance on your cloud provider.
2. In your `/var/www/procurement/backend/.env`, set the `DATABASE_URL` to your external database connection string:
   ```env
   DATABASE_URL=postgresql://your_user:your_password@your_supabase_host:5432/your_database
   ```
3. Update `docker-compose.yml` to remove the `db` service section and the `depends_on: - db` links if you no longer need the local container running.

---

## Step 4: Custom Domain & Nginx Configuration

To connect your domain, configure DNS records and Nginx to act as a reverse proxy.

### A. Point DNS Records to your VPS
Log into your Domain Registrar (GoDaddy, Namecheap, Route53, etc.) and add the following **A Records**:

| Type | Name / Host | Points To (IP) | Description |
| :--- | :--- | :--- | :--- |
| **A** | `procure` (or `@` for root) | `52.144.45.25` | Maps `humanattest.com` to the frontend |
| **A** | `api-procure` | `52.144.45.25` | Maps `api-humanattest.com` to the backend |

### B. Configure Nginx on the Server
1. **Install Nginx if not installed:**
   ```bash
   sudo apt update
   sudo apt install nginx -y
   ```
2. **Create a site configuration file:**
   ```bash
   sudo nano /etc/nginx/sites-available/procurement
   ```
3. **Paste the configuration** (replace `humanattest.com` with your actual domain):
   ```nginx
   # ==========================================
   # FRONTEND REVERSE PROXY
   # ==========================================
   server {
       listen 80;
       server_name humanattest.com;

       location / {
           proxy_pass http://127.0.0.1:5183; # Directs to React frontend port
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }

   # ==========================================
   # BACKEND REVERSE PROXY
   # ==========================================
   server {
       listen 80;
       server_name api.humanattest.com;

       location / {
           proxy_pass http://127.0.0.1:8050; # Directs to FastAPI backend port
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           client_max_body_size 50M;
       }
   }
   ```
4. **Enable the site and verify configuration:**
   ```bash
   # Link the config to enabled-sites
   sudo ln -sf /etc/nginx/sites-available/procurement /etc/nginx/sites-enabled/
   
   # Test Nginx syntax
   sudo nginx -t
   
   # Restart Nginx
   sudo systemctl restart nginx
   ```

---

## Step 5: Obtaining Free Let's Encrypt SSL Certificates

Secure your application using Certbot to generate HTTPS certificates:

1. **Install Certbot and Nginx Plugin:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```
2. **Generate the SSL Certificates:**
   Run the interactive installer (replace `humanattest.com` with your domain):
   ```bash
    sudo certbot --nginx -d humanattest.com -d api.humanattest.com
   ```
3. **Redirect HTTP traffic to HTTPS:**
   Select option `2` when prompted to automatically redirect all traffic.

---

## Step 6: Running the Application in Production

1. **Configure Backend Environment Variables:**
   Create a backend `.env` file on the server:
   ```bash
   nano /var/www/procurement/backend/.env
   ```
   Paste the required configuration, adjusting your database URL and API keys:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@db:5432/procurement
   OPENAI_API_KEY=your_openai_api_key
   AZURE_DOC_INTEL_KEY=your_azure_doc_intel_key
   # Odoo integration / Email details if needed:
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=hrms1928@gmail.com
   SMTP_PASSWORD=your_app_password
   ```

2. **Configure Frontend Environment Variables:**
   The frontend build needs to know where the backend API lives. Adjust the `VITE_API_URL` to point to your new secure domain.
   Update the `docker-compose.yml` file's frontend environment section:
   ```bash
   nano /var/www/procurement/docker-compose.yml
   ```
   Modify the frontend environment key:
   ```yaml
   frontend:
     build: ./frontend
     container_name: procurement_frontend
     restart: always
     ports:
       - "5183:5173"
     environment:
        - VITE_API_URL=https://api.humanattest.com # Point to your API domain
   ```

3. **Start the Containers:**
   Launch the system using Docker Compose:
   ```bash
   cd /var/www/procurement
   docker-compose up -d --build
   ```

4. **Verify Deployment:**
   Open your browser and navigate to `https://humanattest.com`. Verify the connection by logging in and performing an action.

---

## Troubleshooting & Maintenance Commands

- **Check container statuses:**
  ```bash
  docker ps
  ```
- **Inspect live logs (e.g. backend):**
  ```bash
  docker logs -f procurement_backend
  ```
- **Stop the application:**
  ```bash
  docker-compose down
  ```
- **Run database migrations/seeds on the container manually:**
  ```bash
  docker exec -it procurement_backend python seed.py
  ```
- **Auto-renew SSL Certificates:**
  Let's Encrypt certificates last for 90 days. Certbot configures a cron job automatically, but you can dry-run the renewal:
  ```bash
  sudo certbot renew --dry-run
  ```
