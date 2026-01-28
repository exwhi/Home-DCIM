// Frontend SSH terminal using xterm.js with server's /ssh WebSocket proxy
(function(){
  const termEl = document.getElementById('terminal');
  const connectBtn = document.getElementById('connect');
  const disconnectBtn = document.getElementById('disconnect');
  const hostInput = document.getElementById('host');
  const portInput = document.getElementById('port');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');

  const { Terminal } = window;
  const term = new Terminal({ cols: 120, rows: 28, fontSize: 13 });
  term.open(termEl);
  term.write('\x1b[36m欢迎使用 HomeDCIM SSH 终端\x1b[0m\r\n');
  term.write('\x1b[2m请输入连接信息后点击"连接"\x1b[0m\r\n\r\n');

  let ws = null;

  function setConnected(val) {
    if (val) {
      statusIndicator.classList.add('connected');
      statusText.textContent = '已连接';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'inline-flex';
    } else {
      statusIndicator.classList.remove('connected');
      statusText.textContent = '未连接';
      connectBtn.style.display = 'inline-flex';
      disconnectBtn.style.display = 'none';
    }
  }

  function attachWS(socket) {
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => {
      term.write('\x1b[32m✓ 已连接到代理服务器\x1b[0m\r\n');
      term.write('\x1b[32m✓ 正在发送凭据...\x1b[0m\r\n');
      const auth = {
        type: 'auth',
        username: userInput.value,
        password: passInput.value,
        host: hostInput.value,
        port: Number(portInput.value || 22)
      };
      socket.send(JSON.stringify(auth));
    };

    socket.onmessage = (ev) => {
      try {
        const s = typeof ev.data === 'string' ? ev.data : null;
        if (s) {
          try {
            const obj = JSON.parse(s);
            if (obj.type === 'ready') {
              term.write('\x1b[32m✓ Shell 已就绪，可以开始操作\x1b[0m\r\n\r\n');
              setConnected(true);
              return;
            }
            if (obj.type === 'error') {
              term.write('\x1b[31m✗ 错误: ' + obj.message + '\x1b[0m\r\n');
              setConnected(false);
              return;
            }
          } catch (e) {
            // Not JSON, treat as raw data
          }
        }
      } catch (e) {
        // ignore
      }
      // Treat as raw terminal data
      const data = ev.data;
      if (data instanceof ArrayBuffer) {
        term.write(new TextDecoder().decode(data));
      } else {
        term.write(data);
      }
    };

    socket.onclose = () => {
      term.write('\r\n\x1b[31m✗ 连接已关闭\x1b[0m\r\n');
      setConnected(false);
    };

    socket.onerror = (e) => {
      term.write('\r\n\x1b[31m✗ WebSocket 错误\x1b[0m\r\n');
      setConnected(false);
    };

    // Forward terminal input to WebSocket
    term.onData(data => {
      try {
        socket.send(data);
      } catch (e) {
        console.error('Send failed:', e);
      }
    });
  }

  connectBtn.addEventListener('click', () => {
    const host = hostInput.value;
    const port = portInput.value || '22';
    const wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') +
      location.host + '/ssh?host=' + encodeURIComponent(host) + '&port=' + encodeURIComponent(port);
    
    term.write('\x1b[36m正在连接到 ' + host + ':' + port + '...\x1b[0m\r\n');
    
    try {
      ws = new WebSocket(wsUrl);
      attachWS(ws);
      connectBtn.disabled = true;
    } catch (e) {
      term.write('\x1b[31m✗ 连接失败: ' + e.message + '\x1b[0m\r\n');
    }
  });

  disconnectBtn.addEventListener('click', () => {
    if (ws) {
      ws.close();
      ws = null;
    }
    term.write('\r\n\x1b[33m连接已断开\x1b[0m\r\n');
    connectBtn.disabled = false;
    setConnected(false);
  });

  // Allow Enter to connect if no SSH target loaded
  hostInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !ws) connectBtn.click();
  });
})();
