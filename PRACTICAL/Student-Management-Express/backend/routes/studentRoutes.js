const router = require("express").Router();
const Student = require("../models/Student");

// GET students
router.get("/", async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

// POST student
router.post("/", async (req, res) => {
  const student = new Student(req.body);
  const savedStudent = await student.save();
  res.status(201).json(savedStudent);
});

// DELETE student
router.delete("/:id", async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: "Student deleted successfully" });
});


module.exports = router;
