#  Major Dockerized Three-Tier Microservice Application

**Technologies:** Docker | Node.js | Nginx | MySQL | Docker Compose

This project demonstrates how to deploy a **microservice-based three-tier web application** using Docker — with a **reverse proxy**, **isolated networks**, **persistent volumes**, and **auto-database initialization**.

I built this project from scratch to understand container orchestration, inter-container communication, and production-style app deployment.

---

##  Architecture Overview

The system follows a classic **three-tier architecture**:

| Tier                  | Technology            | Description                                                                                            |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Web (Proxy)**       | **Nginx**             | Entry point for all requests. Routes `/` to the registration service and `/view/` to the view service. |
| **Application Layer** | **Node.js (Express)** | Two independent microservices — one for registration and one for viewing student records.              |
| **Database Layer**    | **MySQL 8.0**         | Stores student data. The schema is automatically created from `init.sql`.                              |

![](/Major-Docker-app-imgs/Architectural%20diagram.png)

---

##  Project Structure

```
Major-docker-app/
├── docker-compose.yml
├── db/
│   └── init.sql
├── proxy/
│   └── default.conf
├── registration-service/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
└── view-service/
    ├── Dockerfile
    ├── package.json
    └── server.js
```
![](/Major-Docker-app-imgs/directory-structure-img.png)
---

##  How It Works

1. User opens your EC2 instance’s public IP.
2. Nginx (proxy) forwards `/` requests to the **registration-service**.
3. Registration form sends data to **MySQL (db)**.
4. User clicks “View Registered Students”, which is routed to the **view-service**.
5. View service reads data from MySQL and displays it in a table.

![](/Major-Docker-app-imgs/empty-register-form-img.png)

---

##  Docker Compose Summary

* **frontend network:** connects proxy ↔ Node.js services
* **backend network:** connects Node.js services ↔ MySQL
* **db_data volume:** persists MySQL data
* **init.sql:** auto-creates `students` table

![](/Major-Docker-app-imgs/docker-compose-build-img.png)

![](/Major-Docker-app-imgs/docker-ps.png)

---

##  docker-compose.yml

*(Main configuration file that connects everything together.)*

```yaml
services:
  proxy:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./proxy/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - registration-service
      - view-service
    networks:
      - frontend

  registration-service:
    build: ./registration-service
    expose:
      - "3000"
    depends_on:
      - db
    networks:
      - frontend
      - backend
    environment:
      - DB_HOST=db
      - DB_USER=root
      - DB_PASSWORD=root
      - DB_NAME=studentdb

  view-service:
    build: ./view-service
    expose:
      - "3001"
    depends_on:
      - db
    networks:
      - frontend
      - backend
    environment:
      - DB_HOST=db
      - DB_USER=root
      - DB_PASSWORD=root
      - DB_NAME=studentdb

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: studentdb
    volumes:
      - db_data:/var/lib/mysql
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - backend

networks:
  frontend:
  backend:

volumes:
  db_data:
```

---

##  Nginx Reverse Proxy Configuration (`proxy/default.conf`)

```nginx
server {
    listen 80;
    server_name localhost;

    # Registration service route
    location / {
        proxy_pass http://registration-service:3000;
    }

    # View service route
    location /view/ {
        rewrite ^/view(/.*)$ $1 break;
        proxy_pass http://view-service:3001/;
    }
}
```

![](/Major-Docker-app-imgs/nginx-config-img.png)

---

##  Database Initialization (`db/init.sql`)

```sql
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    course VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

![](/Major-Docker-app-imgs/db-container-exec%20.png)

---

##  Dockerfiles

**Registration Service Dockerfile**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm","start"]
```

**View Service Dockerfile**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm","start"]
```
---

##  Retry Logic (Ensuring DB Connection Stability)

Both Node.js services include a **retry mechanism** that keeps retrying every 5 seconds until MySQL is ready:

```
❌ DB connect error: connect ECONNREFUSED
Retrying in 5 seconds...
✅ Registration service connected to DB
```
---

##  Key Docker Concepts Used

| Concept        | Explanation                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| **Containers** | Each service runs independently but communicates internally via Docker networks. |
| **Networks**   | `frontend` links proxy ↔ Node.js services, `backend` links Node.js ↔ MySQL.      |
| **Volumes**    | Persistent MySQL data stored on host.                                            |
| **depends_on** | Controls build/start order between containers.                                   |
| **Bind Mount** | Used to load custom Nginx configuration.                                         |

![](/Major-Docker-app-imgs/docker-network-volume-img.png)

---

##  Running the Application

### Step 1 — Build and Start

```bash
docker compose up --build -d
```

### Step 2 — Verify Containers

```bash
docker ps
```

You should see all four containers running.

### Step 3 — Access via Browser

```
http://<your-ec2-public-ip>/
```

➡ Displays the **registration form**
➡ Clicking “View Registered Students” opens `/view/` table page.

![](/Major-Docker-app-imgs/filled-register-form.png)

![](/Major-Docker-app-imgs/view-table.png)
---

