# 🎬 Clipper

[![Licencia](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Local First](https://img.shields.io/badge/Privacy-100%25%20Local-emerald)](https://github.com)
[![Vite](https://img.shields.io/badge/Built%20With-Vite%20%26%20React-sky)](https://vite.dev)

**Clipper** es un editor de video web moderno, rápido y privado diseñado para ejecutarse completamente en el navegador. Procesa y edita tus videos de manera local utilizando recursos del cliente, asegurando que tus archivos nunca se suban a un servidor externo.

---

## ✨ Características Principales

*   **🔍 Línea de Tiempo de Alta Precisión:** Corta videos visualizando miniaturas continuas de los fotogramas y previsualizaciones instantáneas al pasar el cursor (hover preview).
*   **📐 Rotación y Espejado:** Corrige la orientación del video girando en 90°/180°/270° o aplicando volteado (flip) horizontal y vertical.
*   **⚡ Velocidad y Volumen:** Modifica el ritmo del video (0.25x a 2.0x) y ajusta los niveles de volumen o silencia la pista con controles intuitivos.
*   **🏢 Conversión a Video Wall:** Divide tu video de manera simétrica en cuadrículas multipantalla (2×1, 1×2, 2×2, 3×2, 2×3) simulando paneles físicos reales.
*   **💾 Exportación Instantánea:** Descarga tus clips editados directamente en formatos **MP4** o **WebM** listos para compartir.

---

## 📸 Galería del Proyecto

Disfruta de una experiencia de edición fluida e interactiva a través de una interfaz de usuario minimalista y optimizada para el rendimiento:

### 📥 1. Pantalla de Carga
Sube cualquier clip arrastrándolo a la interfaz intuitiva. Clipper procesa el formato nativamente en segundos.

![Pantalla de Carga](./screenshots/1-landing.png)

### 📂 2. Carga Local Rápida
Compatible con MP4, WebM, MOV y otros contenedores comunes mediante la API de archivo local.

![Selección de Archivos](./screenshots/2-upload.png)

### ✂️ 3. Panel de Control y Edición
Línea de tiempo interactiva enriquecida con tira de imágenes, tooltip dinámico de posición y selector de cuadrícula de Video Wall integrada.

![Espacio de Trabajo del Editor](./screenshots/3-editor.png)

---

## 🛡️ Privacidad & Seguridad
Al ser una aplicación **Client-Side** (local-first), la edición de video se procesa enteramente en tu ordenador por medio de elementos HTML5, Canvas y MediaRecorder. Ningún byte es enviado a la red, lo que garantiza confidencialidad absoluta sobre tus contenidos multimedia.
