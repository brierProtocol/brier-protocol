# 🌿 Brier Protocol

Brier Protocol es una plataforma descentralizada (un "shadow indexer" y arquitectura de bóvedas ERC4626) que permite a los creadores ("Makers") desplegar algoritmos de trading predictivo en mercados como **Polymarket**, y a los inversores ("LPs") delegar liquidez en ellos a través de un esquema seguro y automatizado.

---

## 🚀 Características Principales

### Para Creadores (Makers)
- **Registro de Algoritmos:** Permite registrar bots predictivos, establecer estrategias, y conectarlos a fuentes de datos como Polymarket y Kalshi.
- **Fase de Incubación (Paper Trading):** Todos los bots nuevos inician en fase de prueba (Paper) sin fondos reales hasta probar su rentabilidad (Win Rate, Sharpe Ratio, Brier Score).
- **Gestión de Perfil:** Dashboard de creador para monitorear el desempeño del bot, modificar metadatos y revisar el historial de transacciones.
- **Circuit Breaker & Skin in the Game:** Los creadores depositan una garantía que puede ser reducida (slashed) si el bot sufre un Drawdown mayor al 15%, alineando incentivos.

### Para Inversores (LPs)
- **Bóvedas ERC4626 (Smart Contracts):** Cada algoritmo aprobado obtiene un Vault (bóveda inteligente) que gestiona los depósitos en USDC.
- **Transparencia Total:** Las métricas de desempeño, APY histórico, PnL y retiros están completamente indexadas y visibles en tiempo real.
- **Verificación On-Chain:** Los depósitos se verifican mediante la escucha de eventos `Transfer` directo de un RPC público de Arbitrum One, protegiendo contra ataques de repetición (Replay Attacks) y validando el remitente (depositorWallet).
- **Retiros Instantáneos:** El capital ocioso ("idle capital") no comprometido en operaciones activas puede ser retirado al instante, sin bloqueos de 48 horas.

### Funciones de la Plataforma
- **Ranking y Descubrimiento:** Tablas de clasificación (Leaderboards) basadas en el Brier Score y rendimiento general.
- **Módulos Sociales:** Sistema de seguidores, "corazones" (likes) y comentarios para construir comunidad alrededor de las estrategias.
- **Arquitectura de UI Dual:** Diseño estético retro-terminal (Bloomberg-style) con elementos de glassmorphism premium.

---

## 🛠 Arquitectura Tecnológica (Stack)

### Frontend (Web3 App)
- **Framework:** Next.js 16.2.6 (App Router) con Turbopack
- **Estilos:** Tailwind CSS v4 + Framer Motion (animaciones de micro-interacciones)
- **Web3:** `wagmi` + `viem` + `@rainbow-me/rainbowkit` (conexión de wallets)
- **Gráficos:** Recharts + Liveline para gráficos financieros y PnL interactivo

### Backend y Base de Datos
- **API:** Next.js Route Handlers (`/api/deposits`, `/api/bots`, `/api/cron`, etc.)
- **Base de Datos:** PostgreSQL alojado en Supabase
- **ORM:** Prisma v5.22.0
- **Seguridad:** Middlewares y protecciones activas contra falsificación de transacciones (Spoofing) e inyección de datos. Rate limiting en despliegues.

### Smart Contracts (Blockchain)
- **Lenguaje:** Solidity `^0.8.20`
- **Librerías:** OpenZeppelin Contracts Upgradeable v5.6.1 (`ERC4626`, `Initializable`, `Pausable`, `ReentrancyGuard`)
- **Factory:** `BrierVaultFactory.sol` (Usa EIP-1167 Minimal Proxy Clones para despliegues ultra-baratos)
- **Vault:** `BrierVault.sol` (Gestión central de fondos, cortes de emergencia, y reparto de fees: 60% LP, 30% Maker, 10% Plataforma)
- **Testing y Deploy:** Hardhat + Ignition

---

## 📁 Estructura del Proyecto

```text
brier-protocol/
├── contracts/
│   ├── BrierVault.sol              # Lógica principal de Bóveda Upgradeable
│   ├── BrierVaultFactory.sol       # Proxy factory para creación de vaults
│   └── BrierFactory.sol            # (Obsoleto) Factory inicial 
├── prisma/
│   ├── schema.prisma               # Modelos de BD (Bot, VaultDeposit, User...)
│   └── seed.ts                     # Script de inicialización de datos falsos
├── src/
│   ├── app/
│   │   ├── api/                    # Endpoints (Bots, Depósitos verificados, Cron)
│   │   ├── bot/[slug]/             # UI pública del bot (Métricas, Depósitos, Foros)
│   │   ├── dashboard/              # Panel de control de inversores
│   │   ├── discover/               # Listado y filtros de bots
│   │   ├── leaderboard/            # Ranking global
│   │   ├── list-bot/               # Flujo para registrar nuevos bots
│   │   ├── maker/[address]/        # Perfil público y gestión del creador
│   │   └── vault/[botId]/          # Vista detallada de la bóveda ERC4626
│   ├── components/                 # Componentes reutilizables (BotCard, MiniChart, Nav)
│   └── lib/                        # Prisma client, Wagmi config, helpers
└── middleware.ts                   # Next.js rate-limiting
```

---

## 🔒 Auditoría de Seguridad & Estado Actual

Recientemente se completó una auditoría exhaustiva de seguridad y arquitectura, resolviendo los siguientes vectores críticos para un entorno de producción que maneja dinero real:
1. **Sanitización de Credenciales:** La BD está completamente aislada usando variables de entorno `.env` en lugar de strings de conexión duros.
2. **Deposit Replay Attack Prevention:** El endpoint de depósitos previene la inyección duplicada de `txHash` y valida el `msg.sender` original desde los eventos del contrato en Arbitrum.
3. **Hardcoded Fallbacks:** Se removieron los fallbacks peligrosos a direcciones de vault arbitrarias; los depósitos se bloquean si un bot no tiene vault asignado.
4. **Protección de API y Cron Jobs:** Los jobs de sincronización (Cron) ahora están protegidos tras tokens de autorización (`CRON_SECRET`), previniendo ejecución no autorizada y fuga de logs.

---

## 💻 Desarrollo Local

### 1. Requisitos Previos
- Node.js (v20+)
- Postgres Database (URL)
- Claves de API de Alchemy o un RPC público de Arbitrum

### 2. Variables de Entorno
Crea un archivo `.env.local` en la raíz (no lo subas a Github):
```env
DATABASE_URL="postgresql://user:password@host:port/postgres"
DIRECT_URL="postgresql://user:password@host:port/postgres"
NEXT_PUBLIC_ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"
CRON_SECRET="your-secure-secret"
```

### 3. Instalación y Ejecución
```bash
# 1. Instalar dependencias
npm install

# 2. Sincronizar la base de datos de Prisma
npx prisma db push

# 3. (Opcional) Popular con datos semilla
npm run db:seed

# 4. Iniciar el servidor local de Next.js
npm run dev
```

El proyecto estará disponible en `http://localhost:3000`.

### 4. Smart Contracts
```bash
# Compilar contratos
npm run compile:contracts

# Ejecutar test unitarios
npm run test:contracts
```
