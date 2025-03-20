// DOM Elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-message');
const clearButton = document.getElementById('clear-chat');
const exportButton = document.getElementById('export-chat');
const newChatButton = document.getElementById('new-chat');
const historyList = document.getElementById('history-list');
const themeToggle = document.getElementById('theme-toggle');
const settingsButton = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsButton = document.getElementById('close-settings');
const saveSettingsButton = document.getElementById('save-settings');
const resetSettingsButton = document.getElementById('reset-settings');
const overlay = document.getElementById('overlay');
const temperatureSlider = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperature-value');
const maxTokensSlider = document.getElementById('max-tokens');
const maxTokensValue = document.getElementById('max-tokens-value');
const modelSelect = document.getElementById('model-select');
const suggestionChips = document.querySelectorAll('.suggestion-chip');
const typingIndicator = document.querySelector('.typing-indicator');

// Initialize Markdown converter
const converter = new showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
    emoji: true
});

// App State
let chatHistory = [];
let conversations = [];
let currentConversationId = null;
let isProcessing = false;

// Settings
let settings = {
    theme: 'light',
    temperature: 0.7,
    maxTokens: 2048,
    model: 'deepseek-chat'
};

// API Configuration
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = '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';

// Initialize app
function init() {
    loadSettings();
    applyTheme();
    loadConversations();
    setupEventListeners();
    adjustTextareaHeight();
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('deepchat-settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        
        // Update UI to match settings
        themeToggle.checked = settings.theme === 'dark';
        temperatureSlider.value = settings.temperature;
        temperatureValue.textContent = settings.temperature;
        maxTokensSlider.value = settings.maxTokens;
        maxTokensValue.textContent = settings.maxTokens;
        modelSelect.value = settings.model;
        
        // Update radio buttons
        document.querySelector(`input[name="theme"][value="${settings.theme}"]`).checked = true;
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('deepchat-settings', JSON.stringify(settings));
}

// Apply theme based on settings
function applyTheme() {
    if (settings.theme === 'dark' || 
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        themeToggle.checked = true;
    } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        themeToggle.checked = false;
    }
}

// Load conversations from localStorage
function loadConversations() {
    const savedConversations = localStorage.getItem('deepchat-conversations');
    if (savedConversations) {
        conversations = JSON.parse(savedConversations);
        updateConversationsList();
    }
}

// Save conversations to localStorage
function saveConversations() {
    localStorage.setItem('deepchat-conversations', JSON.stringify(conversations));
    updateConversationsList();
}

