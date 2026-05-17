let chats = [
    {
        title: "Chat Baru",
        messages: []
    }
];

let controller = null;
let isGenerating = false;

let activeChatIndex = 0;
let stopTyping = false;

function saveChats() {
    localStorage.setItem("animous_chats", JSON.stringify(chats));
    localStorage.setItem("animous_active_chat", activeChatIndex);
}

function loadChats() {
    const savedChats = localStorage.getItem("animous_chats");
    const savedActiveChat = localStorage.getItem("animous_active_chat");

    if (savedChats) {
        chats = JSON.parse(savedChats);
    }

    if (savedActiveChat) {
        activeChatIndex = Number(savedActiveChat);
    }
}

function createChatTitle(text) {
    let cleanText = text
        .replace("File dipilih:", "")
        .replace(/[^\w\s]/gi, "")
        .trim();

    const words = cleanText.split(" ").filter(Boolean);

    const shortWords = words.slice(0, 4);

    let title = shortWords.join(" ");

    title = title
        .toLowerCase()
        .replace(/\b\w/g, function(char) {
            return char.toUpperCase();
        });

    if (!title) {
        title = "Chat Baru";
    }

    return title;
}

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + " B";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function sendMessage() {
    const input = document.getElementById("message");
    const button = document.getElementById("send-btn");
    const stopBtn = document.getElementById("stop-btn");
    const chatBox = document.getElementById("chat-box");

    const message = input.value.trim();
    input.style.height = "auto";

    if (!message) return;

    // Bubble user
    const userMessage = document.createElement("div");
    userMessage.className = "message user";

    if (selectedFile) {
    const fileSize = formatFileSize(selectedFile.size);

    if (selectedFile.type.startsWith("image/")) {
        const imageUrl = URL.createObjectURL(selectedFile);

        userMessage.innerHTML = `
            <div class="image-preview-box">
                <img src="${imageUrl}" alt="Uploaded image">
            </div>
            <div>${message}</div>
        `;
    } else {
        const fileIcon =
            selectedFile.name.toLowerCase().endsWith(".pdf")
            ? "📄"
            : "📝";

        userMessage.innerHTML = `
            <div class="file-preview-card">
                <div class="file-preview-icon">${fileIcon}</div>

                <div class="file-preview-info">
                    <strong>${selectedFile.name}</strong>
                    <span>${fileSize}</span>
                </div>
            </div>

            <div>${message}</div>
        `;
    }
} else {
    userMessage.innerText = message;
}

    chatBox.appendChild(userMessage);

    // Simpan pesan user ke chat aktif
    chats[activeChatIndex].messages.push({
        role: "user",
        content: message
    });
    saveChats();

    // Jadikan pesan pertama sebagai judul sidebar
    if (chats[activeChatIndex].messages.length === 1) {
       chats[activeChatIndex].title = createChatTitle(message);

        renderChatHistory();
    }

    // Reset input
    input.value = "";

    // Disable input sementara
    input.disabled = true;
    button.disabled = true;

    // Loading bubble AI
    const loading = document.createElement("div");
    loading.className = "message ai ai-thinking";
    loading.innerHTML = `
        <span class="thinking-dot"></span>
        <span class="thinking-dot"></span>
        <span class="thinking-dot"></span>
    `;

    chatBox.appendChild(loading);

    controller = new AbortController();
    isGenerating = true;
    stopTyping = false;

    stopBtn.style.display = "block";
    button.style.display = "none";

    // Auto scroll bawah
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        let response;

    if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("message", message);

        response = await fetch("/upload", {
        signal: controller.signal,
            method: "POST",
            body: formData
        });

        selectedFile = null;
        document.getElementById("file-input").value = "";
    } else {
        response = await fetch("/chat", {
        signal: controller.signal,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            })
        });
    }

    const data = await response.json();

        // Hapus loading
        loading.remove();

        async function typeMessage(text, element) {
        element.innerHTML = "";

        let i = 0;

        while (i < text.length) {
            if (stopTyping) {
                break;
            }

            element.innerHTML += text.charAt(i);
            i++;

            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
        // Bubble AI
        const aiMessage = document.createElement("div");
        aiMessage.className = "message ai";

        chatBox.appendChild(aiMessage);

        await typeMessage(data.response, aiMessage);

        aiMessage.innerHTML = marked.parse(data.response);

        // Simpan jawaban AI ke chat aktif
        chats[activeChatIndex].messages.push({
            role: "ai",
            content: data.response
        });
        saveChats();

    } catch (error) {
        loading.remove();

        const errorMessage = document.createElement("div");
        errorMessage.className = "message ai";
        errorMessage.innerText =
            "Terjadi kesalahan. Coba lagi nanti.";

        chatBox.appendChild(errorMessage);

        console.error(error);
    }

    isGenerating = false;

    stopBtn.style.display = "none";
    button.style.display = "flex";

    // Aktifkan lagi input
    input.disabled = false;
    button.disabled = false;
    input.focus();

    // Auto scroll lagi
    chatBox.scrollTop = chatBox.scrollHeight;
}


