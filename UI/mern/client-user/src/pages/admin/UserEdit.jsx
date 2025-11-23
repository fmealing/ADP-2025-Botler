// client-user/src/pages/admin/UserEdit.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL;

function UserEdit() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null
  );

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // own-account form state
  const [usernameSelf, setUsernameSelf] = useState(currentUser?.username || "");
  const [usernameSelfConfirm, setUsernameSelfConfirm] = useState("");
  const [passwordSelf, setPasswordSelf] = useState("");
  const [passwordSelfConfirm, setPasswordSelfConfirm] = useState("");
  const [savingSelf, setSavingSelf] = useState(false);
  const [selfMessage, setSelfMessage] = useState("");

  // modals and forms for admin user management
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

  // Fetch current user from backend (for lastLogin, role, etc)
  useEffect(() => {
    async function fetchMe() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_BASE}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch user");

        setCurrentUser((prev) => {
          const updated = {
            id: data._id || data.id || prev?.id,
            username: data.username,
            role: data.role,
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });

        setUsernameSelf(data.username);
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    }

    fetchMe();
  }, []);

  // Fetch all users (admin only)
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoadingUsers(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch users");

        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingUsers(false);
      }
    }

    fetchUsers();
  }, []);

  // filter + search
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((u) => u.username.toLowerCase().includes(term));
    }

    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }

    return list;
  }, [users, search, roleFilter]);

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
      if (!res.ok) throw new Error(data.message || "Failed to update username");

      setSelfMessage("Username updated successfully.");
      setUsernameSelfConfirm("");
      const updatedUser = data.user || data;
      setCurrentUser({
        id: updatedUser.id || updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role,
      });
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: updatedUser.id || updatedUser._id,
          username: updatedUser.username,
          role: updatedUser.role,
        })
      );
    } catch (err) {
      setSelfMessage(err.message);
    } finally {
      setSavingSelf(false);
    }
  }

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
      if (!res.ok) throw new Error(data.message || "Failed to update password");

      setSelfMessage("Password updated successfully.");
      setPasswordSelf("");
      setPasswordSelfConfirm("");
    } catch (err) {
      setSelfMessage(err.message);
    } finally {
      setSavingSelf(false);
    }
  }

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
      const res = await fetch(`${API_BASE}/users`, {
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
      if (!res.ok) throw new Error(data.message || "Failed to create user");

      const created = data.user || {};
      setUsers((prev) => [...prev, {
        _id: created.id || created._id,
        username: created.username,
        role: created.role,
      }]);

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
      const body = {
        username: editUsername.trim(),
        role: editRole,
      };
      if (editPassword) {
        body.password = editPassword;
      }

      const res = await fetch(`${API_BASE}/users/${editingUser._id || editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update user");

      const updated = data.user || {};
      setUsers((prev) =>
        prev.map((u) =>
          (u._id || u.id) === (editingUser._id || editingUser.id)
            ? {
              ...u,
              username: updated.username,
              role: updated.role,
            }
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
      const res = await fetch(
        `${API_BASE}/users/${deletingUser._id || deletingUser.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete user");

      setUsers((prev) =>
        prev.filter(
          (u) => (u._id || u.id) !== (deletingUser._id || deletingUser.id)
        )
      );

      setShowDeleteModal(false);
      setDeletingUser(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600 text-xl">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <button
        onClick={() => navigate("/pages/admin/control")}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-6"
      >
        ← Back to Control Centre
      </button>

      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-10">
        User Management
      </h1>

      {/* Your Account */}
      <div className="max-w-5xl mx-auto mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-md p-6 border">
          <h2 className="text-2xl font-semibold text-indigo-700 mb-4">
            Your Account
          </h2>
          <p className="text-gray-600 mb-3">
            Logged in as:{" "}
            <span className="font-semibold">{currentUser?.username}</span>{" "}
            ({currentUser?.role})
          </p>

          {selfMessage && (
            <div className="mb-3 text-sm text-center text-indigo-700 bg-indigo-50 rounded-lg py-2 px-3">
              {selfMessage}
            </div>
          )}

          <form onSubmit={handleUpdateSelfUsername} className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-800">Change username</h3>
            <input
              type="text"
              value={usernameSelf}
              onChange={(e) => setUsernameSelf(e.target.value)}
              className="w-full border p-2 rounded-lg"
              placeholder="New username"
            />
            <input
              type="text"
              value={usernameSelfConfirm}
              onChange={(e) => setUsernameSelfConfirm(e.target.value)}
              className="w-full border p-2 rounded-lg"
              placeholder="Confirm new username"
            />
            <button
              type="submit"
              disabled={savingSelf}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingSelf ? "Saving..." : "Save Username"}
            </button>
          </form>

          <form onSubmit={handleUpdateSelfPassword} className="space-y-3">
            <h3 className="font-semibold text-gray-800">Change password</h3>
            <input
              type="password"
              value={passwordSelf}
              onChange={(e) => setPasswordSelf(e.target.value)}
              className="w-full border p-2 rounded-lg"
              placeholder="New password"
            />
            <input
              type="password"
              value={passwordSelfConfirm}
              onChange={(e) => setPasswordSelfConfirm(e.target.value)}
              className="w-full border p-2 rounded-lg"
              placeholder="Confirm new password"
            />
            <button
              type="submit"
              disabled={savingSelf}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingSelf ? "Saving..." : "Save Password"}
            </button>
          </form>
        </div>

        {/* Controls + create new */}
        <div className="bg-white rounded-2xl shadow-md p-6 border flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-indigo-700 mb-4">
              Staff & Admin Accounts
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search by username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border p-2 rounded-lg"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border p-2 rounded-lg"
              >
                <option value="all">All roles</option>
                <option value="admin">Admins only</option>
                <option value="staff">Staff only</option>
                <option value="customer">Customers</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 self-start"
          >
            + Add New User
          </button>
        </div>
      </div>

      {/* Users list */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredUsers.map((u) => (
          <div
            key={u._id || u.id}
            className="bg-white rounded-2xl shadow-md p-5 border flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-semibold text-indigo-700">
                {u.username}
              </h3>
              <p className="text-gray-600 mb-2">Role: {u.role}</p>
              {u.lastLogin && (
                <p className="text-gray-500 text-sm">
                  Last login: {new Date(u.lastLogin).toLocaleString()}
                </p>
              )}
              <p className="text-gray-500 text-sm">
                Created: {new Date(u.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => openEditModal(u)}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => openDeleteModal(u)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <p className="text-center text-gray-500 col-span-full">
            No users found.
          </p>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-semibold text-indigo-700 mb-4">
              Add New User
            </h2>

            {createError && (
              <p className="text-red-600 text-sm mb-3">{createError}</p>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-semibold text-indigo-700 mb-4">
              Edit User
            </h2>

            {editError && (
              <p className="text-red-600 text-sm mb-3">{editError}</p>
            )}

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Reset Password (optional)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full border p-2 rounded-lg"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={editPasswordConfirm}
                  onChange={(e) => setEditPasswordConfirm(e.target.value)}
                  className="w-full border p-2 rounded-lg mt-2"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">
              Delete User
            </h2>
            {deleteError && (
              <p className="text-red-600 text-sm mb-3">{deleteError}</p>
            )}
            <p className="mb-4">
              Are you sure you want to delete user{" "}
              <span className="font-semibold">
                {deletingUser.username}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
