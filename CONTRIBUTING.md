# Cómo trabajamos con Git

Trabajamos con ramas para no pisarnos ni romper la web. Es fácil — son unos pocos
pasos, pero hay que respetarlos **siempre** (si no, las ramas se atrasan y después
mergear es un dolor de cabeza).

## 🌳 Tenemos 2 ramas principales

- **`main`** → versión estable / producción. **Nadie toca esto a mano.**
- **`dev`** → donde juntamos todo lo nuevo antes de publicarlo.

> ⚠️ **Regla de oro:** NUNCA pushear directo a `main` ni a `dev`.
> Todo entra por una rama propia + Pull Request.

## 🔄 Antes de empezar CUALQUIER cosa — sincronizar

El 90% de los problemas vienen de arrancar desde una copia vieja. Siempre:

```bash
git checkout dev
git pull origin dev
```

## 🛠️ El ciclo de cada tarea

**1. Arrancá desde `dev` actualizado y creá tu rama:**
```bash
git checkout dev
git pull origin dev
git checkout -b feat/nombre-corto
```

**2. Trabajás y vas commiteando de a poco:**
```bash
git add -A
git commit -m "mensaje claro de qué hiciste"
```

**3. Si tardás más de un día, traé `dev` a tu rama seguido** (así resolvés
conflictos chicos y temprano, no 48 commits después):
```bash
git pull origin dev
```

**4. Subís y abrís el Pull Request → `dev`:**
```bash
git push -u origin feat/nombre-corto
```
GitHub te da el link al pushear. Abrís el **PR de tu rama → `dev`** (nunca a `main`).

**5. Se revisa y se mergea desde GitHub. Después limpiás:**
```bash
git checkout dev
git pull origin dev
git branch -d feat/nombre-corto     # borra tu rama local ya mergeada
```

## 🏷️ Cómo nombrar las ramas

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feat/` | función nueva | `feat/landing-stats` |
| `fix/` | arreglo de bug | `fix/deposit-amount` |
| `refactor/` | limpieza sin cambiar comportamiento | `refactor/vault-types` |
| `chore/` | mantenimiento (deps, config) | `chore/bump-deps` |
| `docs/` | solo documentación | `docs/readme` |

## ✅ El recorrido completo

```
tu rama  →  PR  →  dev  (lo revisamos y juntamos)
                    │
                    └─ cuando dev está estable  →  PR  →  main  (release)
```

## 🔒 Protección de ramas (ya está activa)

`main` está protegido con un ruleset en GitHub:
- Para mergear a `main` se necesita **1 review de un code-owner** (Felipe o Benjamin).
- **No podés aprobar tu propio PR** (regla de GitHub) → si vos abriste el PR,
  lo aprueba el otro.
- Felipe y Benjamin tienen **bypass de admin**: pueden mergear a `main` directo
  cuando hace falta. La regla protege contra cualquier otro que se equivoque.

`dev` avanza rápido: cualquiera del equipo puede mergear ahí (con su PR).

## 🚦 Las reglas de oro (para no repetir líos)

1. **Pulleá `dev` SIEMPRE antes de empezar** — así tu rama nunca se atrasa.
2. **Nunca trabajes directo en `main` ni `dev`** — siempre una rama aparte.
3. **PRs chicos y seguidos** — no dejes una rama viva semanas; mergeá y borrala.
4. **Traé `dev` a tu rama seguido** si tu trabajo dura varios días.
5. **Nunca `push --force` a ramas compartidas**, ni **tocar la DB de producción a mano**.

---

> Más contexto técnico del proyecto (stack, cómo correrlo, trampas conocidas):
> ver [`CONTEXT.md`](./CONTEXT.md).
> Checklists de auditoría (seguridad, DB, UX, calidad): ver [`AUDITS.md`](./AUDITS.md).
