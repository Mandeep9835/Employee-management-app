const { useCallback, useEffect, useMemo, useState } = React;

const initialForm = {
  name: '',
  email: '',
  department: '',
  role: '',
  hireDate: '',
};

function App() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const departmentOptions = useMemo(() => {
    const values = Array.from(new Set(employees.map((item) => item.department)));
    return values.sort();
  }, [employees]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (department.trim()) params.set('department', department.trim());

      const response = await fetch(`/api/employees?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      setEmployees(await response.json());
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [search, department]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/api/employees/${editingId}` : '/api/employees';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || 'Request failed');
      }

      setForm(initialForm);
      setEditingId(null);
      fetchEmployees();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function beginEdit(employee) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      hireDate: employee.hireDate,
    });
  }

  async function handleDelete(id) {
    setError('');
    try {
      const response = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(data.error || 'Delete failed');
      }
      if (editingId === id) {
        setEditingId(null);
        setForm(initialForm);
      }
      fetchEmployees();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
  }

  return (
    <div className="container">
      <h1>Employee Management System</h1>

      <form onSubmit={handleSubmit} className="grid">
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input
          name="department"
          placeholder="Department"
          value={form.department}
          onChange={handleChange}
          required
        />
        <input name="role" placeholder="Role" value={form.role} onChange={handleChange} required />
        <input
          name="hireDate"
          type="date"
          value={form.hireDate}
          onChange={handleChange}
          required
        />
        <button type="submit">{editingId ? 'Update Employee' : 'Add Employee'}</button>
        {editingId && (
          <button type="button" className="secondary" onClick={cancelEdit}>
            Cancel Edit
          </button>
        )}
      </form>

      <div className="toolbar">
        <input
          placeholder="Search by name, email, or role"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="">All Departments</option>
          {departmentOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Role</th>
            <th>Hire Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7">Loading...</td>
            </tr>
          ) : employees.length === 0 ? (
            <tr>
              <td colSpan="7">No employees found.</td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td>{employee.name}</td>
                <td>{employee.email}</td>
                <td>{employee.department}</td>
                <td>{employee.role}</td>
                <td>{employee.hireDate}</td>
                <td>
                  <div className="actions">
                    <button type="button" className="secondary" onClick={() => beginEdit(employee)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(employee.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
