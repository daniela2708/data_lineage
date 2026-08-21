# Guía para presentar Data Lineage Explorer

## Objetivo de la presentación

Mostrar cómo el explorador convierte el catálogo de datos en una experiencia navegable para responder tres preguntas:

1. ¿Cómo viaja una tabla desde su sistema de origen hasta Snowflake?
2. ¿Qué información y relaciones están documentadas para cada tabla?
3. ¿Cómo se ve el alcance completo de la Fase 1 y dónde están los vacíos de documentación?

Duración sugerida: entre 8 y 12 minutos.

## Antes de comenzar

- Abrir la aplicación con la vista **Animated flow** seleccionada.
- Confirmar que la animación esté en el primer paso. Usar **Restart** si es necesario.
- Mantener el zoom del navegador en 100 %.
- Tener preparada la tabla `CLUB_CARD_DIM` para la demostración.
- Recordar que la fuente principal del catálogo es `Data Catalog V1.xlsx`, hoja `Hoja 1`.

## Apertura, 1 minuto

### Qué mostrar

La cabecera, los indicadores generales y las tres opciones de navegación:

- **Animated flow**
- **Table view**
- **Whole estate**

### Guion sugerido

> Hoy les voy a mostrar Data Lineage Explorer, un prototipo que convierte el catálogo de datos en una herramienta interactiva. La intención es que podamos pasar de una lista estática de tablas a una vista donde sea fácil entender el recorrido de los datos, consultar una tabla específica y observar el alcance completo de la Fase 1.
>
> En la parte superior tenemos un resumen del catálogo. Actualmente se registran 159 tablas, de las cuales 63 están identificadas dentro del alcance de la Fase 1. También tenemos 9 pipelines y 18 triggers documentados.
>
> La aplicación tiene tres vistas. La primera muestra un recorrido de punta a punta, la segunda permite investigar cualquier tabla y la tercera presenta una visión general de todo el entorno.

### Mensaje clave

El explorador no reemplaza el catálogo. Lo hace más fácil de consultar, explicar y validar.

---

## Vista 1: Animated flow, 3 minutos

### Qué contiene

Esta vista presenta el único recorrido documentado de punta a punta hasta el momento: `CLUB_CARD_DIM`.

El flujo tiene 10 pasos:

1. `LogixXS` en SQL Server, con cuatro tablas operacionales de origen.
2. `STG_CLUB_CARD_DIM.parquet` en Landing.
3. `stg_club_card_dim` en Raw.
4. `pstg / club_card_dim` en Bronze.
5. `club_card_dim` acumulada en Bronze.
6. `club_card_dim` conformada en Silver.
7. `club_card_dim` en Gold.
8. `club_card_dim.csv` para la carga.
9. `TEMP.CLUB_CARD_DIM` como tabla temporal en Snowflake.
10. `BI_PROD.WMBI.CLUB_CARD_DIM` como tabla publicada.

También muestra:

- El pipeline o notebook asociado con cada movimiento.
- Las tablas adicionales leídas en algunos pasos.
- Las llaves de merge: `CLUB_CARD_ID` y `HOUSEHOLD_ID`.
- Dos rutas legacy registradas para la misma tabla.
- Los puntos que todavía necesitan definición.
- El vacío de evidencia sobre consumidores downstream.

### Qué hacer en pantalla

1. Presionar **Restart**.
2. Presionar **Play**.
3. Dejar avanzar dos o tres pasos.
4. Mostrar que se puede usar **Pause** y cambiar la velocidad a **2x**.
5. Hacer clic en un paso intermedio, preferiblemente Bronze o Silver.
6. Señalar la tarjeta **The step showing now**.
7. Bajar hasta **Recorded alongside the chain**.

### Guion sugerido

> Empezamos con la vista animada. Aquí seguimos la tabla `CLUB_CARD_DIM` desde su origen operacional hasta su publicación en Snowflake.
>
> El recorrido comienza en LogixXS, dentro de SQL Server, donde se identificaron cuatro tablas operacionales. Después, la información pasa por Landing en formato Parquet, continúa a Raw, atraviesa las capas Bronze, Silver y Gold, se exporta como CSV y finalmente se carga primero a una tabla temporal y después a `BI_PROD.WMBI.CLUB_CARD_DIM` en Snowflake.
>
> La animación permite seguir el proceso paso a paso. En cada punto podemos ver dónde se encuentra la información, qué pipeline o notebook la mueve y qué otras tablas se leen durante el procesamiento.
>
> Por ejemplo, en Bronze no solamente vemos la tabla principal. También aparecen lecturas relacionadas, como `sales_pos_tx_f`, `dt_dim` y otras versiones de `club_card_dim`.
>
> Debajo del recorrido tenemos información adicional. El upsert hacia Raw utiliza `CLUB_CARD_ID` y `HOUSEHOLD_ID` como llaves de merge. También se registran dos caminos legacy y dos puntos todavía abiertos: las columnas utilizadas en algunos joins y la confirmación de cuáles tablas secundarias deben permanecer en el diseño.
>
> Hay otro hallazgo importante: no se pudo confirmar un consumidor downstream. Esto no significa que no exista, significa que no aparece evidenciado en las fuentes revisadas. La aplicación muestra ese vacío explícitamente en vez de completar la información con una suposición.

