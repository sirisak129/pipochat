const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // อนุญาตให้เชื่อมต่อได้จากทุกอุปกรณ์
});

let posts = []; // เก็บ { id, author, content, image, comments: [] }
socket.on('new-post', (data) => {
    const post = { id: Date.now(), ...data };
    io.emit('update-feed', post); // ส่งให้ทุกคนที่ออนไลน์
});


// สั่งให้ Server ดึงไฟล์หน้าเว็บจากโฟลเดอร์ public มาแสดงผล
app.use(express.static(path.join(__dirname, 'public')));

let onlinePlayers = {}; // ตัวแปรเก็บข้อมูลผู้เล่นทั้งหมดที่กำลังออนไลน์

// เมื่อมีผู้เล่นเชื่อมต่อเข้ามา (เปิดหน้าเว็บ)
io.on('connection', (socket) => {
    console.log('มีผู้เล่นเชื่อมต่อเข้ามา รหัสอุปกรณ์คือ: ' + socket.id);

    // จุดที่ 1: เมื่อผู้เล่นตั้งชื่อและกด "เข้าสู่โลก!"
    socket.on('join-game', (playerData) => {
        // บันทึกข้อมูลคนนี้ลงในระบบกลาง
        onlinePlayers[socket.id] = {
            id: socket.id,
            name: playerData.name,
            model: playerData.model,
            x: 100, // จุดเกิดเริ่มต้น
            y: 100
        };

        // ส่งรายชื่อคนที่ออนไลน์อยู่ทั้งหมดไปให้ผู้เล่นใหม่เห็นบนจอ
        socket.emit('current-players', onlinePlayers);

        // บอกผู้เล่นคนอื่นๆ ในเซิร์ฟเวอร์ว่ามีสมาชิกใหม่เข้ามาแล้วนะ
        socket.broadcast.emit('new-player', onlinePlayers[socket.id]);
    });

    // จุดที่ 2: เมื่อมีใครบางคน "จิ้มหน้าจอเพื่อเดิน"
    socket.on('player-movement', (movementData) => {
        if (onlinePlayers[socket.id]) {
            onlinePlayers[socket.id].x = movementData.x;
            onlinePlayers[socket.id].y = movementData.y;
            
            // ส่งพิกัดใหม่นี้ไปบอกเพื่อนคนอื่นๆ ทันที
            socket.broadcast.emit('player-moved', onlinePlayers[socket.id]);
        }
    });

    // จุดที่ 3: เมื่อมีคนส่งข้อความแชท
socket.on('send-chat', (chatData) => {
    io.emit('receive-chat', {
        playerId: socket.id, // ต้องส่ง ID กลับไป
        name: chatData.name,
        message: chatData.message
    });
});

    // จุดที่ 4: เมื่อมีผู้เล่นปิดหน้าเว็บไป (ออกจากเกม)
    socket.on('disconnect', () => {
        console.log('ผู้เล่นออกเกม: ' + socket.id);
        delete onlinePlayers[socket.id]; // ลบออกจากรายชื่อออนไลน์
        io.emit('player-disconnected', socket.id); // สั่งให้จอของคนอื่นลบตัวละครนี้ทิ้ง
    });
});

// ตั้งพอร์ตสำหรับรันบน Render และเครื่องตัวเอง (Localhost:3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 เกมออนไลน์ของคุณทำงานแล้วที่พอร์ต http://localhost:${PORT}`);
});

