// -------------------- IMPORTS --------------------
const express = require('express');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;


// -------------------- DATABASE --------------------
require('./config/database'); // MongoDB connection
const Register = require('./models/register');        // Student model
const Event = require('./models/event');              // Event model
const Registration = require('./models/eventRegistration'); // Event registration model

// -------------------- MIDDLEWARE --------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set("view engine", "ejs");

// -------------------- MULTER CONFIG --------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// -------------------- ROUTES --------------------

// Landing
app.get('/', (req, res) => res.render('index'));

// Register page
app.get('/register', (req, res) => res.render('register'));

// Login page
app.get('/login', (req, res) => res.render('login'));

// -------------------- STUDENT AUTH --------------------

// Create student
app.post('/insert', async (req, res) => {
    try {
       await Register.create({
  name: req.body.name,
  email: req.body.email,
  password: req.body.password,
  section: "EV-1" // until admin edits by default
});
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.send("Error registering user");
    }
});

// Login (Admin or Student)
app.post('/login', async (req, res) => {
    try {
        const admin = { email: "nethraasai87@gmail.com", password: "123" };
        const { email, password } = req.body;

        // ✅ Admin login
        if (email === admin.email && password === admin.password) {
            return res.redirect('/dashboard?page=home');
        }

        // ✅ Student login
        const student = await Register.findOne({ email });
        if (!student) return res.send("User not found");
        if (student.password !== password) return res.send("Invalid password");

        res.redirect(`/home/${student._id}`);
    } catch (err) {
        console.error(err);
        res.send("Login failed");
    }
});

// -------------------- LOGOUT --------------------
app.get('/logout', (req, res) => res.redirect('/login'));

// -------------------- STUDENT DASHBOARD --------------------
app.get('/home/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const student = await Register.findById(studentId);
        if (!student) return res.send("Student not found");

        const events = await Event.find(); 
        const registrations = await Registration.find({ student: studentId })
            .populate('event');

        res.render('home', { student, events, registrations });
    } catch (err) {
        console.error(err);
        res.send("Error loading student dashboard");
    }
});

// Student register for event
app.post('/registerEvent/:eventId', async (req, res) => {
  try {
    const { studentId } = req.body;
    const eventId = req.params.eventId;

    // Fetch event
    const event = await Event.findById(eventId);
    if (!event) return res.send("Event not found");

    // ✅ Block registration if event already passed
    if (new Date(event.date) < new Date()) {
      return res.redirect(`/home/${studentId}?msg=❌ Registration closed. Event already completed.`);
    }

    // Already registered?
    const existing = await Registration.findOne({ student: studentId, event: eventId });
    if (existing) {
      return res.redirect(`/home/${studentId}?msg=Already registered, waiting for admin approval.`);
    }

    // New registration
    await Registration.create({ student: studentId, event: eventId, status: "pending" });

    res.redirect(`/home/${studentId}?msg=✅ Registration pending admin approval`);
  } catch (err) {
    console.error(err);
    res.send("Error registering for event");
  }
});

// -------------------- EVENT MANAGEMENT --------------------

// Create event
app.post('/createEvent', upload.single('poster'), async (req, res) => {
  try {
    const { title, description, date, location, capacity } = req.body;
    const poster = req.file ? req.file.filename : null;

    // ✅ Validation: no past event creation
    if (new Date(date) < new Date()) {
      return res.redirect('/dashboard?page=manage&msg=❌ You cannot create an event with a past date');
    }

    await Event.create({ title, description, date, location, capacity, poster });
    return res.redirect('/dashboard?page=manage&msg=✅ Event created successfully');
  } catch (err) {
    console.error(err);
    res.send("Error creating event");
  }
});

// Edit event
app.get('/editEvent/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.send("Event not found");
        res.render('editEvent', { event });
    } catch (err) {
        console.error(err);
        res.send("Error loading event");
    }
});

// Update event
app.post('/editEvent/:id', upload.single('poster'), async (req, res) => {
  try {
    const { title, description, date, location, capacity } = req.body;

    // ✅ Validation: prevent editing to past date
    if (new Date(date) < new Date()) {
      return res.redirect('/dashboard?page=manage&msg=❌ Cannot update event to a past date');
    }

    const updateData = { title, description, date, location, capacity };
    if (req.file) updateData.poster = req.file.filename;

    await Event.findByIdAndUpdate(req.params.id, updateData);
    return res.redirect('/dashboard?page=manage&msg=✅ Event updated successfully');
  } catch (err) {
    console.error(err);
    res.send("Error updating event");
  }
});

