import React, { useCallback, useEffect, useState } from "react";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage";
import { app, db, storage } from "../../firebaseConfig";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useUser } from "../Auth/UserContext";
import "./CustomBookingNotifications.css";

const STAGES = [
  {
    key: "pickupPending",
    label: "Pickup pending",
    description: "Sent when a booking is waiting for pickup.",
    defaultTitle: "Pickup reminder",
    defaultMessage:
      "Your booking {receiptNumber} is awaiting pickup. Please complete the pickup process.",
  },
  {
    key: "returnPending",
    label: "Return pending",
    description: "Sent when a booking is waiting for return.",
    defaultTitle: "Return reminder",
    defaultMessage:
      "Your booking {receiptNumber} is awaiting return. Please complete the return process.",
  },
];

const emptyStage = (stage) => ({
  enabled: true,
  title: stage.defaultTitle,
  message: stage.defaultMessage,
  imageMode: "product",
  fallbackImageUrl: "",
});

// These are the actual booking stages used by BookingDashboard.
// "all" is a dashboard filter, not a booking stage.
const EVENT_STAGES = [
  { key: "Booking", label: "Booking", description: "When a booking is created.", defaultTitle: "Booking received", defaultMessage: "Hello {clientName}, we have received your booking {receiptNumber}.", icon: "＋" },
  { key: "pickupPending", label: "Pickup pending", description: "When a booking moves to pickup pending.", defaultTitle: "Pickup pending", defaultMessage: "Hello {clientName}, booking {receiptNumber} is awaiting pickup.", icon: "◷" },
  { key: "pickup", label: "Pickup", description: "When the booking moves to pickup.", defaultTitle: "Pickup update", defaultMessage: "Hello {clientName}, your booking {receiptNumber} is ready for pickup.", icon: "↗" },
  { key: "returnPending", label: "Return pending", description: "When a booking moves to return pending.", defaultTitle: "Return pending", defaultMessage: "Hello {clientName}, booking {receiptNumber} is awaiting return.", icon: "◷" },
  { key: "return", label: "Return", description: "When the booking moves to return.", defaultTitle: "Return update", defaultMessage: "Hello {clientName}, the return for booking {receiptNumber} is being processed.", icon: "↙" },
  { key: "successful", label: "Successful", description: "When the booking is completed successfully.", defaultTitle: "Booking completed", defaultMessage: "Hello {clientName}, booking {receiptNumber} has been completed. Thank you!", icon: "✓" },
  { key: "cancelled", label: "Cancelled", description: "When a booking is cancelled.", defaultTitle: "Booking cancelled", defaultMessage: "Hello {clientName}, booking {receiptNumber} has been cancelled.", icon: "×" },
  { key: "postponed", label: "Postponed", description: "When a booking is postponed.", defaultTitle: "Booking postponed", defaultMessage: "Hello {clientName}, booking {receiptNumber} has been postponed.", icon: "Ⅱ" },
];

const EVENT_PLACEHOLDERS = [
  ["{clientName}", "Customer name"],
  ["{clientEmail}", "Customer email"],
  ["{ContactNo}", "Customer contact number"],
  ["{receiptNumber}", "Receipt number"],
  ["{stage}", "Current booking stage"],
  ["{createdAt}", "Booking creation date"],
  ["{pickupDate}", "Pickup date"],
  ["{returnDate}", "Return date"],
  ["{Products}", "Product codes and quantities"],
  ["{Products1}", "Product names"],
  ["{CustomerBy}", "Customer handled by"],
  ["{ReceiptBy}", "Receipt handled by"],
  ["{Alterations}", "Alterations"],
  ["{SpecialNote}", "Special note"],
  ["{GrandTotalRent}", "Gross rent"],
  ["{DiscountOnRent}", "Rent discount"],
  ["{FinalRent}", "Final rent"],
  ["{GrandTotalDeposit}", "Gross deposit"],
  ["{DiscountOnDeposit}", "Deposit discount"],
  ["{FinalDeposit}", "Final deposit"],
  ["{AmountToBePaid}", "Total amount to be paid"],
  ["{AmountPaid}", "Amount paid"],
  ["{Balance}", "Balance amount"],
  ["{PaymentStatus}", "Payment status"],
  ["{FirstPaymentDetails}", "First payment details"],
  ["{FirstPaymentMode}", "First payment mode"],
  ["{SecondPaymentMode}", "Second payment mode"],
  ["{SecondPaymentDetails}", "Second payment details"],
  ["{IdentityProof}", "Identity proof type"],
  ["{IdentityNumber}", "Identity proof number"],
];

const PAYMENT_PLACEHOLDERS = [
  ["{branchCode}", "Branch code"],
  ["{receiptNumber}", "Receipt number"],
  ["{amountPaid}", "Amount received in this payment"],
  ["{totalAmount}", "Total receipt amount"],
  ["{balance}", "Remaining balance"],
  ["{clientName}", "Customer name"],
  ["{contact}", "Customer mobile number"],
  ["{receiptBy}", "Receipt handled by"],
  ["{customerBy}", "Customer handled by"],
  ["{paymentStatus}", "Payment status"],
  ["{createdAt}", "Payment created date and time"],
  ["{rentCollected}", "Rent collected"],
  ["{rentPending}", "Rent pending"],
  ["{depositCollected}", "Deposit collected"],
  ["{depositPending}", "Deposit pending"],
  ["{depositReturned}", "Deposit returned"],
  ["{depositWithYou}", "Deposit currently with you"],
  ["{finalRent}", "Final rent"],
  ["{finalDeposit}", "Final deposit"],
  ["{grandTotalRent}", "Gross rent"],
  ["{grandTotalDeposit}", "Gross deposit"],
  ["{discountOnRent}", "Discount on rent"],
  ["{discountOnDeposit}", "Discount on deposit"],
  ["{appliedCredit}", "Applied customer credit"],
  ["{bookingStage}", "Booking stage"],
  ["{pickupDate}", "Pickup date"],
  ["{returnDate}", "Return date"],
  ["{firstPaymentMode}", "First payment mode"],
  ["{firstPaymentDetails}", "First payment details"],
  ["{secondPaymentMode}", "Second payment mode"],
  ["{secondPaymentDetails}", "Second payment details"],
  ["{specialNote}", "Payment special note"],
  ["{productsSummary}", "Product summary"],
];

