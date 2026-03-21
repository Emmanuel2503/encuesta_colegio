# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

Sistema de Encuestas Escolares (Full Stack)
Este proyecto es una aplicación web completa para gestionar evaluaciones de desempeño (Estudiante a Docente y Docente a Docente).

Stack Tecnológico:

Frontend: React (Vite) + Tailwind CSS

Backend: Node.js + Express

Base de Datos: PostgreSQL

📋 Prerrequisitos
Antes de empezar, asegúrate de tener instalado en tu computadora:

Node.js (Versión LTS recomendada).

PostgreSQL (y pgAdmin para gestionar la BD visualmente).

Git.

🚀 Guía de Instalación Paso a Paso
Sigue este orden estricto para evitar errores de conexión.

1. Configuración de la Base de Datos (PostgreSQL)
   Abre pgAdmin (o tu terminal de SQL).

Crea una nueva base de datos llamada encuestas_db (o el nombre que prefieras).

Abre la "Query Tool" (Herramienta de consultas) en esa base de datos.

Ejecuta el script SQL de creación de tablas.

(Si no tienes el script a mano, asegúrate de crear las tablas: admin_settings, surveys, questions, submissions, answers, teachers, subjects).

IMPORTANTE: Ejecuta este comando para crear el PIN maestro de acceso:

SQL

INSERT INTO public.admin_settings (id, pin_code) VALUES (1, '12345'); 2. Configuración del Backend (Servidor)
Abre una terminal y entra a la carpeta del servidor:

Bash

cd server
Instala las dependencias:

Bash

npm install
Crea un archivo llamado .env dentro de la carpeta server/ con tus credenciales de PostgreSQL:

Fragmento de código

PORT=3000
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=encuestas_db
Inicia el servidor en modo desarrollo:

Bash

npm run dev
Deberías ver: 🔌 ¡Conectado a PostgreSQL exitosamente! y Backend listo en http://localhost:3000.

3. Configuración del Frontend (Cliente)
   Abre otra terminal (sin cerrar la del backend) y ve a la carpeta del frontend:

Bash

cd encuesta_colegio
Instala las dependencias (Esto instalará React 18, Tailwind, Axios, etc.):

Bash

npm install
Crea un archivo llamado .env dentro de la carpeta encuesta_colegio/:

Fragmento de código

VITE_API_URL=http://localhost:3000
Inicia el frontend:

Bash

npm run dev
Abre el link que aparece (usualmente http://localhost:5173) en tu navegador.

🔑 Credenciales de Acceso
Para entrar al Panel de Control como Directora:

URL: /login (Se redirige automáticamente al entrar).

PIN de Acceso: 12345 (O el que hayas configurado en la base de datos).

🛠 Solución de Problemas Comunes

1. Pantalla en Blanco al iniciar:

Asegúrate de que estás usando React 18. Si ves errores de "Invalid hook call", borra la carpeta node_modules del frontend y ejecuta npm install de nuevo.

2. Error de conexión en el Login:

Verifica que el backend esté corriendo en la terminal (npm run dev en la carpeta server).

Revisa que el archivo .env del frontend tenga la URL correcta del backend.

3. "No se pudo conectar a PostgreSQL":

Revisa tu archivo server/.env. La contraseña o el usuario de la base de datos suelen ser la causa. Asegúrate de que el servicio de PostgreSQL esté activo en tu PC.