### Mensaje clave

El valor de esta vista no es solamente visualizar el camino conocido. También permite hacer visibles los puntos que todavía deben investigarse.

### Transición

> Ya vimos el recorrido detallado de una tabla. Ahora vamos a pasar a una vista que permite consultar cualquiera de las 159 tablas del catálogo.

---

## Vista 2: Table view, 3 minutos

### Qué contiene

Esta vista permite:

- Buscar por nombre de tabla, ID, sistema de origen, propietario, dominio o esquema.
- Filtrar por alcance de Fase 1 o mostrar todas las tablas.
- Filtrar por caso de negocio.
- Consultar dominio, tipo, capa, base de datos, esquema, origen, wave, complejidad, propietario y pipelines.
- Ver el camino documentado desde el origen hasta los casos de negocio.
- Explorar inputs upstream, consumidores downstream y tablas que comparten pipeline.
- Leer el historial de comentarios del catálogo sin editar ni resumir el texto original.

### Qué hacer en pantalla

1. Seleccionar **Table view**.
2. Mostrar brevemente el selector **Phase 1 / All tables**.
3. Escribir `CLUB_CARD_DIM` en el buscador.
4. Abrir la tabla.
5. Señalar los estados y los metadatos principales.
6. Recorrer el diagrama de izquierda a derecha.
7. Mostrar **Relationship explorer**.
8. Bajar al historial de la tabla y usar **Show all** solamente si hay tiempo.
9. Opcionalmente, hacer clic en **Open the animated flow for this table** para demostrar la conexión entre vistas.

### Guion sugerido

> En Table view podemos buscar y analizar una tabla específica. Podemos limitar la búsqueda a las 63 tablas de la Fase 1 o consultar las 159 tablas del catálogo completo. También podemos filtrar según los casos de negocio asociados.
>
> Voy a buscar nuevamente `CLUB_CARD_DIM`. En la cabecera de la ficha vemos su identificador estable y sus estados principales. Después encontramos sus metadatos: base de datos, esquema, sistema de origen, casos de negocio, wave, complejidad, propietario técnico y pipelines documentados.
>
> El camino de carga se lee de izquierda a derecha. Primero vemos el sistema donde comienza la información; luego, qué trigger inicia la carga; después, los pipelines que la transportan; la tabla que se carga; y finalmente, los casos de negocio que soporta.
>
> Cuando una etapa aparece con una tarjeta punteada, no es un error de la interfaz. Significa que la fuente no contiene esa información. Decidimos mantener esos vacíos visibles porque también son hallazgos útiles para el discovery.
>
> En Relationship explorer separamos tres conceptos. Primero, los inputs upstream que sí están documentados. Segundo, los consumidores downstream, donde puede existir un vacío de evidencia. Tercero, otras tablas que comparten un pipeline. Esta última es una relación derivada y no se presenta como una dependencia confirmada.
>
> Finalmente, tenemos el historial registrado contra la tabla. El texto se muestra tal como aparece en el catálogo, sin corregirlo ni resumirlo, para conservar la trazabilidad de la evidencia original.

### Mensaje clave

Esta vista sirve como punto de investigación por tabla y diferencia claramente entre evidencia documentada, información ausente y relaciones derivadas.

### Transición

> Hasta ahora vimos una tabla en detalle. Para cerrar, vamos a alejarnos y observar cómo se distribuye todo el alcance de la Fase 1.

---

## Vista 3: Whole estate, 2 minutos

### Qué contiene

Esta vista agrupa las tablas dentro del alcance por el pipeline que las carga.

- Cada marca representa una tabla.
- El color representa el impacto según la cantidad de casos de negocio asociados.
- Una tabla puede aparecer en más de una línea si participa en varios pipelines.
- La línea punteada agrupa las tablas sin pipeline registrado.
- Debajo se presenta el inventario de triggers, con frecuencia, estado y cantidad de pipelines y tablas relacionadas.

Leyenda de impacto:

- Gris: ningún caso de negocio.
- Verde: un caso de negocio.
- Aqua: dos o tres casos de negocio.
- Rojo: cuatro o más casos de negocio.
- Contorno punteado: no hay pipeline registrado.

### Qué hacer en pantalla

1. Seleccionar **Whole estate**.
2. Señalar las líneas de pipelines.
3. Explicar la leyenda de colores.
4. Señalar la línea **No pipeline recorded**.
5. Hacer clic en una marca para mostrar que abre la ficha de la tabla.
6. Volver y bajar hasta la tabla de triggers si queda tiempo.

### Guion sugerido

