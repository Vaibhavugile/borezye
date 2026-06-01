import React, {
  useEffect,
  useMemo,
  useState
} from "react";
import UserHeader
  from "../../UserDashboard/UserHeader";

import UserSidebar
  from "../../UserDashboard/UserSidebar";

import crmApi from "../../../services/crmApi";

import CallDetailsDrawer
  from "./CallDetailsDrawer";

import {
  FaPhoneAlt,
  FaWhatsapp,
  FaEye
} from "react-icons/fa";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";

import { db }
  from "../../../firebaseConfig";

import { useUser }
  from "../../Auth/UserContext";
import "./CallsPage.css";

function CallsPage() {

  // =========================
  // STATE
  // =========================

  const [calls, setCalls] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [sortBy, setSortBy] =
    useState("latest");

  // =========================
  // DAYS FILTER
  // =========================

  const [daysFilter, setDaysFilter] =
    useState("2");
    const [page, setPage] =
  useState(1);

const [totalPages,
  setTotalPages] =
  useState(1);

const [stats,
  setStats] =
  useState(null);

  const [
    selectedPhone,
    setSelectedPhone
  ] = useState(null);

  const [
    drawerOpen,
    setDrawerOpen
  ] = useState(false);
  const { userData } =
  useUser();

const [templates,
  setTemplates] =
  useState([]);

const [
  showTemplateModal,
  setShowTemplateModal
] = useState(false);

const [
  selectedCall,
  setSelectedCall
] = useState(null);
  const [
  isSidebarOpen,
  setIsSidebarOpen
] = useState(false);

const toggleSidebar =
  () => {

    setIsSidebarOpen(
      !isSidebarOpen
    );
  };

  // =========================
  // LOAD CALLS
  // =========================

  async function loadCalls() {

    try {

      setLoading(true);

      setError("");

      // =========================
      // URL
      // =========================

   let url =
  `/recent-calls?days=${daysFilter}&page=${page}&limit=20&status=${statusFilter}`;
      // =========================
      // SEARCH
      // =========================

      if (
        search &&
        search.trim()
      ) {

        url +=
          `&search=${search}`;
      }

      // =========================
      // API
      // =========================

      const res =
        await crmApi.get(url);
        setTotalPages(
  res.data.totalPages || 1
  
);
console.log(
  "API RESPONSE",
  res.data
);

setStats({

  total:
    res.data.count || 0,

  answered:
    res.data.answeredCount || 0,

  missed:
    res.data.missedCount || 0,

  rejected:
    res.data.rejectedCount || 0,

  connected:
    res.data.connectedCount || 0
});

      const newCalls =
        res.data.calls || [];

      // =========================
      // SET
      // =========================

      setCalls(newCalls);

    } catch (e) {

      console.error(
        "CALLS API ERROR",
        e.response?.data || e
      );

      setError(
        e.response?.data?.error ||
        "Failed to load calls"
      );

    } finally {

      setLoading(false);
    }
  }

  // =========================
  // SEARCH
  // =========================

  function handleSearch() {

    loadCalls();
  }

  // =========================
  // AUTO LOAD
  // =========================

useEffect(() => {

  loadCalls();

}, [
  daysFilter,
  page,
  statusFilter
]);
useEffect(() => {

  if (
    userData?.branchCode
  ) {

    loadTemplates();
  }

}, [
  userData?.branchCode
]);

  useEffect(() => {

  if (page !== 1) {
    return;
  }

  const timer =
    setInterval(() => {

      loadCalls();

    }, 30000);

  return () =>
    clearInterval(timer);

}, [
  page,
  daysFilter
]);

  // =========================
  // CALL OUTCOME
  // =========================

  function getCallOutcome(
    direction,
    duration
  ) {

    const seconds =
      Number(duration || 0);

    // INBOUND

    if (
      direction === "inbound"
    ) {

      if (seconds <= 0) {

        return "Missed";
      }

      return "Answered";
    }

    // OUTBOUND

    if (
      direction === "outbound"
    ) {

      if (seconds <= 0) {

        return "Rejected";
      }

      return "Connected";
    }

    return "Unknown";
  }

  // =========================
  // STATUS COLOR
  // =========================

  function getStatusColor(
    status
  ) {

    switch (
      status?.toLowerCase()
    ) {

      case "connected":
      case "answered":
      case "won":

        return "#10b981";

      case "missed":
      case "rejected":

        return "#ef4444";

      case "warm":

        return "#f59e0b";

      case "cold":

        return "#3b82f6";

      default:

        return "#6b7280";
    }
  }

  // =========================
  // FILTERED CALLS
  // =========================
async function loadTemplates() {

  try {

    if (
      !userData?.branchCode
    ) {
      return;
    }

    const q = query(

      collection(
        db,
        "products",
        userData.branchCode,
        "templates"
      ),

      orderBy(
        "order",
        "asc"
      )
    );

    const snap =
      await getDocs(q);

    const data =
      snap.docs.map(
        doc => ({
          id: doc.id,
          ...doc.data()
        })
      );

    setTemplates(data);

  } catch (error) {

    console.error(
      "Template Load Error",
      error
    );
  }
}
  const filteredCalls =
    useMemo(() => {

      let data =
        [...calls];

      // =========================
      // STATUS FILTER
      // =========================

     

      // =========================
      // SORTING
      // =========================

      if (
        sortBy === "latest"
      ) {

        data.sort(
          (a, b) =>
            new Date(
              b.createdAt
            ) -
            new Date(
              a.createdAt
            )
        );
      }

      if (
        sortBy === "oldest"
      ) {

        data.sort(
          (a, b) =>
            new Date(
              a.createdAt
            ) -
            new Date(
              b.createdAt
            )
        );
      }

      if (
        sortBy === "longest"
      ) {

        data.sort(
          (a, b) =>
            (b.durationInSeconds || 0) -
            (a.durationInSeconds || 0)
        );
      }

      if (
        sortBy === "shortest"
      ) {

        data.sort(
          (a, b) =>
            (a.durationInSeconds || 0) -
            (b.durationInSeconds || 0)
        );
      }

      return data;

    }, [
      calls,
      statusFilter,
      sortBy
    ]);

  // =========================
  // STATS
  // =========================

  const totalCalls =
  stats?.total || 0;

const answeredCalls =
  stats?.answered || 0;

const missedCalls =
  stats?.missed || 0;

const rejectedCalls =
  stats?.rejected || 0;

const connectedCalls =
  stats?.connected || 0;
  // =========================
  // UI
  // =========================

return (

  <div className="calls-layout">

    <UserHeader
      onMenuClick={
        toggleSidebar
      }
    />

    <div className="calls-body">

      <UserSidebar
        isOpen={
          isSidebarOpen
        }
      />

      <div className="calls-page">

      {/* HEADER */}

      <div className="calls-header">

        <div>

          <h1 className="calls-title">
            Recent Calls
          </h1>

          <div className="calls-subtitle">
            Manage customer conversations
          </div>

        </div>

      </div>

      {/* STATS */}

     <div className="stats-grid">

  {/* TOTAL */}

  <div
    className={`stat-card ${
      statusFilter === "all"
        ? "active-stat"
        : ""
    }`}
    onClick={() => {

      setStatusFilter(
        "all"
      );

      setPage(1);

    }}
  >

    <div className="stat-value">
      {totalCalls}
    </div>

    <div className="stat-label">
      Total Calls
    </div>

  </div>

  {/* ANSWERED */}

  <div
    className={`stat-card ${
      statusFilter === "answered"
        ? "active-stat"
        : ""
    }`}
    onClick={() => {

      setStatusFilter(
        "answered"
      );

      setPage(1);

    }}
  >

    <div className="stat-value">
      {answeredCalls}
    </div>

    <div className="stat-label">
      Answered
    </div>

  </div>

  {/* MISSED */}

  <div
    className={`stat-card ${
      statusFilter === "missed"
        ? "active-stat"
        : ""
    }`}
    onClick={() => {

      setStatusFilter(
        "missed"
      );

      setPage(1);

    }}
  >

    <div className="stat-value">
      {missedCalls}
    </div>

    <div className="stat-label">
      Missed
    </div>

  </div>

  {/* REJECTED */}

  <div
    className={`stat-card ${
      statusFilter === "rejected"
        ? "active-stat"
        : ""
    }`}
    onClick={() => {

      setStatusFilter(
        "rejected"
      );

      setPage(1);

    }}
  >

    <div className="stat-value">
      {rejectedCalls}
    </div>

    <div className="stat-label">
      Rejected
    </div>

  </div>

  {/* CONNECTED */}

  <div
    className={`stat-card ${
      statusFilter === "connected"
        ? "active-stat"
        : ""
    }`}
    onClick={() => {

      setStatusFilter(
        "connected"
      );

      setPage(1);

    }}
  >

    <div className="stat-value">
      {connectedCalls}
    </div>

    <div className="stat-label">
      Connected
    </div>

  </div>

</div>

      {/* FILTER BAR */}

      <div className="filters-bar">

        {/* SEARCH */}

        <div className="calls-search">

          <input

            type="text"

            placeholder=
              "Search phone number..."

            value={search}

            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

          <button
            onClick={
              handleSearch
            }
          >

            Search

          </button>

        </div>

        {/* FILTERS */}

        <div className="filters-right">

          {/* DAYS */}

          <select

            value={
              daysFilter
            }

           onChange={(e) => {

  setDaysFilter(
    e.target.value
  );

  setPage(1);

}}
          >

            <option value="1">
              Today
            </option>

            <option value="2">
              Last 2 Days
            </option>

            <option value="7">
              Last 7 Days
            </option>

            <option value="30">
              This Month
            </option>

          </select>

          {/* STATUS */}

        <select

  value={
    statusFilter
  }

  onChange={(e) => {

    setStatusFilter(
      e.target.value
    );

    setPage(1);

  }}
>

            <option value="all">
              All
            </option>

            <option value="answered">
              Answered
            </option>

            <option value="missed">
              Missed
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="connected">
              Connected
            </option>

          </select>

          {/* SORT */}

          <select

            value={sortBy}

            onChange={(e) =>
              setSortBy(
                e.target.value
              )
            }
          >

            <option value="latest">
              Latest
            </option>

            <option value="oldest">
              Oldest
            </option>

            <option value="longest">
              Longest
            </option>

            <option value="shortest">
              Shortest
            </option>

          </select>

        </div>

      </div>

      {/* LOADING */}

      {loading && (

        <div className="empty-state">
          Loading calls...
        </div>
      )}

      {/* ERROR */}

      {error && (

        <div className="error-box">

          {error}

        </div>
      )}

      {/* EMPTY */}

      {!loading &&
        filteredCalls.length === 0 && (

        <div className="empty-state">
          No calls found
        </div>
      )}

      {/* CALLS */}

      <div className="calls-list">

        {filteredCalls.map((call) => (

          <div
            key={call.id}

            className="call-row"

           
          >

            {/* CUSTOMER */}

            <div className="call-customer">

              <div className="call-avatar">

                {(call.leadName || "U")
                  .charAt(0)
                  .toUpperCase()}

              </div>

              <div>

                <div className="call-name">

                  {call.leadName ||
                    "Unknown Lead"}

                </div>

                <div className="call-phone">

                  {call.phoneNumber}

                </div>

              </div>

            </div>

            {/* OUTCOME */}

            <div className="call-column">

              <div className="call-column-label">
                Outcome
              </div>

              <div className="call-column-value">

                {getCallOutcome(
                  call.direction,
                  call.durationInSeconds
                )}

              </div>

            </div>

            {/* DIRECTION */}

            <div className="call-column">

              <div className="call-column-label">
                Direction
              </div>

              <div className="call-column-value">

                {call.direction ||
                  "-"}

              </div>

            </div>

            {/* DURATION */}

            <div className="call-column">

              <div className="call-column-label">
                Duration
              </div>

              <div className="call-column-value">

                {call.durationInSeconds || 0}
                sec

              </div>

            </div>
            {/* HANDLED BY */}

<div className="call-column">

  <div className="call-column-label">
    Agent
  </div>

  <div className="call-column-value">

    {call.handledByUserName ||
      "-"}

  </div>

</div>
{/* ACTIONS */}
{/* ACTIONS */}



            {/* STATUS */}

            <div className="call-column">

              <div className="call-column-label">
                Status
              </div>

              <div
                className="call-status"

                style={{
                  background:
                    getStatusColor(
                      getCallOutcome(
                        call.direction,
                        call.durationInSeconds
                      )
                    )
                }}
              >

                {getCallOutcome(
                  call.direction,
                  call.durationInSeconds
                )}

              </div>

            </div>

            {/* CREATED */}

            <div className="call-column">

              <div className="call-column-label">
                Created
              </div>

              <div className="call-time">

                {call.createdAt
                  ? new Date(
                      call.createdAt
                    ).toLocaleString()
                  : "-"}

              </div>

            </div>
<div className="call-actions">

  <button
    type="button"
    className="call-action-btn view-btn"
    onClick={() => {

      setSelectedPhone(
        call.phoneNumber
      );

      setDrawerOpen(true);
    }}
  >
    <FaEye />
  </button>

  <button
    type="button"
    className="call-action-btn call-btn"
    onClick={() => {

      const rawPhone =
        String(call.phoneNumber || "")
          .replace(/\D/g, "");

      let phone = rawPhone;

      if (
        phone.startsWith("0") &&
        phone.length === 11
      ) {
        phone = phone.substring(1);
      }

      if (
        phone.length === 10
      ) {
        phone = `91${phone}`;
      }

      window.open(
        `tel:+${phone}`,
        "_self"
      );
    }}
  >
    <FaPhoneAlt />
  </button>

 <button
  type="button"
  className="call-action-btn whatsapp-btn"
  onClick={() => {

    setSelectedCall(call);

    setShowTemplateModal(true);

  }}
>
  <FaWhatsapp />
</button>

</div>
          </div>
          
        ))}

      </div>
<div className="pagination">

  <button
    disabled={page === 1}
    onClick={() =>
      setPage(page - 1)
    }
  >
    Previous
  </button>

  <span>
    Page {page} of {totalPages}
  </span>

  <button
    disabled={page >= totalPages}
    onClick={() =>
      setPage(page + 1)
    }
  >
    Next
  </button>

</div>
      {/* DRAWER */}

      <CallDetailsDrawer

        phone={
          selectedPhone
        }

        open={
          drawerOpen
        }

        onClose={() =>
          setDrawerOpen(false)
        }
      />
      {showTemplateModal && (

  <div className="template-overlay">

    <div className="template-modal">

      <div className="template-modal-header">

        <h3>
          Select Template
        </h3>

        <button
          className="template-close-btn"
          onClick={() =>
            setShowTemplateModal(false)
          }
        >
          ✕
        </button>

      </div>

      <div className="template-list">

        {templates.length === 0 ? (

          <div className="template-empty">
            No templates found
          </div>

        ) : (

          templates.map(template => (

            <button
              key={template.id}
              className="template-item"
          onClick={() => {

  const rawPhone =
    String(
      selectedCall?.phoneNumber || ""
    ).replace(
      /\D/g,
      ""
    );

  let phone =
    rawPhone;

  if (
    phone.startsWith("0") &&
    phone.length === 11
  ) {
    phone =
      phone.substring(1);
  }

  if (
    phone.length === 10
  ) {
    phone =
      `91${phone}`;
  }

  const message =
    template.body || "";

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank"
  );

  setShowTemplateModal(
    false
  );

}}
            >

              <div className="template-name">
                {template.name}
              </div>

            </button>

          ))

        )}

      </div>

    </div>

  </div>

)}

          </div>

    </div>

  </div>
);
}

export default CallsPage;