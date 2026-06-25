const socket = io(); // เปิดการเชื่อมต่อออนไลน์กับระบบหลังบ้าน

let myId = null;
let myPlayer = {
    name: "",
    model: "🐱"
};

function selectAvatar(model) {
    myPlayer.model = model;
    alert("เลือกอวาตาร์: " + model);
}

function enterGame() {
    const nameInput = document.getElementById("username").value;
    if (nameInput.trim() === "") {
        alert("กรุณาตั้งชื่อตัวละครก่อนครับ!");
        return;
    }
    myPlayer.name = nameInput;

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-container").style.display = "flex";

    // [ออนไลน์] ส่งสัญญาณบอกเซิร์ฟเวอร์ว่าเราพร้อมเข้าเกมแล้ว
    socket.emit('join-game', myPlayer);
}

// [ออนไลน์] รับข้อมูลผู้เล่นทั้งหมดที่อยู่ในห้อง ณ ตอนนั้นมาวาดลงบนจอเรา
socket.on('current-players', (players) => {
    myId = socket.id; // บันทึกรหัสประจำตัวของเรา
    Object.keys(players).forEach((id) => {
        if (id === socket.id) {
            renderCharacter(players[id], true); // วาดตัวเราเอง
        } else {
            renderCharacter(players[id], false); // วาดตัวเพื่อน
        }
    });
});

// [ออนไลน์] เมื่อมีเพื่อนคนอื่นเพิ่งเข้าเกมตามมาทีหลัง
socket.on('new-player', (playerInfo) => {
    renderCharacter(playerInfo, false);
});

// [ออนไลน์] เมื่อมีเพื่อนคนอื่นขยับตัว เดินบนจอ
socket.on('player-moved', (playerInfo) => {
    const charDiv = document.getElementById(playerInfo.id);
    if (charDiv) {
        charDiv.style.left = playerInfo.x + "px";
        charDiv.style.top = playerInfo.y + "px";
    }
});

// [ออนไลน์] เมื่อเพื่อนกดปิดเกม ให้ลบตัวละครนั้นออกจากจอเรา
socket.on('player-disconnected', (id) => {
    const charDiv = document.getElementById(id);
    if (charDiv) charDiv.remove();
});

// ฟังก์ชันสร้างตัวละครแสดงผลบนหน้าจอ
function renderCharacter(playerInfo, isMe) {
    if (document.getElementById(playerInfo.id)) return; // ป้องกันการสร้างซ้ำ

    const gameWorld = document.getElementById("game-world");
    const charDiv = document.createElement("div");
    charDiv.id = playerInfo.id; // ใช้ Socket ID เป็น ID ของแท็ก HTML
    charDiv.className = "character";
    charDiv.style.left = playerInfo.x + "px";
    charDiv.style.top = playerInfo.y + "px";

    charDiv.innerHTML = `
        <div class="chat-bubble" id="bubble-${playerInfo.id}"></div>
        <div class="char-name">${playerInfo.name}</div>
        <div class="char-model">${playerInfo.model}</div>
    `;
    gameWorld.appendChild(charDiv);
}

// ระบบจิ้มเพื่อเดิน
function moveCharacter(event) {
    if(event.target.tagName === 'BUTTON') return;

    const gameWorld = document.getElementById("game-world");
    const rect = gameWorld.getBoundingClientRect();
    
    // คำนวณพิกัดคลิก
    let clickX = event.clientX - rect.left;
    let clickY = event.clientY - rect.top;

    // --- ส่วนจำกัดไม่ให้เดินหลุดขอบ (Clamp) ---
    // กว้างและสูงของจอเกม
    const worldWidth = rect.width;
    const worldHeight = rect.height;

    // ถ้าตัวละครกว้าง/สูง 50px ให้เผื่อขอบไว้ด้วย
    clickX = Math.max(25, Math.min(clickX, worldWidth - 25));
    clickY = Math.max(25, Math.min(clickY, worldHeight - 25));
    // --------------------------------------

    // อัปเดตตำแหน่ง
    myPlayer.x = clickX;
    myPlayer.y = clickY;
    
    const myCharDiv = document.getElementById(myId);
    if (myCharDiv) {
        myCharDiv.style.left = clickX + "px";
        myCharDiv.style.top = clickY + "px";
    }

    socket.emit('player-movement', { x: clickX, y: clickY });
}

// 1. แก้ฟังก์ชัน toggleChat (ตอนกดปุ่มเปิดแชท)
function toggleChat(event) {
    if (event) event.stopPropagation(); // หยุดการส่งต่อเหตุการณ์
    const chatModal = document.getElementById("chat-modal");
    chatModal.classList.toggle('show');
}

// ระบบแชทแบบเรียลไทม์
function sendChat() {
    if (event) event.stopPropagation(); // หยุดการส่งต่อเหตุการณ์
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if(message !== "") {
        // [ออนไลน์] ส่งข้อความไปที่เซิร์ฟเวอร์ส่วนกลาง
        socket.emit('send-chat', { name: myPlayer.name, message: message });
        input.value = "";
    }
}

// [ออนไลน์] รอรับข้อความแชทจากเซิร์ฟเวอร์แล้วนำมาแสดงบนกล่องแชท
socket.on('receive-chat', (data) => {
// 1. แสดงในแชทปกติ
    const history = document.getElementById("chat-history");
    history.innerHTML += `<p><strong>${data.name}:</strong> ${data.message}</p>`;
    history.scrollTop = history.scrollHeight;

// 2. แสดงบนหัวตัวละคร
    const bubble = document.getElementById(`bubble-${data.playerId}`);
    if (bubble) {
        bubble.innerText = data.message;
        bubble.classList.add('show');

        // ซ่อนอัตโนมัติใน 3 วินาที
        setTimeout(() => {
            bubble.classList.remove('show');
        }, 3000);
    }
});

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal.style.display === "none" || modal.style.display === "") {
        modal.style.display = "flex";
    } else {
        modal.style.display = "none";
    }
}

function submitPost() {
    const text = document.getElementById("post-text").value;
    if(text.trim() === "") return;
    alert("โพสต์สำเร็จ! (ระบบจำลองบอร์ด)");
    toggleModal('new-post-modal');
}

function toggleChat() {
    const chatModal = document.getElementById("chat-modal");
    if (chatModal.style.display === "none" || chatModal.style.display === "") {
        chatModal.style.display = "flex";
    } else {
        chatModal.style.display = "none";
    }
}

// เมื่อมีการคลิกที่ช่องพิมพ์ ให้บังคับให้หน้าจอเลื่อนไปจุดนั้น
const chatInput = document.getElementById('chat-input');
chatInput.addEventListener('focus', () => {
    setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
    }, 300);
});