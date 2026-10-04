"""Student Management: a FastAPI practical demonstrating five HTTP methods.

Data is stored in memory and resets on restart. Run one Uvicorn worker.
"""
from typing import Annotated

from fastapi import FastAPI, HTTPException, Path
from pydantic import BaseModel, ConfigDict, Field, model_validator

app = FastAPI(
    title="Student Management API",
    version="1.0.0",
    description=("A practical demonstration of GET, POST, PUT, PATCH and DELETE. "
                 "Use Try it out to execute requests. Records are stored in memory "
                 "and reset when the server restarts."),
    openapi_tags=[{"name": "Students", "description": "Create, read, replace, partially update and delete students."}],
    swagger_ui_parameters={"displayRequestDuration": True, "defaultModelsExpandDepth": -1},
)

class StudentBase(BaseModel):
    """Complete request body for POST and PUT."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True,
                             json_schema_extra={"examples": [{'name': 'K. Pranav', 'age': 19, 'department': 'CSE', 'cgpa': 8.7}]})
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=1, le=120)
    department: str = Field(min_length=1, max_length=100)
    cgpa: float = Field(ge=0, le=10, allow_inf_nan=False)

class StudentUpdate(BaseModel):
    """PATCH accepts only the fields that need to change."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True,
                             json_schema_extra={"examples": [{'cgpa': 9.1}]})
    name: str | None = Field(default=None, min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=1, le=120)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    cgpa: float | None = Field(default=None, ge=0, le=10, allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_changes(self):
        changes = self.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("Provide at least one field to update")
        if any(value is None for value in changes.values()):
            raise ValueError("Fields cannot be null; omit fields you do not want to change")
        return self

class StudentResponse(StudentBase):
    id: int = Field(gt=0, description="Unique positive record ID")

students: dict[int, StudentResponse] = {}
RecordId = Annotated[int, Path(gt=0, description="Unique positive ID", examples=[101])]
ERRORS = {404: {"description": "Record not found"}}

def require_student(student_id: int) -> StudentResponse:
    if student_id not in students:
        raise HTTPException(status_code=404, detail="Student not found")
    return students[student_id]

@app.get("/students", response_model=list[StudentResponse], tags=["Students"], summary="List all students")
async def list_students():
    return [students[key] for key in sorted(students)]

@app.get("/students/{student_id}", response_model=StudentResponse, tags=["Students"],
         summary="Get a student by ID", responses=ERRORS)
async def get_student(student_id: RecordId):
    return require_student(student_id)

@app.post("/students/{student_id}", response_model=StudentResponse, status_code=201,
          tags=["Students"], summary="Create a student", responses={409: {"description": "ID already exists"}})
async def create_student(student_id: RecordId, student: StudentBase):
    if student_id in students:
        raise HTTPException(status_code=409, detail="Student ID already exists")
    record = StudentResponse(id=student_id, **student.model_dump())
    students[student_id] = record
    return record

@app.put("/students/{student_id}", response_model=StudentResponse, tags=["Students"],
         summary="Replace all student details", responses=ERRORS)
async def replace_student(student_id: RecordId, student: StudentBase):
    require_student(student_id)
    record = StudentResponse(id=student_id, **student.model_dump())
    students[student_id] = record
    return record

@app.patch("/students/{student_id}", response_model=StudentResponse, tags=["Students"],
           summary="Update selected student details", responses=ERRORS)
async def patch_student(student_id: RecordId, changes: StudentUpdate):
    current = require_student(student_id)
    record = StudentResponse(**{**current.model_dump(), **changes.model_dump(exclude_unset=True)})
    students[student_id] = record
    return record

@app.delete("/students/{student_id}", tags=["Students"], summary="Delete a student", responses=ERRORS)
async def delete_student(student_id: RecordId):
    require_student(student_id)
    del students[student_id]
    return {"message": "Student deleted successfully", "id": student_id}
