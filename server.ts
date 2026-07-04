import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket, WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { Job, Portfolio, Room, Stroke, CanvasVersion, ChatMessage, RoomUser } from "./src/types.js";

// In-memory Databases
const rooms: Map<string, Room> = new Map();
let jobs: Job[] = [];
let portfolios: Portfolio[] = [];

export interface Creator {
  id: string;
  name: string;
  avatar: string;
  headline: string;
  bio: string;
  skills: string[];
  isOnline: boolean;
  currentRoomId?: string;
}

const creators: Map<string, Creator> = new Map();

// Seed Initial Rooms
rooms.set("digital-oil", {
  id: "digital-oil",
  title: "Digital Oil & Canvas Painting",
  description: "A virtual studio for texture study, landscape paintings, and oil simulation.",
  strokes: [],
  versions: [
    {
      id: "v1",
      name: "Initial Horizon Sketch",
      description: "Quick layout of the ground and sky boundary.",
      creatorName: "Aura Painter",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      strokes: []
    }
  ],
  messages: [],
  activeUsers: []
});

rooms.set("cyberpunk-neon", {
  id: "cyberpunk-neon",
  title: "Cyberpunk Streetscape Concept",
  description: "Co-creating neon signs, flying vehicles, and futuristic architecture.",
  strokes: [],
  versions: [],
  messages: [],
  activeUsers: []
});

rooms.set("cozy-isometric", {
  id: "cozy-isometric",
  title: "Cozy Isometric Bedroom",
  description: "Collaborative pixel art or fine-line drawing of a plants-filled bedroom.",
  strokes: [],
  versions: [],
  messages: [],
  activeUsers: []
});

// Seed Initial Jobs & Freelance Gigs
jobs = [];

