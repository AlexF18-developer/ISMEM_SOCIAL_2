# ISMEM SOCIAL

Red social para estudiantes del instituto ISMEM. Permite registrarse, iniciar sesión, publicar, comentar, reaccionar (like) y recibir notificaciones.

## Tecnologías

- **Next.js** (App Router) — frontend + backend (API Routes) en un solo proyecto
- **TypeScript**
- **Tailwind CSS** — estilos
- **Prisma ORM** — acceso a base de datos
- **MySQL** — base de datos relacional
- **NextAuth.js (Auth.js)** — autenticación con Credentials Provider
- **bcryptjs** — hash de contraseñas

## Requisitos previos

- [Node.js](https://nodejs.org/) 18 o superior
- MySQL corriendo localmente (por ejemplo con [XAMPP](https://www.apachefriends.org/) o MySQL Workbench)

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/AlexF18-developer/ISMEM_SOCIAL_2.git
cd ISMEM_SOCIAL_2
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear una base de datos vacía en MySQL, por ejemplo `ismem_db`.

4. Crear el archivo `.env` en la raíz del proyecto usando `.env.example` como plantilla:
```bash
cp .env.example .env
```

5. Editar `.env` con tus propios datos: