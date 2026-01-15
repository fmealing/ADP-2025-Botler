import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL;

function UserEdit() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null
  );

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [usernameSelf, setUsernameSelf] = useState(currentUser?.username || "");
  const [usernameSelfConfirm, setUsernameSelfConfirm] = useState("");
  const [passwordSelf, setPasswordSelf] = useState("");
  const [passwordSelfConfirm, setPasswordSelfConfirm] = useState("");
  const [savingSelf, setSavingSelf] = useState(false);
  const [selfMessage, setSelfMessage] = useState("");

  // Delete-own-account modal
  const [showDeleteSelfModal, setShowDeleteSelfModal] = useState(false);
  const [deleteSelfPassword, setDeleteSelfPassword] = useState("");
  const [deleteSelfError, setDeleteSelfError] = useState("");
  const [deletingSelf, setDeletingSelf] = useState(false);

  // Admin user management modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("staff");
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordConfirm, setEditPasswordConfirm] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ------------------ Fetch Current User ------------------ */
  useEffect(() => {
    async function fetchMe() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const updated = {
          id: data._id,
          username: data.username,
          role: data.role,
        };

        localStorage.setItem("user", JSON.stringify(updated));
        setCurrentUser(updated);
        setUsernameSelf(updated.username);
      } catch {
        // ignore
      }
    }

    fetchMe();
  }, []);

  /* ------------------ Fetch All Users ------------------ */
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoadingUsers(true);
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        // Exclude logged-in user from admin list
        const filtered = data.filter(
          (u) => u._id !== currentUser?.id && u.id !== currentUser?.id
        );

        setUsers(filtered);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingUsers(false);
      }
    }

    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  /* ------------------ Filter Users ------------------ */
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (search.trim()) {
      list = list.filter((u) =>
        u.username.toLowerCase().includes(search.trim().toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }

    return list;
  }, [users, search, roleFilter]);

  /* ------------------ Update Own Username ------------------ */
  async function handleUpdateSelfUsername(e) {
    e.preventDefault();
    setSelfMessage("");

    if (!usernameSelf.trim()) {
      setSelfMessage("Username cannot be empty.");
      return;
    }

    if (usernameSelf !== usernameSelfConfirm) {
      setSelfMessage("Usernames do not match.");
      return;
    }

    try {
      setSavingSelf(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: usernameSelf.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSelfMessage("Username updated successfully.");
      setUsernameSelfConfirm("");

      const updatedUser = {
        id: data._id,
        username: data.username,
        role: data.role,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } catch (err) {
      setSelfMessage(err.message);
    } finally {
      setSavingSelf(false);
    }
  }

  /* ------------------ Update Own Password ------------------ */
  async function handleUpdateSelfPassword(e) {
    e.preventDefault();
    setSelfMessage("");

    if (!passwordSelf) {
      setSelfMessage("Password cannot be empty.");
      return;
    }
    if (passwordSelf !== passwordSelfConfirm) {
      setSelfMessage("Passwords do not match.");
      return;
    }

    try {
      setSavingSelf(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: passwordSelf }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSelfMessage("Password updated successfully.");
      setPasswordSelf("");
      setPasswordSelfConfirm("");
    } catch (err) {
      setSelfMessage(err.message);
    } finally {
      setSavingSelf(false);
    }
  }

  /* ------------------ Delete Own Account ------------------ */
  async function handleDeleteSelf() {
    if (!deleteSelfPassword) {
      setDeleteSelfError("Password required.");
      return;
    }

    try {
      setDeletingSelf(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/users/${currentUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    } catch (err) {
      setDeleteSelfError(err.message);
    } finally {
      setDeletingSelf(false);
    }
  }

  /* ------------------ Admin: Create User ------------------ */
  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError("");

    if (!newUsername.trim()) {
      setCreateError("Username is required.");
      return;
    }
    if (!newPassword) {
      setCreateError("Password is required.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setCreateError("Passwords do not match.");
      return;
    }

    try {
      setCreatingUser(true);
      const token = localStorage.getItem("token");

      // Backend register route: POST /users/register
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Refresh users list
      const usersRes = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        const filtered = usersData.filter(
          (u) => u._id !== currentUser?.id && u.id !== currentUser?.id
        );
        setUsers(filtered);
      }

      setShowCreateModal(false);
      setNewUsername("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setNewRole("staff");
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreatingUser(false);
    }
  }

  /* ------------------ Admin: Edit User ------------------ */
  function openEditModal(user) {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditPassword("");
    setEditPasswordConfirm("");
    setEditError("");
    setShowEditModal(true);
  }

  async function handleEditUser(e) {
    e.preventDefault();
    if (!editingUser) return;

    setEditError("");

    if (!editUsername.trim()) {
      setEditError("Username cannot be empty.");
      return;
    }

    if (editPassword && editPassword !== editPasswordConfirm) {
      setEditError("Passwords do not match.");
      return;
    }

    try {
      setEditing(true);
      const token = localStorage.getItem("token");

      // Update username/role
      const res = await fetch(`${API_BASE}/users/${editingUser._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editUsername.trim(),
          role: editRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // If password provided, call reset-password endpoint
      if (editPassword) {
        const passRes = await fetch(
          `${API_BASE}/users/${editingUser._id}/reset-password`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ newPassword: editPassword }),
          }
        );

        const passData = await passRes.json();
        if (!passRes.ok) throw new Error(passData.message);
      }

      setUsers((prev) =>
        prev.map((u) =>
          u._id === editingUser._id
            ? { ...u, username: data.username, role: data.role }
            : u
        )
      );

      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditing(false);
    }
  }

  /* ------------------ Admin: Delete User ------------------ */
  function openDeleteModal(user) {
    setDeletingUser(user);
    setDeleteError("");
    setShowDeleteModal(true);
  }

  async function handleDeleteUser() {
    if (!deletingUser) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/users/${deletingUser._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUsers((prev) => prev.filter((u) => u._id !== deletingUser._id));

      setShowDeleteModal(false);
      setDeletingUser(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  /* ------------------ LOADING & ERROR UI ------------------ */
  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center h-screen text-xl font-inter text-center">
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600 text-xl font-inter text-center">
        Error: {error}
      </div>
    );
  }

  /* ------------------ RENDER ------------------ */
  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6 font-inter text-gray-900 text-center">
      <button
        onClick={() => navigate("/pages/admin/control")}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 mb-6 text-lg self-start text-left block"
      >
        ← Back to Control Centre
      </button>

      <h1 className="text-4xl md:text-5xl font-bold text-center text-blue-700 mb-10">
        User Management
      </h1>

      {/* STAFF & ADMIN CONTROLS + USER LIST (one big box, full width) */}
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-blue-100 p-8 mb-10 text-left">
        <h2 className="text-2xl font-semibold text-blue-700 mb-6">
          Staff & Admin Controls
        </h2>

        {/* Search + Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg bg-white"
          >
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="staff">Staff</option>
            <option value="customer">Customers</option>
          </select>
        </div>

        {/* Create User Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="mb-8 bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 text-lg font-semibold transition"
        >
          + Add New User
        </button>

        <h3 className="text-xl font-semibold text-blue-700 mb-6">
          User Accounts
        </h3>

        {/* User List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className="bg-white rounded-2xl p-8 border border-blue-100 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-blue-700">
                {u.username}
              </h3>
              <p className="text-gray-600 mb-3 text-lg">Role: {u.role}</p>

              {u.lastLogin && (
                <p className="text-gray-500 text-base">
                  Last login: {new Date(u.lastLogin).toLocaleString()}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => openEditModal(u)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-lg font-semibold transition"
                >
                  Edit
                </button>

                <button
                  onClick={() => openDeleteModal(u)}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 text-lg font-semibold transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <p className="text-center text-gray-500 col-span-full text-lg">
              No users found.
            </p>
          )}
        </div>
      </div>

      {/* YOUR ACCOUNT (separate full-width box) */}
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-blue-100 p-8 text-left">
        <h2 className="text-2xl font-semibold text-blue-700 mb-6">
          Your Account
        </h2>

        <p className="text-gray-600 mb-6 text-lg">
          Logged in as{" "}
          <span className="font-semibold">{currentUser?.username}</span>{" "}
          ({currentUser?.role})
        </p>

        {selfMessage && (
          <div className="mb-6 text-lg text-center text-blue-700 bg-blue-50 border border-blue-100 rounded-xl py-3 px-4">
            {selfMessage}
          </div>
        )}

        {/* Username change */}
        <form onSubmit={handleUpdateSelfUsername} className="space-y-4 mb-10">
          <h3 className="font-semibold text-gray-800 text-xl">Change username</h3>
          <input
            type="text"
            value={usernameSelf}
            onChange={(e) => setUsernameSelf(e.target.value)}
            className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
          />
          <input
            type="text"
            value={usernameSelfConfirm}
            onChange={(e) => setUsernameSelfConfirm(e.target.value)}
            className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
            placeholder="Confirm username"
          />

          <button
            type="submit"
            disabled={savingSelf}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-lg font-semibold transition"
          >
            Save Username
          </button>
        </form>

        {/* Password change */}
        <form onSubmit={handleUpdateSelfPassword} className="space-y-4">
          <h3 className="font-semibold text-gray-800 text-xl">Change password</h3>
          <input
            type="password"
            value={passwordSelf}
            onChange={(e) => setPasswordSelf(e.target.value)}
            className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
            placeholder="New password"
          />
          <input
            type="password"
            value={passwordSelfConfirm}
            onChange={(e) => setPasswordSelfConfirm(e.target.value)}
            className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
            placeholder="Confirm password"
          />

          <button
            type="submit"
            disabled={savingSelf}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-lg font-semibold transition"
          >
            Save Password
          </button>
        </form>

        {/* Delete own account */}
        <button
          onClick={() => setShowDeleteSelfModal(true)}
          className="mt-10 bg-red-600 text-white px-8 py-4 rounded-xl hover:bg-red-700 text-lg font-semibold transition"
        >
          Delete My Account
        </button>
      </div>

      {/* DELETE SELF MODAL */}
      {showDeleteSelfModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-sm border border-blue-100 text-left">
            <h2 className="text-2xl font-semibold text-red-600 mb-6">
              Delete Your Account
            </h2>

            {deleteSelfError && (
              <p className="text-red-600 text-lg mb-4">{deleteSelfError}</p>
            )}

            <p className="mb-4 text-lg">
              Confirm deletion by entering your password:
            </p>

            <input
              type="password"
              value={deleteSelfPassword}
              onChange={(e) => setDeleteSelfPassword(e.target.value)}
              className="w-full border border-blue-100 p-4 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
              placeholder="Password"
            />

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteSelfModal(false)}
                className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 text-lg font-semibold transition"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteSelf}
                disabled={deletingSelf}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-lg font-semibold transition"
              >
                {deletingSelf ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-sm border border-blue-100 text-left">
            <h2 className="text-2xl font-semibold text-blue-700 mb-6">
              Add New User
            </h2>

            {createError && (
              <p className="text-red-600 text-lg mb-4">{createError}</p>
            )}

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="block font-semibold mb-2 text-lg">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-2 text-lg">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-2 text-lg">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-2 text-lg">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg bg-white"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 text-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-lg font-semibold transition"
                >
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-sm border border-blue-100 text-left">
            <h2 className="text-2xl font-semibold text-blue-700 mb-6">
              Edit User
            </h2>

            {editError && (
              <p className="text-red-600 text-lg mb-4">{editError}</p>
            )}

            <form onSubmit={handleEditUser} className="space-y-5">
              <div>
                <label className="block font-semibold mb-2 text-lg">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-2 text-lg">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg bg-white"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2 text-lg">
                  Reset Password (optional)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={editPasswordConfirm}
                  onChange={(e) => setEditPasswordConfirm(e.target.value)}
                  className="w-full border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg mt-3"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 text-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-lg font-semibold transition"
                >
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER MODAL */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-sm border border-blue-100 text-left">
            <h2 className="text-2xl font-semibold text-red-600 mb-6">
              Delete User
            </h2>

            {deleteError && (
              <p className="text-red-600 text-lg mb-4">{deleteError}</p>
            )}

            <p className="mb-6 text-lg">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingUser.username}</span>?
            </p>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 text-lg font-semibold transition"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-lg font-semibold transition"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserEdit;