// Delete event
app.post('/deleteEvent/:id', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        await Registration.deleteMany({ event: req.params.id });
        res.redirect('/dashboard?page=manage&msg=Event deleted successfully');
    } catch (err) {
        console.error(err);
        res.send("Error deleting event");
    }
});

// -------------------- ADMIN DASHBOARD --------------------
app.get('/dashboard', async (req, res) => {
    try {
        const page = req.query.page || "home";

        let students = [];
        let events = [];
        let registrations = [];

        // Always fetch totals and all registrations
        const totalEvents = await Event.countDocuments();
        const totalStudents = await Register.countDocuments();
        const allRegistrations = await Registration.find()
            .populate('student')
            .populate('event');

        if (page === "students") {
            students = await Register.find();
        }

    if (page === "manage") {
  const allEvents = await Event.find().sort({ date: 1 });
  const allRegs = await Registration.find().populate('event').populate('student');

  events = allEvents.map(e => {
    const isCompleted = new Date(e.date) < new Date();
    const eventRegs = allRegs.filter(r => r.event && r.event._id.toString() === e._id.toString());
    
    const total = eventRegs.length;
    const approved = eventRegs.filter(r => r.status === "approved").length;
    const rejected = eventRegs.filter(r => r.status === "rejected").length;
    
    // ✅ Section-wise counts (only approved students)
    const sectionCounts = {};
    eventRegs.forEach(r => {
      if (r.status === "approved" && r.student && r.student.section) {
        const sec = r.student.section;
        sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
      }
    });

    return {
      ...e.toObject(),
      isCompleted,
      totalRegistrations: total,
      approvedCount: approved,
      rejectedCount: rejected,
      sectionCounts
    };
  });
}

        if (page === "registrations") {
            registrations = allRegistrations;
        }

        res.render('dashboard', {
            page,
            students,
            events,
            registrations: allRegistrations,
            totalEvents,
            totalStudents,
            msg: req.query.msg || null,
        });
    } catch (err) {
        console.error(err);
        res.send("Error loading dashboard");
    }
});

// -------------------- STUDENT MANAGEMENT --------------------
app.get('/students/edit/:id', async (req, res) => {
    try {
        const student = await Register.findById(req.params.id);
        if (!student) return res.send("Student not found");

        res.render('dashboard', {
            page: 'editStudent',
            student,
            students: await Register.find(),
            msg: null
        });
    } catch (err) {
        console.error(err);
        res.send("Error loading student");
    }
});

app.post('/students/edit/:id', async (req, res) => {
    try {
        const { name, email, password, section } = req.body;
        await Register.findByIdAndUpdate(req.params.id, { name, email, password, section });
        res.redirect('/dashboard?page=students&msg=Student updated successfully');
    } catch (err) {
        console.error(err);
        res.send("Error updating student");
    }
});

app.post('/students/delete/:id', async (req, res) => {
    try {
        await Register.findByIdAndDelete(req.params.id);
        await Registration.deleteMany({ student: req.params.id });
        res.redirect('/dashboard?page=students&msg=Student deleted successfully');
    } catch (err) {
        console.error(err);
        res.send("Error deleting student");
    }
});

// -------------------- REGISTRATION APPROVAL --------------------
app.post('/registrations/:id/approve', async (req, res) => {
    try {
        await Registration.findByIdAndUpdate(req.params.id, { status: "approved" });
        res.redirect('/dashboard?page=registrations&msg=Registration approved');
    } catch (err) {
        console.error(err);
        res.send("Error approving registration");
    }
});

app.post('/registrations/:id/reject', async (req, res) => {
    try {
        await Registration.findByIdAndUpdate(req.params.id, { status: "rejected" });
        res.redirect('/dashboard?page=registrations&msg=Registration rejected');
    } catch (err) {
        console.error(err);
        res.send("Error rejecting registration");
    }
});

// -------------------- START SERVER --------------------
app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));