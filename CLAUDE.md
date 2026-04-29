# CLAUDE.md — guitar-tuner

Contexto que Claude Code debe leer **antes de actuar** en este repo. Sumá líneas acá cuando descubras algo no obvio que va a aplicarse otra vez.

## Proyecto

- **Qué es**: afinador cromático + detector de acordes para guitarra. Web app puramente cliente (sin backend).
- **Stack**: React 19 + Vite 8, JS plano (no TS). Web Audio API para captura y análisis de pitch.
- **Estructura real**:
  - `src/main.jsx` — bootstrap React
  - `src/App.jsx` — **toda la lógica vive acá** (DSP, UI, estado). Single-file app.
  - `src/style.css` — estilos globales mínimos
  - `index.html` — entry de Vite
  - `public/`, `dist/` — assets y build
- **Hosting**: Vercel. Proyecto vinculado en `.vercel/project.json` (`projectId prj_VtisrwjSgHMJJu6R5v2Q66osJfev`, team `team_6uKuI7AvexyH0Hn1LHDbl2SX`, slug `guitar-tuner`).
- **Remoto git**: `https://github.com/tomgutgar/guitar-tuner.git` (rama `main`).

## Convenciones

- Idioma de respuestas al usuario: **castellano de España, no español latino ("panchito")**. Usar "vosotros", léxico peninsular, evitar voseo y modismos latinoamericanos.
- Estilos inline en JSX con paleta cyberpunk en const `C` (objeto en `App.jsx`). No hay design system; agregá colores ahí.
- Comentarios en código: castellano cuando hace falta explicar el porqué (no qué).
- No introducir TS, librerías de UI, ni build tools nuevos sin pedirlo. Surgical changes.

## Comandos

```bash
npm run dev      # vite dev server (necesita https o localhost para getUserMedia)
npm run build    # build a dist/
npm run preview  # servir build local
```

## MCPs disponibles en este repo

| MCP | Uso típico |
|---|---|
| `vercel` (`mcp__plugin_vercel_vercel__*`) | listar/inspeccionar deployments, logs, project info, deploy. **403 al listar** sin más permisos del team. |
| `obsidian-vault` | escribe/lee dentro de `C:\Users\togut\Desktop\guitar-tuner` (es el único directorio permitido — el "vault" vive ahí, ver `docs/vault/`). |
| `context7` | docs actualizadas de librerías (React, Vite, Web Audio, etc.). Usar antes de codear contra una API que no sea trivial. |
| `playwright` | browser automation para probar la UI manualmente. |
| `github` | issues, PRs, commits contra `tomgutgar/guitar-tuner`. |
| `fetch`, `sequential-thinking` | utilitarios. |

Vercel CLI **no está instalada** en el sistema. Para deploy manual: `npm i -g vercel && vercel deploy --prod`. Caso contrario, push a `main` dispara deploy automático por la integración Vercel↔GitHub.

## Permisos pre-autorizados (`.claude/settings.local.json`)

```
mcp__plugin_vercel_vercel__deploy_to_vercel
mcp__plugin_vercel_vercel__list_deployments
```

Todo lo demás (Bash, Edit, otros MCPs) pide confirmación. Si una operación se repite mucho, agregar al allowlist con `/fewer-permission-prompts` o editando ese archivo.

## Memoria persistente del proyecto

Vault Obsidian fuera del repo: **`E:\ObsidianWorkspace\guitar-tuner\`**. Leerlo al empezar sesión si la tarea toca DSP, UI o decisiones previas. Index en `E:\ObsidianWorkspace\guitar-tuner\README.md`.

Notas:
- El MCP `obsidian-vault` está restringido a `C:\Users\togut\Desktop\guitar-tuner` — para leer/escribir el vault hay que usar `Read`/`Write`/`Edit` directamente con la ruta de `E:\`.
- Cuando aprendas algo no obvio del proyecto, actualizá el archivo correspondiente del vault (no este CLAUDE.md, que es para reglas operativas cortas).

## Cosas a no romper

- **getUserMedia requiere HTTPS o localhost.** El UI ya muestra error si `isSecureContext` es false. No quitar ese chequeo.
- **`detectPitch` está afinado a guitarra (60–1400 Hz, RMS gate 0.006).** Tocar esos números cambia sensibilidad y ruido — verificar con guitarra real antes de mergear.
- El commit local previo `cambio de estilo` quedó respaldado en la rama `backup-local-main` (no se pushea). Si hay que recuperar algo, cherry-pick desde ahí.
