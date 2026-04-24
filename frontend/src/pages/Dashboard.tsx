import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import ToastContainer from "../components/Toast";
import type { ToastItem, ToastType } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

type Item = {
  id: number;
  name: string;
  quantity: number;
};

const STORAGE_KEY = "inventory_items";

const DUMMY_ITEMS: Item[] = [
  { id: 1, name: "Wireless Keyboard", quantity: 34 },
  { id: 2, name: "USB-C Hub", quantity: 7 },
  { id: 3, name: "Monitor Stand", quantity: 0 },
  { id: 4, name: "Mechanical Mouse", quantity: 15 },
  { id: 5, name: "Webcam HD 1080p", quantity: 3 },
  { id: 6, name: "Laptop Sleeve 15\"", quantity: 0 },
  { id: 7, name: "Ethernet Cable 5m", quantity: 22 },
  { id: 8, name: "HDMI Adapter", quantity: 9 },
];

const getStatus = (qty: number): { label: string; cls: string } => {
  if (qty === 0) return { label: "Out of Stock", cls: "badge-out" };
  if (qty <= 10) return { label: "Low Stock", cls: "badge-low" };
  return { label: "In Stock", cls: "badge-in" };
};

const saveToStorage = (items: Item[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

const loadFromStorage = (): Item[] | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const isAdmin = role === "ADMIN";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [usingDummy, setUsingDummy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = useCallback((message: string, type: ToastType = "success") => {
    setToasts((prev) => [...prev, { id: Date.now(), message, type }]);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Confirm dialog
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "default";
    onConfirm: () => void;
  } | null>(null);

  // Create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; quantity?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Stock In modal
  const [stockInItem, setStockInItem] = useState<Item | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockQtyError, setStockQtyError] = useState("");
  const [stockSubmitError, setStockSubmitError] = useState("");
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Stock Out modal
  const [stockOutItem, setStockOutItem] = useState<Item | null>(null);
  const [stockOutQty, setStockOutQty] = useState("");
  const [stockOutQtyError, setStockOutQtyError] = useState("");
  const [stockOutSubmitError, setStockOutSubmitError] = useState("");
  const [stockOutSubmitting, setStockOutSubmitting] = useState(false);

  const persistItems = (updated: Item[]) => {
    setItems(updated);
    saveToStorage(updated);
  };

  const fetchItems = async () => {
    try {
      const res = await api.get("/inventory/items");
      const fetched: Item[] = res.data;
      setItems(fetched);
      saveToStorage(fetched);
      setUsingDummy(false);
    } catch {
      const stored = loadFromStorage();
      if (stored) {
        setItems(stored);
      } else {
        persistItems(DUMMY_ITEMS);
      }
      setUsingDummy(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleLogout = () => {
    setConfirm({
      title: "Sign out",
      message: "Are you sure you want to log out?",
      confirmLabel: "Log out",
      variant: "warning",
      onConfirm: () => {
        logout();
        navigate("/login");
      },
    });
  };

  // ── Create ──
  const openModal = () => {
    setName("");
    setQuantity("");
    setFormErrors({});
    setSubmitError("");
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: { name?: string; quantity?: string } = {};
    if (!name.trim()) errors.name = "Item name is required";
    else if (name.trim().length < 2) errors.name = "Name must be at least 2 characters";
    if (quantity === "") errors.quantity = "Quantity is required";
    else if (isNaN(Number(quantity)) || Number(quantity) < 0)
      errors.quantity = "Quantity must be a non-negative number";
    else if (!Number.isInteger(Number(quantity)))
      errors.quantity = "Quantity must be a whole number";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      try {
        await api.post("/inventory/items", { name: name.trim(), quantity: Number(quantity) });
        await fetchItems();
      } catch {
        const newItem: Item = { id: Date.now(), name: name.trim(), quantity: Number(quantity) };
        persistItems([...items, newItem]);
      }
      setModalOpen(false);
      addToast(`"${name.trim()}" added to inventory`, "success");
    } catch {
      setSubmitError("Failed to create item. Please try again.");
      addToast("Failed to create item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Stock In ──
  const openStockIn = (item: Item) => {
    setStockInItem(item);
    setStockQty("");
    setStockQtyError("");
    setStockSubmitError("");
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockQtyError("");
    setStockSubmitError("");
    const qty = Number(stockQty);
    if (stockQty === "") { setStockQtyError("Quantity is required"); return; }
    if (isNaN(qty) || qty <= 0) { setStockQtyError("Enter a positive number"); return; }
    if (!Number.isInteger(qty)) { setStockQtyError("Must be a whole number"); return; }
    setStockSubmitting(true);
    try {
      try {
        await api.post(`/inventory/items/${stockInItem!.id}/stock-in`, { quantity: qty });
        await fetchItems();
      } catch {
        persistItems(items.map((i) =>
          i.id === stockInItem!.id ? { ...i, quantity: i.quantity + qty } : i
        ));
      }
      addToast(`Added ${qty} units to "${stockInItem!.name}"`, "success");
      setStockInItem(null);
    } catch {
      setStockSubmitError("Failed to add stock. Please try again.");
      addToast("Failed to add stock", "error");
    } finally {
      setStockSubmitting(false);
    }
  };

  // ── Stock Out ──
  const openStockOut = (item: Item) => {
    setStockOutItem(item);
    setStockOutQty("");
    setStockOutQtyError("");
    setStockOutSubmitError("");
  };

  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockOutQtyError("");
    setStockOutSubmitError("");
    const qty = Number(stockOutQty);
    if (stockOutQty === "") { setStockOutQtyError("Quantity is required"); return; }
    if (isNaN(qty) || qty <= 0) { setStockOutQtyError("Enter a positive number"); return; }
    if (!Number.isInteger(qty)) { setStockOutQtyError("Must be a whole number"); return; }
    if (qty > stockOutItem!.quantity) {
      setStockOutQtyError(`Insufficient stock. Available: ${stockOutItem!.quantity}`);
      return;
    }

    // Confirm before proceeding
    const item = stockOutItem!;
    const amount = qty;
    setStockOutItem(null);
    setConfirm({
      title: "Confirm Stock Out",
      message: `Use ${amount} unit${amount > 1 ? "s" : ""} of "${item.name}"? This cannot be undone.`,
      confirmLabel: "Use Stock",
      variant: "warning",
      onConfirm: async () => {
        setConfirm(null);
        setStockOutSubmitting(true);
        try {
          try {
            await api.post(`/inventory/items/${item.id}/stock-out`, { quantity: amount });
            await fetchItems();
          } catch {
            persistItems(items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity - amount } : i
            ));
          }
          addToast(`Used ${amount} unit${amount > 1 ? "s" : ""} of "${item.name}"`, "info");
        } catch {
          addToast("Failed to use stock", "error");
        } finally {
          setStockOutSubmitting(false);
        }
      },
    });
  };

  const inStock = items.filter((i) => i.quantity > 10).length;
  const lowStock = items.filter((i) => i.quantity >= 1 && i.quantity <= 10).length;
  const outOfStock = items.filter((i) => i.quantity === 0).length;

  return (
    <div className="dashboard-layout">
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
        <div className="sidebar-logo">
          <div className="auth-logo-icon">I</div>
          <span className="auth-logo-text">InvenTrack</span>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <div className="auth-logo-icon">I</div>
          <span className="auth-logo-text">InvenTrack</span>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-item nav-item-active">
            <span></span> Inventory
          </span>
        </nav>
        <div className="sidebar-role-badge">{role}</div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <FontAwesomeIcon icon={faRightFromBracket} style={{ color: "rgb(255, 255, 255)" }} />
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Inventory</h1>
            <p className="dashboard-subtitle">Manage and track your stock levels</p>
          </div>
          {isAdmin && (
            <button className="btn-create" onClick={openModal}>
              + Create Item
            </button>
          )}
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Total Items</p>
            <p className="stat-value">{items.length}</p>
          </div>
          <div className="stat-card stat-card-in">
            <p className="stat-label">In Stock</p>
            <p className="stat-value text-emerald-400">{inStock}</p>
          </div>
          <div className="stat-card stat-card-low">
            <p className="stat-label">Low Stock</p>
            <p className="stat-value text-amber-400">{lowStock}</p>
          </div>
          <div className="stat-card stat-card-out">
            <p className="stat-label">Out of Stock</p>
            <p className="stat-value text-red-400">{outOfStock}</p>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="state-center">
              <div className="spinner" />
              <p className="state-text">Loading inventory...</p>
            </div>
          ) : fetchError ? (
            <div className="state-center">
              <p className="state-icon">⚠️</p>
              <p className="state-text text-red-400">{fetchError}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="state-center">
              <p className="state-icon">📭</p>
              <p className="state-text">No inventory items found</p>
              {isAdmin && <p className="state-sub">Click "Create Item" to add your first item</p>}
            </div>
          ) : (
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const { label, cls } = getStatus(item.quantity);
                  return (
                    <tr key={item.id}>
                      <td className="row-index">{idx + 1}</td>
                      <td className="row-name">{item.name}</td>
                      <td className="row-qty">{item.quantity}</td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td>
                        <div className="action-btns">
                          {isAdmin && (
                            <button className="btn-stock-in" onClick={() => openStockIn(item)}>
                              + Stock
                            </button>
                          )}
                          <button
                            className="btn-stock-out"
                            disabled={item.quantity === 0 || stockOutSubmitting}
                            onClick={() => openStockOut(item)}
                          >
                            − Use Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Stock Out Modal */}
      {stockOutItem && (
        <div className="modal-overlay" onClick={() => setStockOutItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Use Stock</h3>
              <button className="modal-close" onClick={() => setStockOutItem(null)}>✕</button>
            </div>
            <p className="stock-in-item-name">{stockOutItem.name}</p>
            <p className="stock-in-current">Available quantity: <span>{stockOutItem.quantity}</span></p>
            {stockOutSubmitError && (
              <div className="form-error"><span>⚠</span> {stockOutSubmitError}</div>
            )}
            <form onSubmit={handleStockOut} noValidate>
              <div className="form-group">
                <label htmlFor="stock-out-qty" className="form-label">Quantity to Use</label>
                <input
                  id="stock-out-qty"
                  type="number"
                  min="1"
                  max={stockOutItem.quantity}
                  placeholder="e.g. 5"
                  className={`form-input ${stockOutQtyError ? "input-error" : ""}`}
                  value={stockOutQty}
                  onChange={(e) => setStockOutQty(e.target.value)}
                />
                {stockOutQtyError && <p className="field-error">{stockOutQtyError}</p>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setStockOutItem(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={stockOutSubmitting} className="btn-submit">
                  {stockOutSubmitting ? "Processing..." : "Use Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      {stockInItem && (
        <div className="modal-overlay" onClick={() => setStockInItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Stock</h3>
              <button className="modal-close" onClick={() => setStockInItem(null)}>✕</button>
            </div>
            <p className="stock-in-item-name">{stockInItem.name}</p>
            <p className="stock-in-current">Current quantity: <span>{stockInItem.quantity}</span></p>
            {stockSubmitError && (
              <div className="form-error"><span>⚠</span> {stockSubmitError}</div>
            )}
            <form onSubmit={handleStockIn} noValidate>
              <div className="form-group">
                <label htmlFor="stock-qty" className="form-label">Quantity to Add</label>
                <input
                  id="stock-qty"
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  className={`form-input ${stockQtyError ? "input-error" : ""}`}
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                />
                {stockQtyError && <p className="field-error">{stockQtyError}</p>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setStockInItem(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={stockSubmitting} className="btn-submit">
                  {stockSubmitting ? "Adding..." : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Item</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            {submitError && (
              <div className="form-error"><span>⚠</span> {submitError}</div>
            )}
            <form onSubmit={handleCreate} noValidate>
              <div className="form-group">
                <label htmlFor="item-name" className="form-label">Item Name</label>
                <input
                  id="item-name"
                  type="text"
                  placeholder="e.g. Wireless Mouse"
                  className={`form-input ${formErrors.name ? "input-error" : ""}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {formErrors.name && <p className="field-error">{formErrors.name}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="item-qty" className="form-label">Quantity</label>
                <input
                  id="item-qty"
                  type="number"
                  min="0"
                  placeholder="0"
                  className={`form-input ${formErrors.quantity ? "input-error" : ""}`}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {formErrors.quantity && <p className="field-error">{formErrors.quantity}</p>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-submit">
                  {submitting ? "Creating..." : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