function StageIcon({ type }) {
  return type === "pickup" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h13l3 3v4H5a2 2 0 0 1-2-2z" />
      <path d="M7 12V7h7l2 5M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M7 4h10l1 3H6zM6 7l1 13h10l1-13" />
      <path d="M9 11v5M15 11v5" />
    </svg>
  );
}

export default function CustomBookingNotifications() {
  const { userData } = useUser();
  const branchCode = String(userData?.branchCode ?? "").trim();

  const [settings, setSettings] = useState({
    pickupPending: emptyStage(STAGES[0]),
    returnPending: emptyStage(STAGES[1]),
  });
  const [activeStage, setActiveStage] = useState("pickupPending");
  const [activeSection, setActiveSection] = useState("reminders");
  const [eventSettings, setEventSettings] = useState(() =>
    Object.fromEntries(EVENT_STAGES.map((stage) => [stage.key, emptyStage(stage)]))
  );
  const [activeEventStage, setActiveEventStage] = useState("Booking");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savingEvents, setSavingEvents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState({ text: "", type: "success" });
  const [manualRunning, setManualRunning] = useState(false);
  const [manualReport, setManualReport] = useState(null);

  // Branch-specific payment receipt notification settings.
  const [paymentOwners, setPaymentOwners] = useState([]);
  const [selectedPaymentOwnerUids, setSelectedPaymentOwnerUids] = useState([]);
  const [paymentOwnerSearch, setPaymentOwnerSearch] = useState("");
  const [paymentNotification, setPaymentNotification] = useState({
    enabled: false,
    title: "New payment received",
    message: "A payment of ₹{amountPaid} has been received for receipt {receiptNumber} at branch {branchCode}.",
    imageUrl: "",
    clickUrl: "",
  });
  const [loadingPaymentOwners, setLoadingPaymentOwners] = useState(false);
  const [savingPaymentOwners, setSavingPaymentOwners] = useState(false);
  const [testingPaymentOwners, setTestingPaymentOwners] = useState(false);

  const activeConfig = settings[activeStage];
  const stageInfo = STAGES.find((stage) => stage.key === activeStage);
  const activeEventConfig = eventSettings[activeEventStage];
  const activeEventInfo = EVENT_STAGES.find((stage) => stage.key === activeEventStage);
  const notify = useCallback((text, type = "success") => {
    setToast({ text, type });
    window.setTimeout(() => setToast({ text: "", type }), 4000);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSettings() {
      if (!branchCode) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const settingsRef = doc(db, "bookingNotificationSettings", branchCode);
        const snapshot = await getDoc(settingsRef);
        if (!alive) return;

        if (snapshot.exists()) {
          const saved = snapshot.data();
          setSettings({
            pickupPending: {
              ...emptyStage(STAGES[0]),
              ...(saved.pickupPending || {}),
            },
            returnPending: {
              ...emptyStage(STAGES[1]),
              ...(saved.returnPending || {}),
            },
          });
        } else {
          setSettings({
            pickupPending: emptyStage(STAGES[0]),
            returnPending: emptyStage(STAGES[1]),
          });
        }
      } catch (error) {
        console.error("Could not load booking notification settings:", error);
        notify(error?.message || "Could not load notification settings.", "error");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      alive = false;
    };
  }, [branchCode, notify]);

  useEffect(() => {
    let alive = true;
    async function loadEventSettings() {
      if (!branchCode) {
        setLoadingEvents(false);
        return;
      }
      setLoadingEvents(true);
      try {
        const stagesRef = collection(db, "bookingStageNotifications", branchCode, "stages");
        const snapshot = await getDocs(stagesRef);
        if (!alive) return;
        const loaded = Object.fromEntries(EVENT_STAGES.map((stage) => [stage.key, emptyStage(stage)]));
        snapshot.forEach((item) => {
          if (loaded[item.id]) loaded[item.id] = { ...loaded[item.id], ...item.data() };
        });
        setEventSettings(loaded);
      } catch (error) {
        console.error("Could not load booking stage notification settings:", error);
        notify(error?.message || "Could not load stage notification settings.", "error");
      } finally {
        if (alive) setLoadingEvents(false);
      }
    }
    loadEventSettings();
    return () => { alive = false; };
  }, [branchCode, notify]);

  useEffect(() => {
    let alive = true;
    async function loadPaymentOwnerSettings() {
      if (!branchCode) {
        setLoadingPaymentOwners(false);
        return;
      }
      setLoadingPaymentOwners(true);
      try {
        // Customer path: customers/{branchCode}/users/{mobileNumber}
        // Only customers with an FCM token are selectable recipients.
        const customersSnap = await getDocs(collection(db, "customers", branchCode, "users"));
        const branchUsers = customersSnap.docs
          .map((item) => ({ uid: item.id, data: item.data() || {} }))
          .filter((item) => String(item.data.fcmToken || "").trim().length > 0)
          .map(({ uid, data }) => ({
            uid,
            name: data.name || data.fullName || data.displayName || uid,
            phone: data.phone || data.phoneNumber || data.mobileNumber || uid,
            email: data.email || data.emailAddress || "",
            role: data.role || data.userRole || (data.isPartner ? "Partner" : "Customer"),
            fcmToken: String(data.fcmToken || "").trim(),
          }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name)));

        const settingsSnap = await getDoc(
          doc(db, "paymentOwnerNotificationSettings", branchCode)
        );
        if (!alive) return;
        setPaymentOwners(branchUsers);
        if (settingsSnap.exists()) {
          const saved = settingsSnap.data() || {};
          setSelectedPaymentOwnerUids(Array.isArray(saved.ownerUids) ? saved.ownerUids : []);
          setPaymentNotification((current) => ({
            ...current,
            enabled: saved.enabled === true,
            title: saved.title || current.title,
            message: saved.message || current.message,
            imageUrl: saved.imageUrl || "",
            clickUrl: saved.clickUrl || "",
          }));
        } else {
          setSelectedPaymentOwnerUids([]);
        }
      } catch (error) {
        console.error("Could not load payment owner notification settings:", error);
        if (alive) notify(error?.message || "Could not load payment owner settings.", "error");
      } finally {
        if (alive) setLoadingPaymentOwners(false);
      }
    }
    loadPaymentOwnerSettings();
    return () => { alive = false; };
  }, [branchCode, notify]);

  const updatePaymentNotification = (patch) => {
    setPaymentNotification((current) => ({ ...current, ...patch }));
  };

  const filteredPaymentOwners = paymentOwners.filter((owner) => {
    const q = paymentOwnerSearch.trim().toLowerCase();
    if (!q) return true;
    return [owner.name, owner.phone, owner.email, owner.role, owner.uid]
      .some((value) => String(value || "").toLowerCase().includes(q));
  });

  const savePaymentOwnerSettings = async () => {
    if (!branchCode) return notify("Branch code is missing from your user profile.", "error");
    const validUids = new Set(paymentOwners.map((owner) => owner.uid));
    const safeUids = selectedPaymentOwnerUids.filter((uid) => validUids.has(uid));
    if (paymentNotification.enabled && safeUids.length === 0) {
      return notify("Select at least one owner or disable automatic payment notifications.", "error");
    }
    if (safeUids.length !== selectedPaymentOwnerUids.length) {
      return notify("A selected customer is no longer available in this branch. Reload and select again.", "error");
    }
    setSavingPaymentOwners(true);
    try {
      await setDoc(
        doc(db, "paymentOwnerNotificationSettings", branchCode),
        {
          branchCode,
          enabled: paymentNotification.enabled,
          ownerUids: safeUids,
          ownerCustomerIds: safeUids,
          title: paymentNotification.title.trim() || "New payment received",
          message: paymentNotification.message.trim(),
          imageUrl: paymentNotification.imageUrl.trim(),
          clickUrl: paymentNotification.clickUrl.trim(),
          updatedAt: serverTimestamp(),
          updatedBy: userData?.uid || userData?.id || "admin",
        },
        { merge: true }
      );
      notify(`Payment owner notifications saved for branch ${branchCode}.`);
    } catch (error) {
      console.error("Could not save payment owner notification settings:", error);
      notify(error?.message || "Could not save payment owner settings. Check Firestore rules.", "error");
    } finally {
      setSavingPaymentOwners(false);
    }
  };

  const testPaymentOwnerNotification = async () => {
    if (!branchCode) return notify("Branch code is missing.", "error");
    if (!selectedPaymentOwnerUids.length) return notify("Select at least one owner first.", "error");
    setTestingPaymentOwners(true);
    try {
      const callable = httpsCallable(getFunctions(app, "asia-south1"), "sendBranchPaymentOwnerTest");
      const response = await callable({
        branchCode,
        ownerUids: selectedPaymentOwnerUids,
        title: paymentNotification.title,
        message: paymentNotification.message,
        imageUrl: paymentNotification.imageUrl,
        clickUrl: paymentNotification.clickUrl,
      });
      const result = response.data || {};
      notify(`Test notification: ${result.sent || 0} sent, ${result.failed || 0} failed.`);
    } catch (error) {
      console.error("Payment owner test notification failed:", error);
      notify(error?.message || "Could not send test notification. Save settings first.", "error");
    } finally {
      setTestingPaymentOwners(false);
    }
  };

  const updateEventActive = (patch) => {
    setEventSettings((current) => ({
      ...current,
      [activeEventStage]: { ...current[activeEventStage], ...patch },
    }));
  };

  const saveEventSettings = async () => {
    if (!branchCode) {
      notify("Branch code is missing from your user profile.", "error");
      return;
    }
    setSavingEvents(true);
    try {
      await Promise.all(EVENT_STAGES.map((stage) =>
        setDoc(
          doc(db, "bookingStageNotifications", branchCode, "stages", stage.key),
          {
            ...eventSettings[stage.key],
            stage: stage.key,
            branchCode,
            updatedAt: serverTimestamp(),
            updatedBy: userData?.uid || userData?.id || "admin",
          },
          { merge: true }
        )
      ));
      notify("Booking stage-change notification settings saved.");
    } catch (error) {
      console.error("Could not save booking stage notification settings:", error);
      notify(error?.message || "Could not save stage notification settings. Check Firestore rules.", "error");
    } finally {
      setSavingEvents(false);
    }
  };

  const resetEventActive = () => {
    const defaults = EVENT_STAGES.find((stage) => stage.key === activeEventStage);
    setEventSettings((current) => ({ ...current, [activeEventStage]: emptyStage(defaults) }));
  };

  const updateActive = (patch) => {
    setSettings((current) => ({
      ...current,
      [activeStage]: {
        ...current[activeStage],
        ...patch,
      },
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!branchCode) {
      notify("Your profile does not contain a branch code.", "error");
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      notify("Please select an image file.", "error");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("Image must be 5 MB or smaller.", "error");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destination = storageRef(
      storage,
      `booking-notification-images/${branchCode}/${activeStage}/${Date.now()}-${safeName}`
    );
    const task = uploadBytesResumable(destination, file, {
      contentType: file.type,
      customMetadata: { branchCode, notificationStage: activeStage },
    });

    task.on(
      "state_changed",
      (snapshot) => {
        setUploadProgress(
          Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        );
      },
      (error) => {
        console.error("Booking notification image upload failed:", error);
        notify(error?.message || "Image upload failed.", "error");
        setUploading(false);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          updateActive({ fallbackImageUrl: url, imageMode: "custom" });
          notify("Fallback image uploaded.");
        } catch (error) {
          console.error("Could not retrieve uploaded image URL:", error);
          notify("Image uploaded, but its URL could not be retrieved.", "error");
        } finally {
          setUploading(false);
        }
      }
    );

    event.target.value = "";
  };

  const saveSettings = async () => {
    if (!branchCode) {
      notify("Branch code is missing from your user profile.", "error");
      return;
    }

    setSaving(true);
    try {
      const settingsRef = doc(db, "bookingNotificationSettings", branchCode);
      await setDoc(
        settingsRef,
        {
          branchCode,
          pickupPending: settings.pickupPending,
          returnPending: settings.returnPending,
          updatedAt: serverTimestamp(),
          updatedBy: userData?.uid || userData?.id || "admin",
        },
        { merge: true }
      );
      notify("Booking notification settings saved.");
    } catch (error) {
      console.error("Could not save booking notification settings:", error);
      notify(error?.message || "Could not save settings. Check Firestore rules.", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetActive = () => {
    const defaults = STAGES.find((stage) => stage.key === activeStage);
    setSettings((current) => ({
      ...current,
      [activeStage]: emptyStage(defaults),
    }));
  };

  const runManualReminders = async () => {
    if (branchCode !== "7007") {
      notify("Manual force run is currently restricted to branch 7007.", "error");
      return;
    }

    const confirmed = window.confirm(
      "Force-run booking reminders for branch 7007? This bypasses the already-sent check and may send duplicate notifications."
    );
    if (!confirmed) return;

    setManualRunning(true);
    setManualReport(null);
    try {
      const functions = getFunctions(app, "asia-south1");
      const manualRun = httpsCallable(functions, "runBookingStageRemindersManual");
      const response = await manualRun({
        branchCode: "7007",
        forceRun: true,
      });
      setManualReport(response.data || { message: "Manual run completed with no report data." });
      notify("Manual reminder run completed. Review the delivery report below.");
    } catch (error) {
      console.error("Manual booking reminder run failed:", error);
      setManualReport({
        error: error?.message || "Manual reminder run failed.",
        code: error?.code || "unknown",
        details: error?.details || null,
      });
      notify(error?.message || "Manual reminder run failed.", "error");
    } finally {
      setManualRunning(false);
    }
  };

  const previewImage =
    activeConfig.imageMode === "custom"
      ? activeConfig.fallbackImageUrl
      : activeConfig.imageMode === "product"
        ? "booking-product-image"
        : "";

  return (
    <div className="cbn-app">
      <header className="cbn-topbar">
        <div className="cbn-brand">
          <div className="cbn-brand-mark">D</div>
          <div>
            <strong>DOR</strong>
            <span>BUSINESS CONSOLE</span>
          </div>
        </div>
        <div className="cbn-topbar-meta">
          <span className="cbn-live-dot" />
          <span>Branch workspace</span>
          <b>{branchCode || "Branch not assigned"}</b>
        </div>
      </header>

      <main className="cbn-content">
        <div className="cbn-heading">
          <div>
            <div className="cbn-eyebrow">CUSTOMER ENGAGEMENT</div>
            <h1>Custom booking <span>notifications</span></h1>
            <p>Manage scheduled booking reminders, stage-change messages, and branch-specific payment receipt alerts.</p>
          </div>
          <div className="cbn-schedule-chip">
            <span className="cbn-clock">◷</span>
            Automated schedule <strong>11:00 AM · 2:00 PM</strong>
          </div>
        </div>

        <nav className="cbn-section-tabs" aria-label="Notification type">
          <button type="button" className={activeSection === "reminders" ? "active" : ""} onClick={() => setActiveSection("reminders")}>
            <span>◷</span><strong>Scheduled reminders</strong><small>Pickup pending · Return pending</small>
          </button>
          <button type="button" className={activeSection === "stageEvents" ? "active" : ""} onClick={() => setActiveSection("stageEvents")}>
            <span>⇄</span><strong>Stage-change notifications</strong><small>Booking · Pickup · Return · Completed · Cancelled · Postponed</small>
          </button>
          <button type="button" className={activeSection === "paymentOwners" ? "active" : ""} onClick={() => setActiveSection("paymentOwners")}>
            <span>₹</span><strong>Branch payment alerts</strong><small>New receipt · Selected branch owners</small>
          </button>
        </nav>

        {activeSection === "reminders" ? (
        <section className="cbn-layout">
          <div className="cbn-editor">
            <div className="cbn-stage-tabs" role="tablist" aria-label="Booking stage">
              {STAGES.map((stage) => (
                <button
                  type="button"
                  key={stage.key}
                  className={activeStage === stage.key ? "active" : ""}
                  onClick={() => setActiveStage(stage.key)}
                >
                  <span className="cbn-stage-icon">
                    <StageIcon type={stage.key === "pickupPending" ? "pickup" : "return"} />
                  </span>
                  <span>
                    <strong>{stage.label}</strong>
                    <small>{stage.description}</small>
                  </span>
                  <i className={settings[stage.key].enabled ? "enabled" : ""}>
                    {settings[stage.key].enabled ? "ON" : "OFF"}
                  </i>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="cbn-loading">Loading saved notification settings…</div>
            ) : (
              <div className="cbn-form">
                <div className="cbn-form-head">
                  <div>
                    <span className="cbn-step-label">EDIT TEMPLATE</span>
                    <h2>{stageInfo.label}</h2>
                    <p>{stageInfo.description}</p>
                  </div>
                  <label className="cbn-switch">
                    <input
                      type="checkbox"
                      checked={activeConfig.enabled}
                      onChange={(event) => updateActive({ enabled: event.target.checked })}
                    />
                    <span />
                    <b>{activeConfig.enabled ? "Enabled" : "Disabled"}</b>
                  </label>
                </div>

                <label className="cbn-field">
                  <span>Notification title <small>{activeConfig.title.length}/60</small></span>
                  <input
                    maxLength={60}
                    value={activeConfig.title}
                    onChange={(event) => updateActive({ title: event.target.value })}
                    placeholder="Enter notification title"
                  />
                </label>

                <label className="cbn-field">
                  <span>Notification message <small>{activeConfig.message.length}/180</small></span>
                  <textarea
                    rows={4}
                    maxLength={180}
                    value={activeConfig.message}
                    onChange={(event) => updateActive({ message: event.target.value })}
                    placeholder="Write the message your customer will receive"
                  />
                  <em>Available placeholder: {"{receiptNumber}"}.</em>
                </label>

                <div className="cbn-image-section">
                  <div className="cbn-section-head">
                    <div>
                      <h3>Notification image</h3>
                      <p>Choose which image should accompany this booking reminder.</p>
                    </div>
                    <span>OPTIONAL</span>
                  </div>

                  <div className="cbn-image-options">
                    <label className={activeConfig.imageMode === "product" ? "selected" : ""}>
                      <input
                        type="radio"
                        name={`imageMode-${activeStage}`}
                        checked={activeConfig.imageMode === "product"}
                        onChange={() => updateActive({ imageMode: "product" })}
                      />
                      <span className="cbn-option-icon">▧</span>
                      <strong>Booking product image</strong>
                      <small>Use the product image attached to the customer's booking.</small>
                    </label>
                    <label className={activeConfig.imageMode === "custom" ? "selected" : ""}>
                      <input
                        type="radio"
                        name={`imageMode-${activeStage}`}
                        checked={activeConfig.imageMode === "custom"}
                        onChange={() => updateActive({ imageMode: "custom" })}
                      />
                      <span className="cbn-option-icon">▣</span>
                      <strong>Custom fallback image</strong>
                      <small>Use an image you upload here instead.</small>
                    </label>
                    <label className={activeConfig.imageMode === "none" ? "selected" : ""}>
                      <input
                        type="radio"
                        name={`imageMode-${activeStage}`}
                        checked={activeConfig.imageMode === "none"}
                        onChange={() => updateActive({ imageMode: "none" })}
                      />
                      <span className="cbn-option-icon">○</span>
                      <strong>No image</strong>
                      <small>Send a text-only notification.</small>
                    </label>
                  </div>

                  {activeConfig.imageMode === "custom" && (
                    <div className="cbn-upload-area">
                      {activeConfig.fallbackImageUrl ? (
                        <img src={activeConfig.fallbackImageUrl} alt="Custom notification fallback" />
                      ) : (
                        <div className="cbn-upload-empty">Upload a JPG, PNG or WebP image (maximum 5 MB).</div>
                      )}
                      <label className="cbn-upload-button">
                        {uploading ? `Uploading ${uploadProgress}%` : activeConfig.fallbackImageUrl ? "Replace image" : "Choose image"}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                      {activeConfig.fallbackImageUrl && (
                        <button type="button" className="cbn-text-button" onClick={() => updateActive({ fallbackImageUrl: "" })}>
                          Remove uploaded image
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="cbn-note">
                  <strong>How the product image works</strong>
                  <p>When “Booking product image” is selected, the reminder function must read the image URL from that booking's payment/product data. If no booking image is available, it can use the custom fallback image when one is configured.</p>
                </div>

                <div className="cbn-actions">
                  <button type="button" className="cbn-reset" onClick={resetActive}>Reset this template</button>
                  <button type="button" className="cbn-save" onClick={saveSettings} disabled={saving || loading || !branchCode}>
                    {saving ? "Saving…" : "Save notification settings"}
                  </button>
                </div>

                <section className="cbn-manual-panel" style={{ marginTop: 24, padding: 20, border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <span className="cbn-step-label">MANUAL TEST</span>
                      <h3 style={{ margin: "6px 0" }}>Force-run booking reminders</h3>
                      <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                        Runs pickup-pending and return-pending reminders for branch 7007 only. This bypasses the already-sent check.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={runManualReminders}
                      disabled={manualRunning || branchCode !== "7007"}
                      style={{
                        border: 0,
                        borderRadius: 10,
                        padding: "12px 18px",
                        background: manualRunning || branchCode !== "7007" ? "#94a3b8" : "#172554",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: manualRunning || branchCode !== "7007" ? "not-allowed" : "pointer",
                        minWidth: 190,
                      }}
                    >
                      {manualRunning ? "Running reminders…" : "Force Run · Branch 7007"}
                    </button>
                  </div>
                  {branchCode !== "7007" && (
                    <p style={{ color: "#b45309", fontSize: 12, marginBottom: 0 }}>
                      This control is available only when the signed-in user's branch code is 7007.
                    </p>
                  )}
                  {manualReport && (
                    <div style={{ marginTop: 18 }}>
                      <strong style={{ display: "block", marginBottom: 8 }}>Manual run delivery report</strong>
                      <pre style={{
                        margin: 0,
                        padding: 14,
                        borderRadius: 10,
                        background: "#0f172a",
                        color: "#e2e8f0",
                        fontSize: 12,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        maxHeight: 420,
                        overflow: "auto",
                      }}>{JSON.stringify(manualReport, null, 2)}</pre>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          <aside className="cbn-preview">
            <div className="cbn-preview-head">
              <div><span className="cbn-step-label">LIVE PREVIEW</span><h2>Customer notification</h2></div>
              <span className="cbn-live-label"><i /> PREVIEW</span>
            </div>
            <div className="cbn-phone-wrap">
              <div className="cbn-phone">
                <div className="cbn-phone-notch" />
                <div className="cbn-phone-status"><span>9:41</span><span>● ● ▰</span></div>
                <div className="cbn-phone-screen">
                  <div className="cbn-lock-time">9:41</div>
                  <div className="cbn-lock-date">Saturday, 31 October</div>
                  <div className="cbn-notification">
                    <div className="cbn-notification-app"><span className="cbn-mini-logo">D</span><b>DOR</b><small>now</small></div>
                    <strong>{activeConfig.title || "Your notification title"}</strong>
                    <p>{activeConfig.message || "Your notification message will appear here."}</p>
                    {previewImage === "booking-product-image" ? (
                      <div className="cbn-product-placeholder"><span>▧</span><b>Booking product image</b><small>Actual image is selected when the reminder is sent.</small></div>
                    ) : previewImage ? (
                      <img className="cbn-preview-image" src={previewImage} alt="Notification preview" />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="cbn-preview-details">
              <div><span>Branch</span><strong>{branchCode || "Not assigned"}</strong></div>
              <div><span>Notification</span><strong>{stageInfo.label}</strong></div>
              <div><span>Delivery time</span><strong>11:00 AM and 2:00 PM</strong></div>
              <div><span>Status</span><strong className={activeConfig.enabled ? "cbn-status-on" : "cbn-status-off"}>{activeConfig.enabled ? "Enabled" : "Disabled"}</strong></div>
            </div>
            <p className="cbn-preview-foot">This is a visual preview. Actual image availability depends on the product image URL stored with each booking.</p>
          </aside>
        </section>
        ) : activeSection === "stageEvents" ? (
          <section className="cbn-layout cbn-event-layout">
            <div className="cbn-editor">
              <div className="cbn-event-tabs" role="tablist" aria-label="Booking stage">
                {EVENT_STAGES.map((stage) => (
                  <button type="button" key={stage.key} className={activeEventStage === stage.key ? "active" : ""} onClick={() => setActiveEventStage(stage.key)}>
                    <span className="cbn-event-icon">{stage.icon}</span>
                    <span><strong>{stage.label}</strong><small>{stage.description}</small></span>
                    <i className={eventSettings[stage.key].enabled ? "enabled" : ""}>{eventSettings[stage.key].enabled ? "ON" : "OFF"}</i>
                  </button>
                ))}
              </div>

              {loadingEvents ? <div className="cbn-loading">Loading stage notification settings…</div> : (
                <div className="cbn-form">
                  <div className="cbn-form-head">
                    <div><span className="cbn-step-label">AUTOMATIC STAGE EVENT</span><h2>{activeEventInfo.label}</h2><p>{activeEventInfo.description}</p></div>
                    <label className="cbn-switch">
                      <input type="checkbox" checked={activeEventConfig.enabled} onChange={(event) => updateEventActive({ enabled: event.target.checked })} />
                      <span /><b>{activeEventConfig.enabled ? "Enabled" : "Disabled"}</b>
                    </label>
                  </div>

                  <label className="cbn-field">
                    <span>Notification title <small>{activeEventConfig.title.length}/60</small></span>
                    <input maxLength={60} value={activeEventConfig.title} onChange={(event) => updateEventActive({ title: event.target.value })} placeholder="Enter notification title" />
                  </label>
                  <label className="cbn-field">
                    <span>Notification message <small>{activeEventConfig.message.length}/500</small></span>
                    <textarea rows={5} maxLength={500} value={activeEventConfig.message} onChange={(event) => updateEventActive({ message: event.target.value })} placeholder="Write the message your customer will receive" />
                    <em>Use the placeholders below. Values are filled from the booking and its receipt.</em>
                  </label>

                  <div className="cbn-placeholder-panel">
                    <div className="cbn-section-head"><div><h3>Available placeholders</h3><p>Click a placeholder to copy it into your clipboard.</p></div><span>{EVENT_PLACEHOLDERS.length} FIELDS</span></div>
                    <div className="cbn-placeholder-grid">
                      {EVENT_PLACEHOLDERS.map(([token, description]) => (
                        <button type="button" key={token} title={`Copy ${token}`} onClick={() => { navigator.clipboard?.writeText(token); notify(`${token} copied.`); }}>
                          <code>{token}</code><small>{description}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cbn-image-section">
                    <div className="cbn-section-head"><div><h3>Notification image</h3><p>Choose the image sent with this stage-change notification.</p></div><span>OPTIONAL</span></div>
                    <div className="cbn-image-options">
                      <label className={activeEventConfig.imageMode === "product" ? "selected" : ""}>
                        <input type="radio" name={`eventImageMode-${activeEventStage}`} checked={activeEventConfig.imageMode === "product"} onChange={() => updateEventActive({ imageMode: "product" })} />
                        <span className="cbn-option-icon">▧</span><strong>Booking product image</strong><small>Use the product image from the booking.</small>
                      </label>
                      <label className={activeEventConfig.imageMode === "custom" ? "selected" : ""}>
                        <input type="radio" name={`eventImageMode-${activeEventStage}`} checked={activeEventConfig.imageMode === "custom"} onChange={() => updateEventActive({ imageMode: "custom" })} />
                        <span className="cbn-option-icon">▣</span><strong>Custom fallback image</strong><small>Use your uploaded image instead.</small>
                      </label>
                      <label className={activeEventConfig.imageMode === "none" ? "selected" : ""}>
                        <input type="radio" name={`eventImageMode-${activeEventStage}`} checked={activeEventConfig.imageMode === "none"} onChange={() => updateEventActive({ imageMode: "none" })} />
                        <span className="cbn-option-icon">○</span><strong>No image</strong><small>Send a text-only notification.</small>
                      </label>
                    </div>
                    {activeEventConfig.imageMode === "custom" && (
                      <div className="cbn-upload-area">
                        {activeEventConfig.fallbackImageUrl ? <img src={activeEventConfig.fallbackImageUrl} alt="Custom stage notification" /> : <div className="cbn-upload-empty">Upload a JPG, PNG or WebP image (maximum 5 MB).</div>}
                        <label className="cbn-upload-button">
                          {uploading ? `Uploading ${uploadProgress}%` : activeEventConfig.fallbackImageUrl ? "Replace image" : "Choose image"}
                          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (!branchCode || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
                              notify(!branchCode ? "Branch code is missing." : !file.type.startsWith("image/") ? "Please select an image file." : "Image must be 5 MB or smaller.", "error");
                              event.target.value = "";
                              return;
                            }
                            setUploading(true); setUploadProgress(0);
                            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                            const destination = storageRef(storage, `booking-notification-images/${branchCode}/stage-${activeEventStage}/${Date.now()}-${safeName}`);
                            const task = uploadBytesResumable(destination, file, { contentType: file.type, customMetadata: { branchCode, notificationStage: activeEventStage } });
                            task.on("state_changed", (snapshot) => setUploadProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), (error) => { notify(error?.message || "Image upload failed.", "error"); setUploading(false); }, async () => {
                              try { const url = await getDownloadURL(task.snapshot.ref); updateEventActive({ fallbackImageUrl: url, imageMode: "custom" }); notify("Fallback image uploaded."); }
                              catch (error) { notify(error?.message || "Could not retrieve image URL.", "error"); }
                              finally { setUploading(false); }
                            });
                            event.target.value = "";
                          }} />
                        </label>
                        {activeEventConfig.fallbackImageUrl && <button type="button" className="cbn-text-button" onClick={() => updateEventActive({ fallbackImageUrl: "" })}>Remove uploaded image</button>}
                      </div>
                    )}
                  </div>

                  <div className="cbn-note">
                    <strong>Important: trigger integration</strong>
                    <p>These templates are saved separately from scheduled reminders. A Firestore booking-stage trigger must read this branch's stage config and send the notification when userDetails.stage changes. Saving this page alone does not deploy or activate that Cloud Function.</p>
                  </div>
                  <div className="cbn-actions">
                    <button type="button" className="cbn-reset" onClick={resetEventActive}>Reset this template</button>
                    <button type="button" className="cbn-save" onClick={saveEventSettings} disabled={savingEvents || loadingEvents || !branchCode}>{savingEvents ? "Saving…" : "Save all stage notifications"}</button>
                  </div>
                </div>
              )}
            </div>

            <aside className="cbn-preview">
              <div className="cbn-preview-head"><div><span className="cbn-step-label">LIVE PREVIEW</span><h2>Customer notification</h2></div><span className="cbn-live-label"><i /> PREVIEW</span></div>
              <div className="cbn-phone-wrap">
                <div className="cbn-phone">
                  <div className="cbn-phone-notch" /><div className="cbn-phone-status"><span>9:41</span><span>● ● ▰</span></div>
                  <div className="cbn-phone-screen"><div className="cbn-lock-time">9:41</div><div className="cbn-lock-date">Saturday, 31 October</div>
                    <div className="cbn-notification">
                      <div className="cbn-notification-app"><span className="cbn-mini-logo">D</span><b>DOR</b><small>now</small></div>
                      <strong>{activeEventConfig.title || "Your notification title"}</strong>
                      <p>{activeEventConfig.message || "Your notification message will appear here."}</p>
                      {activeEventConfig.imageMode === "product" ? <div className="cbn-product-placeholder"><span>▧</span><b>Booking product image</b><small>Actual image is selected when the stage changes.</small></div> : activeEventConfig.imageMode === "custom" && activeEventConfig.fallbackImageUrl ? <img className="cbn-preview-image" src={activeEventConfig.fallbackImageUrl} alt="Stage notification preview" /> : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="cbn-preview-details">
                <div><span>Branch</span><strong>{branchCode || "Not assigned"}</strong></div>
                <div><span>Booking stage</span><strong>{activeEventInfo.label}</strong></div>
                <div><span>Trigger</span><strong>Stage changes</strong></div>
                <div><span>Status</span><strong className={activeEventConfig.enabled ? "cbn-status-on" : "cbn-status-off"}>{activeEventConfig.enabled ? "Enabled" : "Disabled"}</strong></div>
              </div>
              <p className="cbn-preview-foot">Preview values show the placeholders as typed. Actual values are populated by the Cloud Function.</p>
            </aside>
          </section>
        ) : (
          <section className="cbn-payment-layout">
            <div className="cbn-editor">
              <div className="cbn-form">
                <div className="cbn-form-head">
                  <div>
                    <span className="cbn-step-label">BRANCH-SPECIFIC AUTOMATION</span>
                    <h2>New payment receipt notification</h2>
                    <p>When a new payment document is created, notify only the selected owners belonging to this branch.</p>
                  </div>
                  <label className="cbn-switch">
                    <input type="checkbox" checked={paymentNotification.enabled} onChange={(event) => updatePaymentNotification({ enabled: event.target.checked })} />
                    <span /><b>{paymentNotification.enabled ? "Enabled" : "Disabled"}</b>
                  </label>
                </div>

                <div className="cbn-payment-branch-banner">
                  <span>THIS PAGE'S BRANCH</span><strong>{branchCode || "Branch not assigned"}</strong>
                  <small>Owner selection and delivery are isolated to this branch.</small>
                </div>

                <div className="cbn-payment-owner-heading">
                  <div><h3>Select branch owners</h3><p>Only customers stored under this branch with a registered FCM token can be selected.</p></div>
                  <b>{selectedPaymentOwnerUids.length} selected</b>
                </div>
                <input className="cbn-payment-search" value={paymentOwnerSearch} onChange={(event) => setPaymentOwnerSearch(event.target.value)} placeholder="Search by owner name, mobile, email or role…" />
                <div className="cbn-payment-owner-actions">
                  <button type="button" onClick={() => setSelectedPaymentOwnerUids((current) => [...new Set([...current, ...filteredPaymentOwners.map((owner) => owner.uid)])])}>Select visible</button>
                  <button type="button" onClick={() => setSelectedPaymentOwnerUids([])}>Clear selection</button>
                </div>
                <div className="cbn-payment-owner-list">
                  {loadingPaymentOwners ? <div className="cbn-loading">Loading branch users…</div> :
                    filteredPaymentOwners.length ? filteredPaymentOwners.map((owner) => (
                      <label className="cbn-payment-owner" key={owner.uid}>
                        <input type="checkbox" checked={selectedPaymentOwnerUids.includes(owner.uid)} onChange={() => setSelectedPaymentOwnerUids((current) => current.includes(owner.uid) ? current.filter((uid) => uid !== owner.uid) : [...current, owner.uid])} />
                        <span className="cbn-payment-avatar">{String(owner.name || "U").slice(0, 1).toUpperCase()}</span>
                        <span className="cbn-payment-owner-details"><strong>{owner.name}</strong><small>{[owner.phone, owner.email, owner.role].filter(Boolean).join(" · ") || owner.uid}</small></span>
                        <em>Branch {branchCode}</em>
                      </label>
                    )) : <div className="cbn-loading">No customers with an FCM token found for branch {branchCode || "—"}.</div>}
                </div>

                <label className="cbn-field">
                  <span>Notification title <small>{paymentNotification.title.length}/100</small></span>
                  <input maxLength={100} value={paymentNotification.title} onChange={(event) => updatePaymentNotification({ title: event.target.value })} placeholder="New payment received" />
                </label>
                <label className="cbn-field">
                  <span>Notification message <small>{paymentNotification.message.length}/450</small></span>
                  <textarea rows={5} maxLength={450} value={paymentNotification.message} onChange={(event) => updatePaymentNotification({ message: event.target.value })} placeholder="Write your custom payment notification…" />
                  <em>Click any placeholder below to copy it. The Cloud Function fills it from the new payment document.</em>
                </label>

                <div className="cbn-placeholder-panel">
                  <div className="cbn-section-head"><div><h3>All payment placeholders</h3><p>These names match the payment fields and the notification Cloud Function.</p></div><span>{PAYMENT_PLACEHOLDERS.length} FIELDS</span></div>
                  <div className="cbn-placeholder-grid cbn-payment-placeholder-grid">
                    {PAYMENT_PLACEHOLDERS.map(([token, description]) => (
                      <button type="button" key={token} title={`Copy ${token}`} onClick={() => { navigator.clipboard?.writeText(token); notify(`${token} copied.`); }}>
                        <code>{token}</code><small>{description}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cbn-two-fields">
                  <label className="cbn-field">Notification image URL (optional)<input value={paymentNotification.imageUrl} onChange={(event) => updatePaymentNotification({ imageUrl: event.target.value })} placeholder="https://…" /></label>
                  <label className="cbn-field">Click destination URL (optional)<input value={paymentNotification.clickUrl} onChange={(event) => updatePaymentNotification({ clickUrl: event.target.value })} placeholder="https://…" /></label>
                </div>

                <div className="cbn-note">
                  <strong>Branch security and trigger behavior</strong>
                  <p>The trigger listens only to <code>products/{branchCode || "{branchCode}"}/payments/{`{paymentId}`}</code>. It verifies the payment document's branchCode and checks every selected owner's users/{`{uid}`}.branchCode before sending. Updating an existing payment document does not send another notification.</p>
                  <p>Ensure your Cloud Function <code>notifySelectedBranchOwnersOnPaymentCreated</code> and callable <code>sendBranchPaymentOwnerTest</code> are deployed.</p>
                </div>

                <div className="cbn-actions">
                  <button type="button" className="cbn-reset" onClick={testPaymentOwnerNotification} disabled={testingPaymentOwners || loadingPaymentOwners || !selectedPaymentOwnerUids.length}>{testingPaymentOwners ? "Sending test…" : "Send test to selected owners"}</button>
                  <button type="button" className="cbn-save" onClick={savePaymentOwnerSettings} disabled={savingPaymentOwners || loadingPaymentOwners || !branchCode}>{savingPaymentOwners ? "Saving…" : "Save payment notification settings"}</button>
                </div>
              </div>
            </div>

            <aside className="cbn-preview">
              <div className="cbn-preview-head"><div><span className="cbn-step-label">LIVE PREVIEW</span><h2>Branch owner notification</h2></div><span className="cbn-live-label"><i /> PREVIEW</span></div>
              <div className="cbn-phone-wrap">
                <div className="cbn-phone">
                  <div className="cbn-phone-notch" /><div className="cbn-phone-status"><span>9:41</span><span>● ● ▰</span></div>
                  <div className="cbn-phone-screen">
                    <div className="cbn-lock-time">9:41</div><div className="cbn-lock-date">Saturday, 31 October</div>
                    <div className="cbn-notification">
                      <div className="cbn-notification-app"><span className="cbn-mini-logo">D</span><b>DOR</b><small>now</small></div>
                      {paymentNotification.imageUrl && <img className="cbn-preview-image" src={paymentNotification.imageUrl} alt="Payment notification preview" />}
                      <strong>{paymentNotification.title || "New payment received"}</strong>
                      <p>{paymentNotification.message}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="cbn-preview-details">
                <div><span>Branch</span><strong>{branchCode || "Not assigned"}</strong></div>
                <div><span>Selected owners</span><strong>{selectedPaymentOwnerUids.length}</strong></div>
                <div><span>Trigger</span><strong>New payment document</strong></div>
                <div><span>Status</span><strong className={paymentNotification.enabled ? "cbn-status-on" : "cbn-status-off"}>{paymentNotification.enabled ? "Enabled" : "Disabled"}</strong></div>
              </div>
              <p className="cbn-preview-foot">Preview displays placeholder names. The deployed Cloud Function replaces them with values from each payment document.</p>
            </aside>
          </section>
        )}

        <footer className="cbn-footer"><span>DOR BUSINESS CONSOLE</span><span>Custom booking notifications · Firebase</span></footer>
      </main>

      {toast.text && <div className={`cbn-toast ${toast.type}`}>{toast.text}</div>}
    </div>
  );
}
