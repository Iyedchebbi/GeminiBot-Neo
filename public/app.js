/**
 * GeminiBot Neo — Client Application Logic
 * Immersive AI Chat with real-time streaming, markdown rendering, voice features & session management.
 */

(function () {
    'use strict';

    // --- State & Configurations ---
    const STORAGE_KEY_CHATS = 'geminibot_neo_chats_v1';
    const STORAGE_KEY_SETTINGS = 'geminibot_neo_settings_v1';
    const STORAGE_KEY_ACTIVE_MODEL = 'geminibot_neo_active_model_v1';

    let state = {
        chats: [],
        currentChatId: null,
        models: [],
        activeModel: "nvidia/nemotron-3-ultra-550b-a55b:free",
        activeModelBadge: "FREE",
        activeModelName: "Nvidia Nemotron 3 Ultra",
        isStreaming: false,
        abortController: null,
        isRecording: false,
        speechRecognition: null,
        settings: {
            apiKey: '',
            systemPrompt: 'You are an intelligent, helpful, and creative AI assistant called GeminiBot.',
            temperature: 0.7,
            stream: true
        }
    };

    // --- DOM Elements ---
    const els = {
        sidebar: document.getElementById('sidebar'),
        toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
        closeSidebarBtn: document.getElementById('closeSidebarBtn'),
        newChatBtn: document.getElementById('newChatBtn'),
        chatSearchInput: document.getElementById('chatSearchInput'),
        chatHistoryList: document.getElementById('chatHistoryList'),
        currentChatTitle: document.getElementById('currentChatTitle'),
        modelPickerBtn: document.getElementById('modelPickerBtn'),
        currentModelDisplay: document.getElementById('currentModelDisplay'),
        currentModelTag: document.getElementById('currentModelTag'),
        sidebarModelBadge: document.getElementById('sidebarModelBadge'),
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        messagesContainer: document.getElementById('messagesContainer'),
        welcomeHero: document.getElementById('welcomeHero'),
        messagesList: document.getElementById('messagesList'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        micBtn: document.getElementById('micBtn'),
        stopStreamBtn: document.getElementById('stopStreamBtn'),
        exportBtn: document.getElementById('exportBtn'),
        exportDropdown: document.getElementById('exportDropdown'),
        exportMarkdownBtn: document.getElementById('exportMarkdownBtn'),
        exportJsonBtn: document.getElementById('exportJsonBtn'),
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        topSettingsBtn: document.getElementById('topSettingsBtn'),
        clearAllChatsBtn: document.getElementById('clearAllChatsBtn'),
        modelModal: document.getElementById('modelModal'),
        closeModelModalBtn: document.getElementById('closeModelModalBtn'),
        modelSearchInput: document.getElementById('modelSearchInput'),
        modelCategoryChips: document.getElementById('modelCategoryChips'),
        modelsGrid: document.getElementById('modelsGrid'),
        customModelInput: document.getElementById('customModelInput'),
        applyCustomModelBtn: document.getElementById('applyCustomModelBtn'),
        settingsModal: document.getElementById('settingsModal'),
        closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
        cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),
        systemPromptInput: document.getElementById('systemPromptInput'),
        temperatureSlider: document.getElementById('temperatureSlider'),
        tempValueDisplay: document.getElementById('tempValueDisplay'),
        streamToggle: document.getElementById('streamToggle'),
        toastContainer: document.getElementById('toastContainer')
    };

    // --- Initialization ---
    async function init() {
        loadSettingsFromStorage();
        loadChatsFromStorage();
        initSpeechRecognition();
        bindEvents();
        await checkBackendStatus();
        await fetchModels();

        // If no chat exists, create fresh one
        if (!state.chats.length) {
            createNewChat();
        } else {
            // Select most recent chat
            selectChat(state.chats[0].id);
        }
    }

    // --- Local Storage Management ---
    function loadSettingsFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (stored) {
                state.settings = { ...state.settings, ...JSON.parse(stored) };
            }
            const storedModel = localStorage.getItem(STORAGE_KEY_ACTIVE_MODEL);
            if (storedModel) {
                state.activeModel = storedModel;
            }
        } catch (e) {
            console.warn('Failed to load settings from storage', e);
        }
    }

    function saveSettingsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(state.settings));
            localStorage.setItem(STORAGE_KEY_ACTIVE_MODEL, state.activeModel);
        } catch (e) {
            console.warn('Failed to save settings to storage', e);
        }
    }

    function loadChatsFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_CHATS);
            if (stored) {
                state.chats = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load chats from storage', e);
            state.chats = [];
        }
    }

    function saveChatsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(state.chats));
        } catch (e) {
            console.warn('Failed to save chats to storage', e);
        }
    }

    // --- Backend API Integration ---
    async function checkBackendStatus() {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                const data = await res.json();
                if (data.has_api_key) {
                    els.statusDot.className = 'status-dot';
                    els.statusText.textContent = 'API Connected';
                    if (!state.settings.apiKey && data.masked_key) {
                        els.apiKeyInput.placeholder = data.masked_key;
                    }
                } else {
                    els.statusDot.className = 'status-dot warning';
                    els.statusText.textContent = 'API Key Required';
                }
            }
        } catch (err) {
            els.statusDot.className = 'status-dot warning';
            els.statusText.textContent = 'Server Offline';
        }
    }

    async function fetchModels() {
        try {
            const res = await fetch('/api/models');
            if (res.ok) {
                const data = await res.json();
                state.models = data.models || [];
                updateModelDisplay();
                renderModelsGrid(state.models);
            }
        } catch (err) {
            console.error('Failed to fetch models', err);
        }
    }

    function updateModelDisplay() {
        const found = state.models.find(m => m.id === state.activeModel);
        if (found) {
            state.activeModelName = found.name.replace(/\(Free\)/i, '').trim();
            state.activeModelBadge = found.badge || 'FREE';
        } else {
            state.activeModelName = state.activeModel.split('/').pop().replace(':free', '');
            state.activeModelBadge = state.activeModel.includes(':free') ? 'FREE' : 'CUSTOM';
        }
        els.currentModelDisplay.textContent = state.activeModelName;
        els.currentModelTag.textContent = state.activeModelBadge;
        els.sidebarModelBadge.textContent = state.activeModelName;
    }

    // --- Chat Session Management ---
    function createNewChat() {
        const newChat = {
            id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: 'New Conversation',
            createdAt: new Date().toISOString(),
            messages: []
        };
        state.chats.unshift(newChat);
        saveChatsToStorage();
        renderChatHistory();
        selectChat(newChat.id);
        els.messageInput.focus();
    }

    function selectChat(id) {
        state.currentChatId = id;
        const currentChat = state.chats.find(c => c.id === id);
        if (!currentChat) return;

        els.currentChatTitle.textContent = currentChat.title || 'New Conversation';
        renderChatHistory();
        renderMessages(currentChat.messages);
        
        // Mobile sidebar close on selection
        if (window.innerWidth <= 768) {
            els.sidebar.classList.add('collapsed');
        }
    }

    function deleteChat(id, e) {
        if (e) e.stopPropagation();
        state.chats = state.chats.filter(c => c.id !== id);
        saveChatsToStorage();
        if (state.currentChatId === id) {
            if (state.chats.length > 0) {
                selectChat(state.chats[0].id);
            } else {
                createNewChat();
            }
        } else {
            renderChatHistory();
        }
        showToast('Conversation deleted', 'info');
    }

    function renameChat(id, e) {
        if (e) e.stopPropagation();
        const chat = state.chats.find(c => c.id === id);
        if (!chat) return;
        const newTitle = prompt('Rename conversation:', chat.title);
        if (newTitle && newTitle.trim()) {
            chat.title = newTitle.trim();
            saveChatsToStorage();
            renderChatHistory();
            if (state.currentChatId === id) {
                els.currentChatTitle.textContent = chat.title;
            }
        }
    }

    function clearAllChats() {
        if (!confirm('Are you sure you want to delete all conversations? This cannot be undone.')) return;
        state.chats = [];
        saveChatsToStorage();
        createNewChat();
        showToast('All conversations cleared', 'info');
    }

    function renderChatHistory() {
        const searchTerm = els.chatSearchInput.value.toLowerCase().trim();
        els.chatHistoryList.innerHTML = '';

        const filtered = state.chats.filter(c => {
            if (!searchTerm) return true;
            return c.title.toLowerCase().includes(searchTerm) ||
                c.messages.some(m => m.content.toLowerCase().includes(searchTerm));
        });

        if (filtered.length === 0) {
            els.chatHistoryList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-dim); font-size: 13px;">
                    No conversations found
                </div>
            `;
            return;
        }

        filtered.forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-history-item ${chat.id === state.currentChatId ? 'active' : ''}`;
            item.onclick = () => selectChat(chat.id);

            item.innerHTML = `
                <div class="history-item-content">
                    <i class="fa-regular fa-message history-item-icon"></i>
                    <span class="history-item-title">${escapeHtml(chat.title)}</span>
                </div>
                <div class="history-item-actions">
                    <button class="action-tiny-btn rename-btn" title="Rename" aria-label="Rename">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-tiny-btn delete-btn" title="Delete" aria-label="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;

            const renameBtn = item.querySelector('.rename-btn');
            renameBtn.onclick = (e) => renameChat(chat.id, e);

            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.onclick = (e) => deleteChat(chat.id, e);

            els.chatHistoryList.appendChild(item);
        });
    }

    // --- Message Rendering & Markdown ---
    function renderMessages(messages) {
        if (!messages || messages.length === 0) {
            els.welcomeHero.classList.remove('hidden');
            els.messagesList.innerHTML = '';
            return;
        }

        els.welcomeHero.classList.add('hidden');
        els.messagesList.innerHTML = '';

        messages.forEach((msg, idx) => {
            appendMessageNode(msg, idx);
        });

        scrollToBottom();
    }

    function appendMessageNode(msg, index) {
        const isUser = msg.role === 'user';
        const row = document.createElement('div');
        row.className = `message-row ${isUser ? 'user-row' : 'bot-row'}`;
        row.dataset.index = index;

        const timeString = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        if (isUser) {
            row.innerHTML = `
                <div class="message-content-wrapper">
                    <div class="message-bubble user-bubble">${escapeHtml(msg.content)}</div>
                    <div class="message-meta">
                        <span>${timeString}</span>
                    </div>
                </div>
                <div class="message-avatar user-avatar">
                    <i class="fa-solid fa-user"></i>
                </div>
            `;
        } else {
            const formattedContent = parseMarkdown(msg.content);
            row.innerHTML = `
                <div class="message-avatar bot-avatar">
                    <i class="fa-solid fa-sparkles"></i>
                </div>
                <div class="message-content-wrapper">
                    <div class="message-bubble bot-bubble">${formattedContent}</div>
                    <div class="message-meta">
                        <span>${escapeHtml(msg.model || state.activeModelName)}</span>
                        <span>•</span>
                        <span>${timeString}</span>
                        <div class="message-actions">
                            <button class="msg-action-btn copy-msg-btn" title="Copy text" aria-label="Copy message text">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                            <button class="msg-action-btn speak-msg-btn" title="Read aloud" aria-label="Read message aloud">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Bind copy button
            const copyBtn = row.querySelector('.copy-msg-btn');
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(msg.content);
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                showToast('Copied to clipboard', 'success');
                setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 2000);
            };

            // Bind speak button
            const speakBtn = row.querySelector('.speak-msg-btn');
            speakBtn.onclick = () => speakText(msg.content, speakBtn);
        }

        els.messagesList.appendChild(row);
        bindCodeCopyButtons(row);
    }

    // --- Markdown Parser with Code Block Styling ---
    function parseMarkdown(text) {
        if (!text) return '';
        let html = text;

        // Fenced code blocks ```language ... ```
        html = html.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang.trim() || 'code';
            const escapedCode = escapeHtml(code.trim());
            return `
                <div class="code-container">
                    <div class="code-header">
                        <span class="code-lang">${language.toUpperCase()}</span>
                        <button class="copy-code-btn" data-code="${encodeURIComponent(code.trim())}">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                    </div>
                    <pre><code>${escapedCode}</code></pre>
                </div>
            `;
        });

        // Inline code `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Blockquotes
        html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

        // Bold & Italic
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

        // Unordered lists
        html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>');
        html = html.replace(/<\/ul>\s*<ul>/gis, '');

        // Paragraphs (split by double newline, avoiding wrapping existing block elements)
        const paragraphs = html.split(/\n{2,}/);
        html = paragraphs.map(p => {
            p = p.trim();
            if (!p) return '';
            if (p.startsWith('<div') || p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<blockquote')) {
                return p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        return html;
    }

    function bindCodeCopyButtons(container) {
        const copyBtns = container.querySelectorAll('.copy-code-btn');
        copyBtns.forEach(btn => {
            btn.onclick = () => {
                const code = decodeURIComponent(btn.dataset.code || '');
                navigator.clipboard.writeText(code);
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
                }, 2000);
            };
        });
    }

    function escapeHtml(string) {
        const div = document.createElement('div');
        div.textContent = string;
        return div.innerHTML;
    }

    function scrollToBottom() {
        els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
    }

    // --- Message Sending & Streaming Flow ---
    async function sendMessage(overrideText = null) {
        const text = overrideText !== null ? overrideText.trim() : els.messageInput.value.trim();
        if (!text || state.isStreaming) return;

        els.messageInput.value = '';
        autoResizeTextarea();

        const currentChat = state.chats.find(c => c.id === state.currentChatId);
        if (!currentChat) return;

        // Auto-title conversation on first message
        if (currentChat.messages.length === 0) {
            currentChat.title = text.length > 36 ? text.substring(0, 36) + '...' : text;
            els.currentChatTitle.textContent = currentChat.title;
            renderChatHistory();
        }

        // 1. Add User Message
        const userMsg = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };
        currentChat.messages.push(userMsg);
        saveChatsToStorage();

        els.welcomeHero.classList.add('hidden');
        appendMessageNode(userMsg, currentChat.messages.length - 1);
        scrollToBottom();

        // 2. Prepare AI Assistant Message Placeholder
        const botMsg = {
            role: 'assistant',
            content: '',
            model: state.activeModelName,
            timestamp: new Date().toISOString()
        };
        currentChat.messages.push(botMsg);
        const botMsgIndex = currentChat.messages.length - 1;

        // Create DOM element for streaming response
        const botRow = document.createElement('div');
        botRow.className = 'message-row bot-row';
        botRow.dataset.index = botMsgIndex;
        botRow.innerHTML = `
            <div class="message-avatar bot-avatar">
                <i class="fa-solid fa-sparkles"></i>
            </div>
            <div class="message-content-wrapper">
                <div class="message-bubble bot-bubble">
                    <div class="thinking-indicator">
                        <div class="thinking-dot"></div>
                        <div class="thinking-dot"></div>
                        <div class="thinking-dot"></div>
                    </div>
                </div>
                <div class="message-meta">
                    <span>${escapeHtml(state.activeModelName)}</span>
                    <span>•</span>
                    <span>Generating...</span>
                </div>
            </div>
        `;
        els.messagesList.appendChild(botRow);
        scrollToBottom();

        const bubbleEl = botRow.querySelector('.bot-bubble');
        const metaEl = botRow.querySelector('.message-meta');

        // Set UI to streaming state
        setStreamingState(true);
        state.abortController = new AbortController();

        // Build message payload (include recent context)
        const recentMessages = currentChat.messages.slice(0, -1).map(m => ({
            role: m.role,
            content: m.content
        }));

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: state.abortController.signal,
                body: JSON.stringify({
                    messages: recentMessages,
                    model: state.activeModel,
                    temperature: state.settings.temperature,
                    system_prompt: state.settings.systemPrompt,
                    stream: state.settings.stream
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server responded with ${response.status}`);
            }

            function updateMessageMeta(targetMetaEl, content) {
                if (!targetMetaEl) return;
                const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                targetMetaEl.innerHTML = `
                    <span>${escapeHtml(state.activeModelName)}</span>
                    <span>•</span>
                    <span>${timeString}</span>
                    <div class="message-actions">
                        <button class="msg-action-btn copy-msg-btn" title="Copy text" aria-label="Copy message text">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <button class="msg-action-btn speak-msg-btn" title="Read aloud" aria-label="Read message aloud">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
                    </div>
                `;
                const copyBtn = targetMetaEl.querySelector('.copy-msg-btn');
                if (copyBtn) {
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(content);
                        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                        showToast('Copied to clipboard', 'success');
                        setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 2000);
                    };
                }
                const speakBtn = targetMetaEl.querySelector('.speak-msg-btn');
                if (speakBtn) {
                    speakBtn.onclick = () => speakText(content, speakBtn);
                }
            }

            if (state.settings.stream && response.body) {
                // Remove thinking indicator
                bubbleEl.innerHTML = '<span class="streaming-cursor"></span>';
                let accumulated = '';

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let isStreamDone = false;

                while (!isStreamDone) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep unfinished line in buffer

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(':')) continue;
                        if (!trimmed.startsWith('data:')) continue;
                        const dataStr = trimmed.replace(/^data:\s*/, '').trim();
                        if (dataStr === '[DONE]') {
                            isStreamDone = true;
                            break;
                        }

                        let parsed;
                        try {
                            parsed = JSON.parse(dataStr);
                        } catch (pe) {
                            // Non-json chunk or partial
                            continue;
                        }

                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                        if (parsed.content) {
                            accumulated += parsed.content;
                            botMsg.content = accumulated;
                            bubbleEl.innerHTML = parseMarkdown(accumulated) + '<span class="streaming-cursor"></span>';
                            bindCodeCopyButtons(bubbleEl);
                            scrollToBottom();
                        }
                    }
                }

                if (!isStreamDone && buffer.trim()) {
                    const trimmed = buffer.trim();
                    if (trimmed.startsWith('data:')) {
                        const dataStr = trimmed.replace(/^data:\s*/, '').trim();
                        if (dataStr !== '[DONE]') {
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.content) {
                                    accumulated += parsed.content;
                                    botMsg.content = accumulated;
                                }
                            } catch (_) {}
                        }
                    }
                }

                try {
                    await reader.cancel();
                } catch (_) {}

                // Finalize content
                bubbleEl.innerHTML = parseMarkdown(accumulated);
                bindCodeCopyButtons(bubbleEl);
            } else {
                const data = await response.json();
                botMsg.content = data.content || '';
                bubbleEl.innerHTML = parseMarkdown(botMsg.content);
                bindCodeCopyButtons(bubbleEl);
            }

            // Update metadata row
            updateMessageMeta(metaEl, botMsg.content);
            saveChatsToStorage();

        } catch (err) {
            if (err.name === 'AbortError') {
                showToast('Generation cancelled by user', 'info');
                const baseText = botMsg.content || '';
                bubbleEl.innerHTML = parseMarkdown(baseText) + '<p><em>[Generation stopped]</em></p>';
                bindCodeCopyButtons(bubbleEl);
                botMsg.content = baseText ? `${baseText}\n\n[Generation stopped]` : '[Generation stopped]';
            } else {
                console.error('Chat error:', err);
                bubbleEl.innerHTML = `
                    <div style="color: var(--accent-rose); display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <span>${escapeHtml(err.message || 'An error occurred while generating a response.')}</span>
                    </div>
                `;
                botMsg.content = `Error: ${err.message}`;
                showToast(err.message, 'error');
            }
            updateMessageMeta(metaEl, botMsg.content);
            saveChatsToStorage();
        } finally {
            setStreamingState(false);
            scrollToBottom();
        }
    }

    function setStreamingState(isStreaming) {
        state.isStreaming = isStreaming;
        els.sendBtn.disabled = isStreaming;
        if (isStreaming) {
            els.stopStreamBtn.classList.remove('hidden');
        } else {
            els.stopStreamBtn.classList.add('hidden');
            state.abortController = null;
        }
    }

    function stopStreaming() {
        if (state.abortController) {
            state.abortController.abort();
        }
    }

    // --- Voice Features (Speech-to-Text & Text-to-Speech) ---
    function initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            els.micBtn.title = 'Voice dictation is not supported in this browser';
            return;
        }

        state.speechRecognition = new SpeechRec();
        state.speechRecognition.continuous = false;
        state.speechRecognition.interimResults = true;
        state.speechRecognition.lang = 'en-US';

        state.speechRecognition.onstart = () => {
            state.isRecording = true;
            els.micBtn.classList.add('recording');
            showToast('Listening...', 'info');
        };

        state.speechRecognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            els.messageInput.value = transcript;
            autoResizeTextarea();
        };

        state.speechRecognition.onerror = (e) => {
            console.error('Speech recognition error', e);
            state.isRecording = false;
            els.micBtn.classList.remove('recording');
        };

        state.speechRecognition.onend = () => {
            state.isRecording = false;
            els.micBtn.classList.remove('recording');
        };
    }

    function toggleSpeechRecognition() {
        if (!state.speechRecognition) {
            showToast('Voice dictation not available', 'error');
            return;
        }

        if (state.isRecording) {
            state.speechRecognition.stop();
        } else {
            state.speechRecognition.start();
        }
    }

    function speakText(text, buttonEl) {
        if (!('speechSynthesis' in window)) {
            showToast('Text-to-speech not supported', 'error');
            return;
        }

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            if (buttonEl) buttonEl.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            return;
        }

        // Clean markdown tags for clear speech
        const cleanText = text
            .replace(/```[\s\S]*?```/g, 'Code block omitted.')
            .replace(/`[^`]+`/g, '')
            .replace(/[*#_~>]/g, '')
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            if (buttonEl) buttonEl.innerHTML = '<i class="fa-solid fa-volume-xmark" style="color: var(--accent-rose);"></i>';
        };

        utterance.onend = utterance.onerror = () => {
            if (buttonEl) buttonEl.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        };

        window.speechSynthesis.speak(utterance);
    }

    // --- Export Conversation ---
    function exportConversation(format) {
        const currentChat = state.chats.find(c => c.id === state.currentChatId);
        if (!currentChat || currentChat.messages.length === 0) {
            showToast('No messages to export', 'info');
            return;
        }

        let content = '';
        let filename = `${currentChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}`;
        let mimeType = 'text/plain';

        if (format === 'markdown') {
            filename += '.md';
            mimeType = 'text/markdown';
            content = `# ${currentChat.title}\n*Exported from GeminiBot Neo on ${new Date().toLocaleString()}*\n\n---\n\n`;
            currentChat.messages.forEach(m => {
                const roleName = m.role === 'user' ? '👤 User' : `🤖 GeminiBot (${m.model || state.activeModelName})`;
                content += `### ${roleName}\n\n${m.content}\n\n---\n\n`;
            });
        } else if (format === 'json') {
            filename += '.json';
            mimeType = 'application/json';
            content = JSON.stringify(currentChat, null, 2);
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        els.exportDropdown.classList.remove('show');
        showToast(`Exported as ${filename}`, 'success');
    }

    // --- Model Picker Modal ---
    function renderModelsGrid(models) {
        const searchTerm = els.modelSearchInput.value.toLowerCase().trim();
        const activeChip = els.modelCategoryChips.querySelector('.filter-chip.active');
        const category = activeChip ? activeChip.dataset.category : 'All';

        els.modelsGrid.innerHTML = '';

        const filtered = models.filter(m => {
            const matchesCategory = (category === 'All') || (m.category === category);
            const matchesSearch = !searchTerm ||
                m.name.toLowerCase().includes(searchTerm) ||
                m.id.toLowerCase().includes(searchTerm) ||
                (m.desc && m.desc.toLowerCase().includes(searchTerm));
            return matchesCategory && matchesSearch;
        });

        filtered.forEach(m => {
            const card = document.createElement('div');
            const isActive = m.id === state.activeModel;
            card.className = `model-card ${isActive ? 'active' : ''}`;
            card.onclick = () => selectModel(m.id);

            card.innerHTML = `
                <div class="model-card-top">
                    <span class="model-card-name">${escapeHtml(m.name)}</span>
                    <span class="model-card-badge">${escapeHtml(m.badge || 'FREE')}</span>
                </div>
                <div class="model-card-desc">${escapeHtml(m.desc || 'High efficiency model')}</div>
                <div class="model-card-footer">
                    <span>${escapeHtml(m.category || 'General')}</span>
                    <code>${escapeHtml(m.id.split('/').pop())}</code>
                </div>
            `;
            els.modelsGrid.appendChild(card);
        });
    }

    function selectModel(modelId) {
        state.activeModel = modelId;
        saveSettingsToStorage();
        updateModelDisplay();
        renderModelsGrid(state.models);
        closeModelModal();
        showToast(`Switched model to ${state.activeModelName}`, 'success');
    }

    function openModelModal() {
        els.modelModal.classList.remove('hidden');
        renderModelsGrid(state.models);
    }

    function closeModelModal() {
        els.modelModal.classList.add('hidden');
    }

    // --- Settings Modal ---
    function openSettingsModal() {
        els.apiKeyInput.value = state.settings.apiKey || '';
        els.systemPromptInput.value = state.settings.systemPrompt || '';
        els.temperatureSlider.value = state.settings.temperature;
        els.tempValueDisplay.textContent = state.settings.temperature;
        els.streamToggle.checked = state.settings.stream;
        els.settingsModal.classList.remove('hidden');
    }

    function closeSettingsModal() {
        els.settingsModal.classList.add('hidden');
    }

    async function saveSettings() {
        const newKey = els.apiKeyInput.value.trim();
        state.settings.apiKey = newKey;
        state.settings.systemPrompt = els.systemPromptInput.value.trim();
        state.settings.temperature = parseFloat(els.temperatureSlider.value);
        state.settings.stream = els.streamToggle.checked;

        saveSettingsToStorage();

        // Also push key to server if changed
        if (newKey) {
            try {
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: newKey })
                });
                await checkBackendStatus();
            } catch (e) {
                console.error('Failed to sync settings with server', e);
            }
        }

        closeSettingsModal();
        showToast('Settings saved successfully', 'success');
    }

    // --- Helpers & UI Utilities ---
    function autoResizeTextarea() {
        const textarea = els.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 180) + 'px';
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-info-circle');
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        els.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // --- Event Bindings ---
    function bindEvents() {
        // Sidebar Toggle
        els.toggleSidebarBtn.onclick = () => els.sidebar.classList.toggle('collapsed');
        els.closeSidebarBtn.onclick = () => els.sidebar.classList.add('collapsed');

        // New Chat
        els.newChatBtn.onclick = createNewChat;

        // Search Chats
        els.chatSearchInput.oninput = renderChatHistory;

        // Clear All Chats
        els.clearAllChatsBtn.onclick = clearAllChats;

        // Message Input & Send
        els.messageInput.oninput = autoResizeTextarea;
        els.messageInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
        els.sendBtn.onclick = () => sendMessage();

        // Stop stream
        els.stopStreamBtn.onclick = stopStreaming;

        // Voice dictation
        els.micBtn.onclick = toggleSpeechRecognition;

        // Starter Prompts
        document.querySelectorAll('.starter-card').forEach(card => {
            card.onclick = () => {
                const promptText = card.dataset.prompt;
                if (promptText) {
                    sendMessage(promptText);
                }
            };
        });

        // Model Picker Trigger & Modal
        els.modelPickerBtn.onclick = openModelModal;
        els.closeModelModalBtn.onclick = closeModelModal;
        els.modelSearchInput.oninput = () => renderModelsGrid(state.models);

        els.modelCategoryChips.querySelectorAll('.filter-chip').forEach(chip => {
            chip.onclick = () => {
                els.modelCategoryChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                renderModelsGrid(state.models);
            };
        });

        els.applyCustomModelBtn.onclick = () => {
            const customVal = els.customModelInput.value.trim();
            if (customVal) {
                selectModel(customVal);
                els.customModelInput.value = '';
            }
        };

        // Export Dropdown
        els.exportBtn.onclick = (e) => {
            e.stopPropagation();
            els.exportDropdown.classList.toggle('show');
        };
        document.addEventListener('click', (e) => {
            if (!els.exportDropdown.contains(e.target) && e.target !== els.exportBtn) {
                els.exportDropdown.classList.remove('show');
            }
        });
        els.exportMarkdownBtn.onclick = () => exportConversation('markdown');
        els.exportJsonBtn.onclick = () => exportConversation('json');

        // Settings Modal
        els.openSettingsBtn.onclick = openSettingsModal;
        els.topSettingsBtn.onclick = openSettingsModal;
        els.closeSettingsModalBtn.onclick = closeSettingsModal;
        els.cancelSettingsBtn.onclick = closeSettingsModal;
        els.saveSettingsBtn.onclick = saveSettings;

        // Temperature slider live display
        els.temperatureSlider.oninput = () => {
            els.tempValueDisplay.textContent = els.temperatureSlider.value;
        };

        // Toggle API key password mask
        els.toggleApiKeyVisibility.onclick = () => {
            const isPassword = els.apiKeyInput.type === 'password';
            els.apiKeyInput.type = isPassword ? 'text' : 'password';
            els.toggleApiKeyVisibility.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        };

        // Close modal on backdrop click
        window.onclick = (e) => {
            if (e.target === els.modelModal) closeModelModal();
            if (e.target === els.settingsModal) closeSettingsModal();
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModelModal();
                closeSettingsModal();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                els.chatSearchInput.focus();
            }
        });
    }

    // Boot app
    document.addEventListener('DOMContentLoaded', init);
})();
