# cflokiworker

Un [Cloudflare Tail Worker](https://developers.cloudflare.com/workers/observability/tail-workers/) moderno para enviar logs y excepciones no manejadas a [Grafana Loki](https://grafana.com/oss/loki/) desde tus Cloudflare Workers.

## 🚀 Características

- **Agregación de logs en tiempo real** desde múltiples Cloudflare Workers
- **Transformación automática** de eventos de trace a formato Loki
- **Autenticación segura** con credenciales Base64
- **Despliegue automatizado** con GitHub Actions
- **TypeScript completo** con tipos de Cloudflare Workers
- **Entorno de desarrollo moderno** con Bun y ESLint

## 📋 Requisitos Previos

- Cuenta de Cloudflare con Workers habilitado
- Instancia de Grafana Loki accesible
- Node.js 18+ o Bun (recomendado)
- Wrangler CLI

## 🛠️ Instalación y Configuración

### 1. Clonar y Configurar

```bash
git clone https://github.com/CarmeloCampos/cflokiworker.git
cd cflokiworker
bun install
```

### 2. Configurar Variables de Entorno

Crea los siguientes secretos en tu repositorio de GitHub:

- `CLOUDFLARE_API_TOKEN`: Token de API de Cloudflare
- `CLOUDFLARE_ACCOUNT_ID`: ID de tu cuenta de Cloudflare
- `LOKI_PUSH_URL`: URL HTTP de tu instancia de Loki
- `LOKI_CREDENTIALS`: Credenciales codificadas en Base64 (`username:password`)

### 3. Conectar Workers Existentes

Agrega esta configuración al `wrangler.toml` de los workers que quieres monitorear:

```toml
tail_consumers = [{ service = "logger" }]
```

Ejemplo en `wrangler.json`

```json
"tail_consumers": [{ "service": "logger" }]
```

### 4. Desplegar

```bash
bun run deploy
```

## 🔧 Desarrollo

### Scripts Disponibles

```bash
# Instalar dependencias
bun install

# Ejecutar linter
bun run lint

# Compilar proyecto
bun run build

# Desplegar a Cloudflare
bun run deploy

# Desarrollo local
bun run dev
```

### Estructura del Proyecto

```
cflokiworker/
├── src/
│   └── index.ts          # Función principal del tail worker
├── .github/
│   └── workflows/
│       └── deploy.yml    # Pipeline de CI/CD
├── worker-configuration.d.ts  # Tipos de Cloudflare Workers
├── wrangler.toml         # Configuración de Wrangler
├── tsconfig.json         # Configuración de TypeScript
├── eslint.config.mjs     # Configuración de ESLint
└── package.json          # Dependencias y scripts
```

## 📊 Uso en Producción

Este worker está siendo utilizado en producción para recopilar logs del [API Gateway de ScreenshotOne](https://screenshotone.com/), demostrando su confiabilidad para escenarios de agregación de logs a gran escala.

## 🔄 Pipeline de CI/CD

El proyecto incluye un pipeline automatizado que:

1. ✅ Valida la calidad del código con ESLint
2. 🔨 Compila TypeScript a JavaScript
3. 🚀 Despliega automáticamente a Cloudflare Workers
4. 🌍 Distribuye globalmente en la red edge de Cloudflare

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📚 Recursos Adicionales

- [Documentación oficial de Cloudflare Tail Workers](https://developers.cloudflare.com/workers/observability/tail-workers/)
- [Guía de integración con Grafana Loki](https://scalabledeveloper.com/posts/cloudflare-tail-worker-for-pushing-logs-to-grafana-loki/)
- [Documentación de Grafana Loki](https://grafana.com/docs/loki/)

## 📄 Licencia

Este proyecto está licenciado bajo la [Licencia MIT](LICENSE).

---

**Nota**: Este worker está optimizado para el runtime de Cloudflare Workers y utiliza las últimas características de TypeScript y herramientas modernas de desarrollo.
