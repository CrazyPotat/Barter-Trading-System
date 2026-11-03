
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  CircleUserRound,
  Home,
  ImagePlus,
  LogOut,
  MapPin,
  Menu,
  Package,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Users,
  X,
} from "lucide-react";
import "./App.css";

const API_URL = "https://barter-trading-system.onrender.com/api/auth";
const ITEM_API_URL = "https://barter-trading-system.onrender.com/api/items";
const SERVER_URL = "https://barter-trading-system.onrender.com";

function App() {
  const [page, setPage] = useState("login");
  const [view, setView] = useState("dashboard");

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("barterUser")) || null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState({
  full_name: "",
  email: "",
  profile_image: "",
  location: "",
  bio: "",
});

const [profileImage, setProfileImage] = useState(null);
const [profilePreview, setProfilePreview] = useState("");
const [profileLoading, setProfileLoading] = useState(false);
const [profileSaving, setProfileSaving] = useState(false);
const [profileError, setProfileError] = useState("");
const [profileSuccess, setProfileSuccess] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const [itemForm, setItemForm] = useState({
    title: "",
    description: "",
    category_id: "",
    condition_status: "Good",
    location: "",
    desired_exchange: "",
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [proposals, setProposals] = useState([]);
const [proposalsLoading, setProposalsLoading] = useState(false);
const [proposalError, setProposalError] = useState("");
const [selectedTradeItem, setSelectedTradeItem] = useState(null);
const [selectedOfferedItem, setSelectedOfferedItem] = useState("");
const [proposalMessage, setProposalMessage] = useState("");
const [proposalSubmitting, setProposalSubmitting] = useState(false);
const [tradeHistory, setTradeHistory] = useState([]);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [itemError, setItemError] = useState("");
  const [itemSuccess, setItemSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [passwordData, setPasswordData] = useState({
  current_password: "",
  new_password: "",
  confirm_password: "",
});

const [passwordLoading, setPasswordLoading] = useState(false);
const [passwordError, setPasswordError] = useState("");
const [passwordSuccess, setPasswordSuccess] = useState("");
const [showPasswords, setShowPasswords] = useState(false);

  const isRegister = page === "register";

  // CHANGE PASSWORD
const handleChangePassword = async (e) => {
  e.preventDefault();

  setPasswordError("");
  setPasswordSuccess("");

  const token = localStorage.getItem("barterToken");

  if (!token) {
    setPasswordError("Please log in again.");
    return;
  }

  setPasswordLoading(true);

  try {
    const response = await fetch(`${API_URL}/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to change password.");
    }

    setPasswordSuccess(data.message);

    setPasswordData({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });

    setShowPasswords(false);

  } catch (error) {
    setPasswordError(error.message);
  } finally {
    setPasswordLoading(false);
  }
};
  // Load categories and available items
  const loadData = async () => {
    setItemsLoading(true);

    try {
      const [itemsResponse, categoriesResponse] = await Promise.all([
        fetch(ITEM_API_URL),
        fetch(`${ITEM_API_URL}/categories`),
      ]);

      const itemsData = await itemsResponse.json();
      const categoriesData = await categoriesResponse.json();

      if (!itemsResponse.ok) {
        throw new Error(itemsData.message || "Failed to load items.");
      }

      if (!categoriesResponse.ok) {
        throw new Error(
          categoriesData.message || "Failed to load categories."
        );
      }

      setItems(Array.isArray(itemsData) ? itemsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      console.error("Loading error:", err);
      setItemError(err.message || "Unable to load items.");
    } finally {
      setItemsLoading(false);
    }
  };
 
const loadProposals = async () => {
  const token = localStorage.getItem("barterToken");

  if (!token) return;

  setProposalsLoading(true);
  setProposalError("");

  try {
    const response = await fetch(
      "https://barter-trading-system.onrender.com/api/trades/proposals",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load proposals.");
    }

    setProposals(Array.isArray(data) ? data : []);
  } catch (err) {
    setProposalError(err.message);
  } finally {
    setProposalsLoading(false);
  }
};

// LOAD TRADE HISTORY
const loadTradeHistory = async () => {
  const token = localStorage.getItem("barterToken");

  if (!token) return;

  setHistoryLoading(true);
  setHistoryError("");

  try {
    const response = await fetch(
      "https://barter-trading-system.onrender.com/api/trades/history",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load trade history.");
    }

    setTradeHistory(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("TRADE HISTORY ERROR:", err);
    setHistoryError(err.message || "Unable to load trade history.");
  } finally {
    setHistoryLoading(false);
  }
};

// LOAD USER PROFILE
const loadProfile = async () => {
  const token = localStorage.getItem("barterToken");

  if (!token) return;

  setProfileLoading(true);
  setProfileError("");

  try {
    const response = await fetch(`${API_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load profile.");
    }

    setProfile(data.user);
    setProfilePreview(
      data.user.profile_image
        ? `${SERVER_URL}${data.user.profile_image}`
        : ""
    );
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    setProfileError(err.message || "Unable to load profile.");
  } finally {
    setProfileLoading(false);
  }
};

// HANDLE PROFILE IMAGE
const handleProfileImageChange = (e) => {
  const selectedFile = e.target.files?.[0];

  if (!selectedFile) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(selectedFile.type)) {
    setProfileError("Only JPG, PNG, and WEBP images are allowed.");
    return;
  }

  if (selectedFile.size > 5 * 1024 * 1024) {
    setProfileError("Image must not exceed 5MB.");
    return;
  }

  setProfileImage(selectedFile);
  setProfilePreview(URL.createObjectURL(selectedFile));
  setProfileError("");
  setProfileSuccess("");
};

// SAVE PROFILE
const handleSaveProfile = async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("barterToken");

  if (!token) {
    setProfileError("Please log in again.");
    return;
  }

  setProfileSaving(true);
  setProfileError("");
  setProfileSuccess("");

  try {
    const formData = new FormData();

    formData.append("full_name", profile.full_name);
    formData.append("location", profile.location || "");
    formData.append("bio", profile.bio || "");

    if (profileImage) {
      formData.append("profile_image", profileImage);
    }

    const response = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update profile.");
    }

    setProfile(data.user);
    setProfileImage(null);
    setProfilePreview(
      data.user.profile_image
        ? `${SERVER_URL}${data.user.profile_image}`
        : ""
    );

    const updatedUser = {
      ...user,
      full_name: data.user.full_name,
      email: data.user.email,
      profile_image: data.user.profile_image,
      location: data.user.location,
      bio: data.user.bio,
    };

    setUser(updatedUser);
    localStorage.setItem("barterUser", JSON.stringify(updatedUser));

    setProfileSuccess("Profile updated successfully!");
  } catch (err) {
    console.error("SAVE PROFILE ERROR:", err);
    setProfileError(err.message || "Unable to save profile.");
  } finally {
    setProfileSaving(false);
  }
};

const handleProposalAction = async (proposalId, action) => {
  const token = localStorage.getItem("barterToken");

  setProposalError("");

  try {
    const response = await fetch(
      `https://barter-trading-system.onrender.com/api/trades/proposals/${proposalId}/${action}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Failed to ${action} proposal.`);
    }

    await loadProposals();
  } catch (err) {
    setProposalError(err.message);
  }
};

const handleSendProposal = async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("barterToken");

  if (!selectedTradeItem || !selectedOfferedItem) {
    setProposalError("Please select one of your items to offer.");
    return;
  }

  setProposalSubmitting(true);
  setProposalError("");

  try {
    const response = await fetch(
      "https://barter-trading-system.onrender.com/api/trades/proposals",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offered_item_id: Number(selectedOfferedItem),
          requested_item_id: Number(selectedTradeItem.id),
          message: proposalMessage,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send proposal.");
    }

    setSelectedTradeItem(null);
    setSelectedOfferedItem("");
    setProposalMessage("");
    setProposalError("");

    alert("Trade proposal sent successfully!");

    await loadData();
  } catch (err) {
    setProposalError(err.message);
  } finally {
    setProposalSubmitting(false);
  }
};

  useEffect(() => {
  if (user) {
    loadData();
  }
}, [user]);

useEffect(() => {
  if (user && view === "trades") {
    loadProposals();
  }
}, [user, view]);

useEffect(() => {
  if (user && view === "history") {
    loadTradeHistory();
  }
}, [user, view]);
// LOAD PROFILE WHEN PROFILE PAGE OPENS
useEffect(() => {
  if (user && view === "profile") {
    loadProfile();
  }
}, [user, view]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? "/register" : "/login";

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isRegister
            ? form
            : {
                email: form.email,
                password: form.password,
              }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      if (isRegister) {
        setSuccess("Account created! You can now log in.");
        setPage("login");
        setForm({
          full_name: "",
          email: form.email,
          password: "",
        });
      } else {
        localStorage.setItem("barterToken", data.token);
        localStorage.setItem("barterUser", JSON.stringify(data.user));
        setUser(data.user);
        setView("dashboard");
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Make sure the backend is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("barterToken");
    localStorage.removeItem("barterUser");
    setUser(null);
    setPage("login");
    setView("dashboard");
    setForm({ full_name: "", email: "", password: "" });
  };

  const openView = (newView) => {
    setView(newView);
    setSidebarOpen(false);
    setItemError("");
    setItemSuccess("");
  };

  const handleItemChange = (e) => {
    setItemForm({
      ...itemForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setItemError("Please select a valid image file.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setItemError("Image must not exceed 5MB.");
      return;
    }

    setItemError("");
    setImage(selectedFile);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(URL.createObjectURL(selectedFile));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();

    setItemError("");
    setItemSuccess("");

    const token = localStorage.getItem("barterToken");

    if (!token) {
      setItemError("Please log in again before posting an item.");
      return;
    }

    setItemSubmitting(true);

    try {
      const formData = new FormData();

      Object.entries(itemForm).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (image) {
        formData.append("image", image);
      }

      const response = await fetch(ITEM_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to post item.");
      }

      setItemSuccess("Your item has been posted successfully!");

      setItemForm({
        title: "",
        description: "",
        category_id: "",
        condition_status: "Good",
        location: "",
        desired_exchange: "",
      });

      setImage(null);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview("");
      }

      await loadData();

      setTimeout(() => {
        setItemSuccess("");
        setView("my-items");
      }, 1200);
    } catch (err) {
      console.error("Add item error:", err);
      setItemError(err.message || "Unable to post item.");
    } finally {
      setItemSubmitting(false);
    }
  };

  const myItems = items.filter(
    (item) => Number(item.user_id) === Number(user?.id)
  );

  const filteredItems = (view === "my-items" ? myItems : items).filter(
    (item) => {
      const keyword = searchTerm.toLowerCase();

      return (
        item.title?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword) ||
        item.category_name?.toLowerCase().includes(keyword) ||
        item.location?.toLowerCase().includes(keyword)
      );
    }
  );

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `${SERVER_URL}${imagePath}`;
  };

  const getViewTitle = () => {
    const titles = {
      dashboard: "Dashboard",
      browse: "Browse Items",
      "my-items": "My Items",
      "add-item": "Add New Item",
      trades: "Trade Proposals",
      history: "Trade History",
      profile: "My Profile",
      settings: "Settings",
    };

    return titles[view] || "Dashboard";
  };

  if (user) {
    return (
      <div className="dashboard-layout">
        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
          <div className="brand">
            <div className="brand-icon">
              <ArrowRightLeft size={23} />
            </div>
            <span>
              Barter<span className="brand-light">Hub</span>
            </span>
          </div>

          <p className="sidebar-label">MENU</p>

          <nav className="sidebar-nav">
            <button
              className={`nav-link ${view === "dashboard" ? "active" : ""}`}
              onClick={() => openView("dashboard")}
            >
              <Home size={19} /> Dashboard
            </button>

            <button
              className={`nav-link ${view === "browse" ? "active" : ""}`}
              onClick={() => openView("browse")}
            >
              <Search size={19} /> Browse Items
            </button>

            <button
              className={`nav-link ${view === "my-items" ? "active" : ""}`}
              onClick={() => openView("my-items")}
            >
              <Package size={19} /> My Items
            </button>

            <button
              className={`nav-link ${view === "trades" ? "active" : ""}`}
              onClick={() => openView("trades")}
            >
              <ArrowRightLeft size={19} /> Trade Proposals
            </button>

            <button
              className={`nav-link ${view === "history" ? "active" : ""}`}
              onClick={() => openView("history")}
            >
              <BookOpen size={19} /> Trade History
            </button>
          </nav>

          <p className="sidebar-label account-label">ACCOUNT</p>

          <nav className="sidebar-nav">
            <button
              className={`nav-link ${view === "profile" ? "active" : ""}`}
              onClick={() => openView("profile")}
            >
              <CircleUserRound size={19} /> My Profile
            </button>

            <button
              className={`nav-link ${view === "settings" ? "active" : ""}`}
              onClick={() => openView("settings")}
            >
              <Settings size={19} /> Settings
            </button>
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <div className="avatar">
                {user.full_name?.charAt(0).toUpperCase()}
              </div>

              <div className="sidebar-user-info">
                <strong>{user.full_name}</strong>
                <span>Member</span>
              </div>
            </div>

            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={18} /> Log out
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="topbar">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={22} />
            </button>

            <div className="breadcrumb">
              <span>Pages</span>
              <span>/</span>
              <strong>{getViewTitle()}</strong>
            </div>

            <div className="topbar-actions">
              <button
                className="icon-button"
                aria-label="Refresh items"
                onClick={loadData}
              >
                <RefreshCw size={19} />
              </button>

              <button className="icon-button" aria-label="Notifications">
                <Bell size={20} />
                <span className="notification-dot"></span>
              </button>

              <div className="topbar-avatar">
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="dashboard-content">
            {view === "dashboard" && (
              <>
                <section className="welcome-section">
                  <div>
                    <p className="eyebrow">YOUR TRADING SPACE</p>
                    <h1>Welcome back, {user.full_name?.split(" ")[0]}!</h1>
                    <p className="welcome-description">
                      Discover items, connect with people, and trade what you
                      have for what you need.
                    </p>

                    <button
                      className="primary-button dashboard-add-button"
                      onClick={() => openView("add-item")}
                    >
                      <Plus size={18} /> List an Item
                    </button>
                  </div>

                  <div className="welcome-illustration">
                    <ShoppingBag size={54} strokeWidth={1.3} />
                    <ArrowRightLeft size={25} />
                    <Package size={43} strokeWidth={1.3} />
                  </div>
                </section>

                <section className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon mint">
                      <Package size={22} />
                    </div>
                    <p>My Listed Items</p>
                    <h2>{myItems.length}</h2>
                    <span>Items you have listed</span>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon blue">
                      <ArrowRightLeft size={22} />
                    </div>
                    <p>Active Trades</p>
                    <h2>0</h2>
                    <span>Ongoing exchanges</span>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon yellow">
                      <Bell size={22} />
                    </div>
                    <p>Pending Proposals</p>
                    <h2>0</h2>
                    <span>Waiting for your response</span>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon purple">
                      <CheckCircle2 size={22} />
                    </div>
                    <p>Completed Trades</p>
                    <h2>0</h2>
                    <span>Successfully exchanged</span>
                  </div>
                </section>

                <section className="dashboard-grid">
                  <div className="content-card browse-card">
                    <div className="section-heading">
                      <div>
                        <h2>Explore Items</h2>
                        <p>Find something you would love to trade for.</p>
                      </div>
                      <span className="heading-icon">
                        <Search size={20} />
                      </span>
                    </div>

                    {items.length > 0 ? (
                      <div className="dashboard-item-preview">
                        {items.slice(0, 2).map((item) => (
                          <div className="mini-item" key={item.id}>
                            {item.image ? (
                              <img
                                src={getImageUrl(item.image)}
                                alt={item.title}
                              />
                            ) : (
                              <div className="mini-item-placeholder">
                                <Package size={25} />
                              </div>
                            )}

                            <div>
                              <strong>{item.title}</strong>
                              <span>{item.category_name}</span>
                            </div>
                          </div>
                        ))}

                        <button
                          className="text-button"
                          onClick={() => openView("browse")}
                        >
                          View all items <ArrowLeft size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <ShoppingBag size={34} />
                        </div>
                        <h3>Ready to discover?</h3>
                        <p>
                          Browse available items from other members and find
                          your next great exchange.
                        </p>
                        <button
                          className="primary-button"
                          onClick={() => openView("browse")}
                        >
                          Browse Items <ArrowRightLeft size={17} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="content-card activity-card">
                    <div className="section-heading">
                      <div>
                        <h2>Quick Overview</h2>
                        <p>Your barter community at a glance.</p>
                      </div>
                      <span className="heading-icon">
                        <Users size={20} />
                      </span>
                    </div>

                    <div className="overview-item">
                      <div className="overview-icon">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <strong>Trade fairly</strong>
                        <p>Communicate clearly with other members.</p>
                      </div>
                    </div>

                    <div className="overview-item">
                      <div className="overview-icon">
                        <Package size={20} />
                      </div>
                      <div>
                        <strong>List your items</strong>
                        <p>Share items you are willing to exchange.</p>
                      </div>
                    </div>

                    <div className="overview-item">
                      <div className="overview-icon">
                        <ArrowRightLeft size={20} />
                      </div>
                      <div>
                        <strong>Make an exchange</strong>
                        <p>Find items that match what you need.</p>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {view === "add-item" && (
              <section className="page-section">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">SHARE SOMETHING USEFUL</p>
                    <h1>List a New Item</h1>
                    <p>
                      Add an item you are willing to exchange with the
                      community.
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => openView("my-items")}
                  >
                    <ArrowLeft size={17} /> My Items
                  </button>
                </div>

                {itemError && (
                  <div className="form-message error-message">
                    {itemError}
                  </div>
                )}

                {itemSuccess && (
                  <div className="form-message success-message">
                    {itemSuccess}
                  </div>
                )}

                <form className="item-form" onSubmit={handleAddItem}>
                  <div className="item-form-main">
                    <div className="content-card">
                      <h2>Item Information</h2>
                      <p className="form-subtitle">
                        Provide accurate details about your item.
                      </p>

                      <div className="form-group">
                        <label htmlFor="title">Item Name *</label>
                        <input
                          id="title"
                          name="title"
                          value={itemForm.title}
                          onChange={handleItemChange}
                          placeholder="e.g. Wireless Headphones"
                          maxLength={150}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="description">Description *</label>
                        <textarea
                          id="description"
                          name="description"
                          value={itemForm.description}
                          onChange={handleItemChange}
                          placeholder="Describe your item, its features, and any important details..."
                          rows={5}
                          required
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="category_id">Category *</label>
                          <select
                            id="category_id"
                            name="category_id"
                            value={itemForm.category_id}
                            onChange={handleItemChange}
                            required
                          >
                            <option value="">Select a category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="condition_status">Condition *</label>
                          <select
                            id="condition_status"
                            name="condition_status"
                            value={itemForm.condition_status}
                            onChange={handleItemChange}
                            required
                          >
                            <option value="New">New</option>
                            <option value="Like New">Like New</option>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Poor">Poor</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="location">Location *</label>
                        <input
                          id="location"
                          name="location"
                          value={itemForm.location}
                          onChange={handleItemChange}
                          placeholder="e.g. Antipolo City"
                          maxLength={150}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="desired_exchange">
                          What do you want in exchange? *
                        </label>
                        <textarea
                          id="desired_exchange"
                          name="desired_exchange"
                          value={itemForm.desired_exchange}
                          onChange={handleItemChange}
                          placeholder="Describe what you would like to receive..."
                          rows={3}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="item-form-side">
                    <div className="content-card">
                      <h2>Item Photo</h2>
                      <p className="form-subtitle">
                        Upload a clear photo of your item.
                      </p>

                      <label className="image-upload-area">
                        {imagePreview ? (
                          <img
                            className="image-preview"
                            src={imagePreview}
                            alt="Item preview"
                          />
                        ) : (
                          <>
                            <ImagePlus size={38} />
                            <strong>Click to upload an image</strong>
                            <span>PNG, JPG or WEBP (maximum 5MB)</span>
                          </>
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          hidden
                        />
                      </label>

                      {image && (
                        <div className="selected-image">
                          <span>{image.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setImage(null);
                              URL.revokeObjectURL(imagePreview);
                              setImagePreview("");
                            }}
                            aria-label="Remove image"
                          >
                            <X size={17} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="content-card listing-tip">
                      <ShieldCheck size={24} />
                      <h3>Listing Tips</h3>
                      <ul>
                        <li>Use a clear and accurate item name.</li>
                        <li>Describe any defects or damage honestly.</li>
                        <li>Choose the correct item condition.</li>
                        <li>Be specific about your desired exchange.</li>
                      </ul>
                    </div>

                    <button
                      className="submit-button post-item-button"
                      type="submit"
                      disabled={itemSubmitting}
                    >
                      {itemSubmitting ? "Posting Item..." : "Post Item"}
                      {!itemSubmitting && <Plus size={18} />}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {(view === "browse" || view === "my-items") && (
              <section className="page-section">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">
                      {view === "browse" ? "DISCOVER AND EXCHANGE" : "YOUR LISTINGS"}
                    </p>
                    <h1>
                      {view === "browse" ? "Browse Items" : "My Items"}
                    </h1>
                    <p>
                      {view === "browse"
                        ? "Explore items posted by members of the community."
                        : "Manage the items you have shared with the community."}
                    </p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => openView("add-item")}
                  >
                    <Plus size={18} /> Add Item
                  </button>
                </div>

                {itemError && (
                  <div className="form-message error-message">
                    {itemError}
                  </div>
                )}

                <div className="item-search-bar">
                  <Search size={19} />
                  <input
                    type="search"
                    placeholder="Search items, categories, or locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button type="button" onClick={loadData}>
                    <RefreshCw size={18} />
                  </button>
                </div>

                {itemsLoading ? (
                  <div className="items-empty">
                    <RefreshCw className="loading-icon" size={30} />
                    <h3>Loading items...</h3>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="items-empty content-card">
                    <div className="empty-icon">
                      <PackageOpen size={35} />
                    </div>
                    <h3>
                      {searchTerm
                        ? "No matching items found"
                        : view === "my-items"
                          ? "You haven't listed any items yet"
                          : "No items available yet"}
                    </h3>
                    <p>
                      {view === "my-items"
                        ? "Share something you no longer need and find something useful in return."
                        : "Check back later or be the first to post an item."}
                    </p>

                    {view === "my-items" && (
                      <button
                        className="primary-button"
                        onClick={() => openView("add-item")}
                      >
                        <Plus size={18} /> List Your First Item
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="items-grid">
  {filteredItems.map((item) => {
    const isOwnItem =
      Number(item.user_id) === Number(user?.id);

    return (
      <article className="item-card" key={item.id}>
        <div className="item-card-image">
          {item.image ? (
            <img
              src={getImageUrl(item.image)}
              alt={item.title}
            />
          ) : (
            <div className="item-placeholder">
              <Package size={43} />
              <span>No image available</span>
            </div>
          )}

          <span className="condition-badge">
            {item.condition_status}
          </span>
        </div>

        <div className="item-card-content">
          <span className="item-category">
            <Tag size={14} /> {item.category_name || "Other"}
          </span>

          <h3>{item.title}</h3>

          <p className="item-description">
            {item.description}
          </p>

          <div className="item-detail">
            <MapPin size={15} />
            {item.location || "Location not specified"}
          </div>

          <div className="exchange-info">
            <span>Wants in exchange</span>
            <strong>{item.desired_exchange}</strong>
          </div>

          <div className="item-owner">
            <div className="small-avatar">
              {item.owner_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span>{item.owner_name || "Member"}</span>
          </div>

          {view === "browse" && !isOwnItem && (
            <button
              className="primary-button propose-button"
              onClick={() => {
                setSelectedTradeItem(item);
                setSelectedOfferedItem("");
                setProposalMessage("");
                setProposalError("");
              }}
            >
              <ArrowRightLeft size={17} />
              Propose Trade
            </button>
          )}
        </div>
      </article>
    );
  })}
</div>
                )}
              </section>
            )}

            

{view === "trades" && (
  <section className="page-section trades-page">
    <div className="page-heading trades-page-heading">
      <div>
        <p className="eyebrow">YOUR TRADING ACTIVITY</p>
        <h1>Trade Proposals</h1>
        <p>Keep track of your incoming and outgoing exchange offers.</p>
      </div>

      <button
        className="secondary-button refresh-proposals"
        onClick={loadProposals}
        disabled={proposalsLoading}
      >
        <RefreshCw
          size={17}
          className={proposalsLoading ? "loading-icon" : ""}
        />
        {proposalsLoading ? "Refreshing..." : "Refresh"}
      </button>
    </div>

    {proposalError && (
      <div className="form-message error-message">
        {proposalError}
      </div>
    )}

    {!proposalsLoading && (
      <div className="trade-overview">
        <div className="trade-overview-card">
          <div className="trade-overview-icon">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <span>Total Proposals</span>
            <h3>{proposals.length}</h3>
          </div>
        </div>

        <div className="trade-overview-card">
          <div className="trade-overview-icon">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span>Accepted Offers</span>
            <h3>
              {proposals.filter(p => p.status === "Accepted").length}
            </h3>
          </div>
        </div>

        <div className="trade-overview-card">
          <div className="trade-overview-icon">
            <RefreshCw size={22} />
          </div>
          <div>
            <span>Pending Offers</span>
            <h3>
              {proposals.filter(p => p.status === "Pending").length}
            </h3>
          </div>
        </div>
      </div>
    )}

    {proposalsLoading ? (
      <div className="items-empty content-card">
        <RefreshCw className="loading-icon" size={30} />
        <h3>Loading proposals...</h3>
        <p>Please wait while we retrieve your exchanges.</p>
      </div>
    ) : proposals.length === 0 ? (
      <div className="items-empty content-card">
        <div className="empty-icon">
          <ArrowRightLeft size={35} />
        </div>
        <h3>No trade proposals yet</h3>
        <p>
          Your incoming and outgoing exchange offers will appear here.
        </p>
        <button
          className="primary-button"
          onClick={() => openView("browse")}
        >
          Browse Items
        </button>
      </div>
    ) : (
      <>
        <div className="trade-section-heading">
          <div>
            <span className="eyebrow">INCOMING EXCHANGES</span>
            <h2>Received Offers</h2>
            <p>Offers from other BarterHub members.</p>
          </div>
          <span className="trade-count">
            {proposals.filter(p =>
              Number(p.receiver_id) === Number(user.id)
            ).length} Offers
          </span>
        </div>

        <div className="proposal-list redesigned-proposal-list">
          {proposals
            .filter(p => Number(p.receiver_id) === Number(user.id))
            .map(proposal => (
              <article className="content-card proposal-card redesigned-proposal-card" key={proposal.id}>
                <div className="proposal-heading">
                  <div className="trader-info">
                    <div className="trader-avatar">
                      {(proposal.proposer_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="proposal-type-label">RECEIVED FROM</span>
                      <h3>{proposal.proposer_name}</h3>
                    </div>
                  </div>

                  <span className={`proposal-status ${proposal.status?.toLowerCase()}`}>
                    {proposal.status}
                  </span>
                </div>

                <div className="exchange-panel">
                  <div className="exchange-item">
                    <span>THEY OFFER</span>
                    <h4>{proposal.offered_item_title}</h4>
                  </div>

                  <div className="exchange-arrow">
                    <ArrowRightLeft size={21} />
                  </div>

                  <div className="exchange-item">
                    <span>THEY WANT</span>
                    <h4>{proposal.requested_item_title}</h4>
                  </div>
                </div>

                {proposal.message && (
                  <div className="proposal-message redesigned-message">
                    <span>MESSAGE</span>
                    <p>"{proposal.message}"</p>
                  </div>
                )}

                <div className="proposal-footer">
                  <span className="proposal-date">
                    <Clock size={14} />
                    {new Date(proposal.created_at).toLocaleString()}
                  </span>

                  {proposal.status === "Pending" && (
                    <div className="proposal-actions">
                      <button
                        className="primary-button"
                        onClick={() => handleProposalAction(proposal.id, "accept")}
                      >
                        <CheckCircle2 size={16} /> Accept
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() => handleProposalAction(proposal.id, "decline")}
                      >
                        <X size={16} /> Decline
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
        </div>

        <div className="trade-section-heading sent-section-heading">
          <div>
            <span className="eyebrow">OUTGOING EXCHANGES</span>
            <h2>Sent Offers</h2>
            <p>Offers you have sent to other members.</p>
          </div>
          <span className="trade-count">
            {proposals.filter(p =>
              Number(p.proposer_id) === Number(user.id)
            ).length} Offers
          </span>
        </div>

        <div className="proposal-list redesigned-proposal-list">
          {proposals
            .filter(p => Number(p.proposer_id) === Number(user.id))
            .map(proposal => (
              <article className="content-card proposal-card redesigned-proposal-card" key={proposal.id}>
                <div className="proposal-heading">
                  <div className="trader-info">
                    <div className="trader-avatar">
                      {(proposal.receiver_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="proposal-type-label">SENT TO</span>
                      <h3>{proposal.receiver_name}</h3>
                    </div>
                  </div>

                  <span className={`proposal-status ${proposal.status?.toLowerCase()}`}>
                    {proposal.status}
                  </span>
                </div>

                <div className="exchange-panel">
                  <div className="exchange-item">
                    <span>YOU OFFER</span>
                    <h4>{proposal.offered_item_title}</h4>
                  </div>

                  <div className="exchange-arrow">
                    <ArrowRightLeft size={21} />
                  </div>

                  <div className="exchange-item">
                    <span>YOU REQUEST</span>
                    <h4>{proposal.requested_item_title}</h4>
                  </div>
                </div>

                {proposal.message && (
                  <div className="proposal-message redesigned-message">
                    <span>YOUR MESSAGE</span>
                    <p>"{proposal.message}"</p>
                  </div>
                )}

                <div className="proposal-footer">
                  <span className="proposal-date">
                    <Clock size={14} />
                    {new Date(proposal.created_at).toLocaleString()}
                  </span>
                </div>
              </article>
            ))}
        </div>
      </>
    )}
  </section>
)}

{["history", "profile", "settings"].includes(view) &&   
view === "history" ? (
  <section className="page-section history-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">BARTERHUB</p>
        <h1>Trade History</h1>
        <p>View the activity and progress of your item exchanges.</p>
      </div>
    </div>

    <div className="history-banner">
      <div className="history-banner-icon">
        <ArrowRightLeft size={30} />
      </div>
      <div>
        <h2>Your Exchange Journey</h2>
        <p>
          Every trade update is recorded here so you can track your exchanges.
        </p>
      </div>
    </div>

    {historyLoading ? (
      <div className="history-empty">
        <p>Loading trade history...</p>
      </div>
    ) : historyError ? (
      <div className="history-empty">
        <h3>Unable to Load Trade History</h3>
        <p>{historyError}</p>
        <button
          className="primary-button"
          onClick={loadTradeHistory}
        >
          Try Again
        </button>
      </div>
    ) : tradeHistory.length === 0 ? (
      <div className="history-empty">
        <div className="history-empty-icon">
          <PackageOpen size={38} />
        </div>

        <h3>No Trade Records Yet</h3>
        <p>
          Your trade activities will appear here once you start exchanging items.
        </p>

        <button
          className="primary-button"
          onClick={() => openView("browse")}
        >
          <Package size={17} />
          Browse Items
        </button>
      </div>
    ) : (
      <div className="history-list">
        {tradeHistory.map((record) => {
          const partnerName =
            String(user.id) === String(record.proposer_id)
              ? record.receiver_name
              : record.proposer_name;

          return (
            <div className="history-card" key={record.history_id}>
              <div className="history-card-top">
                <div>
                  <span className="history-label">
                    TRADE #{record.trade_id}
                  </span>
                  <h3>
                    {record.offered_item_title}{" "}
                    <ArrowRightLeft size={16} />{" "}
                    {record.requested_item_title}
                  </h3>
                </div>

                <span
                  className={`history-status ${String(
                    record.new_status
                  ).toLowerCase()}`}
                >
                  {record.new_status}
                </span>
              </div>

              <div className="history-card-details">
                <p>
                  <strong>Trade Partner:</strong>{" "}
                  {partnerName || "Unknown"}
                </p>

                <p>
                  <strong>Current Trade Status:</strong>{" "}
                  {record.current_status}
                </p>

                <p>
                  <strong>Activity Date:</strong>{" "}
                  {record.created_at
                    ? new Date(record.created_at).toLocaleString()
                    : "Not available"}
                </p>

                {record.remarks && (
                  <p>
                    <strong>Remarks:</strong> {record.remarks}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
) : view === "profile" ? (
  <section className="page-section profile-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">BARTERHUB</p>
        <h1>My Profile</h1>
        <p>Manage your personal information and profile picture.</p>
      </div>
    </div>

    {profileLoading ? (
      <div className="content-card">
        <p>Loading your profile...</p>
      </div>
    ) : (
      <form className="content-card profile-form" onSubmit={handleSaveProfile}>
        <div className="profile-picture-section">
          <div className="profile-avatar">
            {profilePreview ? (
              <img src={profilePreview} alt="Profile" />
            ) : (
              <span>
                {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            )}
          </div>

          <div>
            <h3>Profile Picture</h3>
            <p>JPG, PNG, or WEBP. Maximum size: 5MB.</p>

            <label className="primary-button profile-upload-button">
              Upload Picture
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfileImageChange}
                hidden
              />
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="profileName">Full Name</label>
          <input
            id="profileName"
            type="text"
            value={profile.full_name || ""}
            onChange={(e) =>
              setProfile({ ...profile, full_name: e.target.value })
            }
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="profileEmail">Email Address</label>
          <input
            id="profileEmail"
            type="email"
            value={profile.email || ""}
            readOnly
          />
        </div>

        <div className="form-group">
          <label htmlFor="profileLocation">Location</label>
          <input
            id="profileLocation"
            type="text"
            value={profile.location || ""}
            onChange={(e) =>
              setProfile({ ...profile, location: e.target.value })
            }
            placeholder="Enter your location"
          />
        </div>

        <div className="form-group">
          <label htmlFor="profileBio">About Me</label>
          <textarea
            id="profileBio"
            rows="5"
            value={profile.bio || ""}
            onChange={(e) =>
              setProfile({ ...profile, bio: e.target.value })
            }
            placeholder="Tell other traders something about yourself..."
          />
        </div>

        {profileError && (
          <div className="form-message error-message">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="form-message success-message">
            {profileSuccess}
          </div>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={profileSaving}
        >
          {profileSaving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    )}
  </section>
) : (
  
  <section className="page-section settings-page">
    <div className="page-heading settings-heading">
  <div className="settings-brand">
    <div className="settings-logo">
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M10 17h25l-6-6m6 6-6 6"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M38 31H13l6 6m-6-6 6-6"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <span>BARTERHUB</span>
  </div>

  <h1>Settings</h1>
  <p>Manage your account preferences and security.</p>
</div>

    <div className="content-card settings-card">
      <div className="settings-card-header">
        <div>
          <h3>Change Password</h3>
          <p>Update your password to keep your account secure.</p>
        </div>
      </div>

      <form onSubmit={handleChangePassword}>
        <div className="form-group">
          <label>Current Password</label>
          <input
            type={showPasswords ? "text" : "password"}
            value={passwordData.current_password}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                current_password: e.target.value,
              })
            }
            placeholder="Enter current password"
            required
          />
        </div>

        <div className="form-group">
          <label>New Password</label>
          <input
            type={showPasswords ? "text" : "password"}
            value={passwordData.new_password}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                new_password: e.target.value,
              })
            }
            placeholder="Enter new password"
            minLength={8}
            required
          />
        </div>

        <div className="form-group">
          <label>Confirm New Password</label>
          <input
            type={showPasswords ? "text" : "password"}
            value={passwordData.confirm_password}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                confirm_password: e.target.value,
              })
            }
            placeholder="Confirm new password"
            minLength={8}
            required
          />
        </div>

        <label className="show-password-option">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
          />
          Show passwords
        </label>

        {passwordError && (
          <p className="form-error">{passwordError}</p>
        )}

        {passwordSuccess && (
          <p className="form-success">{passwordSuccess}</p>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={passwordLoading}
        >
          {passwordLoading ? "Updating..." : "Save Changes"}
        </button>
            </form>
    </div>
  </section>
)}

<footer className="dashboard-footer">
  © 2026 BarterHub. Trade items, build connections.
</footer>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="brand-icon">
            <ArrowRightLeft size={23} />
          </div>
          <span>
            Barter<span className="brand-light">Hub</span>
          </span>
        </div>

        <div className="auth-hero">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            A COMMUNITY BUILT ON SHARING
          </div>

          <h1>
            One person's extra,
            <br />
            <span>another person's treasure.</span>
          </h1>

          <p>
            Exchange what you have for what you need. Discover useful items,
            meet your community, and make trading simple.
          </p>

          <div className="hero-art">
            <div className="art-circle circle-one"></div>
            <div className="art-circle circle-two"></div>

            <div className="art-card art-card-left">
              <BookOpen size={33} />
              <span>Books</span>
            </div>

            <div className="art-card art-card-center">
              <ArrowRightLeft size={45} />
              <span>Exchange</span>
            </div>

            <div className="art-card art-card-right">
              <ShoppingBag size={33} />
              <span>Goods</span>
            </div>

            <div className="art-sparkle sparkle-one">✦</div>
            <div className="art-sparkle sparkle-two">✧</div>
          </div>
        </div>

        <div className="auth-left-footer">
          <span>Simple trading. Stronger communities.</span>
          <span>© 2026 BarterHub</span>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="mobile-brand">
            <div className="brand-icon">
              <ArrowRightLeft size={22} />
            </div>
            <span>
              Barter<span className="brand-light">Hub</span>
            </span>
          </div>

          <div className="form-heading">
            <p className="eyebrow">
              {isRegister ? "JOIN THE COMMUNITY" : "WELCOME BACK"}
            </p>
            <h2>{isRegister ? "Create an account" : "Welcome back!"}</h2>
            <p>
              {isRegister
                ? "Create your account and start exchanging."
                : "Sign in to continue your trading journey."}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              className={!isRegister ? "tab active" : "tab"}
              onClick={() => {
                setPage("login");
                setError("");
                setSuccess("");
              }}
            >
              Log In
            </button>

            <button
              className={isRegister ? "tab active" : "tab"}
              onClick={() => {
                setPage("register");
                setError("");
                setSuccess("");
              }}
            >
              Register
            </button>
          </div>

          {error && <div className="form-message error-message">{error}</div>}
          {success && (
            <div className="form-message success-message">{success}</div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                {!isRegister && (
                  <span className="password-hint">Your account password</span>
                )}
              </div>

              <input
                id="password"
                name="password"
                type="password"
                placeholder={
                  isRegister ? "At least 8 characters" : "Enter your password"
                }
                value={form.password}
                onChange={handleChange}
                minLength={8}
                required
              />
            </div>

            <button className="submit-button" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create Account"
                  : "Log In"}
              {!loading && <ArrowRightLeft size={18} />}
            </button>
          </form>

          <div className="form-divider">
            <span></span>
            <small>TRADE • SHARE • CONNECT</small>
            <span></span>
          </div>

          <p className="auth-note">
            By continuing, you agree to use the platform responsibly and trade
            fairly with other members.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
