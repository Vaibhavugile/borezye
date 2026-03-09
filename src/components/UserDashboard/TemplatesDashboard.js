import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc ,where, query } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { FaSearch, FaDownload, FaEdit, FaTrash ,FaPlus} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse"; // Import PapaParse for CSV operations
import CSidebar from "../UserDashboard/UserSidebar"; // Import the Sidebar component
import ClientHeader from "../UserDashboard/UserHeader"; // Import the Header component
import { useUser } from "../Auth/UserContext"; // Assuming you're using a UserContext for branchCode
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify

const TemplatesDashboard = () => {
  const [templates, setTemplates] = useState([]);
  const [originalTemplates, setOriginalTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // Search query state
  const [searchField, setSearchField] = useState("name"); // Search field state
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { userData } = useUser(); // Access userData from the context

  // Fetch templates from Firestore
  const fetchTemplates = async () => {
    try {
        const q = query(
            collection(db, "templates"),
            where('branchCode', '==', userData.branchCode)
   
        );
      const querySnapshot = await getDocs(q);
      const templatesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTemplates(templatesData);
      setOriginalTemplates(templatesData);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.warn("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this template?");
    if (confirmDelete) {
      try {
        const templateDocRef = doc(db, "templates", id);
        await deleteDoc(templateDocRef);
        setTemplates(templates.filter((template) => template.id !== id));
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  const handleEdit = (id) => {
    navigate(`/edittemplate/${id}`);
  };

  const handleSearch = () => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (lowerCaseQuery === "") {
      setTemplates(originalTemplates); // Show all templates if search query is empty
    } else {
      const filteredTemplates = originalTemplates.filter((template) =>
        template[searchField]?.toLowerCase().includes(lowerCaseQuery)
      );
      setTemplates(filteredTemplates);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery, searchField]);

  const exportToCSV = () => {
    const csv = Papa.unparse(templates);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "templates.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={`dashboard-container ${sidebarOpen ? "sidebar-open" : ""}`}>
      <CSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="dashboard-content">
        <ClientHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
        <h2 style={{ marginLeft: "20px", marginTop: "100px" }}>Templates Dashboard</h2>
        <p style={{ marginLeft: "20px" }}>{templates.length} Templates</p>

        <div className="toolbar-container">
          <div className="search-bar-container7">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="search-dropdown7"
            >
              <option value="name">Template Name</option>
              <option value="body">Template Body</option>
            </select>
            <input
              type="text"
              placeholder={`Search by...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="action-buttons">
            <label className="export-button" onClick={exportToCSV}>
              <FaDownload /> Export
            </label>
            <label className="add-product-button" onClick={() => navigate("/addtemplate")}>
              <FaPlus /> Add Template
            </label>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <p>Loading templates...</p>
          ) : templates.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Template Body</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>
                      <div
                        style={{
                          width: "300px",
                          height: "80px",
                          overflow: "auto",
                          whiteSpace: "normal",
                          textOverflow: "ellipsis",
                          wordWrap: "break-word",
                        }}
                      >
                        {template.body}
                      </div>
                    </td>
                    <td>{new Date(template.createdAt.seconds * 1000).toLocaleString()}</td>
                    <td>
                      <div className="action-buttons">
                        <label onClick={() => handleEdit(template.id)}>
                          <FaEdit style={{ color: "#757575", cursor: "pointer" }} />
                        </label>
                        {userData?.role !== "Subuser" && (
                          <label onClick={() => handleDelete(template.id)}>
                            <FaTrash style={{ color: "#757575", cursor: "pointer" }} />
                          </label>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No templates found</p>
          )}
        </div>
      </div>

      <ToastContainer/>
    </div>
  );
};

export default TemplatesDashboard;