// Update the sidebar conversation list
function updateConversationsList() {
    historyList.innerHTML = '';
    
    conversations.forEach(conv => {
        const li = document.createElement('li');
        li.className = 'history-item';

        if (conv.id === currentConversationId) {
            li.classList.add('active');
        }
        
        li.innerHTML = `
            <i class="fas fa-comment"></i>
            <span class="history-item-text">${conv.title}</span>
            <button class="delete-btn" title="Delete Conversation">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Load conversation on click
        li.querySelector('.history-item-text').addEventListener('click', () => loadConversation(conv.id));
        
        // Delete conversation on delete button click
        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the loadConversation event
            deleteConversation(conv.id);
        });
        
        historyList.appendChild(li);
    });
}

// Create a new conversation
function createNewConversation() {
    const id = Date.now().toString();
    const newConversation = {
        id,
        title: 'New Conversation',
        messages: []
    };
    
    conversations.unshift(newConversation);
    currentConversationId = id;
    chatHistory = [];
    saveConversations();
    clearChatContainer();
    showWelcomeScreen();
}

// Load a conversation
function loadConversation(id) {
    currentConversationId = id;
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
        chatHistory = [...conversation.messages];
        clearChatContainer();
        
        // Hide welcome screen if we have messages
        if (chatHistory.length > 0) {
            const welcomeScreen = document.querySelector('.welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.remove();
            }
            
            // Render messages
            chatHistory.forEach(msg => {
                renderMessage(msg.role, msg.content);
            });
        } else {
            showWelcomeScreen();
        }
        
        updateConversationsList();
    }
}

// Update conversation title based on first message
function updateConversationTitle(id, message) {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation && conversation.title === 'New Conversation') {
        // Create a short title from the first user message
        const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
        conversation.title = title;
        saveConversations();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Send message on button click
    sendButton.addEventListener('click', handleSendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new lines)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Clear chat
    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the current chat?')) {
            clearChat();
        }
    });
    
    // Export chat
    exportButton.addEventListener('click', exportChat);
    
    // New chat
    newChatButton.addEventListener('click', createNewConversation);
    
    // Theme toggle
    themeToggle.addEventListener('change', () => {
        settings.theme = themeToggle.checked ? 'dark' : 'light';
        applyTheme();
        saveSettings();
    });
    
    // Settings modal
    settingsButton.addEventListener('click', () => {
        settingsModal.classList.add('active');
        overlay.classList.add('active');
    });
    
    closeSettingsButton.addEventListener('click', closeSettingsModal);
    
    overlay.addEventListener('click', closeSettingsModal);
    
    // Save settings
    saveSettingsButton.addEventListener('click', () => {
        // Get values from modal inputs
        settings.temperature = parseFloat(temperatureSlider.value);
        settings.maxTokens = parseInt(maxTokensSlider.value);
        settings.model = modelSelect.value;
        settings.theme = document.querySelector('input[name="theme"]:checked').value;
        
        saveSettings();
        applyTheme();
        closeSettingsModal();
    });
    
    // Reset settings
    resetSettingsButton.addEventListener('click', () => {
        settings = {
            theme: 'light',
            temperature: 0.7,
            maxTokens: 2048,
            model: 'deepseek-chat'
        };
        
        // Update UI
        temperatureSlider.value = settings.temperature;
        temperatureValue.textContent = settings.temperature;
        maxTokensSlider.value = settings.maxTokens;
        maxTokensValue.textContent = settings.maxTokens;
        modelSelect.value = settings.model;
        document.querySelector('input[name="theme"][value="light"]').checked = true;
        
        saveSettings();
        applyTheme();
    });
    
    // Sliders
    temperatureSlider.addEventListener('input', () => {
        temperatureValue.textContent = temperatureSlider.value;
    });
    
    maxTokensSlider.addEventListener('input', () => {
        maxTokensValue.textContent = maxTokensSlider.value;
    });
    
    // Textarea auto-resize
    userInput.addEventListener('input', adjustTextareaHeight);
    
    // Suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const promptText = chip.getAttribute('data-prompt');
            userInput.value = promptText;
            adjustTextareaHeight();
            userInput.focus();
        });
    });
    
    // System theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (settings.theme === 'system') {
            applyTheme();
        }
    });
}

// Close settings modal
function closeSettingsModal() {
    settingsModal.classList.remove('active');
    overlay.classList.remove('active');
}

// Handle sending a message
async function handleSendMessage() {
    const message = userInput.value.trim();
    if (message === '' || isProcessing) return;
    
    // Create a new conversation if we don't have one
    if (!currentConversationId) {
        createNewConversation();
    }
    
    // Update conversation title if this is the first message
    if (chatHistory.length === 0) {
        updateConversationTitle(currentConversationId, message);
        
        // Remove welcome screen
        const welcomeScreen = document.querySelector('.welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.remove();
        }
    }
    
    // Render user message
    renderMessage('user', message);
    
    // Add to chat history
    chatHistory.push({
        role: 'user',
        content: message
    });
    
    // Update conversation
    const conversation = conversations.find(conv => conv.id === currentConversationId);
    if (conversation) {
        conversation.messages = [...chatHistory];
        saveConversations();
    }
    
    // Clear input
    userInput.value = '';
    adjustTextareaHeight();
    
    // Show typing indicator
    typingIndicator.classList.remove('hidden');
    
    // Disable processing
    isProcessing = true;
    
    try {
        // Send message to API
        const response = await sendMessageToAPI(message);
        
        // Hide typing indicator
        typingIndicator.classList.add('hidden');
        
        // Add AI response to chat history
        const aiMessage = {
            role: 'assistant',
            content: response
        };
        chatHistory.push(aiMessage);
        
        // Update conversation
        if (conversation) {
            conversation.messages = [...chatHistory];
            saveConversations();
        }
        
        // Render AI message
        renderMessage('assistant', response);
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.classList.add('hidden');
        renderMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
        isProcessing = false;
    }
}

// Send message to API
async function sendMessageToAPI(message) {
    const modelMap = {
        'deepseek-chat': 'deepseek/deepseek-chat',
        'deepseek-coder': 'deepseek/deepseek-coder'
    };
    
    const selectedModel = modelMap[settings.model] || 'deepseek/deepseek-chat';
    
    // Prepare messages for API
    const messages = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
    
    // Add system message
    messages.unshift({
        role: 'system',
        content: 'You are DeepChat, a helpful AI assistant powered by DeepSeek. You are knowledgeable, friendly, and respond concisely. When appropriate, use markdown for formatting.'
    });
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages,
                temperature: settings.temperature,
                max_tokens: settings.maxTokens
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('API Error:', error);
        return 'Sorry, I encountered an error communicating with the DeepSeek API. Please try again later.';
    }
}

// Render a message in the chat container
function renderMessage(role, content) {
    // Remove welcome screen if it exists
    const welcomeScreen = document.querySelector('.welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Convert markdown to HTML for assistant messages
    let processedContent = content;
    if (role === 'assistant') {
        processedContent = converter.makeHtml(content);
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar ${role}">
            <i class="fas ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="message-content">
            ${role === 'user' ? escapeHTML(content) : processedContent}
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Apply syntax highlighting to code blocks
    if (role === 'assistant') {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

// Clear the chat container
function clearChatContainer() {
    chatContainer.innerHTML = '';
}

// Show welcome screen
function showWelcomeScreen() {
    const welcomeHTML = `
        <div class="welcome-screen">
            <div class="welcome-logo">
                <i class="fas fa-brain"></i>
            </div>
            <h2>Welcome to DeepChat</h2>
            <p>Your personal AI assistant powered by DeepSeek.</p>
            <div class="suggestion-chips">
                <button class="suggestion-chip" data-prompt="Write a professional email to schedule a meeting">Write a professional email</button>
                <button class="suggestion-chip" data-prompt="Explain quantum computing in simple terms">Explain quantum computing</button>
                <button class="suggestion-chip" data-prompt="Help me brainstorm ideas for a marketing campaign">Brainstorm marketing ideas</button>
                <button class="suggestion-chip" data-prompt="Write a Python function to analyze data">Write a Python function</button>
            </div>
        </div>
    `;
    
    chatContainer.innerHTML = welcomeHTML;
    
    // Re-attach event listeners to the new chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const promptText = chip.getAttribute('data-prompt');
            userInput.value = promptText;
            adjustTextareaHeight();
            userInput.focus();
        });
    });
}

// Clear chat
function clearChat() {
    chatHistory = [];
    clearChatContainer();
    showWelcomeScreen();
    
    // Update conversation
    const conversation = conversations.find(conv => conv.id === currentConversationId);
    if (conversation) {
        conversation.messages = [];
        saveConversations();
    }
}

// Export chat
function exportChat() {
    if (chatHistory.length === 0) {
        alert('No messages to export');
        return;
    }
    
    let exportText = '# DeepChat Conversation\n\n';
    
    chatHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'DeepChat';
        exportText += `**${role}:** ${msg.content}\n\n`;
    });
    
    const blob = new Blob([exportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepchat-conversation-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function deleteConversation(id) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    // Remove the conversation from the array
    conversations = conversations.filter(conv => conv.id !== id);

    // Clear the chat if the deleted conversation was active
    if (currentConversationId === id) {
        currentConversationId = null;
        chatHistory = [];
        clearChatContainer();
        showWelcomeScreen();
    }

    // Save updated conversations and refresh the list
    saveConversations();
    updateConversationsList();
}

// Adjust textarea height based on content
function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight > 200 ? 200 : userInput.scrollHeight) + 'px';
}

// Escape HTML to prevent XSS
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);


// Sidebar Toggle Functionality
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menu-toggle');

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

// Close sidebar when clicking outside (for mobile users)
document.addEventListener('click', (event) => {
    if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
        sidebar.classList.remove('show');
    }
});