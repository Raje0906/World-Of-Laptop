import React, { useEffect, useState } from "react";
import axios from "axios";
import { saveUsersToIDB, getUsersFromIDB } from '@/lib/dataUtils';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive?: boolean;
  store_id?: { name: string; address: string; _id: string } | null;
}

interface Store {
  _id: string;
  name: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  interface UserFormData {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    store_id?: string;
  }

  const [form, setForm] = useState<UserFormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "sales",
    store_id: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "";

  useEffect(() => {
    loadUsers();
    fetchStores();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${apiBase}/api/auth/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.data.data.users;
    } catch (err: any) {
      // Log the full error for debugging
      console.error('Error fetching users:', err);
      // Try to show the most informative error message
      let message = 'Failed to fetch users';
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      throw err; // Re-throw to be caught by loadUsers
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      let data = [];
      if (navigator.onLine) {
        data = await fetchUsers();
        // Log the data for debugging
        console.log('Fetched users:', data);
        // Filter out users without a valid _id and map to include id
        const validUsers = Array.isArray(data)
          ? data.filter(u => u && u._id).map(u => ({ ...u, id: u._id }))
          : [];
        await saveUsersToIDB(validUsers);
        setUsers(validUsers);
      } else {
        data = await getUsersFromIDB();
        setUsers(data);
      }
    } catch (error: any) {
      // Log the error for debugging
      console.error('Error in loadUsers:', error);
      // Show the error message if available
      setError(error?.response?.data?.message || error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/auth/stores`);
      setStores(res.data.data.stores);
    } catch (err) {
      // ignore store fetch errors for now
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    if (form.role !== "admin" && !form.store_id) {
      setFormError("Store selection is required for non-admin users");
      setFormLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      // Create payload based on role
      const payload: any = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role
      };
      
      // Only include store_id for non-admin users
      if (form.role !== "admin") {
        payload.store_id = form.store_id;
      }
      
      await axios.post(`${apiBase}/api/auth/register`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", password: "", role: "sales", store_id: "" });
      await loadUsers();
    } catch (err: any) {
      console.error('Error adding user:', err);
      setFormError(err.response?.data?.message || "Failed to add user");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      store_id: user.store_id?._id || "",
      isActive: user.isActive !== false,
    });
    setEditError(null);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    setEditForm({
      ...editForm,
      [name]: type === 'checkbox' ? (target as HTMLInputElement).checked : value,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setEditLoading(true);
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    try {
      // Update role if changed
      if (editUser && editForm.role !== editUser.role) {
        await axios.put(
          `${apiBase}/api/auth/admin/users/${editUser._id}/role`,
          { role: editForm.role },
          { headers }
        );
      }
      // Update store if changed (and not admin)
      if (editUser && editForm.role !== "admin" && editForm.store_id !== (editUser.store_id?._id || "")) {
        await axios.put(
          `${apiBase}/api/auth/admin/users/${editUser._id}/store`,
          { store_id: editForm.store_id },
          { headers }
        );
      }
      // Update name, email, phone, isActive (if changed)
      if (editUser && (
        editForm.name !== editUser.name ||
        editForm.email !== editUser.email ||
        editForm.phone !== editUser.phone ||
        editForm.isActive !== editUser.isActive
      )) {
        await axios.put(
          `${apiBase}/api/auth/admin/users/${editUser._id}`,
          {
            name: editForm.name,
            email: editForm.email,
            phone: editForm.phone,
            isActive: editForm.isActive,
          },
          { headers }
        );
      }
      setEditUser(null);
      setEditForm(null);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.response?.data?.message || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  // Delete user handler
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiBase}/api/auth/admin/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Optimistically remove from UI
      setUsers(prev => prev.filter(u => u.id !== userId && u._id !== userId));
      // Remove from IndexedDB as well
      const usersFromIDB = await getUsersFromIDB();
      const filtered = usersFromIDB.filter(u => u.id !== userId && u._id !== userId);
      await saveUsersToIDB(filtered);
      await loadUsers(); // Refresh for consistency
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to delete user';
      if (err.response && err.response.status === 404) {
        setUsers(prev => prev.filter(u => u.id !== userId && u._id !== userId));
        alert('User already deleted (404). Removed from UI.');
      } else {
        alert(message);
      }
      await loadUsers();
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="max-w-5xl mx-auto my-10 bg-white dark:bg-zinc-900 rounded-xl shadow-soft p-8 animate-fade-in">
      <h2 className="text-3xl font-bold mb-8 tracking-wide text-gradient">User Management</h2>
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-6 bg-blue-600 hover:bg-blue-800 text-white rounded-md px-6 py-2 font-semibold text-lg shadow transition-colors"
      >
        {showForm ? "Cancel" : "Add User"}
      </button>
      {showForm && (
        <form onSubmit={handleAddUser} className="mb-8 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6 grid gap-4 shadow-soft">
          <div className="flex flex-col md:flex-row gap-4">
            <label className="flex-1">
              Name:
              <input name="name" value={form.name} onChange={handleFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1" />
            </label>
            <label className="flex-1">
              Email:
              <input name="email" type="email" value={form.email} onChange={handleFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1" />
            </label>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <label className="flex-1">
              Phone:
              <input name="phone" value={form.phone} onChange={handleFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1" />
            </label>
            <label className="flex-1">
              Password:
              <input name="password" type="password" value={form.password} onChange={handleFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1" />
            </label>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <label className="flex-1">
              Role:
              <select name="role" value={form.role} onChange={handleFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1">
                <option value="admin">Admin</option>
                <option value="store manager">Store Manager</option>
                <option value="sales">Sales</option>
                <option value="engineer">Engineer</option>
              </select>
            </label>
            <label className="flex-1">
              Store:
              <select name="store_id" value={form.store_id} onChange={handleFormChange} disabled={form.role === 'admin'} required={form.role !== 'admin'} className="w-full p-2 rounded border border-gray-300 mt-1">
                <option value="">{form.role === 'admin' ? "(None)" : "Select Store"}</option>
                {stores.map(store => (
                  <option key={store._id} value={store._id}>{store.name}</option>
                ))}
              </select>
            </label>
          </div>
          {formError && <div className="text-red-600 font-medium">{formError}</div>}
          <button type="submit" disabled={formLoading} className="bg-green-600 hover:bg-green-700 text-white rounded-md px-6 py-2 font-semibold mt-2 transition-colors">
            {formLoading ? "Adding..." : "Add User"}
          </button>
        </form>
      )}
      <div className="overflow-x-auto rounded-lg shadow-soft">
        <table className="min-w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-3 px-4 font-bold tracking-wide">Name</th>
              <th className="py-3 px-4 font-bold tracking-wide">Email</th>
              <th className="py-3 px-4 font-bold tracking-wide">Phone</th>
              <th className="py-3 px-4 font-bold tracking-wide">Role</th>
              <th className="py-3 px-4 font-bold tracking-wide">Store</th>
              <th className="py-3 px-4 font-bold tracking-wide">Active</th>
              <th className="py-3 px-4 font-bold tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-zinc-800 transition">
                <td className="py-3 px-4">{user.name}</td>
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4">{user.phone}</td>
                <td className="py-3 px-4">{user.role}</td>
                <td className="py-3 px-4">{user.store_id?.name || "-"}</td>
                <td className="py-3 px-4">{user.isActive !== false ? "Yes" : "No"}</td>
                <td className="py-3 px-4 flex gap-2">
                  <button onClick={() => handleEditClick(user)} className="bg-blue-600 hover:bg-blue-800 text-white rounded px-3 py-1 font-medium transition-colors">Edit</button>
                  <button onClick={() => handleDeleteUser(user._id)} className="bg-red-600 hover:bg-red-800 text-white rounded px-3 py-1 font-medium transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in">
          <form onSubmit={handleEditSubmit} className="bg-white dark:bg-zinc-900 rounded-xl p-8 min-w-[340px] max-w-[90vw] shadow-strong relative w-[420px]">
            <button type="button" onClick={() => setEditUser(null)} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-bold">×</button>
            <h3 className="text-2xl font-bold mb-6 text-center tracking-wide">Edit User</h3>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <label className="flex-1 min-w-[140px]">
                Name:
                <input name="name" value={editForm.name} onChange={handleEditFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1 text-base" />
              </label>
              <label className="flex-1 min-w-[140px]">
                Email:
                <input name="email" type="email" value={editForm.email} onChange={handleEditFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1 text-base" />
              </label>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <label className="flex-1 min-w-[140px]">
                Phone:
                <input name="phone" value={editForm.phone} onChange={handleEditFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1 text-base" />
              </label>
              <label className="flex-1 min-w-[140px]">
                Role:
                <select name="role" value={editForm.role} onChange={handleEditFormChange} required className="w-full p-2 rounded border border-gray-300 mt-1 text-base">
                  <option value="admin">Admin</option>
                  <option value="store manager">Store Manager</option>
                  <option value="sales">Sales</option>
                  <option value="engineer">Engineer</option>
                </select>
              </label>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <label className="flex-1 min-w-[140px]">
                Store:
                <select name="store_id" value={editForm.store_id} onChange={handleEditFormChange} disabled={editForm.role === 'admin'} required={editForm.role !== 'admin'} className="w-full p-2 rounded border border-gray-300 mt-1 text-base">
                  <option value="">{editForm.role === 'admin' ? "(None)" : "Select Store"}</option>
                  {stores.map(store => (
                    <option key={store._id} value={store._id}>{store.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex-1 min-w-[140px] flex items-center gap-2 mt-7">
                <input type="checkbox" name="isActive" checked={editForm.isActive} onChange={handleEditFormChange} className="mr-2" /> Active
              </label>
            </div>
            {editError && <div className="text-red-600 font-medium mb-2 text-center">{editError}</div>}
            <div className="flex gap-4 mt-6 justify-center">
              <button type="button" onClick={() => setEditUser(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-md px-6 py-2 font-semibold min-w-[110px]">Cancel</button>
              <button type="submit" disabled={editLoading} className="bg-green-600 hover:bg-green-700 text-white rounded-md px-6 py-2 font-semibold min-w-[110px]">{editLoading ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 