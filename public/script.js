const socket = io(); // เปิดการเชื่อมต่อออนไลน์กับระบบหลังบ้าน


let myId = null;
let myPlayer = {
    name: "",
    model: "🐱"
};

function selectAvatar(model) {
    myPlayer.model = model;
    
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

// ใน server.js
io.on('connection', (socket) => {
    
    // ต้องมีส่วนนี้
    socket.on('new-post', (data) => {
        console.log("Server ได้รับโพสต์แล้ว:", data); // ดูใน Terminal/Log ของ Render
        io.emit('update-feed', data); // กระจายให้ทุกคน
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
    if (event) event.stopPropagation();

    const chatModal = document.getElementById("chat-modal");
    const chatOverlay = document.getElementById("chat-overlay");
    const chatBtn = document.getElementById("chat-float-btn");

    const isShowing = chatModal.style.display === "flex";

    if (!isShowing) {
        // เปิดแชท
        chatModal.style.display = "flex";
        chatOverlay.classList.add('show');
        chatBtn.classList.add('active'); // เลื่อนปุ่มขึ้น
    } else {
        // ปิดแชท
        chatModal.style.display = "none";
        chatOverlay.classList.remove('show');
        chatBtn.classList.remove('active'); // เลื่อนปุ่มลง
    }
}

function toggleModal(elementId) {
    const modal = document.getElementById(elementId);
    if (!modal) {
        console.error("หา ID ไม่เจอ: " + elementId);
        return;
    }
    
    // สลับคลาส 'show'
    modal.classList.toggle('show');
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

// ใน script.js (ใส่ไว้ข้างนอกฟังก์ชัน)
document.getElementById('submit-post-btn').addEventListener('click', () => {
    const text = document.getElementById('post-text').value;
    if (!text) {
        alert("กรุณาพิมพ์ข้อความ");
        return;
    }
    socket.emit('new-post', { text: text });
    document.getElementById('post-text').value = '';
    console.log("ส่งข้อมูลไปแล้ว!"); 
});


// ส่งโพสต์ไป Server
function submitPost() {
    const text = document.getElementById('post-text').value;
    
    console.log("กำลังส่งโพสต์..."); // เช็คว่าปุ่มทำงานไหม
    
    if (!text) {
        alert("กรุณาพิมพ์ข้อความก่อนครับ!");
        return;
    }

    socket.emit('new-post', {
        text: text,
        timestamp: Date.now()
    });
    
    console.log("ส่งข้อมูลไป Server แล้ว!");
    document.getElementById('post-text').value = ''; 
}

function showTempImage(btn, imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.width = "100%";
    btn.parentNode.appendChild(img);
    
    // ลบรูปทิ้งใน 10 วินาที
    setTimeout(() => {
        img.remove();
    }, 10000);
}

// รับโพสต์จาก Server แล้วแปะลง Feed
socket.on('update-feed', (post) => {
    console.log("ได้รับโพสต์จากเซิร์ฟเวอร์:", post); // เช็คใน F12 ว่ามันมาถึงไหม
    
    const container = document.getElementById('board-container');
    const newPost = document.createElement('div');
    newPost.className = "post-card";
    newPost.innerHTML = `<p>${post.text}</p>`;
    container.prepend(newPost); // แปะโพสต์ใหม่ไว้บนสุด
});

function toggleChat() {
    const chatModal = document.getElementById("chat-modal");
    if (chatModal.style.display === "none" || chatModal.style.display === "") {
        chatModal.style.display = "flex";
    } else {
        chatModal.style.display = "none";
    }
}

function selectModel(element, model) {
    // 1. เคลียร์คลาส 'selected' จากทุกตัวที่เคยเลือกไว้
    const allItems = document.querySelectorAll('.emoji-item');
    allItems.forEach(el => el.classList.remove('selected'));

    // 2. ใส่คลาส 'selected' ให้ตัวที่เพิ่งกด (ซึ่ง CSS จะสั่งขยายขนาดให้เอง)
    element.classList.add('selected');

    // 3. Logic อัปเดตตัวละครของคุณ (ตามเดิมที่เคยทำไว้)
    myPlayer.model = model;
    const myChar = document.getElementById(myId);
    if(myChar) {
        myChar.querySelector('.char-model').innerText = model;
    }
    socket.emit('change-model', model);
}


function createPost() {
    const text = document.getElementById('post-text').value.trim();
    if (!text) {
        alert("พิมพ์ก่อนโพสต์น้า!");
        return;
    }

    // 1. ส่งข้อมูลไป Server
    socket.emit('new-post', { text: text });
    
    // 2. ล้างค่าช่องพิมพ์
    document.getElementById('post-text').value = '';
    
    // 3. แสดง Feedback เล็กๆ
    alert("โพสต์สำเร็จแล้ว!");
}

function toggleModal(id) {
    const modal = document.getElementById(id);
    
    if (!modal) {
        alert("ไม่พบกล่องโพสต์ (เช็ค ID ให้ดี!)");
        return;
    }

    // ถ้าซ่อนอยู่ ให้แสดงผล
    if (modal.style.display === "none" || modal.style.display === "") {
        modal.style.display = "block";
        console.log("กล่องเปิดแล้ว!");
    } else {
        // ถ้าแสดงอยู่ ให้ซ่อน
        modal.style.display = "none";
        console.log("กล่องปิดแล้ว!");
    }
}


// เมื่อมีการคลิกที่ช่องพิมพ์ ให้บังคับให้หน้าจอเลื่อนไปจุดนั้น
const chatInput = document.getElementById('chat-input');
chatInput.addEventListener('focus', () => {
    setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
    }, 300);
});