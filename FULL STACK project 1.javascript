const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

module.exports = mongoose.model('User', UserSchema);
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  title: String,
  description: String,
});

module.exports = mongoose.model('Item', ItemSchema);
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Item = require('./models/Item');
const auth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

// DB CONNECT
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// REGISTER
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });

  await user.save();
  res.json({ message: "User created" });
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: "Invalid" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid" });

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

// GET ITEMS
app.get('/api/items', auth, async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

// CREATE ITEM
app.post('/api/items', auth, async (req, res) => {
  const item = new Item(req.body);
  await item.save();
  res.json(item);
});

// DELETE ITEM
app.delete('/api/items/:id', auth, async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// START SERVER
app.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT}`);
});
import React, { useState, useEffect } from "react";

const API = "http://localhost:5000/api";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const login = async () => {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    setToken(data.token);
    fetchItems(data.token);
  };

  const fetchItems = async (tkn) => {
    const res = await fetch(`${API}/items`, {
      headers: { Authorization: `Bearer ${tkn}` },
    });

    const data = await res.json();
    setItems(data);
  };

  const addItem = async () => {
    const res = await fetch(`${API}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description }),
    });

    const data = await res.json();
    setItems([...items, data]);
  };

  const deleteItem = async (id) => {
    await fetch(`${API}/items/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    setItems(items.filter((i) => i._id !== id));
  };

  if (!token) {
    return (
      <div>
        <h2>Login</h2>
        <input onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        <input onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        <button onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Items</h2>

      <input onChange={(e) => setTitle(e.target.value)} placeholder="title" />
      <input onChange={(e) => setDescription(e.target.value)} placeholder="desc" />
      <button onClick={addItem}>Add</button>

      <ul>
        {items.map((i) => (
          <li key={i._id}>
            {i.title} - {i.description}
            <button onClick={() => deleteItem(i._id)}>X</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