const messageInput =
    document.getElementById("message");

messageInput.addEventListener(
    "keydown",
    function(event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {
        event.preventDefault();
        sendMessage();
    }
});

messageInput.addEventListener(
    "input",
    function() {

    this.style.height = "auto";
    this.style.height =
        this.scrollHeight + "px";
});

function startVoiceInput() {
    const input = document.getElementById("message");
    const voiceBtn = document.getElementById("voice-btn");
    const voiceStatus = document.getElementById("voice-status");

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        voiceStatus.innerText =
            "Browser kamu belum mendukung voice input.";

        voiceStatus.className =
            "voice-status show error";

        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.classList.add("listening");
    voiceBtn.innerText = "🎙️";

    voiceStatus.innerText = "Mendengarkan...";
    voiceStatus.className = "voice-status show";

    recognition.start();

    recognition.onresult = function(event) {
        const transcript =
            event.results[0][0].transcript;

        input.value = transcript;
        input.focus();

        voiceStatus.innerText = "Suara berhasil dikenali.";
        voiceStatus.className = "voice-status show";
    };

    recognition.onerror = function() {
        voiceStatus.innerText =
            "Voice input gagal. Izinkan akses microphone.";

        voiceStatus.className =
            "voice-status show error";
    };

    recognition.onend = function() {
        voiceBtn.classList.remove("listening");
        voiceBtn.innerText = "🎤";

        setTimeout(function() {
            voiceStatus.className = "voice-status";
            voiceStatus.innerText = "";
        }, 1800);
    };
}

function createNewChat() {
    chats.push({
        title: "Chat Baru",
        messages: []
    });

    activeChatIndex = chats.length - 1;
    saveChats();
    renderChatHistory();
    renderActiveChat();
}

function renderChatHistory() {

    const history =
        document.getElementById("chat-history");

    const searchInput =
        document.getElementById("search-chat");

    const keyword = searchInput
        ? searchInput.value.toLowerCase()
        : "";

    history.innerHTML = "";

    chats.forEach(function(chat, index) {

        const chatTitle =
            chat.title || "Chat Baru";

        if (
            keyword &&
            !chatTitle.toLowerCase().includes(keyword)
        ) {
            return;
        }

        const item =
            document.createElement("div");

        item.className =
            index === activeChatIndex
            ? "history-item active"
            : "history-item";

        const content =
            document.createElement("div");

        content.className = "history-content";

        content.innerText = chatTitle;

        const deleteBtn =
            document.createElement("button");

        deleteBtn.className =
            "delete-chat-btn";

        deleteBtn.innerHTML = "✕";

        deleteBtn.onclick = function(e) {

            e.stopPropagation();

            chats.splice(index, 1);

            if (chats.length === 0) {

                chats.push({
                    title: "Chat Baru",
                    messages: []
                });

                activeChatIndex = 0;

            } else {

                activeChatIndex =
                    Math.max(0, index - 1);
            }

            saveChats();

            renderChatHistory();

            renderActiveChat();
        };

        item.onclick = function() {

            activeChatIndex = index;

            saveChats();

            renderChatHistory();

            renderActiveChat();
        };

        item.appendChild(content);

        item.appendChild(deleteBtn);

        history.appendChild(item);
    });
}

function renderActiveChat() {
    const chatBox =
        document.getElementById("chat-box");

    if (chats[activeChatIndex].messages.length === 0) {

    chatBox.innerHTML = `
        <div class="empty-state">
            <h2>✨ Welcome to Animous AI</h2>

            <p>
                Modern AI assistant for chat, understanding documents, analyzing images, and helping you get work done faster.
            </p>

            <div class="empty-suggestions">

                <button onclick="quickPrompt('Jelaskan AI secara sederhana')">
                    🤖 Explain AI
                </button>

                <button onclick="quickPrompt('Buat roadmap belajar frontend developer')">
                    💻 Learn Frontend
                </button>

                <button onclick="quickPrompt('Ringkas isi dokumen ini')">
                    📄 Document Summary
                </button>

            </div>
        </div>
    `;

    return;
}

    chats[activeChatIndex].messages.forEach(function(msg) {
        const bubble =
            document.createElement("div");

        bubble.className =
            msg.role === "user"
            ? "message user"
            : "message ai";

        if (msg.role === "ai") {
            bubble.innerHTML =
                marked.parse(msg.content);
        } else {
            bubble.innerText =
                msg.content;
        }

        chatBox.appendChild(bubble);
    });

    chatBox.scrollTop =
        chatBox.scrollHeight;
}

loadChats();
renderChatHistory();
renderActiveChat();