> La tercera vista nos da una perspectiva de todo el entorno de la Fase 1. Cada línea representa un pipeline y cada marca representa una tabla asociada con ese pipeline.
>
> El color no representa el estado técnico. Representa el alcance del impacto de negocio. Verde significa un caso de negocio, aqua significa dos o tres y rojo significa cuatro o más. Así podemos identificar visualmente las tablas que podrían tener un impacto más amplio.
>
> Una tabla puede aparecer en varias líneas cuando está asociada con más de un pipeline. Esa repetición es intencional y permite entender la cobertura de cada proceso.
>
> La línea con marcas punteadas reúne las tablas que están dentro del alcance pero no tienen un pipeline registrado. Esas tablas representan una oportunidad clara de investigación y documentación.
>
> En la parte inferior también podemos revisar los triggers registrados, su frecuencia, su estado y cuántos pipelines y tablas alcanzan.

### Mensaje clave

Esta vista permite priorizar el trabajo de lineage: combina alcance de negocio, cobertura técnica y vacíos de documentación en un solo lugar.

---

## Cierre, 1 minuto

### Guion sugerido

> En resumen, el explorador ofrece tres niveles de lectura. Podemos seguir un recorrido de punta a punta, investigar una tabla individual o revisar el alcance completo de la Fase 1.
>
> El catálogo principal se genera desde `Data Catalog V1.xlsx`. La herramienta conserva los vacíos como vacíos, mantiene los comentarios originales y etiqueta las relaciones derivadas para no confundirlas con dependencias confirmadas.
>
> Hoy tenemos 159 tablas catalogadas, 63 dentro del alcance y un recorrido completamente trazado. El siguiente paso natural sería documentar nuevos recorridos de punta a punta y completar los pipelines o consumidores que todavía no están evidenciados.

## Preguntas probables y respuestas sugeridas

### ¿El diagrama está dibujado manualmente?

> No. Se genera a partir de una estructura de datos. Cuando se documente el recorrido de otra tabla, la misma interfaz puede representarlo sin diseñar un diagrama nuevo desde cero.

### ¿Toda la información viene del Excel?

> El catálogo principal de tablas se genera desde `Data Catalog V1.xlsx`, hoja `Hoja 1`. Algunos elementos que el Excel no contiene, como identificadores estables, el recorrido detallado de `CLUB_CARD_DIM` y ciertas relaciones de presentación, se mantienen como metadatos curados y están diferenciados de los datos del catálogo.

### ¿Por qué algunas secciones dicen “Not documented”?

> Porque ese valor no aparece en las fuentes revisadas. Se mantiene visible para convertir la ausencia de información en un hallazgo y evitar inventar datos.

### ¿Compartir pipeline significa que una tabla depende de otra?

> No necesariamente. La aplicación lo etiqueta como una relación derivada. Sirve para encontrar tablas relacionadas operacionalmente, pero no confirma una dependencia directa.

### ¿Por qué solamente hay una tabla trazada de punta a punta?

> `CLUB_CARD_DIM` es el caso trazado completamente con la evidencia disponible. Funciona como plantilla para demostrar cómo se representarían los siguientes recorridos una vez documentados.

### ¿Se puede actualizar el reporte cuando cambie el Excel?

> Sí. El proceso de compilación vuelve a generar el catálogo desde el archivo Excel. Así, los cambios en las columnas utilizadas por el reporte se reflejan en la aplicación durante el siguiente despliegue.

### ¿El Excel queda disponible públicamente en Vercel?

> No. El archivo se utiliza durante la compilación para generar el catálogo, pero se elimina del resultado público del despliegue.

### ¿La herramienta modifica los comentarios originales?

> No. El historial se conserva de forma textual para mantener la evidencia tal como fue registrada en el catálogo.

## Versión corta, presentación de 3 minutos

> Data Lineage Explorer convierte el catálogo de datos en tres vistas interactivas. En la parte superior vemos 159 tablas registradas, 63 dentro del alcance de la Fase 1, además de 9 pipelines y 18 triggers.
>
> En Animated flow seguimos `CLUB_CARD_DIM` desde cuatro tablas operacionales en SQL Server, pasando por Landing, Raw, Bronze, Silver y Gold, hasta su publicación en Snowflake. La vista muestra pipelines, notebooks, lecturas adicionales, llaves de merge y puntos todavía abiertos.
>
> En Table view podemos buscar cualquier tabla, revisar sus metadatos, su camino de carga, sus relaciones y el historial textual del catálogo. Los vacíos se muestran como “Not documented” y las relaciones derivadas están claramente identificadas.
>
> En Whole estate vemos todas las tablas de la Fase 1 agrupadas por pipeline. Los colores representan cuántos casos de negocio impacta cada tabla y las marcas punteadas identifican tablas sin pipeline registrado.
>
> La fuente principal es `Data Catalog V1.xlsx`. El objetivo es facilitar la validación del lineage, priorizar vacíos de documentación y ampliar progresivamente los recorridos de punta a punta.

## Recordatorios para la persona que presenta

- Hablar de “evidencia no encontrada” y no afirmar que un proceso no existe.
- Aclarar que compartir un pipeline no confirma una dependencia.
- No leer todos los nombres técnicos del flujo; explicar primero la historia general.
- Usar `CLUB_CARD_DIM` como hilo conductor entre Animated flow y Table view.
- Si falta tiempo, omitir la lista de triggers y usar la versión corta del cierre.
- Terminar con el siguiente paso: documentar más recorridos completos y resolver los vacíos visibles.
