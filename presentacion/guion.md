# SOMA: comercial de 30 segundos

Archivo: `soma-pitch-30s.mp4` (1920x1080, 30 fps, H.264 + AAC, 30,0 s).
Sin voz en off: todo el texto va en pantalla. De fondo suena una música suave generada por código, con fade in y fade out.
Estética: fondo verde petróleo oscuro, acento verde azulado (#0f766e / #14b8a6 / #5eead4) y tipografía Inter.

| # | Tiempo | Escena | Texto en pantalla | Animación |
|---|--------|--------|-------------------|-----------|
| 1 | 0,0 – 4,5 s | Gancho | **¿Te acordás qué te dolía hace tres meses?** / Casi nadie se acuerda. | Las líneas aparecen y la cámara hace un zoom lento |
| 2 | 4,5 – 9,0 s | Problema | **Tu salud queda desparramada.** / Y tu médico no tiene tu historia a mano. | Tarjetas flotando torcidas: "Estudios en papel", "Resultados en PDF", "Chats de WhatsApp", "Lo que te acordás" |
| 3 | 9,0 – 15,0 s | Solución | CON SOMA / **Se lo contás.** / Como un audio de WhatsApp: "me siento mal", "fui al médico", "el lunes tengo turno". / **Y queda todo en orden.** | Celular con micrófono estilo WhatsApp: la onda se anima mientras "graba" y caen eventos con etiqueta (Cómo me siento · Consulta médica · Estudios · Próxima cita fijada arriba) |
| 4 | 15,0 – 20,8 s | Las 3 vistas | **Todo tu historial, a mano** / Historial · Estudios · Posibles problemas (Top 10, con el estudio para descartarlo y qué decirle al médico) / Llegás a la consulta sabiendo qué preguntar. | Tres paneles que aparecen en cascada, con filas que entran una por una |
| 5 | 20,8 – 25,0 s | Tu asistente | **Funciona con el asistente que ya usás.** / SOMA guarda tu historia. Tu asistente te ayuda a entenderla. | Nodo SOMA en el centro y tres asistentes (Claude, Gemini, ChatGPT) que se conectan con líneas animadas |
| 6 | 25,0 – 30,0 s | Cierre | **SOMA** / **Tu salud, contada por vos.** / (letra chica) SOMA no diagnostica ni receta. Te ayuda a hablarlo con tu médico. | El logo se cierra (el espaciado entre letras se achica) y la música baja con un fade |

## Cómo se regenera

```bash
# requiere: node + playwright-core (por NODE_PATH), Google Chrome, ffmpeg con libx264, python3
NODE_PATH=/ruta/a/node_modules FFMPEG=/ruta/a/ffmpeg ./build.sh
```

- `comercial.html`: las escenas. `window.render(t)` dibuja el cuadro exacto del segundo `t`.
- `render.js`: captura 900 cuadros con Chrome headless y se los pasa a ffmpeg. Con `--frames=2.5,12` saca capturas sueltas en PNG.
- `music.py`: genera la música de fondo (solo usa la biblioteca estándar de Python).
- `build.sh`: arma todo y deja `soma-pitch-30s.mp4`.