function clearAllChats() {

    localStorage.removeItem("animous_chats");
    localStorage.removeItem("animous_active_chat");

    chats = [
        {
            title: "Chat Baru",
            messages: []
        }
    ];

    activeChatIndex = 0;

    saveChats();
    renderChatHistory();
    renderActiveChat();
}


let selectedFile = null;

function handleFileUpload(event) {
    selectedFile = event.target.files[0];

    if (!selectedFile) return;

    const maxSize = 4 * 1024 * 1024; // 4MB

    if (selectedFile.size > maxSize) {
        alert("Ukuran file terlalu besar. Maksimal 4MB. Coba kompres atau gunakan gambar yang lebih kecil.");

        selectedFile = null;
        event.target.value = "";

        const input = document.getElementById("message");
        input.value = "";

        return;
    }

    const input = document.getElementById("message");

    input.value = `File dipilih: ${selectedFile.name}`;
}

const themeToggle = document.getElementById("theme-toggle");

// cek localStorage
if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
    themeToggle.innerText = "☀️";
}

themeToggle.addEventListener("click", () => {

    document.body.classList.toggle("light-mode");

    // simpan tema
    if (document.body.classList.contains("light-mode")) {

        localStorage.setItem("theme", "light");

        themeToggle.innerText = "☀️";

    } else {

        localStorage.setItem("theme", "dark");

        themeToggle.innerText = "🌙";
    }
});

function exportChat() {
    const activeChat = chats[activeChatIndex];

    if (!activeChat || activeChat.messages.length === 0) {
        alert("Chat masih kosong, belum ada yang bisa diexport.");
        return;
    }

    let content = `Animous AI - Export Chat\n`;
    content += `Judul: ${activeChat.title}\n`;
    content += `Tanggal: ${new Date().toLocaleString()}\n`;
    content += `\n============================\n\n`;

    activeChat.messages.forEach(function(msg) {
        const sender =
            msg.role === "user"
            ? "User"
            : "Animous AI";

        content += `${sender}:\n${msg.content}\n\n`;
    });

    const blob = new Blob([content], {
        type: "text/plain"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeChat.title || "animous-chat"}.txt`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportChatPDF() {
    const activeChat = chats[activeChatIndex];

    if (!activeChat || activeChat.messages.length === 0) {
        alert("Chat masih kosong, belum ada yang bisa diexport.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 20;
    const maxWidth = pageWidth - margin * 2;

    let y = 20;

    doc.setFontSize(18);
    doc.text("Animous AI - Export Chat", margin, y);

    y += 10;

    doc.setFontSize(11);
    doc.text(`Judul: ${activeChat.title}`, margin, y);

    y += 7;

    doc.text(`Tanggal: ${new Date().toLocaleString()}`, margin, y);

    y += 12;

    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);

    y += 12;

    activeChat.messages.forEach(function(msg) {
        const sender = msg.role === "user" ? "User" : "Animous AI";

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");

        const senderLines = doc.splitTextToSize(`${sender}:`, maxWidth);

        if (y > pageHeight - 25) {
            doc.addPage();
            y = 20;
        }

        doc.text(senderLines, margin, y);
        y += senderLines.length * 7;

        doc.setFont(undefined, "normal");

        const cleanContent = msg.content
            .replace(/[#*_`>-]/g, "")
            .replace(/\n{3,}/g, "\n\n");

        const messageLines = doc.splitTextToSize(cleanContent, maxWidth);

        messageLines.forEach(function(line) {
            if (y > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }

            doc.text(line, margin, y);
            y += 7;
        });

        y += 8;
    });

    const fileName =
        (activeChat.title || "animous-chat")
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase();

    doc.save(`${fileName}.pdf`);
}

function toggleExportMenu() {
    const menu = document.getElementById("export-menu");
    menu.classList.toggle("show");
}

const stopButton = document.getElementById("stop-btn");
const sendButton = document.getElementById("send-btn");

stopButton.onclick = function () {
    stopTyping = true;

    if (controller) {
        controller.abort();
    }

    isGenerating = false;

    stopButton.style.display = "none";
    sendButton.style.display = "flex";
};

const searchChatInput =
    document.getElementById("search-chat");

if (searchChatInput) {
    searchChatInput.addEventListener("input", function() {
        renderChatHistory();
    });
}

const autoResizeInput =
    document.getElementById("message");

if (autoResizeInput) {
    autoResizeInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = Math.min(this.scrollHeight, 140) + "px";
    });
}

function quickPrompt(text) {

    const input =
        document.getElementById("message");

    input.value = text;

    input.focus();
}

function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("show");
    document.getElementById("sidebar-overlay").classList.toggle("show");
}

function closeSidebar() {
    document.querySelector(".sidebar").classList.remove("show");
    document.getElementById("sidebar-overlay").classList.remove("show");
}