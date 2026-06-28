# Cómo trabajamos con Git

Reorganizamos y limpiamos toda la base de código. De ahora en más trabajamos
con ramas para no pisarnos ni romper la web. Es fácil — son 4 pasos.

## 🌳 Tenemos 2 ramas principales

- **`main`** → versión estable / producción. **Nadie toca esto a mano.**
- **`dev`** → donde juntamos todo lo nuevo antes de publicarlo.

> ⚠️ **Regla de oro:** NUNCA pushear directo a `main` ni a `dev`.
> Todo entra por una rama propia + Pull Request.

## 🔄 Primer paso (háganlo una vez)

Como cambió la estructura de carpetas, antes de seguir trabajando:

```bash
git checkout dev
git pull origin dev
```

## 🛠️ Cómo trabajar (cada cosa nueva)

```bash
git checkout dev
git pull origin dev                 # arrancar siempre desde lo último
git checkout -b feat/nombre-corto   # crear tu rama
# ...trabajan, hacen commits...
git push -u origin feat/nombre-corto
```

Después, en GitHub, abren un **Pull Request de su rama → `dev`**.

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

## 🗳️ Política de merges (acuerdo del equipo)

Propuesta para mantener `main` siempre estable:

- **Merge a `dev`:** lo puede hacer cualquiera del equipo (así `dev` avanza rápido).
- **Merge a `main`:** lo hace **solo quien maneja el lado de código**, como paso
  final revisado antes de publicar.

**¿Están todos de acuerdo?** Si sí, se activa la protección de rama en GitHub
para que quede aplicado automáticamente (aunque alguien se equivoque, GitHub no
deja pushear directo a `main`).

---

> Más contexto técnico del proyecto (stack, cómo correrlo, trampas conocidas):
> ver [`CONTEXT.md`](./CONTEXT.md).
