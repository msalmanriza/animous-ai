let chats = [
    {
        title: "Chat Baru",
        messages: []
    }
];

let activeChatIndex = 0;

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

async function sendMessage() {
    const input = document.getElementById("message");
    const button = document.getElementById("send-btn");
    const chatBox = document.getElementById("chat-box");

    const message = input.value.trim();

    if (!message) return;

    // Bubble user
    const userMessage = document.createElement("div");
    userMessage.className = "message user";

    if (selectedFile && selectedFile.type.startsWith("image/")) {
        const imageUrl = URL.createObjectURL(selectedFile);

        userMessage.innerHTML = `
            <div class="image-preview-box">
                <img src="${imageUrl}" alt="Uploaded image">
            </div>
            <div>${message}</div>
        `;
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

    // Auto scroll bawah
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        let response;

    if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("message", message);

        response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        selectedFile = null;
        document.getElementById("file-input").value = "";
    } else {
        response = await fetch("/chat", {
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

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Browser kamu belum mendukung voice input.");
        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.classList.add("listening");
    voiceBtn.innerText = "🎙️";

    recognition.start();

    recognition.onresult = function(event) {
        const transcript =
            event.results[0][0].transcript;

        input.value = transcript;
        input.focus();
    };

    recognition.onerror = function() {
        alert("Voice input gagal. Coba izinkan akses microphone.");
    };

    recognition.onend = function() {
        voiceBtn.classList.remove("listening");
        voiceBtn.innerText = "🎤";
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

    history.innerHTML = "";

    chats.forEach(function(chat, index) {

        const item =
            document.createElement("div");

        item.className =
            index === activeChatIndex
            ? "history-item active"
            : "history-item";

        // CONTENT TITLE
        const content =
            document.createElement("div");

        content.className = "history-content";

        content.innerText =
            chat.title || "Chat Baru";

        // DELETE BUTTON
        const deleteBtn =
            document.createElement("button");

        deleteBtn.className =
            "delete-chat-btn";

        deleteBtn.innerHTML = "✕";

        // DELETE CHAT
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

        // CLICK CHAT
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

    chatBox.innerHTML = `
        <div class="message ai">
            Halo! Saya Animous AI 🚀 Siap membantu pertanyaan kamu.
        </div>
    `;

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