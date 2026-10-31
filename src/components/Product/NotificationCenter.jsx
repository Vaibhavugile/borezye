import React, { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, auth, db, storage } from "../../firebaseConfig";
import { useUser } from "../Auth/UserContext";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import "./NotificationCenter.css";

const functions = getFunctions(app, "asia-south1");
const sendBranchNotificationCall = httpsCallable(functions, "sendBranchNotification");

const templates = [
  { label: "New collection", title: "New arrivals are here ✨", message: "Discover the latest styles at DOR. Explore the collection before your favourites are gone." },
  { label: "Booking reminder", title: "A quick reminder from DOR", message: "Your upcoming booking is coming up soon. Open the app to review your booking details." },
  { label: "Special offer", title: "A little something for you 🎁", message: "Enjoy a special offer on your next visit. Open DOR to see what's waiting for you." },
];

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2Z"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></>,
    trash: <><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  };
  return <svg {...common}>{paths[name] || paths.bell}</svg>;
}

function formatDate(value) {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function NotificationCenter() {
  // Match ProductDashboard: branchCode comes from the current page auth context.
  const { userData } = useUser();
  const branchCode = String(userData?.branchCode ?? "").trim();
  const branchId = branchCode;

  const [tokenCount, setTokenCount] = useState(null);
  const [checkingBranch, setCheckingBranch] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [activeTab, setActiveTab] = useState("compose");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("info");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [result, setResult] = useState(null);
  const [imageFileName, setImageFileName] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [imageError, setImageError] = useState("");

  const notify = useCallback((text, type = "info") => {
    setToast(text);
    setToastType(type);
    window.setTimeout(() => setToast(""), 4500);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!auth.currentUser || !branchId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      // Fetch every campaign for this branch, newest first.
      const campaignsQuery = query(
        collection(db, "notificationCampaigns"),
        where("branch", "==", branchId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(campaignsQuery);
      setHistory(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error("Branch campaign history load failed:", error);
      notify("Could not load this branch's campaign history. Check Firestore rules and indexes.", "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [branchId, notify]);

  const checkBranch = useCallback(async () => {
    if (!branchId || !/^[a-zA-Z0-9_-]{1,64}$/.test(branchId)) {
      setTokenCount(null);
      return;
    }
    if (!auth.currentUser) {
      notify("Please sign in to the admin console first.", "error");
      return;
    }
    setCheckingBranch(true);
    try {
      const usersRef = collection(db, "customers", branchId, "users");
      const snapshot = await getDocs(usersRef);
      let count = 0;
      const seen = new Set();
      snapshot.docs.forEach((userDoc) => {
        const token = userDoc.get("fcmToken");
        if (typeof token === "string" && token.trim() && !seen.has(token.trim())) {
          seen.add(token.trim());
          count += 1;
        }
      });
      setTokenCount(count);
    } catch (error) {
      console.error("Branch token count failed:", error);
      notify(error?.message || "Unable to read branch users. Check Firestore rules.", "error");
    } finally {
      setCheckingBranch(false);
    }
  }, [branchId, notify]);

  useEffect(() => {
    if (branchId) {
      loadHistory();
      checkBranch();
    } else {
      setTokenCount(null);
      setHistory([]);
    }
  }, [branchId, loadHistory, checkBranch]);

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError("");
    if (!branchId) {
      setImageError("Your user profile does not contain branchCode.");
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setImageUploading(true);
    setImageUploadProgress(0);
    setImageUrl("");
    setImageFileName(file.name);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destination = storageRef(
      storage,
      `notification-images/${branchId}/web-console/${Date.now()}-${safeName}`
    );
    const task = uploadBytesResumable(destination, file, {
      contentType: file.type,
      customMetadata: {
        branchCode: branchId,
        uploadedBy: userData?.uid || userData?.id || "web-console",
      },
    });

    task.on(
      "state_changed",
      (snapshot) => {
        setImageUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (error) => {
        console.error("Notification image upload failed:", error);
        setImageError(error?.message || "Image upload failed. Check Firebase Storage rules.");
        setImageUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          setImageUrl(downloadUrl);
          notify("Notification image uploaded successfully.", "success");
        } catch (error) {
          console.error("Could not get image URL:", error);
          setImageError("Image uploaded, but its download URL could not be retrieved.");
        } finally {
          setImageUploading(false);
        }
      }
    );
    event.target.value = "";
  };

  const clearImage = () => {
    setImageUrl("");
    setImageFileName("");
    setImageUploadProgress(0);
    setImageError("");
  };

  const applyTemplate = (template) => {
    setTitle(template.title);
    setMessage(template.message);
    setActiveTab("compose");
    notify(`${template.label} template applied.`, "success");
  };

  const confirmSend = async () => {
    if (!auth.currentUser) {
      setShowConfirm(false);
      notify("Please sign in before sending.", "error");
      return;
    }
    setShowConfirm(false);
    setSending(true);
    setResult(null);
    try {
      const response = await sendBranchNotificationCall({
        branch: branchId,
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim(),
        deepLink: deepLink.trim(),
      });
      setResult(response.data);
      notify(`Campaign ${response.data.status}: ${response.data.successCount} successful, ${response.data.failureCount} failed.`, response.data.failureCount ? "warning" : "success");
      await loadHistory();
    } catch (error) {
      console.error("Notification sending failed:", error);
      notify(error?.message || "Notification sending failed. Check Cloud Functions logs.", "error");
    } finally {
      setSending(false);
    }
  };

  const filteredHistory = useMemo(() => history.filter((item) => {
    if (historyFilter === "All") return true;
    if (historyFilter === "Sent") return ["sent", "completed", "partial"].includes(item.status);
    return String(item.status || "").toLowerCase() === historyFilter.toLowerCase();
  }), [history, historyFilter]);

  const report = useMemo(() => {
    const total = history.length;
    const successful = history.reduce((sum, item) => sum + Number(item.successCount || 0), 0);
    const failed = history.reduce((sum, item) => sum + Number(item.failureCount || 0), 0);
    const recipients = history.reduce((sum, item) => sum + Number(item.recipientCount || 0), 0);
    const sent = history.filter((item) => ["sent", "completed", "partial"].includes(String(item.status || "").toLowerCase())).length;
    const failedCampaigns = history.filter((item) => String(item.status || "").toLowerCase() === "failed").length;
    return { total, successful, failed, recipients, sent, failedCampaigns };
  }, [history]);

  const currentUserName = userData?.name || userData?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || auth.currentUser?.phoneNumber || "Signed-in user";

  return (
    <div className="nc-app">
      <aside className="nc-sidebar">
        <div className="nc-brand"><div className="nc-brand-mark">D</div><div><strong>DOR</strong><span>BUSINESS CONSOLE</span></div></div>
        <div className="nc-workspace-label">WORKSPACE</div>
        <div className="nc-nav-item"><span className="nc-nav-glyph">⌂</span> Overview</div>
        <div className="nc-nav-item"><span className="nc-nav-glyph">▦</span> Bookings</div>
        <div className="nc-nav-item"><span className="nc-nav-glyph">♙</span> Customers</div>
        <div className="nc-nav-item"><span className="nc-nav-glyph">▤</span> Products</div>
        <div className="nc-workspace-label nc-nav-spacer">ENGAGEMENT</div>
        <div className="nc-nav-item active"><Icon name="bell" size={17}/> Notifications <span className="nc-nav-pill">LIVE</span></div>
        <div className="nc-nav-item"><Icon name="chart" size={17}/> Analytics</div>
        <div className="nc-sidebar-bottom">
          <div className="nc-help-card"><div className="nc-help-icon"><Icon name="shield" size={18}/></div><strong>Branch-aware delivery</strong><p>Only tokens stored under the selected branch are targeted by the sender function.</p><span>Delivery security <Icon name="chevron" size={13}/></span></div>
          <div className="nc-profile"><div className="nc-avatar">{currentUserName.slice(0, 1).toUpperCase()}</div><div className="nc-profile-copy"><strong>{currentUserName}</strong><span>{auth.currentUser ? "Signed in" : "Not signed in"}</span></div></div>
        </div>
      </aside>

      <main className="nc-main">
        <header className="nc-topbar"><div className="nc-breadcrumb">Engagement <Icon name="chevron" size={13}/> <strong>Notifications</strong></div><div className="nc-topbar-right"><span className={`nc-live-dot ${auth.currentUser ? "" : "offline"}`}/><span>{auth.currentUser ? "Firebase session active" : "Sign-in required"}</span><span className="nc-status-chip">LIVE DATA</span><div className="nc-top-avatar">{currentUserName.slice(0, 1).toUpperCase()}</div></div></header>

        <div className="nc-content">
          <section className="nc-page-heading"><div><div className="nc-eyebrow"><span className="nc-eyebrow-line"/> CUSTOMER ENGAGEMENT</div><h1>Notification <span>Studio</span></h1><p>Create branch-specific customer updates and monitor campaign results.</p></div><button className="nc-secondary-button" onClick={() => { setTitle(""); setMessage(""); setDeepLink(""); clearImage(); setResult(null); }}><Icon name="sparkles" size={16}/> New campaign</button></section>

          <section className="nc-stat-grid">
            <div className="nc-stat-card"><div className="nc-stat-top"><span>Reachable devices</span><span className="nc-stat-icon purple"><Icon name="users"/></span></div><div className="nc-stat-value">{tokenCount === null ? "—" : tokenCount.toLocaleString("en-IN")}<small> tokens</small></div><div className="nc-stat-foot"><span className="nc-foot-dot green"/> {branchId ? `Branch ${branchId}` : "Check a branch to load live count"}</div></div>
            <div className="nc-stat-card"><div className="nc-stat-top"><span>Branch campaigns</span><span className="nc-stat-icon blue"><Icon name="bell"/></span></div><div className="nc-stat-value">{report.total}<small> total</small></div><div className="nc-stat-foot">{report.sent} sent or completed · {report.failedCampaigns} failed</div></div>
            <div className="nc-stat-card"><div className="nc-stat-top"><span>Historical send results</span><span className="nc-stat-icon amber"><Icon name="chart"/></span></div><div className="nc-stat-value">{report.successful.toLocaleString("en-IN")}<small> successful</small></div><div className="nc-stat-foot">{report.failed.toLocaleString("en-IN")} failed · {report.recipients.toLocaleString("en-IN")} total recipient attempts</div></div>
            <div className="nc-stat-card"><div className="nc-stat-top"><span>Current sender</span><span className="nc-stat-icon green"><Icon name="shield"/></span></div><div className="nc-stat-value nc-sender-stat">{currentUserName}</div><div className="nc-stat-foot">Sender identity recorded by the function</div></div>
          </section>

          <div className="nc-workspace">
            <section className="nc-editor-panel">
              <div className="nc-panel-heading"><div><h2>Create notification</h2><p>Target a branch, compose your message, then review before sending.</p></div><span className="nc-step-badge">FIREBASE CONNECTED</span></div>
              <div className="nc-tabs" role="tablist"><button className={activeTab === "compose" ? "selected" : ""} onClick={() => setActiveTab("compose")}><span>01</span> Compose</button><button className={activeTab === "history" ? "selected" : ""} onClick={() => { setActiveTab("history"); loadHistory(); }}><span>02</span> Campaign history</button></div>

              {activeTab === "compose" ? <div className="nc-form">
                <div className="nc-section-title"><span className="nc-section-number">1</span><div><strong>Delivery audience</strong><p>Your logged-in profile determines the branch for this campaign.</p></div></div>
                <div className="nc-branch-locked"><span className="nc-branch-lock-icon"><Icon name="shield" size={17}/></span><div><small>YOUR ASSIGNED BRANCH</small><strong>{branchId || "branchCode missing from userdata"}</strong><span>Notifications and campaign reports are scoped to this branch.</span></div><button className="nc-icon-button" onClick={checkBranch} disabled={checkingBranch} aria-label="Refresh branch token count"><Icon name="refresh"/></button></div>
                <div className="nc-field"><small>Reads customers/{'{branch}'}/users and counts unique documents containing an fcmToken.</small></div>
                <div className="nc-reach-note"><Icon name="shield" size={16}/><span><strong>{branchId ? `Branch ${branchId}: ${tokenCount === null ? "not checked" : `${tokenCount.toLocaleString("en-IN")} unique tokens`}` : "No branch selected"}</strong><br/>The deployed function fetches tokens again when you send. The displayed count is an estimate and can change.</span></div>

                <div className="nc-form-divider"/><div className="nc-section-title"><span className="nc-section-number">2</span><div><strong>Message content</strong><p>Keep it clear, useful and easy to read on mobile.</p></div></div>
                <div className="nc-template-row"><span>Start with a template</span>{templates.map((template) => <button key={template.label} onClick={() => applyTemplate(template)}>{template.label}<Icon name="chevron" size={12}/></button>)}</div>
                <div className="nc-field"><div className="nc-label-row"><label htmlFor="nc-title">Notification title</label><span>{title.length}/60</span></div><input id="nc-title" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. A special update from DOR"/></div>
                <div className="nc-field"><div className="nc-label-row"><label htmlFor="nc-message">Message</label><span>{message.length}/180</span></div><textarea id="nc-message" maxLength={180} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a helpful message your customers will want to open…"/><small>Put the most important information first. Emojis are optional.</small></div>
                <div className="nc-field"><label htmlFor="nc-image-file">Notification image <span className="nc-optional">OPTIONAL</span></label>
                  <div className={`nc-upload-dropzone ${imageUrl ? "has-image" : ""}`}>
                    {imageUrl ? <img className="nc-upload-preview" src={imageUrl} alt="Uploaded notification preview"/> : <div className="nc-upload-placeholder"><span><Icon name="upload" size={21}/></span><strong>Upload notification image</strong><small>JPG, PNG or WebP · up to 5 MB</small></div>}
                    <label className="nc-upload-button" htmlFor="nc-image-file"><Icon name="image" size={15}/>{imageUploading ? `Uploading ${imageUploadProgress}%` : imageUrl ? "Replace image" : "Choose image"}</label>
                    <input id="nc-image-file" className="nc-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageUpload} disabled={imageUploading}/>
                    {imageUploading && <div className="nc-upload-progress"><span style={{width: `${imageUploadProgress}%`}}/></div>}
                  </div>
                  {imageFileName && imageUrl && <div className="nc-upload-file-row"><span><Icon name="check" size={14}/>{imageFileName}</span><button type="button" className="nc-remove-image" onClick={clearImage}><Icon name="trash" size={14}/> Remove</button></div>}
                  {imageError && <small className="nc-field-error">{imageError}</small>}
                  <small>The image is uploaded to Firebase Storage under this branch and its HTTPS URL is included in the FCM payload.</small>
                </div>
                <div className="nc-field"><label htmlFor="nc-link">Open destination <span className="nc-optional">OPTIONAL</span></label><input id="nc-link" value={deepLink} onChange={(e) => setDeepLink(e.target.value)} placeholder="e.g. dor://offers or /booking-details"/><small>Your customer app must implement handling for this deepLink field.</small></div>
                <div className="nc-form-divider"/><div className="nc-section-title"><span className="nc-section-number">3</span><div><strong>Review and send</strong><p>Confirm the selected branch and message before sending to every saved token in that branch.</p></div></div>
                <div className="nc-compliance-note"><Icon name="shield" size={17}/><p><strong>Sending access warning</strong><br/>The current deployed function accepts any authenticated Firebase user. Only test with a controlled account until administrator and branch permissions are enforced.</p></div>
                {result && <div className="nc-result-box"><strong>Latest campaign: {result.status}</strong><span>{result.successCount} successful · {result.failureCount} failed · {result.recipientCount} recipients</span><small>Campaign ID: {result.campaignId}</small></div>}
                <div className="nc-form-actions"><button className="nc-reset-button" onClick={() => { setTitle(""); setMessage(""); setDeepLink(""); clearImage(); setResult(null); }}>Clear draft</button><button className="nc-primary-button" disabled={sending || !branchId || tokenCount === null || !title.trim() || !message.trim()} onClick={() => setShowConfirm(true)}>{sending ? "Sending…" : "Review notification"}<Icon name="chevron" size={16}/></button></div>
              </div> : <div className="nc-history"><div className="nc-history-top"><div><strong>Campaign activity</strong><p>Complete campaign history and delivery totals for branch {branchId || "—"}.</p></div><div className="nc-history-controls"><select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}><option>All</option><option>Sent</option><option>sending</option><option>partial</option><option>failed</option><option>completed</option></select><button className="nc-icon-button" onClick={loadHistory} aria-label="Refresh campaign history"><Icon name="refresh"/></button></div></div>
                <div className="nc-history-report-grid">
                  <div><small>Campaigns</small><strong>{report.total}</strong></div>
                  <div><small>Recipient attempts</small><strong>{report.recipients.toLocaleString("en-IN")}</strong></div>
                  <div><small>FCM accepted</small><strong>{report.successful.toLocaleString("en-IN")}</strong></div>
                  <div><small>Failed</small><strong>{report.failed.toLocaleString("en-IN")}</strong></div>
                </div>
                {historyLoading ? <div className="nc-empty"><span className="nc-loader"/>Loading campaign history…</div> : filteredHistory.length === 0 ? <div className="nc-empty"><Icon name="bell" size={25}/><strong>No campaigns found</strong><span>Campaigns appear here after they are recorded in Firestore.</span></div> : filteredHistory.map((item) => <div className="nc-history-row" key={item.id}><div className="nc-history-symbol"><Icon name="bell" size={17}/></div><div className="nc-history-main"><strong>{item.title || "Untitled campaign"}</strong><span>{formatDate(item.createdAt)} · Branch {item.branch || "—"}</span><span>Sent by {item.createdByName || item.createdBy || "Unknown user"}</span></div><span className={`nc-history-status ${String(item.status || "").toLowerCase()}`}>{item.status || "unknown"}</span><div className="nc-history-counts"><b>{item.successCount ?? 0}</b><small>success</small><b>{item.failureCount ?? 0}</b><small>failed</small></div></div>)}
                <p className="nc-history-foot">FCM success indicates that Firebase accepted the message, not that the device displayed it.</p></div>}
            </section>

            <aside className="nc-preview-column"><div className="nc-preview-heading"><div><h2>Live preview</h2><p>Approximate notification appearance.</p></div><span className="nc-preview-live"><i/> LIVE</span></div>
              <div className="nc-phone-stage"><div className="nc-phone"><div className="nc-phone-notch"/><div className="nc-phone-status"><span>9:41</span><span>● ● ▰</span></div><div className="nc-wallpaper"><div className="nc-lock-time">9:41</div><div className="nc-lock-date">Notification preview</div><div className="nc-notification-card"><div className="nc-notification-app"><div className="nc-app-icon">D</div><span>DOR <small>now</small></span><span className="nc-notification-chevron">⌄</span></div><strong>{title.trim() || "Your notification title"}</strong><p>{message.trim() || "Your notification message will appear here. Keep it useful, warm, and easy to scan."}</p>{imageUrl && <img className="nc-phone-image" src={imageUrl} alt="Notification image preview"/>}</div><div className="nc-phone-bottom"><span>Flashlight</span><span>Camera</span></div></div></div></div>
              <div className="nc-preview-summary"><div className="nc-summary-top"><span>CAMPAIGN SUMMARY</span><Icon name="sparkles" size={16}/></div><div className="nc-summary-row"><span>Branch</span><strong>{branchId || "Not selected"}</strong></div><div className="nc-summary-row"><span>Estimated reach</span><strong className="nc-reach-value">{tokenCount === null ? "Not checked" : `${tokenCount.toLocaleString("en-IN")} devices`}</strong></div><div className="nc-summary-row"><span>Sender</span><strong>{currentUserName}</strong></div>{deepLink && <div className="nc-summary-row"><span>Destination</span><strong className="nc-destination">{deepLink}</strong></div>}<div className="nc-summary-divider"/><div className="nc-summary-tip"><span><Icon name="sparkles" size={16}/></span><p><strong>One last check</strong><br/>Make sure this message is relevant to every customer in the selected branch.</p></div></div>
              <div className="nc-security-foot"><Icon name="shield" size={15}/><span>Cloud Functions sends with Firebase Admin SDK. Never expose service-account credentials in React.</span></div>
            </aside>
          </div>
          <footer className="nc-footer"><span>© 2026 DOR Business Console</span><span><i/> Notification Studio <b>·</b> Firebase connected</span></footer>
        </div>
      </main>

      {showConfirm && <div className="nc-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowConfirm(false)}><div className="nc-modal" role="dialog" aria-modal="true" aria-labelledby="nc-modal-title"><div className="nc-modal-icon"><Icon name="send" size={22}/></div><h2 id="nc-modal-title">Confirm notification</h2><p>You are about to send this message to saved FCM tokens under <strong>customers/{branchId}/users</strong>.</p><div className="nc-modal-message"><strong>{title}</strong><span>{message}</span></div><div className="nc-modal-warning"><Icon name="shield" size={17}/> This sends to all tokens found by the deployed function. Confirm that this is the intended branch and that you are testing with an authorized account.</div><div className="nc-modal-actions"><button className="nc-reset-button" onClick={() => setShowConfirm(false)}>Go back</button><button className="nc-primary-button" onClick={confirmSend} disabled={sending}>Confirm and send <Icon name="send" size={15}/></button></div></div></div>}
      {toast && <div className={`nc-toast ${toastType}`}><span><Icon name={toastType === "error" ? "shield" : "check"} size={16}/></span>{toast}</div>}
    </div>
  );
}