// Seed Portfolios
portfolios = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // REST API Endpoints
  app.get("/api/rooms", (req, res) => {
    res.json(Array.from(rooms.values()));
  });

  app.get("/api/rooms/:id", (req, res) => {
    const room = rooms.get(req.params.id);
    if (room) {
      res.json(room);
    } else {
      res.status(404).json({ error: "Room not found" });
    }
  });

  // Dynamic Room Persistence
  app.post("/api/rooms", (req, res) => {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Room title is required" });
    }
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    const newRoom: Room = {
      id,
      title,
      description: description || "A custom space for collaboration.",
      strokes: [],
      versions: [],
      messages: [],
      activeUsers: []
    };
    rooms.set(id, newRoom);
    res.status(201).json(newRoom);
  });

  app.delete("/api/rooms/:id", (req, res) => {
    if (rooms.delete(req.params.id)) {
      res.json({ success: true, id: req.params.id });
    } else {
      res.status(404).json({ error: "Room not found" });
    }
  });

  // Live Creators Directory API
  app.get("/api/creators", (req, res) => {
    res.json(Array.from(creators.values()));
  });

  app.post("/api/creators", (req, res) => {
    const { name, avatar, headline, bio, skills, isOnline } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const id = `creator-${Date.now()}`;
    const newCreator = {
      id,
      name,
      avatar: avatar || "🎨",
      headline: headline || "Creative Designer",
      bio: bio || "Dynamic designer on the live network.",
      skills: Array.isArray(skills) ? skills : [],
      isOnline: isOnline === undefined ? true : !!isOnline
    };
    creators.set(id, newCreator);
    res.status(201).json(newCreator);
  });

  app.put("/api/creators/:id", (req, res) => {
    const creator = creators.get(req.params.id);
    if (!creator) return res.status(404).json({ error: "Creator not found" });
    const { name, avatar, headline, bio, skills, isOnline, currentRoomId } = req.body;
    if (name) creator.name = name;
    if (avatar) creator.avatar = avatar;
    if (headline) creator.headline = headline;
    if (bio) creator.bio = bio;
    if (Array.isArray(skills)) creator.skills = skills;
    if (isOnline !== undefined) creator.isOnline = !!isOnline;
    if (currentRoomId !== undefined) creator.currentRoomId = currentRoomId;
    res.json(creator);
  });

  app.delete("/api/creators/:id", (req, res) => {
    if (creators.delete(req.params.id)) {
      res.json({ success: true, id: req.params.id });
    } else {
      res.status(404).json({ error: "Creator not found" });
    }
  });

  // Simulating Live Connection: Join / Leave Room
  app.post("/api/rooms/:roomId/join-creator", (req, res) => {
    const { creatorId } = req.body;
    const room = rooms.get(req.params.roomId);
    const creator = creators.get(creatorId);
    if (!room || !creator) {
      return res.status(404).json({ error: "Room or creator not found" });
    }

    room.activeUsers = room.activeUsers.filter(u => u.id !== creator.id);
    const newUser: RoomUser = {
      id: creator.id,
      name: creator.name,
      avatar: creator.avatar,
      isSpeaking: false,
      speakVolume: 0
    };
    room.activeUsers.push(newUser);
    creator.currentRoomId = room.id;

    broadcastToRoom(room.id, {
      type: "user-joined",
      data: { user: newUser, activeUsers: room.activeUsers }
    });

    res.json({ success: true, activeUsers: room.activeUsers });
  });

  app.post("/api/rooms/:roomId/leave-creator", (req, res) => {
    const { creatorId } = req.body;
    const room = rooms.get(req.params.roomId);
    const creator = creators.get(creatorId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    room.activeUsers = room.activeUsers.filter(u => u.id !== creatorId);
    if (creator) creator.currentRoomId = undefined;

    broadcastToRoom(room.id, {
      type: "user-left",
      data: { userId: creatorId, activeUsers: room.activeUsers }
    });

    res.json({ success: true, activeUsers: room.activeUsers });
  });

  // Simulating Live Actions: Send Message, Draw Stroke, Speaking Toggle
  app.post("/api/rooms/:roomId/creator-action", (req, res) => {
    const { creatorId, actionType, text, strokeColor } = req.body;
    const room = rooms.get(req.params.roomId);
    const creator = creators.get(creatorId);
    if (!room || !creator) {
      return res.status(404).json({ error: "Room or creator not found" });
    }

    if (actionType === "message") {
      const newMessage: ChatMessage = {
        id: `m-sim-${Date.now()}`,
        userId: creator.id,
        userName: creator.name,
        userAvatar: creator.avatar,
        text: text || "Hey everyone! Awesome whiteboard canvas.",
        timestamp: new Date().toISOString()
      };
      room.messages.push(newMessage);
      
      broadcastToRoom(room.id, {
        type: "message-received",
        data: { message: newMessage }
      });
      return res.json({ success: true, action: "message", message: newMessage });
    }

    if (actionType === "draw") {
      const points = [];
      const centerX = 100 + Math.random() * 400;
      const centerY = 100 + Math.random() * 300;
      const radius = 20 + Math.random() * 50;
      
      // Draw a neat dynamic triangle, star, or hexagon shape
      const sides = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i <= sides; i++) {
        const angle = (i * 2 * Math.PI) / sides;
        points.push({
          x: Math.round(centerX + radius * Math.cos(angle)),
          y: Math.round(centerY + radius * Math.sin(angle))
        });
      }

      const newStroke: Stroke = {
        id: `s-sim-${Date.now()}`,
        points,
        color: strokeColor || "#00FF66",
        width: 3,
        isEraser: false,
        userId: creator.id,
        userName: creator.name
      };

      room.strokes.push(newStroke);
      broadcastToRoom(room.id, {
        type: "draw-stroke",
        data: { stroke: newStroke }
      });
      return res.json({ success: true, action: "draw", stroke: newStroke });
    }

    if (actionType === "speak") {
      const isSpeaking = req.body.isSpeaking;
      const speakVolume = isSpeaking ? 30 + Math.round(Math.random() * 60) : 0;
      
      const user = room.activeUsers.find(u => u.id === creator.id);
      if (user) {
        user.isSpeaking = isSpeaking;
        user.speakVolume = speakVolume;
      }

      broadcastToRoom(room.id, {
        type: "voice-updated",
        data: { userId: creator.id, isSpeaking, speakVolume }
      });
      return res.json({ success: true, action: "speak", isSpeaking, speakVolume });
    }

    res.status(400).json({ error: "Invalid actionType" });
  });

  app.get("/api/jobs", (req, res) => {
    res.json(jobs);
  });

  app.post("/api/jobs", (req, res) => {
    const { title, company, location, type, description, salary, skills, postedBy, isFreelance } = req.body;
    if (!title || !company || !description) {
      return res.status(400).json({ error: "Title, company, and description are required" });
    }
    const logos = ["💼", "🎨", "👾", "📐", "🎬", "✨", "🖌️", "🌐"];
    const randomLogo = logos[Math.floor(Math.random() * logos.length)];

    const newJob: Job = {
      id: `job-${Date.now()}`,
      title,
      company,
      logo: randomLogo,
      location: location || "Remote",
      type: type || "Full-time",
      description,
      salary: salary || "Competitive",
      skills: Array.isArray(skills) ? skills : [],
      postedAt: new Date().toISOString(),
      applicationsCount: 0,
      postedBy: postedBy || "anonymous",
      isFreelance: !!isFreelance
    };

    jobs.unshift(newJob);
    res.status(201).json(newJob);
  });

  app.put("/api/jobs/:id", (req, res) => {
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job opening not found" });
    }
    const { title, company, location, type, description, salary, skills, isFreelance } = req.body;
    if (title) job.title = title;
    if (company) job.company = company;
    if (location) job.location = location;
    if (type) job.type = type;
    if (description) job.description = description;
    if (salary) job.salary = salary;
    if (Array.isArray(skills)) job.skills = skills;
    if (typeof isFreelance === "boolean") job.isFreelance = isFreelance;
    res.json(job);
  });

  app.delete("/api/jobs/:id", (req, res) => {
    const initialLength = jobs.length;
    jobs = jobs.filter(j => j.id !== req.params.id);
    if (jobs.length === initialLength) {
      return res.status(404).json({ error: "Job opening not found" });
    }
    res.json({ success: true, id: req.params.id });
  });

  app.get("/api/portfolios", (req, res) => {
    res.json(portfolios);
  });

  app.post("/api/portfolios", (req, res) => {
    const { artistId, artistName, artistAvatar, title, description, imageSrc, processSteps } = req.body;
    if (!title || !description || !imageSrc) {
      return res.status(400).json({ error: "Title, description, and canvas drawing image are required" });
    }

    const newPortfolio: Portfolio = {
      id: `p-${Date.now()}`,
      artistId: artistId || "anonymous",
      artistName: artistName || "Anonymous Creator",
      artistAvatar: artistAvatar || "🎨",
      title,
      description,
      imageSrc,
      likes: 0,
      likedBy: [],
      processSteps: Array.isArray(processSteps) ? processSteps : [],
      comments: [],
      timestamp: new Date().toISOString()
    };

    portfolios.unshift(newPortfolio);
    res.status(201).json(newPortfolio);
  });

  app.post("/api/portfolios/:id/like", (req, res) => {
    const { userId } = req.body;
    const portfolio = portfolios.find(p => p.id === req.params.id);
    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio item not found" });
    }

    if (!userId) {
      return res.status(400).json({ error: "UserId is required" });
    }

    if (portfolio.likedBy.includes(userId)) {
      // Unlike
      portfolio.likedBy = portfolio.likedBy.filter(id => id !== userId);
      portfolio.likes = Math.max(0, portfolio.likes - 1);
    } else {
      // Like
      portfolio.likedBy.push(userId);
      portfolio.likes += 1;
    }

    res.json(portfolio);
  });

  app.post("/api/portfolios/:id/comment", (req, res) => {
    const { userName, userAvatar, text } = req.body;
    const portfolio = portfolios.find(p => p.id === req.params.id);
    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio item not found" });
    }

    if (!text || !userName) {
      return res.status(400).json({ error: "Text and userName are required" });
    }

    const newComment = {
      id: `c-${Date.now()}`,
      userName,
      userAvatar: userAvatar || "🎨",
      text,
      timestamp: new Date().toISOString()
    };

    portfolio.comments.push(newComment);
    res.status(201).json(portfolio);
  });

  app.put("/api/portfolios/:id", (req, res) => {
    const portfolio = portfolios.find(p => p.id === req.params.id);
    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio item not found" });
    }
    const { title, description, imageSrc, processSteps } = req.body;
    if (title) portfolio.title = title;
    if (description) portfolio.description = description;
    if (imageSrc) portfolio.imageSrc = imageSrc;
    if (Array.isArray(processSteps)) portfolio.processSteps = processSteps;
    res.json(portfolio);
  });

  app.delete("/api/portfolios/:id", (req, res) => {
    const initialLength = portfolios.length;
    portfolios = portfolios.filter(p => p.id !== req.params.id);
    if (portfolios.length === initialLength) {
      return res.status(404).json({ error: "Portfolio item not found" });
    }
    res.json({ success: true, id: req.params.id });
  });

  // Create combined server for HTTP and WebSockets
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Map of active WebSocket connections to their metadata
  const activeConnections: Map<WebSocket, { userId: string; roomId: string; name: string; avatar: string }> = new Map();

  // Handle Upgrade to WebSocket
  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // Broadcast to all clients in a specific room
  function broadcastToRoom(roomId: string, messageObj: any, senderWs?: WebSocket) {
    const payloadString = JSON.stringify(messageObj);
    activeConnections.forEach((meta, ws) => {
      if (meta.roomId === roomId && ws !== senderWs && ws.readyState === WebSocket.OPEN) {
        ws.send(payloadString);
      }
    });
  }

  // WebSocket Server logic
  wss.on("connection", (ws: WebSocket) => {
    activeConnections.set(ws, { userId: "", roomId: "", name: "", avatar: "" });

    ws.on("message", (rawMessage: string) => {
      try {
        const parsed = JSON.parse(rawMessage);
        const { type, roomId, data } = parsed;

        if (type === "join-room") {
          const { userId, name, avatar } = data;
          
          // Set or update connection metadata
          activeConnections.set(ws, { userId, roomId, name, avatar });

          // Sync database room or create if not exists
          let room = rooms.get(roomId);
          if (!room) {
            room = {
              id: roomId,
              title: `Collaborative Canvas ${roomId}`,
              description: "Custom space",
              strokes: [],
              versions: [],
              messages: [],
              activeUsers: []
            };
            rooms.set(roomId, room);
          }

          // Ensure user isn't duplicated in activeUsers
          room.activeUsers = room.activeUsers.filter(u => u.id !== userId);
          const newUser: RoomUser = { id: userId, name, avatar, isSpeaking: false, speakVolume: 0 };
          room.activeUsers.push(newUser);

          // Reply with current full room state
          ws.send(JSON.stringify({
            type: "room-sync",
            data: {
              strokes: room.strokes,
              messages: room.messages,
              versions: room.versions,
              activeUsers: room.activeUsers
            }
          }));

          // Broadcast to others that user joined
          broadcastToRoom(roomId, {
            type: "user-joined",
            data: { user: newUser, activeUsers: room.activeUsers }
          }, ws);
        }

        if (type === "leave-room") {
          const meta = activeConnections.get(ws);
          if (meta) {
            const room = rooms.get(meta.roomId);
            if (room) {
              room.activeUsers = room.activeUsers.filter(u => u.id !== meta.userId);
              broadcastToRoom(meta.roomId, {
                type: "user-left",
                data: { userId: meta.userId, activeUsers: room.activeUsers }
              }, ws);
            }
            meta.roomId = "";
            meta.userId = "";
          }
        }

        if (type === "draw-stroke") {
          const stroke: Stroke = data.stroke;
          const room = rooms.get(roomId);
          if (room) {
            room.strokes.push(stroke);
            broadcastToRoom(roomId, {
              type: "draw-stroke",
              data: { stroke }
            }, ws);
          }
        }

        if (type === "clear-canvas") {
          const room = rooms.get(roomId);
          if (room) {
            room.strokes = [];
            broadcastToRoom(roomId, {
              type: "clear-canvas"
            }, ws);
          }
        }

        if (type === "undo-stroke") {
          const room = rooms.get(roomId);
          if (room && room.strokes.length > 0) {
            const meta = activeConnections.get(ws);
            const userId = meta ? meta.userId : null;
            let indexToRemove = -1;
            if (userId) {
              for (let i = room.strokes.length - 1; i >= 0; i--) {
                if (room.strokes[i].userId === userId) {
                  indexToRemove = i;
                  break;
                }
              }
            }
            if (indexToRemove === -1) {
              indexToRemove = room.strokes.length - 1;
            }
            room.strokes.splice(indexToRemove, 1);
            
            const restorePayload = JSON.stringify({
              type: "canvas-restored",
              data: { strokes: room.strokes }
            });
            activeConnections.forEach((m, clientWs) => {
              if (m.roomId === roomId && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(restorePayload);
              }
            });
          }
        }

        if (type === "save-version") {
          const { name, description, creatorName } = data;
          const room = rooms.get(roomId);
          if (room) {
            const newVersion: CanvasVersion = {
              id: `v-${Date.now()}`,
              name,
              description,
              strokes: [...room.strokes],
              timestamp: new Date().toISOString(),
              creatorName
            };
            room.versions.push(newVersion);
            // Broadcast added version
            broadcastToRoom(roomId, {
              type: "version-added",
              data: { version: newVersion }
            });
            // Also notify the sender
            ws.send(JSON.stringify({
              type: "version-added",
              data: { version: newVersion }
            }));
          }
        }

        if (type === "restore-version") {
          const { versionId } = data;
          const room = rooms.get(roomId);
          if (room) {
            const version = room.versions.find(v => v.id === versionId);
            if (version) {
              room.strokes = [...version.strokes];
              // Broadcast restoration to everyone (including sender)
              const restorePayload = JSON.stringify({
                type: "canvas-restored",
                data: { strokes: room.strokes }
              });
              activeConnections.forEach((meta, clientWs) => {
                if (meta.roomId === roomId && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(restorePayload);
                }
              });
            }
          }
        }

        if (type === "send-message") {
          const { text, userId, userName, userAvatar } = data;
          const room = rooms.get(roomId);
          if (room) {
            const newMessage: ChatMessage = {
              id: `m-${Date.now()}`,
              userId,
              userName,
              userAvatar,
              text,
              timestamp: new Date().toISOString()
            };
            room.messages.push(newMessage);
            // Broadcast to all (including sender)
            const msgPayload = JSON.stringify({
              type: "message-received",
              data: { message: newMessage }
            });
            activeConnections.forEach((meta, clientWs) => {
              if (meta.roomId === roomId && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(msgPayload);
              }
            });
          }
        }

        if (type === "voice-level") {
          const { userId, isSpeaking, speakVolume } = data;
          const room = rooms.get(roomId);
          if (room) {
            const user = room.activeUsers.find(u => u.id === userId);
            if (user) {
              user.isSpeaking = isSpeaking;
              user.speakVolume = speakVolume;
              
              broadcastToRoom(roomId, {
                type: "voice-updated",
                data: { userId, isSpeaking, speakVolume }
              }, ws);
            }
          }
        }

        if (type === "cursor-move") {
          const { userId, name, avatar, x, y } = data;
          broadcastToRoom(roomId, {
            type: "cursor-moved",
            data: { userId, name, avatar, x, y }
          }, ws);
        }

      } catch (err) {
        console.error("Error parsing socket message:", err);
      }
    });

    ws.on("close", () => {
      const meta = activeConnections.get(ws);
      if (meta && meta.roomId && meta.userId) {
        const room = rooms.get(meta.roomId);
        if (room) {
          room.activeUsers = room.activeUsers.filter(u => u.id !== meta.userId);
          broadcastToRoom(meta.roomId, {
            type: "user-left",
            data: { userId: meta.userId, activeUsers: room.activeUsers }
          });
        }
      }
      activeConnections.delete(ws);
    });
  });

  // Vite development integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});
