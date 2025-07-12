const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:8080'], // Allow both ports
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080'],
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1/stackit', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const JWT_SECRET = 'your_jwt_secret_key';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});
const User = mongoose.model('User', userSchema);

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  tags: [{ type: String }],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});
const Question = mongoose.model('Question', questionSchema);

const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  accepted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Answer = mongoose.model('Answer', answerSchema);

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Notification = mongoose.model('Notification', notificationSchema);

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: 'Invalid token' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ message: 'Username already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, role: user.role });
});

app.post('/api/questions', authenticate, async (req, res) => {
  const { title, description, tags } = req.body;
  try {
    const question = new Question({ title, description, tags, user: req.user._id });
    await question.save();
    io.emit('newQuestion', { message: `${req.user.username} posted a new question: ${title}` });
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ message: 'Error posting question' });
  }
});

app.get('/api/questions', async (req, res) => {
  const questions = await Question.find().populate('user', 'username');
  res.json(questions);
});

app.post('/api/answers', authenticate, async (req, res) => {
  const { questionId, content } = req.body;
  try {
    const answer = new Answer({ question: questionId, user: req.user._id, content });
    await answer.save();
    const question = await Question.findById(questionId).populate('user');
    if (question.user._id.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        user: question.user._id,
        message: `${req.user.username} answered your question: ${question.title}`,
      });
      await notification.save();
      io.to(question.user._id.toString()).emit('notification', notification);
    }
    res.status(201).json(answer);
  } catch (err) {
    res.status(400).json({ message: 'Error posting answer' });
  }
});

app.post('/api/answers/:id/vote', authenticate, async (req, res) => {
  const { id } = req.params;
  const { vote } = req.body;
  try {
    const answer = await Answer.findById(id);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });
    if (vote === 'up') {
      if (!answer.upvotes.includes(req.user._id)) {
        answer.upvotes.push(req.user._id);
        answer.downvotes.pull(req.user._id);
      }
    } else if (vote === 'down') {
      if (!answer.downvotes.includes(req.user._id)) {
        answer.downvotes.push(req.user._id);
        answer.upvotes.pull(req.user._id);
      }
    }
    await answer.save();
    res.json(answer);
  } catch (err) {
    res.status(400).json({ message: 'Error voting' });
  }
});

app.post('/api/answers/:id/accept', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const answer = await Answer.findById(id).populate('question');
    if (!answer) return res.status(404).json({ message: 'Answer not found' });
    if (answer.question.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only question owner can accept answer' });
    }
    await Answer.updateMany({ question: answer.question._id }, { accepted: false });
    answer.accepted = true;
    await answer.save();
    const notification = new Notification({
      user: answer.user,
      message: `Your answer to "${answer.question.title}" was accepted by ${req.user.username}`,
    });
    await notification.save();
    io.to(answer.user._id.toString()).emit('notification', notification);
    res.json(answer);
  } catch (err) {
    res.status(400).json({ message: 'Error accepting answer' });
  }
});

app.get('/api/notifications', authenticate, async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(notifications);
});

app.post('/api/notifications/:id/read', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notification.findById(id);
    if (!notification || notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(400).json({ message: 'Error marking notification' });
  }
});

app.delete('/api/questions/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await Question.findByIdAndDelete(id);
    await Answer.deleteMany({ question: id });
    res.json({ message: 'Question rejected and deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Error rejecting question' });
  }
});

app.post('/api/users/:id/ban', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await User.findByIdAndDelete(id);
    res.json({ message: 'User banned' });
  } catch (err) {
    res.status(400).json({ message: 'Error banning user' });
  }
});

app.post('/api/broadcast', authenticate, isAdmin, async (req, res) => {
  const { message } = req.body;
  try {
    const users = await User.find();
    const notifications = users.map(user => ({
      user: user._id,
      message,
    }));
    await Notification.insertMany(notifications);
    users.forEach(user => {
      io.to(user._id.toString()).emit('notification', { message });
    });
    res.json({ message: 'Broadcast sent' });
  } catch (err) {
    res.status(400).json({ message: 'Error sending broadcast' });
  }
});

app.get('/api/reports', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.countDocuments();
    const questions = await Question.countDocuments();
    const answers = await Answer.countDocuments();
    const notifications = await Notification.countDocuments();
    const report = {
      users,
      questions,
      answers,
      notifications,
      generatedAt: new Date(),
    };
    res.json(report);
  } catch (err) {
    res.status(400).json({ message: 'Error generating report' });
  }
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} connected`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});