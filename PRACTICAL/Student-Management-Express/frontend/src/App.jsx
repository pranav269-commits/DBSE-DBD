import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [students, setStudents] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    course: ""
  });

  const loadStudents = async () => {
    const response = await axios.get(
      "http://localhost:5000/api/students"
    );

    setStudents(response.data);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const addStudent = async (e) => {
    e.preventDefault();

    await axios.post(
      "http://localhost:5000/api/students",
      form
    );

    setForm({
      name: "",
      email: "",
      course: ""
    });

    loadStudents();
  };

  const deleteStudent = async (id) => {
    await axios.delete(
      `http://localhost:5000/api/students/${id}`
    );

    loadStudents();
  };

  return (
    <div className="container">

      <h1>Student Management System</h1>

      <form onSubmit={addStudent}>

        <input
          type="text"
          name="name"
          placeholder="Student Name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="course"
          placeholder="Course"
          value={form.course}
          onChange={handleChange}
          required
        />

        <button type="submit">
          Add Student
        </button>

      </form>

      <h2>Students</h2>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Course</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => (
            <tr key={student._id}>

              <td>{student.name}</td>
              <td>{student.email}</td>
              <td>{student.course}</td>

              <td>
                <button
                  onClick={() =>
                    deleteStudent(student._id)
                  }
                >
                  Delete
                </button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

export default App;
