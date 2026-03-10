# FocusBuddy Desktop Widget

Este diretório contém os arquivos para a interface do **Widget Desktop** do FocusBuddy, com visual moderno inspirado em players de música (como Spotify) e usando Glassmorphism.

## 🎨 Visual

- **Fundo**: Escuro profundo (`#050505`) com glow sutil.
- **Card**: Efeito de vidro (`backdrop-filter: blur`) com bordas translúcidas.
- **Controles**: Estilo player de música, com botão de Play/Pause destacado.
- **Personagem**: Integrado com efeito de brilho e animações suaves.

## 📂 Arquivos

1.  **`index.html`**: Estrutura semântica e moderna do widget.
2.  **`style.css`**: Estilização completa (Glassmorphism, Dark Mode, Inter Font).
3.  **`renderer.js`**: Lógica de exemplo para atualizar a UI (Score, Personagem, Play/Pause).

## 🚀 Como Usar

### Opção 1: Teste Rápido
Basta abrir o arquivo `index.html` no seu navegador (Chrome/Edge/Safari).

### Opção 2: Integração com Electron
Se você já tem um projeto Electron, copie o conteúdo de `index.html` e `style.css` para a pasta do seu renderizador. Certifique-se de configurar a janela do Electron para suportar transparência se quiser o efeito completo:

```javascript
// main.js (Exemplo Electron)
const mainWindow = new BrowserWindow({
  width: 360,
  height: 520,
  frame: false, // Remove barra de título padrão
  transparent: true, // Permite cantos arredondados e transparência real
  webPreferences: {
    nodeIntegration: true
  }
});
```

## 🛠 Personalização

- Para mudar as cores, edite as variáveis `:root` no início do `style.css`.
- Os ícones são da biblioteca [Lucide](https://lucide.dev/), importados via CDN no HTML.
