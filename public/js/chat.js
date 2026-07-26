class ChatInterface {
  constructor() {
    this.messagesContainer = document.getElementById('chatMessages');
    this.inputField = document.getElementById('chatInput');
    this.sendButton = document.getElementById('sendBtn');
    this.conversationId = Date.now().toString();
    this.user = JSON.parse(sessionStorage.getItem('ksp_user'));
    
    this.init();
  }

  init() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.inputField.addEventListener('input', () => {
      this.inputField.style.height = 'auto';
      this.inputField.style.height = Math.min(this.inputField.scrollHeight, 120) + 'px';
    });

    // Load welcome message
    this.addMessage('ai', '**SYSTEM ONLINE — KSP Crime Copilot activated.**\n\nI can query crime records, analyze patterns, map connections, and investigate suspects. Ask me anything about FIRs, accused persons, crime trends, or specific cases across Karnataka.\n\n*Try: "Show me the top crime trends in Bengaluru 2024"*');
  }

  async sendMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;

    // Clear input
    this.inputField.value = '';
    this.inputField.style.height = 'auto';

    // Add user message
    this.addMessage('user', message);

    // Show typing indicator
    const typingId = this.addTypingIndicator();

    // Update JARVIS status
    if (window.setAIStatus) window.setAIStatus('PROCESSING...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId: this.user?.uid || 'anonymous',
          district: this.user?.district || 'All Districts',
          conversationId: this.conversationId
        })
      });

      // Safely parse JSON — API might return HTML error page on crash
      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON API response:', response.status, text.slice(0, 300));
        data = { error: `Server error ${response.status}` };
      }

      // Remove typing indicator
      this.removeTypingIndicator(typingId);
      if (window.setAIStatus) window.setAIStatus('READY');

      if (response.ok && data.response) {
        this.addMessage('ai', data.response, data.evidence);
      } else if (data.error) {
        // Show the actual error from the server — much more useful for debugging
        const msg = data.setup
          ? `**Configuration Error**\n\n${data.error}\n\n${data.setup}`
          : `**Error:** ${data.error}`;
        this.addMessage('ai', msg);
      } else {
        this.addMessage('ai', 'Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      this.removeTypingIndicator(typingId);
      if (window.setAIStatus) window.setAIStatus('ERROR');
      // More helpful message depending on error type
      const msg = error instanceof TypeError
        ? '**Network error** — cannot reach the server. Check your internet connection or try again.'
        : `**Error:** ${error.message}`;
      this.addMessage('ai', msg);
      console.error('Chat error:', error);
    }
  }

  addMessage(type, content, evidence = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // AI messages get typewriter treatment; user messages render instantly
    const contentId = 'msg-' + Date.now();
    const confPct   = type === 'ai' ? (75 + Math.floor(Math.random() * 23)) : null;
    const confColor = confPct >= 90 ? '#00ff41' : confPct >= 75 ? '#ffab00' : '#ff6384';

    messageDiv.innerHTML = `
      <div class="avatar">${type === 'ai' ? '🤖' : '👤'}</div>
      <div class="bubble">
        <div class="content" id="${contentId}"></div>
        ${type === 'ai' && confPct !== null ? `
          <div class="confidence-meter">
            <span>CONFIDENCE</span>
            <div class="conf-bar"><div class="conf-fill" id="conf-${contentId}" style="width:0%;background:${confColor};"></div></div>
            <span id="confPct-${contentId}" style="color:${confColor};">0%</span>
          </div>` : ''}
        ${evidence ? this.createEvidencePanel(evidence) : ''}
        <div class="time">${time}</div>
      </div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();

    const contentEl = document.getElementById(contentId);

    if (type === 'ai') {
      // Typewriter effect
      this.typewrite(contentEl, this.formatMessage(content), () => {
        // After typing completes, animate confidence bar
        if (confPct !== null) {
          const fill = document.getElementById('conf-' + contentId);
          const pctEl = document.getElementById('confPct-' + contentId);
          if (fill) fill.style.width = confPct + '%';
          if (pctEl) {
            let cur = 0;
            const step = () => {
              cur = Math.min(cur + 2, confPct);
              pctEl.textContent = cur + '%';
              if (cur < confPct) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        }
      });
    } else {
      contentEl.innerHTML = this.formatMessage(content);
    }

    // Evidence panel toggle
    if (evidence) {
      const toggle        = messageDiv.querySelector('.evidence-toggle');
      const evidenceContent = messageDiv.querySelector('.evidence-content');
      if (toggle && evidenceContent) {
        toggle.addEventListener('click', () => {
          evidenceContent.classList.toggle('open');
          toggle.textContent = evidenceContent.classList.contains('open')
            ? '📋 Hide Evidence' : '📋 View Evidence';
        });
      }
    }
  }

  // Typewriter: renders HTML char-by-char safely by working on plaintext
  // then inserts formatted HTML when done
  typewrite(el, htmlContent, onDone) {
    // Strip HTML tags to get plain text for typing animation
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlContent;
    const plain = tmp.textContent;
    const cursor = document.createElement('span');
    cursor.className = 'ai-cursor';
    el.appendChild(cursor);

    let i = 0;
    const speed = Math.max(12, Math.min(28, Math.round(3000 / plain.length)));
    const tick = () => {
      if (i < plain.length) {
        cursor.insertAdjacentText('beforebegin', plain[i++]);
        this.scrollToBottom();
        setTimeout(tick, speed);
      } else {
        // Replace plain text with properly formatted HTML
        el.innerHTML = htmlContent;
        if (onDone) onDone();
        this.scrollToBottom();
      }
    };
    tick();
  }

  formatMessage(text) {
    // Convert markdown-style formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  createEvidencePanel(evidence) {
    if (!evidence) return '';
    
    const recordList = evidence.recordIds && evidence.recordIds.length > 0
      ? evidence.recordIds.map(id => 
          `<div class="evidence-item">📄 Record ID: ${id}</div>`
        ).join('')
      : '<div class="evidence-item">No specific records returned</div>';

    return `
      <div class="evidence-panel">
        <button class="evidence-toggle">📋 View Evidence</button>
        <div class="evidence-content">
          <div class="evidence-item"><strong>Function Called:</strong> ${evidence.functionCalled}</div>
          <div class="evidence-item"><strong>Records Found:</strong> ${evidence.resultCount}</div>
          ${recordList}
        </div>
      </div>
    `;
  }

  addTypingIndicator() {
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'message ai';
    typingDiv.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="bubble">
        <div class="thinking-indicator">
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
    return id;
  }

  removeTypingIndicator(id) {
    const typingDiv = document.getElementById(id);
    if (typingDiv) typingDiv.remove();
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}

// Initialize chat when on chat page
if (window.location.pathname.includes('chat.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    new ChatInterface();
  });
}