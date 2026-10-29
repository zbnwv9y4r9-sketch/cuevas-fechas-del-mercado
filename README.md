# CUEVAS - Fechas del mercado

Calendario comercial por país (Centroamérica, Venezuela y Caribe) de octubre 2026 a diciembre 2027. Incluye feriados, pagos, fechas de venta, carreras, calendario escolar y la agenda interna de Northbay. Tiene filtro por país, periodo, mes y categoría, una búsqueda y un botón para descargar en PDF lo que se está viendo.

Es una app web estática: no necesita servidor, base de datos ni instalación. Se puede instalar en el celular o la computadora como app (PWA) y funciona sin conexión después de abrirla una vez.

## Estructura

Todos los archivos van en la raíz del repositorio, sin carpetas:

```
index.html                  Página principal
app.css                     Estilos
app.js                      Lógica de la app (filtros, calendario, PDF)
pdf-lib.min.js              Generador de PDF (licencia MIT)
paises.json                 Lista de países
<código>.json               Fechas de cada país (pa.json, cr.json, gt.json, …)
northbay.json               Agenda interna Northbay
logo.svg e icon-*.png       Logo e íconos
manifest.webmanifest, sw.js Para instalarla como app y usarla sin conexión
```

## Publicarla con GitHub Pages

1. Crea una cuenta en https://github.com (si no tienes).
2. Pulsa **New repository**. Nombre sugerido: `fechas-del-mercado`.
3. Elige si será **Public** o **Private** (lee el aviso de privacidad más abajo) y pulsa **Create repository**.
4. En el repositorio nuevo pulsa **uploading an existing file**, arrastra **todos los archivos** de esta carpeta (deben quedar en la raíz del repositorio) y pulsa **Commit changes**.
5. Ve a **Settings › Pages**. En **Source** elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y pulsa **Save**.
6. En uno o dos minutos aparece el enlace, con la forma `https://<tu-usuario>.github.io/fechas-del-mercado/`. Ese es el enlace para compartir.

Para instalarla como app: abre el enlace en el celular (Chrome en Android o Safari en iPhone) y elige **Agregar a pantalla de inicio**. En la computadora, Chrome o Edge muestran un ícono de **Instalar** en la barra de direcciones.

> La app necesita abrirse desde el enlace (GitHub Pages). Si haces doble clic en `index.html` desde tu computadora, el navegador no deja leer los archivos `.json` y no cargarán las fechas.

## Aviso de privacidad (importante)

`northbay.json` contiene información interna de Northbay.

- Un sitio de GitHub Pages es **público** aunque el repositorio sea privado, salvo en GitHub Enterprise Cloud con control de acceso. Cualquiera con el enlace podrá ver la agenda.
- GitHub Pages desde un repositorio privado requiere un plan de pago (Pro, Team o Enterprise).
- Si no quieres exponer la agenda interna, deja `northbay.json` con `"eventos": []` en la versión pública, o consulta con TI de Northbay una alternativa con acceso restringido (por ejemplo, Azure Static Web Apps o Cloudflare Pages con Access).

## Actualizar fechas

Todo se edita en los archivos `.json`, directamente en GitHub: abre el archivo, pulsa el lápiz (**Edit this file**), cambia y pulsa **Commit changes**. La app publicada se actualiza en uno o dos minutos.

### Agregar una fecha de Northbay

En `northbay.json`, copia un bloque dentro de `"eventos"` y cambia los datos:

```json
{"inicio": "2027-02-15", "fin": null, "titulo": "Early Buy SP27", "detalle": "Sesión con cuentas clave", "paises": ["todos"]},
```

- `inicio` y `fin`: fechas en formato AAAA-MM-DD. Usa `null` en `fin` si es un solo día.
- `titulo`: máximo unos 45 caracteres. `detalle`: opcional.
- `paises`: `["todos"]` o una lista de códigos, por ejemplo `["pa", "cr", "gt"]`.
- `"nike": true` agrega la etiqueta Nike.
- Separa cada bloque con una coma, sin coma después del último.
- Actualiza `"actualizado"` con la fecha del cambio.

### Agregar o corregir una fecha de un país

En `<código>.json`, cada fecha tiene esta forma:

```json
{"inicio": "2027-11-26", "cat": "comercio", "titulo": "Black Friday", "detalle": "Viernes", "fuente": "https://..."}
```

- `cat`: `feriado`, `comercio`, `pagos`, `deporte` (carreras) o `escolar`.
- `"confirmado": false` muestra la etiqueta **Por confirmar**. Quítalo cuando la fecha sea oficial.

Códigos: pa Panamá · cr Costa Rica · ni Nicaragua · hn Honduras · sv El Salvador · gt Guatemala · bz Belice · ve Venezuela · do Rep. Dominicana · pr Puerto Rico · jm Jamaica · tt Trinidad y Tobago · bb Barbados · bs Bahamas · aw Aruba · cw Curazao.

Si un JSON queda mal escrito (por ejemplo, falta una coma), la app muestra un mensaje de error. Puedes revisar el archivo en https://jsonlint.com.

## Probarla en tu computadora (opcional)

Con Python instalado, desde esta carpeta:

```
python -m http.server 8000
```

y abre http://localhost:8000.

## Datos

Fechas investigadas en octubre de 2026 a partir de fuentes públicas (ministerios de trabajo y educación, prensa local, organizadores de carreras). Las fechas de 2027 que aún no tienen anuncio oficial están marcadas como "Por confirmar".
