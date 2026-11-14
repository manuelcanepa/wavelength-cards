# Mazo de espectros para Wavelength

Página web estática que saca al azar cartas de espectro ("Frío ↔ Caliente", etc.) para jugar Wavelength.
Las cartas **no se repiten** hasta que tocás **Barajar**. El estado del mazo se guarda en el navegador,
así que podés recargar la página sin perder la posición.

## Uso

- **Sacar carta**: botón, tocar la carta, o `Espacio` / `Enter`.
- **Invertir**: intercambia los extremos de la carta actual.
- **Barajar**: reinicia el mazo con un orden nuevo (`B`).

## Editar las cartas

Las cartas están en [`cards.json`](cards.json):

```json
[
  { "left": "Frío", "right": "Caliente" }
]
```

Si modificás el archivo, el mazo se baraja automáticamente la próxima vez que se abra la página.

## Probar en local

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

(Hace falta un servidor; abrir `index.html` directamente con `file://` no permite cargar el JSON.)

## Desplegar en GitHub Pages

1. Creá un repositorio en GitHub y subí el proyecto a la rama `main`:
   ```bash
   git remote add origin git@github.com:<usuario>/<repo>.git
   git push -u origin main
   ```
2. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada push a `main` despliega automáticamente (workflow en `.github/workflows/deploy.yml`).
   La URL queda en `https://<usuario>.github.io/<repo>/`.
