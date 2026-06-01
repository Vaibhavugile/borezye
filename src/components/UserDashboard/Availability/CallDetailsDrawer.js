import React, {
  useEffect,
  useState
} from "react";

import crmApi from "../../../services/crmApi";

import "./CallDetailsDrawer.css";

function CallDetailsDrawer({

  phone,

  open,

  onClose
}) {

  // =========================
  // STATE
  // =========================

  const [loading, setLoading] =
    useState(false);

  const [lead, setLead] =
    useState(null);

  const [formData, setFormData] =
    useState({});

  const [calls, setCalls] =
    useState([]);

  const [error, setError] =
    useState("");

  const [note, setNote] =
    useState("");

  // =========================
  // LOAD DETAILS
  // =========================

  async function loadDetails() {

    if (!phone) {
      return;
    }

    try {

      setLoading(true);

      setError("");

      const res =
        await crmApi.get(
          `/call-details/${phone}`
        );

      const leadData =
        res.data.lead || null;

      setLead(
        leadData
      );

      setFormData(
        leadData || {}
      );

      setCalls(
        res.data.calls || []
      );

    } catch (e) {

      console.error(
        e.response?.data || e
      );

      setError(
        e.response?.data?.error ||
        "Failed to load details"
      );

    } finally {

      setLoading(false);
    }
  }

  // =========================
  // LOAD
  // =========================

  useEffect(() => {

    if (open) {

      loadDetails();
    }

  }, [open, phone]);

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

      return seconds <= 0
        ? "Missed"
        : "Answered";
    }

    // OUTBOUND

    if (
      direction === "outbound"
    ) {

      return seconds <= 0
        ? "Rejected"
        : "Connected";
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

      case "hot":
        return "#ef4444";

      case "warm":
        return "#f59e0b";

      case "cold":
        return "#3b82f6";

      case "won":
        return "#10b981";

      default:
        return "#6b7280";
    }
  }

  // =========================
  // DATE FORMAT
  // =========================

  function formatDate(
    value
  ) {

    if (!value) {
      return "-";
    }

    try {

      return new Date(
        value
      ).toLocaleString();

    } catch {

      return value;
    }
  }

  // =========================
  // SAVE LEAD
  // =========================

  async function handleSaveLead() {

    try {

      await crmApi.post(
        "/update-lead",
        {

          phoneNumber:
            lead.phoneNumber,

          updates: {

            name:
              formData.name || "",

            status:
              formData.status || "",

            source:
              formData.source || "",

            address:
              formData.address || "",

            requirements:
              formData.requirements || "",

            nextFollowUp:
              formData.nextFollowUp || null,

            eventDate:
              formData.eventDate || null
          }
        }
      );

      // RELOAD

      await loadDetails();

    } catch (e) {

      console.error(
        e.response?.data || e
      );
    }
  }

  // =========================
  // ADD NOTE
  // =========================

  async function handleAddNote() {

    if (!note.trim()) {
      return;
    }

    try {

      await crmApi.post(
        "/add-note",
        {

          phoneNumber:
            lead.phoneNumber,

          note
        }
      );

      // CLEAR

      setNote("");

      // RELOAD

      await loadDetails();

    } catch (e) {

      console.error(
        e.response?.data || e
      );
    }
  }

  // =========================
  // HIDE
  // =========================

  if (!open) {
    return null;
  }

  // =========================
  // UI
  // =========================

  return (

    <>

      {/* OVERLAY */}

      <div
        className="drawer-overlay"
        onClick={onClose}
      />

      {/* DRAWER */}

      <div className="crm-drawer">

        {/* HEADER */}

        <div className="drawer-header">

          <div>

            <h2 className="drawer-title">
              Customer
            </h2>

            <div className="drawer-subtitle">
              CRM Timeline
            </div>

          </div>

          <button
            className="drawer-close"
            onClick={onClose}
          >

            ✕

          </button>

        </div>

        {/* LOADING */}

        {loading && (

          <div className="drawer-empty">
            Loading...
          </div>
        )}

        {/* ERROR */}

        {error && (

          <div className="drawer-error">
            {error}
          </div>
        )}

        {/* PROFILE */}

        {lead && (

          <div className="crm-profile">

            {/* TOP */}

            <div className="profile-top">

              {/* AVATAR */}

              <div className="profile-avatar">

                {(formData.name || "U")
                  .charAt(0)
                  .toUpperCase()}

              </div>

              {/* INFO */}

              <div>

                <input

                  className="profile-name-input"

                  value={
                    formData.name || ""
                  }

                  onChange={(e) =>
                    setFormData({

                      ...formData,

                      name:
                        e.target.value
                    })
                  }

                  placeholder=
                    "Customer name"
                />

                <div className="profile-phone">

                  {lead.phoneNumber}

                </div>

                <select

                  className="profile-status-select"

                  value={
                    formData.status || ""
                  }

                  onChange={(e) =>
                    setFormData({

                      ...formData,

                      status:
                        e.target.value
                    })
                  }
                >

                  <option value="">
                    Select Status
                  </option>

                  <option value="hot">
                    Hot
                  </option>

                  <option value="warm">
                    Warm
                  </option>

                  <option value="cold">
                    Cold
                  </option>

                  <option value="won">
                    Won
                  </option>

                </select>

              </div>

            </div>

            {/* ACTIONS */}

            <div className="profile-actions">

              <button
                onClick={
                  handleSaveLead
                }
              >

                Save Changes

              </button>

            </div>

            {/* GRID */}

            <div className="profile-grid">

              {/* SOURCE */}

              <div className="profile-item">

                <div className="profile-label">
                  Source
                </div>

                <input

                  className="profile-input"

                  value={
                    formData.source || ""
                  }

                  onChange={(e) =>
                    setFormData({

                      ...formData,

                      source:
                        e.target.value
                    })
                  }
                />

              </div>

              {/* ADDRESS */}

              <div className="profile-item">

                <div className="profile-label">
                  Address
                </div>

                <textarea

                  className="profile-textarea"

                  value={
                    formData.address || ""
                  }

                  onChange={(e) =>
                    setFormData({

                      ...formData,

                      address:
                        e.target.value
                    })
                  }
                />

              </div>

              {/* REQUIREMENTS */}

              <div className="profile-item">

                <div className="profile-label">
                  Requirements
                </div>

                <textarea

                  className="profile-textarea"

                  value={
                    formData.requirements || ""
                  }

                  onChange={(e) =>
                    setFormData({

                      ...formData,

                      requirements:
                        e.target.value
                    })
                  }
                />

              </div>

              {/* FOLLOWUP */}

              <div className="profile-item">

                <div className="profile-label">
                  Next Followup
                </div>

                <input

                  type="datetime-local"

                  className="profile-input"

                  value={
                    formData.nextFollowUp
                      ? new Date(
                          formData.nextFollowUp
                        )
                          .toISOString()
                          .slice(0,16)
                      : ""
                  }

                  onChange={(e) =>
                    setFormData({

                      ...formData,

                      nextFollowUp:
                        e.target.value
                    })
                  }
                />

              </div>

              {/* EVENT DATE */}

              <div className="profile-item">

                <div className="profile-label">
                  Event Date
                </div>

                <input

                  type="datetime-local"

                  className="profile-input"

                  value={
                    formData.eventDate
                      ? new Date(
                          formData.eventDate
                        )
                          .toISOString()
                          .slice(0,16)
                      : ""
                  }

                  onChange={(e) =>
                    setFormData({

                      ...formData,

                      eventDate:
                        e.target.value
                    })
                  }
                />

              </div>

            </div>

          </div>
        )}

        {/* ADD NOTE */}

        <div className="drawer-section">

          <div className="section-title">
            Add Note
          </div>

          <div className="note-input-wrapper">

            <textarea

              value={note}

              onChange={(e) =>
                setNote(
                  e.target.value
                )
              }

              placeholder=
                "Write customer notes..."
            />

            <button
              onClick={
                handleAddNote
              }
            >

              Save Note

            </button>

          </div>

        </div>

        {/* NOTES */}

        {lead?.notes?.length > 0 && (

          <div className="drawer-section">

            <div className="section-title">
              Notes
            </div>

            {lead.notes.map(
              (note, index) => (

                <div
                  key={index}
                  className="note-card"
                >

                  <div className="note-text">

                    {note.text ||
                      note.note ||
                      "-"}

                  </div>

                  <div className="note-time">

                    {formatDate(
                      note.createdAt ||
                      note.timestamp
                    )}

                  </div>

                </div>
              )
            )}

          </div>
        )}

        {/* TIMELINE */}

        <div className="drawer-section">

          <div className="section-title">
            Call Timeline
          </div>

          <div className="timeline">

            {calls.map((call) => (

              <div
                key={call.id}
                className="timeline-event"
              >

                {/* TOP */}

                <div className="timeline-top">

                  <div className="timeline-outcome">

                    {getCallOutcome(
                      call.direction,
                      call.durationInSeconds
                    )}

                  </div>

                  <div className="timeline-time">

                    {formatDate(
                      call.createdAt
                    )}

                  </div>

                </div>

                {/* META */}

                <div className="timeline-meta">

                  <div className="timeline-row">

                    <div className="timeline-label">
                      Direction
                    </div>

                    <div className="timeline-value">
                      {call.direction}
                    </div>

                  </div>

                  <div className="timeline-row">

                    <div className="timeline-label">
                      Duration
                    </div>

                    <div className="timeline-value">

                      {call.durationInSeconds || 0}
                      sec

                    </div>

                  </div>

                  <div className="timeline-row">

                    <div className="timeline-label">
                      Handled By
                    </div>

                    <div className="timeline-value">

                      {call.handledByUserName ||
                        "-"}

                    </div>

                  </div>

                </div>

              </div>
            ))}

          </div>

        </div>

      </div>

    </>
  );
}

export default
  CallDetailsDrawer;