

# kit-helpers

Ayudas, plugins y herramientas para [`@solana/kit`](https://github.com/anza-xyz/kit).

## Plugins

| Paquete                                                           | Descripción                                                              | Versión |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- |
| [@kit-helpers/client](./plugins/client)                           | Cliente de Solana con todo incluido y todos los plugins de kit-helpers   | 0.1.0   |
| [@kit-helpers/action](./plugins/action)                           | Plugin del ciclo de vida de transacciones: envío, simulación y firma     | 0.1.0   |
| [@kit-helpers/query](./plugins/query)                             | Definiciones de consulta independientes del framework para la obtención de datos de Solana | 0.1.0   |
| [@kit-helpers/wallet](./plugins/wallet)                           | Plugin de billetera independiente del framework con soporte para Wallet Standard | 0.1.0   |
| [@kit-helpers/transaction-builder](./plugins/transaction-builder) | API fluida para construir, firmar y enviar transacciones de Solana       | 0.1.0   |
| [@kit-helpers/asset](./plugins/asset)                             | Direcciones de activos de Solana ampliamente conocidas                   | 0.1.0   |
| [@kit-helpers/jito](./plugins/jito)                               | Plugin de paquetes Jito: envío de paquetes, cuentas de tip y sondeo de estado | 0.1.0   |
| [@kit-helpers/local-validator](./plugins/local-validator)         | Gestión del ciclo de vida del validador de prueba de Solana              | 0.1.0   |
| [@kit-helpers/airdrop-token](./plugins/airdrop-token)             | Utilidad de airdrop para crear mints de tokens, ATAs y acuñar tokens     | 0.1.0   |

> **Nota:** Los paquetes `@kit-helpers/program-system` y `@kit-helpers/program-token` han sido eliminados. Su funcionalidad ahora está proporcionada por los plugins nativos [`@solana-program/system`](https://www.npmjs.com/package/@solana-program/system) y [`@solana-program/token`](https://www.npmjs.com/package/@solana-program/token), compuestos automáticamente por `@kit-helpers/client` bajo `client.program.system` y `client.program.token`.

## Renderizadores

| Paquete                                                      | Descripción                                          | Versión |
| ------------------------------------------------------------ | ---------------------------------------------------- | ------- |
| [@kit-helpers/renderer-react-hooks](./renderers/react-hooks) | Renderizador de Codama para generar hooks de React a partir de IDLs | 0.1.0   |
| [@kit-helpers/renderer-js-docs](./renderers/js-docs)         | Renderizador de Codama para generar documentación a partir de IDLs | 0.1.0   |

## Desarrollo

```bash
# Instalar dependencias
make install

# Compilar todos los paquetes
make build

# Ejecutar pruebas
make test

# Revisión de código y formato
make fix
```

Consulta el [Makefile](./Makefile) para ver todos los comandos disponibles.

## Estructura

```
kit-helpers/
├── plugins/      # plugins de @solana/kit
├── renderers/    # renderizadores de Codama
└── examples/     # aplicaciones de demostración
```

## Licencia

MIT
