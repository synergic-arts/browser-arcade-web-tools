# Browser Arcade Web Tools

Colección de juegos web gratuitos, estáticos y ejecutables en el navegador.

- No existe servidor de aplicación ni cuenta necesaria.
- Canvas, Web Audio, `localStorage`, eventos táctiles y service worker son las únicas dependencias de ejecución.
- Las mejores puntuaciones se guardan en el dispositivo del jugador.
- La primera visita puede instalar la caché offline de la aplicación.

## Juegos

- [Meteor Patrol](juegos/meteor-patrol/): arcade de supervivencia para teclado y pantalla táctil.
- [Hex Path](juegos/hex-path/): rompecabezas de rutas y obstáculos generado en cada partida.
- [Memory Layers](juegos/memory-layers/): memoria visual con iconos de cartografía y ciencia.
- [Nebula Command](juegos/nebula-command/): shooter de oleadas con partículas, escudo, mejoras y comandantes.
- [Cartographer Quest](juegos/cartographer-quest/): exploración procedural con niebla de guerra, minimapa y seis hitos.
- [Carto Tactics](juegos/carto-tactics/): estrategia por turnos con terreno, energía, balizas y rival automático.
- [Ridge Recon](juegos/ridge-recon/): exploración táctica con niebla de guerra, escaneo, anomalías, tormentas y patrullas móviles.
- [Atlas Command](juegos/atlas-command/): campaña de tres mapas con balizas, energía, créditos, mejoras y unidades enemigas.
- [Survey Sprint](juegos/survey-sprint/): campaña de prospección de tres zonas con rover, escáner, muestras, batería y peligros.
- [Carto Rally](juegos/carto-rally/): campeonato de tres circuitos con checkpoints, trazada, velocidad, turbo y controles táctiles.

## Desarrollo

Cada juego es una página independiente y no comparte estado con los demás. Esto permite añadir nuevos juegos sin romper los existentes y facilita alojarlos directamente en GitHub Pages.
